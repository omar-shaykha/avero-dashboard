// @ts-nocheck
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthorizationContext, isKingAdmin, isTenantAdmin, hasPermission } from "@/lib/auth/authorization";

const db = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { persistSession: false } }
);
const can = (a:any,p:string) => isKingAdmin(a) || isTenantAdmin(a) || hasPermission(a,p);

async function C(){
  const a = await getAuthorizationContext();
  return a?.profile?.company_id ? { a, c:a.profile.company_id, s:db() } : null;
}

export async function GET(){
  const x=await C();
  if(!x)return NextResponse.json({error:"Unauthorized"},{status:401});
  if(!can(x.a,"sales.view")&&!can(x.a,"sales.manage"))return NextResponse.json({error:"Forbidden"},{status:403});

  const [products,categories,warehouses,suppliers,recipes,sections]=await Promise.all([
    x.s.from("sales_products")
      .select("id,category_id,section_id,inventory_item_id,preferred_supplier_id,recipe_id,sub_recipe_id,product_type,inventory_policy,accounting_class,sku,barcode,name,description,image_url,image_path,sale_unit,price,tax_enabled,tax_rate,track_inventory,show_on_cashier,purchasable,sort_order,sales_categories(name),inventory_items(id,name,sku,average_cost,item_type,purchasable)")
      .eq("company_id",x.c).eq("active",true).order("created_at",{ascending:false}),
    x.s.from("sales_categories").select("id,name,code,description,sort_order,show_on_cashier").eq("company_id",x.c).eq("active",true).order("sort_order").order("name"),
    x.s.from("inventory_warehouses").select("id,name,code").eq("company_id",x.c).eq("active",true).order("name"),
    x.s.from("suppliers").select("id,name,supplier_code").eq("company_id",x.c).eq("status","active").order("name"),
    x.s.from("production_recipes").select("id,name,recipe_code,recipe_type,status,output_item_id").eq("company_id",x.c).eq("status","active").order("name"),
    x.s.from("sales_sections").select("id,name,code,printer_target,sort_order").eq("company_id",x.c).eq("active",true).order("sort_order").order("name")
  ]);
  const firstError=[products,categories,warehouses,suppliers,recipes,sections].map((r:any)=>r.error).find(Boolean);
  if(firstError)return NextResponse.json({error:firstError.message},{status:400});
  const rows=products.data||[];
  return NextResponse.json({
    products:rows,
    categories:categories.data||[],
    warehouses:warehouses.data||[],
    suppliers:suppliers.data||[],
    recipes:recipes.data||[],
    sections:sections.data||[],
    legacy_image_count:rows.filter((p:any)=>typeof p.image_url==="string"&&p.image_url.startsWith("data:image/")).length
  });
}

export async function POST(req:Request){
  const x=await C();
  if(!x)return NextResponse.json({error:"Unauthorized"},{status:401});
  if(!can(x.a,"sales.manage"))return NextResponse.json({error:"Forbidden"},{status:403});
  const b=await req.json(),d=b.data||{};
  if(b.kind!=="archive")return NextResponse.json({error:"Invalid action"},{status:400});

  const p=await x.s.from("sales_products").select("id,inventory_item_id").eq("id",d.id).eq("company_id",x.c).maybeSingle();
  if(!p.data)return NextResponse.json({error:"Invalid product"},{status:404});
  const r=await x.s.from("sales_products").update({active:false,show_on_cashier:false,purchasable:false,updated_at:new Date().toISOString()}).eq("id",d.id).eq("company_id",x.c).select("id").single();
  if(r.error)return NextResponse.json({error:r.error.message},{status:400});
  if(p.data.inventory_item_id){
    await x.s.from("inventory_items").update({purchasable:false,updated_at:new Date().toISOString()}).eq("id",p.data.inventory_item_id).eq("company_id",x.c);
    await x.s.from("inventory_item_suppliers").update({preferred:false,active:false}).eq("item_id",p.data.inventory_item_id).eq("company_id",x.c);
  }
  return NextResponse.json({record:r.data});
}
