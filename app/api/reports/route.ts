import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthorizationContext, hasApp, hasPermission, isKingAdmin, isTenantAdmin, type AuthorizationContext } from "@/lib/auth/authorization";

type Kind = "sales" | "items" | "customers" | "production" | "waste" | "counts" | "stock" | "purchasing" | "movements";
const kinds = new Set<Kind>(["sales", "items", "customers", "production", "waste", "counts", "stock", "purchasing", "movements"]);
const PAGE = 1000;
const MAX = 5000;
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
const privileged = (access: AuthorizationContext) => isKingAdmin(access) || isTenantAdmin(access);
const permitted = (access: AuthorizationContext, kind: Kind) => {
  const can = (...keys: string[]) => privileged(access) || keys.some((key) => hasPermission(access, key));
  if (kind === "sales" || kind === "items") return hasApp(access, "app_sell") && can("sales.view", "sales.manage");
  if (kind === "customers") return hasApp(access, "app_sell") && can("customers.manage", "sales.manage");
  if (kind === "production") return hasApp(access, "app_operations") && can("production.view", "production.manage");
  if (kind === "purchasing") return (hasApp(access, "app_operations") || hasApp(access, "app_sell")) && can("purchasing.view", "purchasing.manage");
  if (kind === "waste") return hasApp(access, "app_operations") && can("inventory.view", "inventory.manage", "production.view");
  return hasApp(access, "app_operations") && can("inventory.view", "inventory.manage");
};

