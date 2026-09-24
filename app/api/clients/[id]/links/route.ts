import { getAuthorizationContext, isKingAdmin } from "@/lib/auth/authorization";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){
  const access=await getAuthorizationContext();
  if(!access)return Response.json({error:"Unauthorized"},{status:401});
  if(!isKingAdmin(access))return Response.json({error:"Forbidden"},{status:403});
  const {id}=await params;
  const db=createAdminClient();
  const [company,store]=await Promise.all([
    db.from("companies").select("id").eq("id",id).maybeSingle(),
    db.from("go_stores").select("slug,enabled").eq("company_id",id).maybeSingle(),
  ]);
  if(company.error||store.error)return Response.json({error:"Unable to load links"},{status:500});
  if(!company.data)return Response.json({error:"Client not found"},{status:404});
  return Response.json({slug:store.data?.slug||null,menu_enabled:Boolean(store.data?.enabled)},{headers:{"Cache-Control":"no-store"}});
}
