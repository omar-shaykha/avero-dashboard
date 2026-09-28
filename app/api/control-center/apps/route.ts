import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthorizationContext, isKingAdmin } from "@/lib/auth/authorization";

const APP_KEYS=["app_sell","app_accounting","app_hr","app_loyalty","app_intelligence","app_zatca"] as const;

export async function GET(){
  const access=await getAuthorizationContext();
  if(!access)return Response.json({error:"Unauthorized"},{status:401});
  if(!isKingAdmin(access))return Response.json({error:"Forbidden"},{status:403});
  const db=createAdminClient();
  const [companies,features,entitlements]=await Promise.all([
    db.from("companies").select("id,name,status,created_at").order("name"),
    db.from("features").select("id,key,name").in("key",[...APP_KEYS]),
    db.from("company_features").select("company_id,feature_id,enabled,expires_at").eq("enabled",true),
  ]);
  const error=companies.error||features.error||entitlements.error;
  if(error)return Response.json({error:error.message},{status:500});
  const featureById=new Map((features.data||[]).map(f=>[f.id,f.key]));
  const subscribers:Record<string,string[]>={};
  APP_KEYS.forEach(k=>subscribers[k]=[]);
  const now=Date.now();
  for(const row of entitlements.data||[]){
    const key=featureById.get(row.feature_id);
    if(key&&APP_KEYS.includes(key as typeof APP_KEYS[number])&&(!row.expires_at||new Date(row.expires_at).getTime()>now))subscribers[key].push(row.company_id);
  }
  return Response.json({companies:companies.data||[],subscribers});
}
