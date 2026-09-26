import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthorizationContext, hasApp, hasPermission, isKingAdmin, isTenantAdmin } from "@/lib/auth/authorization";

export async function GET(){
 const access=await getAuthorizationContext();
 if(!access)return NextResponse.json({error:"Unauthorized"},{status:401});
 if(!access.profile.company_id)return NextResponse.json({error:"Company required"},{status:400});
 if(!hasApp(access,"app_sell"))return NextResponse.json({error:"Forbidden"},{status:403});
 if(!isKingAdmin(access)&&!isTenantAdmin(access)&&!hasPermission(access,"sales.view")&&!hasPermission(access,"customers.manage"))return NextResponse.json({error:"Forbidden"},{status:403});
 const db=createAdminClient(),companyId=access.profile.company_id;
 const [customers,orders]=await Promise.all([
   db.from("sales_customers").select("id,customer_code,name,phone,email,city,active,created_at").eq("company_id",companyId).order("updated_at",{ascending:false}),
   db.from("sales_orders").select("id,customer_id,total,status,sales_payments(payment_method,amount)").eq("company_id",companyId).in("status",["completed","refunded"]).not("customer_id","is",null)
 ]);
 if(customers.error||orders.error)return NextResponse.json({error:"Could not load customers"},{status:500});
 const stats=new Map<string,any>();
 for(const order of orders.data||[]){if(!order.customer_id)continue;const s=stats.get(order.customer_id)||{orders:0,total:0,cash:0,card:0,credit:0,other:0};const sign=order.status==="refunded"?-1:1;s.orders+=sign;s.total+=sign*Number(order.total||0);for(const p of order.sales_payments||[]){const code=String(p.payment_method||"").toLowerCase(),amount=sign*Number(p.amount||0);if(["cash"].includes(code))s.cash+=amount;else if(["card","visa","mada","apple_pay","applepay","mastercard"].includes(code))s.card+=amount;else if(["credit","on_account","deferred","later","ajal"].includes(code))s.credit+=amount;else s.other+=amount;}stats.set(order.customer_id,s);}
 return NextResponse.json({customers:(customers.data||[]).map(c=>({...c,...(stats.get(c.id)||{orders:0,total:0,cash:0,card:0,credit:0,other:0})}))});
}