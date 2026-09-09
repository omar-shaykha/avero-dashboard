// @ts-nocheck
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthorizationContext, isKingAdmin, isTenantAdmin, hasPermission } from "@/lib/auth/authorization";

const db = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { persistSession: false } }
);
const can=(a:any,p:string)=>isKingAdmin(a)||isTenantAdmin(a)||hasPermission(a,p);

async function C(){
  const a=await getAuthorizationContext();
  return a?.profile?.company_id?{a,c:a.profile.company_id,s:db()}:null;
}

async function owned(s:any,table:string,id:string|undefined,c:string){
  if(!id)return false;
  const q=await s.from(table).select("id").eq("id",id).eq("company_id",c).maybeSingle();
  return !!q.data;
}

async function taken(x:any,field:string,value:string,excludeId?:string|null){
  if(!value)return false;
  let q=x.s.from("sales_products").select("id").eq("company_id",x.c).eq(field,value).limit(1);
  if(excludeId)q=q.neq("id",excludeId);
  const r=await q;
  return !!r.data?.length;
}

export async function POST(req:Request){
  const x=await C();
  if(!x)return NextResponse.json({error:"Unauthorized"},{status:401});
  if(!can(x.a,"sales.manage"))return NextResponse.json({error:"Forbidden"},{status:403});

  const b=await req.json().catch(()=>({}));
  if(b.kind!=="save_without_recipe")return NextResponse.json({error:"Invalid action"},{status:400});
  const d=b.data||{};

  const name=String(d.name||"").trim();
  const price=Number(d.price);
  if(!name)return NextResponse.json({error:"Product name is required"},{status:400});
  if(!Number.isFinite(price)||price<0)return NextResponse.json({error:"Price must be zero or greater"},{status:400});
  if(d.category_id&&!await owned(x.s,"sales_categories",d.category_id,x.c))return NextResponse.json({error:"Invalid sales category"},{status:400});
  if(d.section_id&&!await owned(x.s,"sales_sections",d.section_id,x.c))return NextResponse.json({error:"Invalid section"},{status:400});

  const unit=["piece","gram","kilogram","liter","milliliter"].includes(d.sale_unit)?d.sale_unit:"piece";
  let sku=String(d.sku||"").trim().toUpperCase();
  let barcode=String(d.barcode||"").trim().toUpperCase()||null;
  if(!sku){
    const g=await x.s.rpc("sales_generate_code",{p_company_id:x.c,p_prefix:"RCP"});
    if(g.error)return NextResponse.json({error:g.error.message},{status:400});
    sku=String(g.data);
    if(!barcode)barcode=sku;
  }
  if(await taken(x,"sku",sku,d.id||null))return NextResponse.json({error:"SKU / product code is already used"},{status:409});
  if(barcode&&await taken(x,"barcode",barcode,d.id||null))return NextResponse.json({error:"Barcode is already used"},{status:409});

  const payload:any={
    company_id:x.c,
    category_id:d.category_id||null,
    section_id:d.section_id||null,
    inventory_item_id:null,
    preferred_supplier_id:null,
    recipe_id:null,
    sub_recipe_id:null,
    product_type:"recipe_product",
    inventory_policy:"none",
    accounting_class:"non_stock",
    sku,
    barcode,
    name,
    description:d.description||null,
    image_url:d.image_url||null,
    image_path:d.image_path||null,
    sale_unit:unit,
    price,
    tax_enabled:d.tax_enabled!==false,
    tax_rate:d.tax_enabled===false?0:Math.max(0,Math.min(100,Number(d.tax_rate||0))),
    track_inventory:false,
    show_on_cashier:d.show_on_cashier!==false,
    purchasable:false,
    active:true,
    sort_order:Number(d.sort_order||0),
    updated_at:new Date().toISOString()
  };

  let r:any;
  if(d.id){
    r=await x.s.from("sales_products").update(payload).eq("id",d.id).eq("company_id",x.c).select().single();
  }else{
    r=await x.s.from("sales_products").insert(payload).select().single();
  }
  if(r.error)return NextResponse.json({error:r.error.message},{status:400});
  return NextResponse.json({record:r.data});
}
