import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthorizationContext } from "@/lib/auth/authorization";

export async function POST(){
  const access=await getAuthorizationContext();
  if(!access)return NextResponse.json({error:"Unauthorized"},{status:401});
  const companyId=access.profile.company_id;
  const now=new Date().toISOString();
  const {error}=await createAdminClient().from("user_presence").upsert({
    user_id:access.user.id,company_id:companyId,last_seen_at:now,updated_at:now
  },{onConflict:"user_id"});
  if(error){console.error("Presence heartbeat error",error);return NextResponse.json({error:"Presence unavailable"},{status:500});}
  return NextResponse.json({ok:true});
}
