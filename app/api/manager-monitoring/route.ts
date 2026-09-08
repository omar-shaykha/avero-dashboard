import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthorizationContext, hasPermission, isKingAdmin, isTenantAdmin } from "@/lib/auth/authorization";

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Missing Supabase configuration");
  return createClient(url, key, { auth: { persistSession: false } });
}

function canView(access: Awaited<ReturnType<typeof getAuthorizationContext>>) {
  return Boolean(access && (isKingAdmin(access) || isTenantAdmin(access) || hasPermission(access, "analytics.view")));
}

function validDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET(request: Request) {
  try {
    const access = await getAuthorizationContext();
    if (!access?.profile.company_id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canView(access)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const url = new URL(request.url);
    const from = validDate(url.searchParams.get("from"));
    const to = validDate(url.searchParams.get("to"));
    const warehouseId = url.searchParams.get("warehouse")?.trim() || null;

    if (!from || !to || from >= to) return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
    const spanMs = to.getTime() - from.getTime();
    if (spanMs > 366 * 24 * 60 * 60 * 1000) return NextResponse.json({ error: "Date range cannot exceed 366 days" }, { status: 400 });

    const db = admin();
    const companyId = access.profile.company_id;

    if (warehouseId) {
      const { data: warehouse, error } = await db
        .from("inventory_warehouses")
        .select("id")
        .eq("id", warehouseId)
        .eq("company_id", companyId)
        .eq("active", true)
        .maybeSingle();
      if (error || !warehouse) return NextResponse.json({ error: "Invalid warehouse" }, { status: 400 });
    }

    const previousTo = from;
    const previousFrom = new Date(from.getTime() - spanMs);

    const [current, previous, warehouses, settings, company] = await Promise.all([
      db.rpc("manager_monitoring_snapshot", {
        p_company_id: companyId,
        p_from: from.toISOString(),
        p_to: to.toISOString(),
        p_warehouse_id: warehouseId,
      }),
      db.rpc("manager_monitoring_snapshot", {
        p_company_id: companyId,
        p_from: previousFrom.toISOString(),
        p_to: previousTo.toISOString(),
        p_warehouse_id: warehouseId,
      }),
      db.from("inventory_warehouses").select("id,name,code").eq("company_id", companyId).eq("active", true).order("name"),
      db.from("sales_settings").select("currency").eq("company_id", companyId).maybeSingle(),
      db.from("companies").select("name").eq("id", companyId).maybeSingle(),
    ]);

    const error = current.error || previous.error || warehouses.error || settings.error || company.error;
    if (error) {
      console.error("Manager monitoring error:", error);
      return NextResponse.json({ error: "Could not load manager monitoring data" }, { status: 500 });
    }

    return NextResponse.json({
      current: current.data,
      previous: previous.data,
      warehouses: warehouses.data || [],
      currency: settings.data?.currency || "SAR",
      company_name: company.data?.name || "AVERO",
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Manager monitoring GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
