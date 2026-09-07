// @ts-nocheck
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthorizationContext } from "@/lib/auth/authorization";
const db=()=>createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SECRET_KEY!,{auth:{persistSession:false}});
async function context(){const a=await getAuthorizationContext();return a?.profile?.company_id?{a,companyId:a.profile.company_id,s:db()}:null}
export async function GET(){const c=await context();if(!c)return NextResponse.json({error:"Unauthorized"},{status:401});const [{data:items},{data:warehouses},{data:units},{data:balances},{data:batches},{data:movements}]=await Promise.all([
 c.s.from("inventory_items").select("*").eq("company_id",c.companyId).order("created_at",{ascending:false}),
 c.s.from("inventory_warehouses").select("*").eq("company_id",c.companyId).order("name"),
 c.s.from("inventory_units").select("*").eq("company_id",c.companyId).order("name"),
 c.s.from("inventory_stock_balances").select("*").eq("company_id",c.companyId),
 c.s.from("inventory_batches").select("*").eq("company_id",c.companyId).order("expiry_date",{ascending:true}),
 c.s.from("inventory_stock_movements").select("*").eq("company_id",c.companyId).order("movement_date",{ascending:false}).limit(100)
]);
 const today=new Date();const soon=new Date(Date.now()+30*86400000);const expiring=(batches||[]).filter((b:any)=>b.expiry_date&&new Date(b.expiry_date)>=today&&new Date(b.expiry_date)<=soon).length;const totalValue=(balances||[]).reduce((a:number,b:any)=>a+Number(b.qty_on_hand||0)*Number(b.average_cost||0),0);const low=(items||[]).filter((i:any)=>{const q=(balances||[]).filter((b:any)=>b.item_id===i.id).reduce((a:number,b:any)=>a+Number(b.qty_on_hand||0),0);return q<=Number(i.reorder_point||0)}).length;
 return NextResponse.json({items:items||[],warehouses:warehouses||[],units:units||[],balances:balances||[],batches:batches||[],movements:movements||[],summary:{items:(items||[]).length,warehouses:(warehouses||[]).length,total_value:totalValue,low_stock:low,expiring_30d:expiring}})}
export async function POST(req:Request){const c=await context();if(!c)return NextResponse.json({error:"Unauthorized"},{status:401});const b=await req.json();const kind=b.kind;const data=b.data||{};if(kind==="unit"){if(!data.code||!data.name)return NextResponse.json({error:"Unit code and name required"},{status:400});const {data:r,error}=await c.s.from("inventory_units").insert({...data,company_id:c.companyId}).select("*").single();if(error)return NextResponse.json({error:error.message},{status:500});return NextResponse.json({record:r})}
 if(kind==="warehouse"){if(!data.name)return NextResponse.json({error:"Warehouse name required"},{status:400});const code=data.code||`WH-${Date.now().toString().slice(-5)}`;const {data:r,error}=await c.s.from("inventory_warehouses").insert({...data,code,company_id:c.companyId}).select("*").single();if(error)return NextResponse.json({error:error.message},{status:500});return NextResponse.json({record:r})}
 if(kind==="item"){if(!data.name)return NextResponse.json({error:"Item name required"},{status:400});const sku=data.sku||`ITM-${Date.now().toString().slice(-7)}`;const payload={...data,sku,company_id:c.companyId,created_by:c.a.user?.id,updated_by:c.a.user?.id};const {data:r,error}=await c.s.from("inventory_items").insert(payload).select("*").single();if(error)return NextResponse.json({error:error.message},{status:500});return NextResponse.json({record:r})}
 return NextResponse.json({error:"Invalid inventory action"},{status:400})}
