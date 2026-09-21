import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthorizationContext, isKingAdmin, isTenantAdmin, hasPermission } from "@/lib/auth/authorization";

const AGENTS = [
  ["ai_sales","Leo","Sales"],
  ["ai_marketing","Foxy","Marketing"],
  ["ai_hr","Aero","HR & Booking"],
  ["ai_support","Gor","Support"],
  ["ai_inventory","Vexa","Inventory"],
  ["ai_warehouse","Bruno","Warehouse"],
  ["ai_customer_care","Rex","Customer Care"],
  ["ai_analytics","Nova","Analytics"],
] as const;

function allowed(a:any){return isKingAdmin(a)||isTenantAdmin(a)||hasPermission(a,"crm.view")||hasPermission(a,"analytics.view");}
async function count(s:any,table:string,companyId:string){const r=await s.from(table).select("*",{count:"exact",head:true}).eq("company_id",companyId);return r.count||0;}

export async function GET(req:Request){
  const a=await getAuthorizationContext(); if(!a)return NextResponse.json({error:"Unauthorized"},{status:401});
  if(!allowed(a))return NextResponse.json({error:"Forbidden"},{status:403});
  const companyId=a.profile.company_id; if(!companyId)return NextResponse.json({error:"Company not configured"},{status:409});
  const s=createAdminClient(), wanted=new URL(req.url).searchParams.get("agent");
  const keys=wanted?AGENTS.filter(x=>x[0]===wanted):AGENTS;
  const [{data:items},{data:runs},{data:configs}]=await Promise.all([
    s.from("ai_agent_crm_items").select("*").eq("company_id",companyId).order("updated_at",{ascending:false}).limit(300),
    s.from("ai_agent_runs").select("id,agent_key,action,status,created_at,completed_at,error_message").eq("company_id",companyId).order("created_at",{ascending:false}).limit(500),
    s.from("ai_agent_configs").select("agent_key,enabled,autonomy_mode").eq("company_id",companyId)
  ]);

  const [leadRows,marketingRows,hrCandidates,hrJobs,attendance,inventoryItems,stockMoves,customers,conversations]=await Promise.all([
    s.from("leads").select("status,estimated_value,next_follow_up_at,probability").eq("company_id",companyId),
    s.from("marketing_content_queue").select("status,created_at").eq("company_id",companyId),
    count(s,"hr_candidates",companyId),
    count(s,"hr_jobs",companyId),
    count(s,"attendance_logs",companyId),
    count(s,"inventory_items",companyId),
    count(s,"inventory_stock_movements",companyId),
    count(s,"customers",companyId),
    count(s,"conversations",companyId),
  ]);

  const leads=leadRows.data||[], marketing=marketingRows.data||[];
  const now=Date.now();
  const domain:any={
    ai_sales:{total_leads:leads.length,open:leads.filter((x:any)=>!["won","lost"].includes(x.status)).length,won:leads.filter((x:any)=>x.status==="won").length,lost:leads.filter((x:any)=>x.status==="lost").length,pipeline_value:leads.filter((x:any)=>!["won","lost"].includes(x.status)).reduce((n:number,x:any)=>n+Number(x.estimated_value||0),0),followups_due:leads.filter((x:any)=>x.next_follow_up_at&&new Date(x.next_follow_up_at).getTime()<=now&&!["won","lost"].includes(x.status)).length},
    ai_marketing:{content:marketing.length,published:marketing.filter((x:any)=>x.status==="published").length,failed:marketing.filter((x:any)=>x.status==="failed").length,scheduled:marketing.filter((x:any)=>["scheduled","approved"].includes(x.status)).length},
    ai_hr:{jobs:hrJobs,candidates:hrCandidates,attendance_records:attendance},
    ai_inventory:{items:inventoryItems,stock_movements:stockMoves},
    ai_warehouse:{stock_movements:stockMoves,inventory_items:inventoryItems},
    ai_customer_care:{customers,conversations},
    ai_support:{customers,conversations},
    ai_analytics:{tracked_records:leads.length+marketing.length+stockMoves},
  };

  const cfg=new Map((configs||[]).map((x:any)=>[x.agent_key,x]));
  const allRuns=runs||[], allItems=items||[];
  const agents=keys.map(([key,name,department])=>{
    const rr=allRuns.filter((x:any)=>x.agent_key===key), ii=allItems.filter((x:any)=>x.agent_key===key);
    const completed=rr.filter((x:any)=>String(x.status).startsWith("completed")).length;
    const failed=rr.filter((x:any)=>x.status==="failed").length;
    return {key,name,department,enabled:cfg.get(key)?.enabled??false,autonomy_mode:cfg.get(key)?.autonomy_mode||"approval",
      kpis:{runs:rr.length,completed,failed,success_rate:rr.length?Math.round(completed/rr.length*100):0,open_items:ii.filter((x:any)=>!["done","cancelled"].includes(x.status)).length,urgent:ii.filter((x:any)=>x.priority==="urgent"&&!["done","cancelled"].includes(x.status)).length,value:ii.reduce((n:number,x:any)=>n+Number(x.value||0),0),...domain[key]},
      items:ii,recent_runs:rr.slice(0,20)};
  });
  return NextResponse.json({agents,generated_at:new Date().toISOString()});
}

export async function POST(req:Request){
  const a=await getAuthorizationContext(); if(!a)return NextResponse.json({error:"Unauthorized"},{status:401});
  if(!allowed(a))return NextResponse.json({error:"Forbidden"},{status:403});
  const companyId=a.profile.company_id; if(!companyId)return NextResponse.json({error:"Company not configured"},{status:409});
  const s=createAdminClient(), b=await req.json();
  if(b.action==="create"){
    if(!AGENTS.some(x=>x[0]===b.agent_key)||!String(b.title||"").trim())return NextResponse.json({error:"Invalid CRM item"},{status:400});
    const {data,error}=await s.from("ai_agent_crm_items").insert({company_id:companyId,agent_key:b.agent_key,record_type:b.record_type||"task",title:String(b.title).trim(),status:b.status||"open",priority:b.priority||"medium",value:Number(b.value||0),due_at:b.due_at||null,summary:b.summary||null,metadata:b.metadata||{}}).select().single();
    return error?NextResponse.json({error:error.message},{status:400}):NextResponse.json({item:data});
  }
  if(b.action==="update"){
    const patch:any={updated_at:new Date().toISOString()};
    for(const k of ["title","status","priority","record_type","due_at","summary","value","score","metadata"])if(k in b)patch[k]=b[k];
    const {data,error}=await s.from("ai_agent_crm_items").update(patch).eq("id",b.id).eq("company_id",companyId).select().maybeSingle();
    return error?NextResponse.json({error:error.message},{status:400}):NextResponse.json({item:data});
  }
  return NextResponse.json({error:"Invalid action"},{status:400});
}
