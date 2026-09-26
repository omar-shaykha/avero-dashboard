import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthorizationContext, hasApp, hasPermission, isKingAdmin, isTenantAdmin } from "@/lib/auth/authorization";

const json = (value: unknown, status = 200) => Response.json(value, { status, headers: { "Cache-Control": "no-store" } });
const canManage = (access: NonNullable<Awaited<ReturnType<typeof getAuthorizationContext>>>) =>
  isKingAdmin(access) || isTenantAdmin(access) || hasPermission(access, "sales.manage");
const canView = (access: NonNullable<Awaited<ReturnType<typeof getAuthorizationContext>>>) =>
  canManage(access) || hasPermission(access, "sales.view") || hasPermission(access, "sales.cashier");

async function selectedCompany(request: Request, access: NonNullable<Awaited<ReturnType<typeof getAuthorizationContext>>>) {
  const requested = new URL(request.url).searchParams.get("company");
  if (!requested || requested === access.profile.company_id) return access.profile.company_id;
  if (!isKingAdmin(access) || !/^[0-9a-f-]{36}$/i.test(requested)) return null;
  const { data, error } = await createAdminClient().from("companies").select("id").eq("id", requested).maybeSingle();
  return error ? null : data?.id || null;
}

export async function GET(request: Request) {
  const access = await getAuthorizationContext();
  const companyId = access && await selectedCompany(request, access);
  if (!access || !companyId) return json({ error: "Unauthorized" }, 401);
  if (!hasApp(access,"app_go") || !hasApp(access,"app_sell")) return json({error:"Forbidden"},403);
  if (!canView(access)) return json({ error: "Forbidden" }, 403);
  const db = createAdminClient();
  const [store, company, branches, categories, products, orders, companies] = await Promise.all([
    db.from("go_stores").select("slug,pickup_branch_id,pickup_address,prep_minutes,enabled,logo_url,hero_image_url,primary_color,accent_color,contact_phone,contact_email,whatsapp_url,map_url,help_url,announcement_text,popup_enabled,popup_image_url,popup_title,popup_body,popup_link,about_title,about_body,about_image_url,locations_json,gallery_json,custom_links_json").eq("company_id", companyId).maybeSingle(),
    db.from("companies").select("name").eq("id", companyId).single(),
    db.from("branches").select("id,name,status").eq("company_id", companyId).eq("status", "active").order("created_at"),
    db.from("sales_categories").select("id,name,active").eq("company_id", companyId).order("sort_order"),
    db.from("sales_products").select("id,sku,barcode,name,description,price,image_url,category_id,active,show_on_go,product_type,calories,allergens").eq("company_id", companyId).neq("product_type", "raw_material").neq("product_type", "sub_recipe").order("sort_order"),
    db.from("sales_orders").select("id,order_no,customer_name,customer_phone,customer_notes,total,tracking_status,status,created_at,sales_order_lines(product_name,quantity)").eq("company_id", companyId).eq("channel", "go").order("created_at", { ascending: false }).limit(50),
    isKingAdmin(access) ? db.from("companies").select("id,name").eq("status", "active").order("name") : Promise.resolve({ data: [], error: null }),
  ]);
  const error = [store, company, branches, categories, products, orders, companies].find((result) => result.error)?.error;
  if (error) { console.error("GO dashboard read failed", error); return json({ error: "Could not load GO" }, 500); }
  return json({ store: store.data, company: company.data, branches: branches.data, categories: categories.data,
    products: products.data, orders: orders.data, can_manage: canManage(access), selected_company_id: companyId, available_companies: companies.data || [] });
}

