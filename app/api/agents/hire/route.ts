import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthorizationContext, isKingAdmin, isTenantAdmin } from "@/lib/auth/authorization";

const HIREABLE=new Set(["ai_hr","ai_support","ai_inventory","ai_warehouse","ai_customer_care","ai_analytics"]);

export async function POST(req:Request){
 const access=await getAuthorizationContext();
 if(!access)return NextResponse.json({error:"Unauthorized"},{status:401});
 if(!(isKingAdmin(access)||isTenantAdmin(access)))return NextResponse.json({error:"Admin access required"},{status:403});
 const companyId=access.profile.company_id;if(!companyId)return NextResponse.json({error:"Company not configured"},{status:409});
 const body=await req.json().catch(()=>({}));const agentKey=String(body.agent_key||"");
 if(!HIREABLE.has(agentKey))return NextResponse.json({error:"Invalid AI employee"},{status:400});
 const s=createAdminClient();
 const {data:feature}=await s.from("features").select("id,key").eq("key",agentKey).maybeSingle();
 if(!feature)return NextResponse.json({error:"Feature is not configured"},{status:409});
 const {data:entitlement}=await s.from("subscription_items")
   .select("id,status,starts_at,ends_at,subscriptions!inner(company_id,status)")
   .eq("feature_id",feature.id)
   .eq("subscriptions.company_id",companyId)
   .eq("status","active")
   .limit(1).maybeSingle();
 const now=Date.now();
 const valid=!!entitlement && (!entitlement.starts_at||new Date(entitlement.starts_at).getTime()<=now) && (!entitlement.ends_at||new Date(entitlement.ends_at).getTime()>now);
 if(!valid)return NextResponse.json({error:"Payment required before this AI employee can be activated",code:"PAYMENT_REQUIRED"},{status:402});
 await s.from("company_features").upsert({company_id:companyId,feature_id:feature.id,enabled:true,activated_at:new Date().toISOString()},{onConflict:"company_id,feature_id"});
 await s.from("ai_agent_configs").upsert({company_id:companyId,agent_key:agentKey,enabled:true,autonomy_mode:"approval",updated_at:new Date().toISOString()},{onConflict:"company_id,agent_key"});
 return NextResponse.json({ok:true,agent_key:agentKey,status:"activated"});
}
