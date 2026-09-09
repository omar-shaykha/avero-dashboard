// @ts-nocheck
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthorizationContext, isKingAdmin, isTenantAdmin, hasPermission } from "@/lib/auth/authorization";

const db = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { persistSession: false } }
);

const can = (a: any, permission: string) =>
  isKingAdmin(a) || isTenantAdmin(a) || hasPermission(a, permission);

export async function GET() {
  const auth = await getAuthorizationContext();
  const companyId = auth?.profile?.company_id;

  if (!auth || !companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!can(auth, "sales.view") && !can(auth, "sales.cashier")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const s = db();
  const [products, categories, heldOrders, completedOrders, settings, warehouses, shifts] = await Promise.all([
    s.from("sales_products")
      .select("id,category_id,sku,barcode,name,image_url,sale_unit,price,tax_enabled,tax_rate,show_on_cashier,sort_order")
      .eq("company_id", companyId)
      .eq("active", true)
      .eq("show_on_cashier", true)
      .neq("product_type", "raw_material")
      .neq("product_type", "sub_recipe")
      .order("sort_order"),

    s.from("sales_categories")
      .select("id,name,sort_order")
      .eq("company_id", companyId)
      .eq("active", true)
      .eq("show_on_cashier", true)
      .order("sort_order"),

    s.from("sales_orders")
      .select("id,order_no,status,total,discount_percent,customer_name,customer_phone,customer_email,customer_notes,service_type,created_at,sales_order_lines(product_id,quantity,notes)")
      .eq("company_id", companyId)
      .eq("status", "held")
      .order("created_at", { ascending: false })
      .limit(100),

    s.from("sales_orders")
      .select("id,order_no,status,total,cashier_name,tracking_status,created_at")
      .eq("company_id", companyId)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(50),

    s.from("sales_settings")
      .select("currency,prices_include_tax,default_warehouse_id,allow_discount")
      .eq("company_id", companyId)
      .maybeSingle(),

    s.from("inventory_warehouses")
      .select("id,name")
      .eq("company_id", companyId)
      .eq("active", true)
      .order("name"),

    s.from("sales_shifts")
      .select("id,warehouse_id,status,opening_cash,created_at")
      .eq("company_id", companyId)
      .eq("user_id", auth.user.id)
      .order("created_at", { ascending: false })
      .limit(5)
  ]);

  const firstError = [products, categories, heldOrders, completedOrders, settings, warehouses, shifts]
    .map((r: any) => r.error)
    .find(Boolean);

  if (firstError) {
    return NextResponse.json({ error: firstError.message }, { status: 400 });
  }

  const orders = [...(heldOrders.data || []), ...(completedOrders.data || [])]
    .sort((a: any, b: any) => String(b.created_at || "").localeCompare(String(a.created_at || "")));

  return NextResponse.json({
    products: products.data || [],
    categories: categories.data || [],
    orders,
    settings: settings.data || null,
    warehouses: warehouses.data || [],
    shifts: shifts.data || []
  });
}