export async function PATCH(request: Request) {
  const access = await getAuthorizationContext();
  const companyId = access && await selectedCompany(request, access);
  if (!access || !companyId) return json({ error: "Unauthorized" }, 401);
  if (!hasApp(access,"app_go") || !hasApp(access,"app_sell")) return json({error:"Forbidden"},403);
  if (!canManage(access)) return json({ error: "Forbidden" }, 403);
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return json({ error: "Invalid request" }, 400); }
  const db = createAdminClient();
  if (body.kind === "branch") {
    const name = String(body.name || "").trim().slice(0, 100);
    const address = String(body.address || "").trim().slice(0, 300);
    if (name.length < 2 || address.length < 8) return json({ error: "Enter the real branch name and pickup address" }, 400);
    const existing = await db.from("branches").select("id").eq("company_id", companyId).limit(1);
    if (existing.error) return json({ error: "Could not check branches" }, 500);
    const created = await db.from("branches").insert({ company_id: companyId, name, status: "active", is_default: !existing.data?.length, created_by: access.user.id }).select("id").single();
    if (created.error) return json({ error: "Could not create branch" }, 500);
    const previous = await db.from("go_stores").select("slug").eq("company_id", companyId).maybeSingle();
    if (previous.error) return json({ error: "Branch created; could not load GO settings" }, 500);
    const saved = await db.from("go_stores").upsert({ company_id: companyId,
      slug: previous.data?.slug || `store-${companyId.slice(0, 8)}`,
      pickup_branch_id: created.data.id, pickup_address: address, enabled: false, updated_at: new Date().toISOString() },
    { onConflict: "company_id" });
    if (saved.error) return json({ error: "Branch created; could not configure pickup" }, 500);
    return json({ ok: true, branch_id: created.data.id });
  }
  if (body.kind === "product") {
    const id = String(body.id || "");
    const published = body.published === true;
    const product = await db.from("sales_products").select("id,active,product_type,price,category_id")
      .eq("company_id", companyId).eq("id", id).maybeSingle();
    if (product.error || !product.data) return json({ error: "Product not found" }, 404);
    if (published && (!product.data.active || ["raw_material", "sub_recipe"].includes(product.data.product_type)
      || Number(product.data.price) < 0)) return json({ error: "Product is not ready for sale" }, 400);
    if (published && product.data.category_id) {
      const category = await db.from("sales_categories").select("id").eq("company_id", companyId)
        .eq("id", product.data.category_id).eq("active", true).maybeSingle();
      if (category.error) return json({ error: "Could not verify category" }, 500);
      if (!category.data) return json({ error: "Activate the product category before publishing to GO" }, 400);
    }
    const changed = await db.from("sales_products").update({ show_on_go: published }).eq("company_id", companyId).eq("id", id);
    return changed.error ? json({ error: "Could not update product" }, 500) : json({ ok: true });
  }
  if (body.kind === "appearance") {
    const color=(value:unknown,fallback:string)=>/^#[0-9a-f]{6}$/i.test(String(value||""))?String(value):fallback;
    const clean=(value:unknown,max=500)=>String(value||"").trim().slice(0,max)||null;
    const saved=await db.from("go_stores").update({
      logo_url:clean(body.logo_url),hero_image_url:clean(body.hero_image_url),
      primary_color:color(body.primary_color,"#06b6d4"),accent_color:color(body.accent_color,"#f59e0b"),
      contact_phone:clean(body.contact_phone,40),contact_email:clean(body.contact_email,160),
      whatsapp_url:clean(body.whatsapp_url),map_url:clean(body.map_url),help_url:clean(body.help_url),
      announcement_text:clean(body.announcement_text,300),popup_enabled:!!body.popup_enabled,popup_image_url:clean(body.popup_image_url),popup_title:clean(body.popup_title,160),popup_body:clean(body.popup_body,800),popup_link:clean(body.popup_link),about_title:clean(body.about_title,160),about_body:clean(body.about_body,4000),about_image_url:clean(body.about_image_url),locations_json:Array.isArray(body.locations_json)?body.locations_json.slice(0,30):[],gallery_json:Array.isArray(body.gallery_json)?body.gallery_json.slice(0,30):[],custom_links_json:Array.isArray(body.custom_links_json)?body.custom_links_json.slice(0,20):[],
      updated_at:new Date().toISOString()
    }).eq("company_id",companyId);
    return saved.error?json({error:"Could not save appearance"},500):json({ok:true});
  }
  if (body.kind === "product_details") {
    const id=String(body.id||"");
    const calories=body.calories===""||body.calories==null?null:Number(body.calories);
    const allergens=Array.isArray(body.allergens)?body.allergens.map(String).map(x=>x.trim()).filter(Boolean).slice(0,20):[];
    if(calories!==null&&(!Number.isFinite(calories)||calories<0||calories>100000))return json({error:"Invalid calories"},400);
    const changed=await db.from("sales_products").update({description:String(body.description||"").trim().slice(0,1000)||null,calories,allergens}).eq("company_id",companyId).eq("id",id);
    return changed.error?json({error:"Could not update product details"},500):json({ok:true});
  }
  if (body.kind === "store") {
    const store = await db.from("go_stores").select("slug").eq("company_id", companyId).maybeSingle();
    if (store.error) return json({ error: "Could not load store" }, 500);
    const branchId = String(body.branch_id || "");
    const address = String(body.address || "").trim().slice(0, 300);
    const minutes = Number(body.prep_minutes);
    if (!branchId || address.length < 8 || !Number.isInteger(minutes) || minutes < 5 || minutes > 240)
      return json({ error: "Choose an active branch, real address and preparation time" }, 400);
    const branch = await db.from("branches").select("id").eq("company_id", companyId).eq("id", branchId).eq("status", "active").maybeSingle();
    if (branch.error || !branch.data) return json({ error: "Invalid branch" }, 400);
    if (body.enabled === true) {
      const products = await db.from("sales_products").select("id", { head: true, count: "exact" })
        .eq("company_id", companyId).eq("active", true).eq("show_on_go", true)
        .neq("product_type", "raw_material").neq("product_type", "sub_recipe");
      if (products.error || !products.count) return json({ error: "Publish at least one product before opening orders" }, 400);
    }
    const saved = await db.from("go_stores").upsert({ company_id: companyId,
      slug: store.data?.slug || `store-${companyId.slice(0, 8)}`,
      pickup_branch_id: branchId, pickup_address: address, prep_minutes: minutes,
      enabled: body.enabled === true, updated_at: new Date().toISOString() }, { onConflict: "company_id" });
    return saved.error ? json({ error: "Could not update store" }, 500) : json({ ok: true });
  }
  if (body.kind === "order") {
    const status = String(body.status || "");
    if (!["preparing", "ready", "cancelled"].includes(status)) return json({ error: "Invalid status" }, 400);
    const updated = await db.from("sales_orders").update({ tracking_status: status,
      ...(status === "cancelled" ? { status: "cancelled" } : {}) })
      .eq("id", String(body.id || "")).eq("company_id", companyId).eq("channel", "go")
      .eq("status", "held").select("id").maybeSingle();
    return updated.error || !updated.data ? json({ error: "Order is unavailable" }, 409) : json({ ok: true });
  }
  return json({ error: "Invalid action" }, 400);
}
