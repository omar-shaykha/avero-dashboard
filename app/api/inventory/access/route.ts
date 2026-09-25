import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthorizationContext, hasApp, hasPermission, isKingAdmin, isTenantAdmin, type AuthorizationContext } from "@/lib/auth/authorization";
import { belongsToActiveCompany, parseWarehouseAccessInput } from "@/lib/inventory/warehouse-access";

async function context(): Promise<{ access: AuthorizationContext; companyId: string } | null> {
  const access = await getAuthorizationContext();
  if (!access?.profile.company_id || (!hasApp(access, "app_operations") && !hasApp(access, "app_sell"))) return null;
  return { access, companyId: access.profile.company_id };
}

const canManage = (access: AuthorizationContext) =>
  isKingAdmin(access) || isTenantAdmin(access) || hasPermission(access, "users.permissions.manage") || hasPermission(access, "inventory.manage");

export async function GET() {
  const current = await context();
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManage(current.access)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = createAdminClient();
  const [users, warehouses, warehouseAccess] = await Promise.all([
    db.from("user_profiles").select("user_id,role,first_name,last_name,full_name,job_title").eq("company_id", current.companyId).order("created_at"),
    db.from("inventory_warehouses").select("id,name,code").eq("company_id", current.companyId).eq("active", true).order("name"),
    db.from("inventory_warehouse_access").select("*").eq("company_id", current.companyId),
  ]);
  if (users.error || warehouses.error || warehouseAccess.error)
    return NextResponse.json({ error: "Could not load warehouse access" }, { status: 500 });
  return NextResponse.json({ users: users.data || [], warehouses: warehouses.data || [], access: warehouseAccess.data || [] });
}

export async function POST(request: Request) {
  const current = await context();
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManage(current.access)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const input = parseWarehouseAccessInput(await request.json().catch(() => null));
  if (!input) return NextResponse.json({ error: "Invalid warehouse access request" }, { status: 400 });
  if (input.canViewCost && !isKingAdmin(current.access) && !isTenantAdmin(current.access)
    && !hasPermission(current.access, "inventory.cost.view"))
    return NextResponse.json({ error: "Cost access requires cost permission" }, { status: 403 });

  const db = createAdminClient();
  const [profile, membership, warehouse] = await Promise.all([
    db.from("user_profiles").select("user_id,company_id").eq("user_id", input.userId).eq("company_id", current.companyId).maybeSingle(),
    db.from("company_memberships").select("user_id,company_id,status").eq("user_id", input.userId).eq("company_id", current.companyId).eq("status", "active").maybeSingle(),
    db.from("inventory_warehouses").select("id,company_id,active").eq("id", input.warehouseId).eq("company_id", current.companyId).eq("active", true).maybeSingle(),
  ]);
  if (profile.error || membership.error || warehouse.error)
    return NextResponse.json({ error: "Could not verify warehouse access" }, { status: 500 });
  if (!belongsToActiveCompany(current.companyId, input.userId, input.warehouseId, profile.data, membership.data, warehouse.data))
    return NextResponse.json({ error: "User or warehouse unavailable" }, { status: 404 });

  const payload = {
    company_id: current.companyId,
    user_id: input.userId,
    warehouse_id: input.warehouseId,
    can_view: input.canView,
    can_manage: input.canManage,
    can_transfer: input.canTransfer,
    can_count: input.canCount,
    can_view_cost: input.canViewCost,
    updated_at: new Date().toISOString(),
  };
  const result = await db.from("inventory_warehouse_access")
    .upsert(payload, { onConflict: "company_id,user_id,warehouse_id" }).select("*").single();
  if (result.error) return NextResponse.json({ error: "Could not update warehouse access" }, { status: 500 });
  const audit = await db.from("inventory_audit_log").insert({
    company_id: current.companyId, entity_type: "warehouse_access", entity_id: result.data.id,
    action: "update_access", details: payload, created_by: current.access.user.id,
  });
  if (audit.error) console.error("Warehouse access audit failed", audit.error);
  return NextResponse.json({ record: result.data });
}
