// @ts-nocheck
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthorizationContext,isKingAdmin,isTenantAdmin,hasPermission } from "@/lib/auth/authorization";

const db=()=>createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SECRET_KEY!,{auth:{persistSession:false}});
const can=(a:any,p:string)=>isKingAdmin(a)||isTenantAdmin(a)||hasPermission(a,p);
async function C(){const a=await getAuthorizationContext();return a?.profile?.company_id?{a,c:a.profile.company_id,s:db()}:null;}

export async function GET(){
  const x=await C();if(!x)return NextResponse.json({error:"Unauthorized"},{status:401});
  if(!can(x.a,"sales.view")&&!can(x.a,"sales.cashier"))return NextResponse.json({error:"Forbidden"},{status:403});
  const [payments,tables,me,settings,manual,best]=await Promise.all([
    x.s.from("sales_payment_methods").select("id,code,name,adjustment_percent,adjustment_type,sort_order").eq("company_id",x.c).eq("active",true).order("sort_order"),
    x.s.from("sales_dining_tables").select("id,name,area,seats,status,sort_order").eq("company_id",x.c).order("sort_order"),
    x.s.from("user_profiles").select("full_name,username,nickname").eq("user_id",x.a.user.id).eq("company_id",x.c).maybeSingle(),
    x.s.from("sales_settings").select("best_seller_mode").eq("company_id",x.c).maybeSingle(),
    x.s.from("sales_products").select("id").eq("company_id",x.c).eq("active",true).eq("show_on_cashier",true).eq("best_seller_manual",true).not("product_type","in",'(\"raw_material\",\"sub_recipe\")'),
    x.s.rpc("sales_best_sellers",{p_company_id:x.c,p_limit:24})
  ]);
  const firstError=[payments,tables,me,settings,manual,best].map((r:any)=>r.error).find(Boolean);
  if(firstError)return NextResponse.json({error:firstError.message},{status:400});
  const mode=settings.data?.best_seller_mode==="manual"?"manual":"auto";
  const bestSellers=mode==="manual"
    ?(manual.data||[]).map((z:any)=>({product_id:z.id,qty:null}))
    :(best.data||[]).map((z:any)=>({product_id:z.product_id,qty:Number(z.qty||0)}));
  return NextResponse.json({
    payment_methods:payments.data||[],
    tables:tables.data||[],
    cashier_name:me.data?.full_name||me.data?.username||me.data?.nickname||"Cashier",
    best_seller_mode:mode,
    best_sellers:bestSellers
  });
}

export async function POST(req:Request){
  const x=await C();if(!x)return NextResponse.json({error:"Unauthorized"},{status:401});
  if(!can(x.a,"sales.cashier")&&!can(x.a,"sales.manage"))return NextResponse.json({error:"Forbidden"},{status:403});
  const b=await req.json(),d=b.data||{};

  if(b.kind==="tracking"){
    const allowed=["new","preparing","ready","delivered","completed","cancelled"];
    if(!allowed.includes(d.status))return NextResponse.json({error:"Invalid status"},{status:400});
    const r=await x.s.from("sales_orders").update({tracking_status:d.status}).eq("id",d.order_id).eq("company_id",x.c).select("id,tracking_status").single();
    return r.error?NextResponse.json({error:r.error.message},{status:400}):NextResponse.json({record:r.data});
  }

  if(b.kind==="table_status"){
    const allowed=["open","closed","occupied"];
    if(!allowed.includes(d.status))return NextResponse.json({error:"Invalid table status"},{status:400});
    const r=await x.s.from("sales_dining_tables").update({status:d.status,updated_at:new Date().toISOString()}).eq("id",d.table_id).eq("company_id",x.c).select("id,status").single();
    return r.error?NextResponse.json({error:r.error.message},{status:400}):NextResponse.json({record:r.data});
  }

  if(b.kind==="attach_order"){
    const tableId=d.table_id||null;
    if(tableId){
      const t=await x.s.from("sales_dining_tables").select("id").eq("id",tableId).eq("company_id",x.c).maybeSingle();
      if(!t.data)return NextResponse.json({error:"Invalid table"},{status:400});
    }
    const r=await x.s.from("sales_orders").update({dining_table_id:tableId,table_no:d.table_name||null,tracking_status:d.tracking_status||"new"}).eq("id",d.order_id).eq("company_id",x.c).select("id").single();
    if(r.error)return NextResponse.json({error:r.error.message},{status:400});
    if(tableId)await x.s.from("sales_dining_tables").update({status:"open",current_order_id:null,updated_at:new Date().toISOString()}).eq("id",tableId).eq("company_id",x.c);
    return NextResponse.json({record:r.data});
  }

  return NextResponse.json({error:"Invalid action"},{status:400});
}
