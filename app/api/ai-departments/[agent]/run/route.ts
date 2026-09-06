import {createClient} from "@supabase/supabase-js";
import {canAccess,getAuthorizationContext,isKingAdmin} from "@/lib/auth/authorization";

const agents={
  sales:{feature:"ai_sales",manage:"sales.manage",key:"ai_sales"},
  marketing:{feature:"ai_marketing",manage:"marketing.manage",key:"ai_marketing"},
  hr:{feature:"ai_hr",manage:"hr.manage",key:"ai_hr"},
  support:{feature:"ai_support",manage:"support.manage",key:"ai_support"}
} as const;
type Agent=keyof typeof agents;

function db(){const u=process.env.NEXT_PUBLIC_SUPABASE_URL,k=process.env.SUPABASE_SECRET_KEY;if(!u||!k)throw new Error("Missing Supabase configuration");return createClient(u,k)}

async function generate(prompt:string){
  const key=process.env.GEMINI_API_KEY;
  if(!key)throw new Error("Missing Gemini configuration");
  const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(key)}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{temperature:0.4}})});
  if(!r.ok)throw new Error("AI provider request failed");
  const j=await r.json();
  const text=j?.candidates?.[0]?.content?.parts?.map((p:{text?:string})=>p.text||"").join("").trim();
  if(!text)throw new Error("AI provider returned no content");
  return text;
}

export async function POST(request:Request,{params}:{params:Promise<{agent:string}>}){
  try{
    const {agent}=await params;
    if(!(agent in agents))return Response.json({error:"Unknown agent"},{status:404});
    const a=agents[agent as Agent],ctx=await getAuthorizationContext();
    if(!ctx)return Response.json({error:"Unauthorized"},{status:401});
    if(!(isKingAdmin(ctx)||canAccess(ctx,a.feature,a.manage)))return Response.json({error:"Forbidden"},{status:403});
    const companyId=ctx.profile.company_id;
    if(!companyId)return Response.json({error:"Company not configured"},{status:409});
    const body=await request.json();
    const task=String(body.task||body.brief||"").trim().slice(0,12000);
    if(!task)return Response.json({error:"Task is required"},{status:400});
    const s=db();
    const [{data:profile,error:pErr},{data:config,error:cErr}]=await Promise.all([
      s.from("company_ai_profiles").select("industry,business_description,products_services,target_audience,brand_voice,languages,locations,social_notes").eq("company_id",companyId).maybeSingle(),
      s.from("ai_agent_configs").select("enabled,instructions,knowledge_scope,autonomy_mode").eq("company_id",companyId).eq("agent_key",a.key).maybeSingle()
    ]);
    if(pErr||cErr)return Response.json({error:"Failed to load AI configuration"},{status:500});
    if(!config?.enabled)return Response.json({error:"AI department is disabled"},{status:409});
    const runInput={task,channel:body.channel||null,content_type:body.content_type||null,job_id:body.job_id||null,candidate_id:body.candidate_id||null};
    const {data:run,error:runErr}=await s.from("ai_agent_runs").insert({company_id:companyId,agent_key:a.key,status:"running",input:runInput}).select("id").single();
    if(runErr)return Response.json({error:"Failed to start AI run"},{status:500});
    const prompt=`You are the ${a.key} department for exactly one company.\nCOMPANY PROFILE:\n${JSON.stringify(profile||{})}\nAGENT INSTRUCTIONS:\n${config.instructions||""}\nKNOWLEDGE SCOPE:\n${config.knowledge_scope||"Use only this tenant's approved knowledge."}\nUSER TASK:\n${task}\nCHANNEL: ${String(body.channel||"")}\nCONTENT TYPE: ${String(body.content_type||"")}\nStrict rules: never use or infer another tenant's data; never invent prices, offers, customer facts, candidate facts, integrations or capabilities. Follow the configured autonomy mode. For HR, provide assistance/recommendations only and never make a final hiring or rejection decision. For marketing, create a draft and never claim publication unless a separately authorized publishing workflow confirms it. Return only the useful department output.`;
    try{
      const output=await generate(prompt);
      const status=a.key==="ai_marketing"||config.autonomy_mode==="approval"?"approval_required":"completed";
      await s.from("ai_agent_runs").update({status,output:{text:output}}).eq("id",run.id);
      if(a.key==="ai_marketing")await s.from("marketing_content_queue").insert({company_id:companyId,channel:String(body.channel||"general").slice(0,80),content_type:String(body.content_type||"post").slice(0,80),caption:output,status:"draft"});
      return Response.json({ok:true,agent:a.key,status,output,run_id:run.id});
    }catch(e){
      console.error(e);await s.from("ai_agent_runs").update({status:"failed",error_message:"AI generation failed"}).eq("id",run.id);return Response.json({error:"AI generation failed"},{status:502});
    }
  }catch(e){console.error(e);return Response.json({error:"Internal server error"},{status:500})}
}
