import { getAuthorizationContext, isKingAdmin } from "@/lib/auth/authorization";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(){
 const access=await getAuthorizationContext();
 if(!access)return Response.json({error:"Unauthorized"},{status:401});
 if(!isKingAdmin(access))return Response.json({error:"Forbidden"},{status:403});
 const db=createAdminClient();
 const publishedAt=new Date().toISOString();
 const {error}=await db.from("platform_settings").upsert({key:"client_release",value:{published_at:publishedAt,published_by:access.user.id}},{onConflict:"key"});
 if(error)return Response.json({error:error.message},{status:500});
 return Response.json({ok:true,published_at:publishedAt});
}