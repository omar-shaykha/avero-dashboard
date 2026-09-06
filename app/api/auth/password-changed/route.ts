import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

export async function POST(){
  try{
    const auth=await createServerClient();
    const{data:{user}}=await auth.auth.getUser();
    if(!user)return Response.json({error:"Unauthorized"},{status:401});
    const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY;
    if(!url||!key)return Response.json({error:"Missing Supabase configuration"},{status:500});
    const admin=createAdminClient(url,key);
    const{data:profile,error:profileError}=await admin.from("user_profiles").select("role").eq("user_id",user.id).maybeSingle();
    if(profileError)return Response.json({error:"Could not verify profile"},{status:500});
    if(!profile)return Response.json({error:"Profile not configured"},{status:409});
    if(profile.role==="king_admin")return Response.json({ok:true,skipped:true});
    const{error}=await admin.from("user_profiles").update({must_change_password:false,updated_at:new Date().toISOString()}).eq("user_id",user.id).neq("role","king_admin");
    if(error)return Response.json({error:"Could not complete password change"},{status:500});
    return Response.json({ok:true});
  }catch(error){console.error("Password changed API error:",error);return Response.json({error:"Internal server error"},{status:500})}
}
