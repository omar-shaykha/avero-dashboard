import { createAdminClient } from "@/lib/supabase/admin";

type Context = { params: Promise<{ slug: string }> };
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
async function subscribed(db: ReturnType<typeof createAdminClient>,companyId:string){
  const {data,error}=await db.from("company_features").select("enabled,expires_at,features!inner(key)").eq("company_id",companyId).eq("enabled",true).in("features.key",["app_go","app_sell"]);
  if(error)throw error;
  const keys=new Set((data||[]).filter(row=>!row.expires_at||new Date(row.expires_at).getTime()>Date.now()).map(row=>{
    const feature=Array.isArray(row.features)?row.features[0]:row.features;
    return feature?.key;
  }));
  return keys.has("app_go")&&keys.has("app_sell");
}

export async function GET(_request: Request, { params }: Context) {
  const { slug } = await params;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return reply({ error: "Menu unavailable" }, 404);
  const db = createAdminClient();
  const store = await db.from("go_stores")
    .select("company_id,pickup_branch_id,pickup_address,prep_minutes,enabled")
    .eq("slug", slug).eq("enabled", true).maybeSingle();
  if (store.error) return reply({ error: "Could not load menu" }, 500);
  if (!store.data?.pickup_branch_id || !store.data.pickup_address) return reply({ error: "Menu unavailable" }, 404);
  if (!await subscribed(db,store.data.company_id)) return reply({error:"Menu unavailable"},404);
  const [company, branch, categories, products, settings] = await Promise.all([
    db.from("companies").select("name,status").eq("id", store.data.company_id).maybeSingle(),
    db.from("branches").select("name,status").eq("id", store.data.pickup_branch_id).eq("company_id", store.data.company_id).maybeSingle(),
    db.from("sales_categories").select("id,name").eq("company_id", store.data.company_id).eq("active", true).order("sort_order"),
    db.from("sales_products").select("id,name,description,image_url,price,category_id,tax_enabled,tax_rate")
      .eq("company_id", store.data.company_id).eq("active", true).eq("show_on_go", true)
      .neq("product_type", "raw_material").neq("product_type", "sub_recipe").order("sort_order"),
    db.from("sales_settings").select("prices_include_tax,currency").eq("company_id", store.data.company_id).maybeSingle(),
  ]);
  const error = [company, branch, categories, products, settings].find((result) => result.error)?.error;
  if (error) { console.error("GO menu read failed", error); return reply({ error: "Could not load menu" }, 500); }
  if (!company.data || company.data.status !== "active" || branch.data?.status !== "active")
    return reply({ error: "Menu unavailable" }, 404);
  const allowedCategories = new Set((categories.data || []).map((category) => category.id));
  return reply({ company: company.data.name, branch: branch.data.name,
    pickup_address: store.data.pickup_address, prep_minutes: store.data.prep_minutes,
    currency: settings.data?.currency || "SAR", prices_include_tax: !!settings.data?.prices_include_tax,
    categories: categories.data || [],
    products: (products.data || []).filter((product) => !product.category_id || allowedCategories.has(product.category_id)) });
}

export async function POST(request: Request, { params }: Context) {
  const { slug } = await params;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return reply({ error: "Menu unavailable" }, 404);
  let body: { name?: unknown; phone?: unknown; notes?: unknown; items?: unknown };
  try { body = await request.json(); } catch { return reply({ error: "Invalid request" }, 400); }
  const name = String(body.name || "").trim();
  const phone = String(body.phone || "").replace(/[\s()-]/g, "").trim();
  const notes = String(body.notes || "").trim();
  const items = body.items;
  if (name.length < 2 || name.length > 80 || !/^\+?\d{8,15}$/.test(phone) || notes.length > 400
    || !Array.isArray(items) || items.length < 1 || items.length > 20
    || items.some((item) => !item || typeof item.product_id !== "string" || !Number.isInteger(item.quantity)
      || item.quantity < 1 || item.quantity > 20)) return reply({ error: "Check your name, phone and order" }, 400);
  const db=createAdminClient();
  const store=await db.from("go_stores").select("company_id").eq("slug",slug).eq("enabled",true).maybeSingle();
  if(store.error)return reply({error:"Could not check menu"},500);
  if(!store.data||!await subscribed(db,store.data.company_id))return reply({error:"Menu unavailable"},404);
  const result = await db.rpc("go_place_pickup_order", {
    p_slug: slug, p_name: name, p_phone: phone, p_notes: notes,
    p_items: items.map((item) => ({ product_id: item.product_id, quantity: item.quantity })),
  });
  if (result.error) {
    const message = result.error.message;
    if (message.includes("Order limit reached")) return reply({ error: "Too many requests. Try again later." }, 429);
    if (message.includes("unavailable") || message.includes("Store owner")) return reply({ error: "Pickup is unavailable right now" }, 409);
    if (message.includes("Invalid")) return reply({ error: "Some items or details are no longer valid. Refresh the menu." }, 400);
    console.error("GO order failed", result.error);
    return reply({ error: "Could not place order" }, 500);
  }
  return reply({ order: result.data }, 201);
}
