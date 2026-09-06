import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthorizationContext, isKingAdmin } from "@/lib/auth/authorization";

function admin(){return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SECRET_KEY!);}

export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){
  const access=await getAuthorizationContext();
  if(!access)return NextResponse.json({error:"Unauthorized"},{status:401});
  if(!isKingAdmin(access))return NextResponse.json({error:"Forbidden"},{status:403});
  const {id}=await params; const db=admin();
  const [company,profiles,permissions,subscription,receipts]=await Promise.all([
    db.from("companies").select("id,name,created_at,whatsapp_phone_number_id").eq("id",id).maybeSingle(),
    db.from("user_profiles").select("user_id,role,first_name,last_name,full_name,job_title,created_at").eq("company_id",id).order("created_at"),
    db.from("permissions").select("id,key,name,description").order("key"),
    db.from("subscriptions").select("id,status,started_at,current_period_start,current_period_end,amount,currency,auto_renew,plan_id,subscription_plans(name,key,billing_period)").eq("company_id",id).order("created_at",{ascending:false}).limit(1).maybeSingle(),
    db.from("subscription_receipts").select("id,receipt_number,issued_at,total_amount,currency,payment_status,period_start,period_end").eq("company_id",id).order("issued_at",{ascending:false}).limit(10)
  ]);
  if(company.error||profiles.error||permissions.error||subscription.error||receipts.error)return NextResponse.json({error:"Could not load client overview"},{status:500});
  if(!company.data)return NextResponse.json({error:"Company not found"},{status:404});
  const users=[] as any[];
  for(const profile of profiles.data||[]){
    const [{data:auth},{data:overrides}]=await Promise.all([
      db.auth.admin.getUserById(profile.user_id),
      db.from("user_permission_overrides").select("permission_id,allowed").eq("user_id",profile.user_id).eq("company_id",id)
    ]);
    users.push({...profile,email:auth?.user?.email||null,permission_overrides:overrides||[]});
  }
  return NextResponse.json({company:company.data,users,permissions:permissions.data||[],subscription:subscription.data||null,receipts:receipts.data||[]});
}