export async function GET(request: Request) {
  const access = await getAuthorizationContext();
  if (!access?.profile.company_id) return json({ error: "Unauthorized" }, 401);
  const url = new URL(request.url);
  const kind = url.searchParams.get("type") as Kind;
  if (!kinds.has(kind)) return json({ error: "Invalid report" }, 400);
  if (!permitted(access, kind)) return json({ error: "Forbidden" }, 403);
  const fromText = url.searchParams.get("from") || "";
  const toText = url.searchParams.get("to") || "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fromText) || !/^\d{4}-\d{2}-\d{2}$/.test(toText)) return json({ error: "Choose valid dates" }, 400);
  // Reporting days follow the Saudi business clock, including the final local day.
  const from = new Date(`${fromText}T00:00:00+03:00`);
  const end = new Date(`${toText}T00:00:00+03:00`);
  if (!Number.isFinite(from.getTime()) || !Number.isFinite(end.getTime()) || end < from || end.getTime() - from.getTime() > 366 * 86400000)
    return json({ error: "Date range must be within 366 days" }, 400);
  const until = new Date(end.getTime() + 86400000).toISOString();
  const db = createAdminClient();
  const companyId = access.profile.company_id;
  const canCost = privileged(access) || hasPermission(access, "inventory.cost.view");
  // Service-role reads bypass RLS; apply the same per-warehouse visibility as Inventory.
  let warehouseIds: string[] | null = null;
  if (!privileged(access) && ["waste", "counts", "stock", "movements"].includes(kind)) {
    const grants = await db.from("inventory_warehouse_access").select("warehouse_id")
      .eq("company_id", companyId).eq("user_id", access.user.id).eq("can_view", true);
    if (grants.error) return json({ error: "Could not verify warehouse access" }, 500);
    warehouseIds = (grants.data || []).map((row) => row.warehouse_id);
  }

  // Supabase pages reads. Include one extra row to detect incomplete exports.
  async function collect(query: any) {
    const rows: any[] = [];
    for (let offset = 0; offset <= MAX; offset += PAGE) {
      const page = await query.range(offset, offset + PAGE - 1);
      if (page.error) throw page.error;
      rows.push(...(page.data || []));
      if ((page.data || []).length < PAGE) break;
    }
    return { rows: rows.slice(0, MAX), truncated: rows.length > MAX };
  }

  try {
    let result: { rows: any[]; truncated: boolean };
    if (["sales", "items", "customers"].includes(kind)) {
      result = await collect(db.from("sales_orders")
        .select("id,order_no,created_at,status,channel,service_type,customer_name,subtotal,discount,tax,total,sales_order_lines(product_name,quantity,line_total)")
        .eq("company_id", companyId).gte("created_at", from.toISOString()).lt("created_at", until)
        .in("status", ["completed", "refunded"]).order("created_at", { ascending: false }).order("id", { ascending: false }));
      if (kind === "items") {
        const lines = result.rows.flatMap((order) => (order.sales_order_lines || []).map((line: any) => ({ date: order.created_at, order: order.order_no, item: line.product_name, quantity: line.quantity, sales: line.line_total, status: order.status })));
        result.truncated ||= lines.length > MAX;
        result.rows = lines.slice(0, MAX);
      }
      else if (kind === "customers") {
        const grouped = new Map<string, { customer: string; orders: number; sales: number }>();
        for (const order of result.rows) { const name = order.customer_name || "Walk-in"; const item = grouped.get(name) || { customer: name, orders: 0, sales: 0 }; item.orders++; item.sales += Number(order.total || 0); grouped.set(name, item); }
        result.rows = [...grouped.values()].sort((a, b) => b.sales - a.sales);
      } else result.rows = result.rows.map(({ sales_order_lines: _lines, ...order }) => order);
    } else if (kind === "production") {
      result = await collect(db.from("production_orders")
        .select(canCost ? "production_no,planned_date,completed_at,status,planned_qty,actual_qty,actual_cost,variance_cost" : "production_no,planned_date,completed_at,status,planned_qty,actual_qty")
        .eq("company_id", companyId).gte("created_at", from.toISOString()).lt("created_at", until).order("created_at", { ascending: false }).order("id", { ascending: false }));
    } else if (kind === "purchasing") {
      result = await collect(db.from("purchase_orders").select("po_no,order_date,status,subtotal,discount,tax,total,currency")
        .eq("company_id", companyId).gte("created_at", from.toISOString()).lt("created_at", until).order("created_at", { ascending: false }).order("id", { ascending: false }));
    } else if (kind === "waste") {
      if (hasPermission(access, "inventory.view") || hasPermission(access, "inventory.manage") || privileged(access)) {
        let inventoryQuery = db.from("inventory_waste").select(canCost ? "created_at,quantity,reason_code,notes,unit_cost" : "created_at,quantity,reason_code,notes")
          .eq("company_id", companyId).gte("created_at", from.toISOString()).lt("created_at", until);
        if (warehouseIds) inventoryQuery = inventoryQuery.in("warehouse_id", warehouseIds);
        const inventory = warehouseIds?.length === 0 ? { rows: [], truncated: false }
          : await collect(inventoryQuery.order("created_at", { ascending: false }).order("id", { ascending: false }));
        result = { rows: inventory.rows.map((row) => ({ source: "Inventory", ...row })), truncated: inventory.truncated };
      } else result = { rows: [], truncated: false };
      if (hasPermission(access, "production.view") || hasPermission(access, "production.manage") || privileged(access)) {
        const production = await collect(db.from("production_waste").select(canCost ? "created_at,quantity,reason,cost" : "created_at,quantity,reason")
          .eq("company_id", companyId).gte("created_at", from.toISOString()).lt("created_at", until).order("created_at", { ascending: false }).order("id", { ascending: false }));
        result.rows.push(...production.rows.map((row) => ({ source: "Production", ...row })));
        result.truncated ||= production.truncated || result.rows.length > MAX;
        result.rows = result.rows.slice(0, MAX);
      }
    } else {
      const config = kind === "counts" ? { table: "inventory_counts", columns: "count_no,count_date,status,count_type", date: "created_at" }
        : kind === "movements" ? { table: "inventory_stock_movements", columns: canCost ? "movement_date,movement_type,quantity,unit_cost,total_cost,reference_no" : "movement_date,movement_type,quantity,reference_no", date: "movement_date" }
        : { table: "inventory_stock_balances", columns: canCost ? "updated_at,item_id,warehouse_id,qty_on_hand,qty_reserved,qty_incoming,average_cost" : "updated_at,item_id,warehouse_id,qty_on_hand,qty_reserved,qty_incoming", date: "updated_at" };
      let query = db.from(config.table).select(config.columns).eq("company_id", companyId);
      if (kind !== "stock") query = query.gte(config.date, from.toISOString()).lt(config.date, until);
      result = warehouseIds?.length === 0 ? { rows: [], truncated: false }
        : await collect((warehouseIds ? query.in("warehouse_id", warehouseIds) : query)
          .order(config.date, { ascending: false }).order("id", { ascending: false }));
    }
    return json({ type: kind, from: fromText, to: toText, generated_at: new Date().toISOString(), rows: result.rows, truncated: result.truncated });
  } catch (error) {
    console.error("Reports read failed", error);
    return json({ error: "Could not load report" }, 500);
  }
}
