import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthorizationContext, isKingAdmin } from "@/lib/auth/authorization";
const ALL=["app_sell","app_accounting","app_stock","app_hr","app_loyalty","app_go","app_intelligence","app_zatca","app_operations","app_manager"];
const PRESETS:Record<string,string[]>={
  pos_only:["app_sell"],
  pos_stock:["app_sell","app_stock"],
  erp:["app_sell","app_stock","app_accounting","app_operations","app_manager"],
  full:["app_sell","app_stock","app_accounting","app_operations","app_manager","app_hr","app_loyalty","app_go","app_intelligence","app_zatca"],
};
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){const access=await getAuthorizationContext();if(!access)return NextResponse.json({error:"Unauthorized"},{status:401});if(!isKingAdmin(access))return NextResponse.json({error:"Forbidden"},{status:403});const {id:companyId}=await params;const body=await request.json().catch(()=>({}));const preset=String(body.preset||"");const on=PRESETS[preset];if(!on)return NextResponse.json({error:"Invalid preset"},{status:400});const db=createAdminClient();const company=await db.from("companies").select("id").eq("id",companyId).maybeSingle();if(company.error)return NextResponse.json({error:company.error.message},{status:500});if(!company.data)return NextResponse.json({error:"Company not found"},{status:404});const fs=await db.from("features").select("id,key").in("key",ALL);if(fs.error)return NextResponse.json({error:fs.error.message},{status:500});const rows=(fs.data||[]).map(f=>({company_id:companyId,feature_id:f.id,enabled:on.includes(f.key),expires_at:null}));if(rows.length){const x=await db.from("company_features").upsert(rows,{onConflict:"company_id,feature_id"});if(x.error)return NextResponse.json({error:x.error.message},{status:500});}return NextResponse.json({ok:true,preset});}
