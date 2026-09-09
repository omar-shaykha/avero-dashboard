// @ts-nocheck
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthorizationContext, isKingAdmin, isTenantAdmin, hasPermission } from "@/lib/auth/authorization";

const db = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });
const can = (a:any,p:string) => isKingAdmin(a) || isTenantAdmin(a) || hasPermission(a,p);
async function C(){ const a=await getAuthorizationContext(); return a?.profile?.company_id ? { a, c:a.profile.company_id, s:db() } : null; }
async function owned(s:any,table:string,id:string|undefined,c:string){ if(!id)return false; const r=await s.from(table).select("id").eq("id",id).eq("company_id",c).maybeSingle(); return !!r.data; }
const codeFrom = (v:string) => String(v||"").trim().toUpperCase().replace(/[^A-Z0-9]+/g,"_").replace(/^_+|_+$/g,"").slice(0,30);

export async function GET(){
  const x=await C();
  if(!x)return NextResponse.json({error:"Unauthorized"},{status:401});
  if(!can(x.a,"sales.view")&&!can(x.a,"sales.manage")&&!can(x.a,"sales.cashier"))return NextResponse.json({error:"Forbidden"},{status:403});

  const [categories,products,sections,settings] = await Promise.all([
    x.s.from("sales_categories").select("id,name,code,description,sort_order,show_on_cashier,active").eq("company_id",x.c).eq("active",true).order("sort_order").order("name"),
    x.s.from("sales_products").select("id,name,sku,price,product_type,category_id,section_id,show_on_cashier,track_inventory,inventory_policy,best_seller_manual,active").eq("company_id",x.c).eq("active",true).order("name"),
    x.s.from("sales_sections").select("id,name,code,printer_target,sort_order,active").eq("company_id",x.c).eq("active",true).order("sort_order").order("name"),
    x.s.from("sales_settings").select("best_seller_mode").eq("company_id",x.c).maybeSingle()
  ]);

  return NextResponse.json({
    categories: categories.data||[],
    products: products.data||[],
    sections: sections.data||[],
    best_seller_mode: settings.data?.best_seller_mode || "auto"
  });
}

export async function POST(req:Request){
  const x=await C();
  if(!x)return NextResponse.json({error:"Unauthorized"},{status:401});
  if(!can(x.a,"sales.manage"))return NextResponse.json({error:"Forbidden"},{status:403});
  const b=await req.json(), d=b.data||{};

  if(b.kind==="category_save"){
    const name=String(d.name||"").trim();
    if(!name)return NextResponse.json({error:"Category name is required"},{status:400});
    const payload={ company_id:x.c, name, code:codeFrom(d.code||name)||null, description:d.description||null, sort_order:Number(d.sort_order||0), show_on_cashier:d.show_on_cashier!==false, active:true };
    const r=d.id
      ? await x.s.from("sales_categories").update(payload).eq("id",d.id).eq("company_id",x.c).select().single()
      : await x.s.from("sales_categories").insert(payload).select().single();
    return r.error?NextResponse.json({error:r.error.message},{status:400}):NextResponse.json({record:r.data});
  }

  if(b.kind==="category_visibility"){
    if(!await owned(x.s,"sales_categories",d.id,x.c))return NextResponse.json({error:"Invalid category"},{status:400});
    const r=await x.s.from("sales_categories").update({show_on_cashier:!!d.show_on_cashier}).eq("id",d.id).eq("company_id",x.c).select("id,show_on_cashier").single();
    return r.error?NextResponse.json({error:r.error.message},{status:400}):NextResponse.json({record:r.data});
  }

  if(b.kind==="section_save"){
    const name=String(d.name||"").trim();
    if(!name)return NextResponse.json({error:"Section name is required"},{status:400});
    const payload={ company_id:x.c, name, code:codeFrom(d.code||name)||null, printer_target:String(d.printer_target||"").trim()||null, sort_order:Number(d.sort_order||0), active:true, updated_at:new Date().toISOString() };
    const r=d.id
      ? await x.s.from("sales_sections").update(payload).eq("id",d.id).eq("company_id",x.c).select().single()
      : await x.s.from("sales_sections").insert(payload).select().single();
    return r.error?NextResponse.json({error:r.error.message},{status:400}):NextResponse.json({record:r.data});
  }

  if(b.kind==="section_delete"){
    if(!await owned(x.s,"sales_sections",d.id,x.c))return NextResponse.json({error:"Invalid section"},{status:400});
    const used=await x.s.from("sales_products").select("id",{count:"exact",head:true}).eq("company_id",x.c).eq("section_id",d.id).eq("active",true);
    if((used.count||0)>0)return NextResponse.json({error:"Move products out of this section before deleting it"},{status:409});
    const r=await x.s.from("sales_sections").update({active:false,updated_at:new Date().toISOString()}).eq("id",d.id).eq("company_id",x.c).select("id").single();
    return r.error?NextResponse.json({error:r.error.message},{status:400}):NextResponse.json({record:r.data});
  }

  if(b.kind==="product_section"){
    if(!await owned(x.s,"sales_products",d.product_id,x.c))return NextResponse.json({error:"Invalid product"},{status:400});
    if(d.section_id && !await owned(x.s,"sales_sections",d.section_id,x.c))return NextResponse.json({error:"Invalid section"},{status:400});
    const r=await x.s.from("sales_products").update({section_id:d.section_id||null,updated_at:new Date().toISOString()}).eq("id",d.product_id).eq("company_id",x.c).select("id,section_id").single();
    return r.error?NextResponse.json({error:r.error.message},{status:400}):NextResponse.json({record:r.data});
  }

  if(b.kind==="product_cashier_visibility"){
    const p=await x.s.from("sales_products").select("id,product_type").eq("id",d.id).eq("company_id",x.c).maybeSingle();
    if(!p.data)return NextResponse.json({error:"Invalid product"},{status:400});
    const blocked=["raw_material","sub_recipe"].includes(p.data.product_type);
    const r=await x.s.from("sales_products").update({show_on_cashier:blocked?false:!!d.show_on_cashier,updated_at:new Date().toISOString()}).eq("id",d.id).eq("company_id",x.c).select("id,show_on_cashier").single();
    return r.error?NextResponse.json({error:r.error.message},{status:400}):NextResponse.json({record:r.data});
  }

  if(b.kind==="best_seller_mode"){
    const mode=d.mode==="manual"?"manual":"auto";
    const r=await x.s.from("sales_settings").upsert({company_id:x.c,best_seller_mode:mode},{onConflict:"company_id"}).select("company_id,best_seller_mode").single();
    return r.error?NextResponse.json({error:r.error.message},{status:400}):NextResponse.json({record:r.data});
  }

  if(b.kind==="best_seller_toggle"){
    const p=await x.s.from("sales_products").select("id,product_type").eq("id",d.id).eq("company_id",x.c).maybeSingle();
    if(!p.data)return NextResponse.json({error:"Invalid product"},{status:400});
    if(["raw_material","sub_recipe"].includes(p.data.product_type))return NextResponse.json({error:"This product type cannot appear on Cashier"},{status:400});
    const r=await x.s.from("sales_products").update({best_seller_manual:!!d.enabled,updated_at:new Date().toISOString()}).eq("id",d.id).eq("company_id",x.c).select("id,best_seller_manual").single();
    return r.error?NextResponse.json({error:r.error.message},{status:400}):NextResponse.json({record:r.data});
  }

  return NextResponse.json({error:"Invalid action"},{status:400});
}
