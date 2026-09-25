import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canAccess, getAuthorizationContext, isKingAdmin } from "@/lib/auth/authorization";
import { generateDailyContent } from "@/app/api/marketing/daily-content/route";

const GRAPH_VERSION=process.env.META_GRAPH_VERSION||"v24.0";
const DAY=24*60*60*1000;

function metricValue(data:any[],name:string){
 const row=(data||[]).find((x:any)=>x?.name===name);
 const v=row?.values?.[0]?.value ?? row?.value;
 return Number.isFinite(Number(v))?Number(v):null;
}

async function graphGet(path:string,token:string,params:Record<string,string>={}){
 const u=new URL("https://graph.facebook.com/"+GRAPH_VERSION+"/"+path.replace(/^\/+/,""));
 for(const [k,v] of Object.entries(params))u.searchParams.set(k,v);
 u.searchParams.set("access_token",token);
 const r=await fetch(u,{cache:"no-store",signal:AbortSignal.timeout(30000)});
 const j=await r.json().catch(()=>({}));
 if(!r.ok)throw new Error(j?.error?.message||("Meta Graph "+r.status));
 return j;
}

async function tokenFor(s:any,companyId:string,platform:string){
 const r=await s.rpc("marketing_get_social_token",{p_company_id:companyId,p_platform:platform});
 return typeof r.data==="string"&&r.data.trim()?r.data.trim():null;
}

async function syncInstagram(s:any,row:any,token:string){
 const media=await graphGet(encodeURIComponent(row.external_post_id),token,{fields:"id,permalink,like_count,comments_count,media_type"});
 let insights:any={data:[]};
 try{
  insights=await graphGet(encodeURIComponent(row.external_post_id)+"/insights",token,{metric:"views,reach,saved,total_interactions"});
 }catch{
  try{insights=await graphGet(encodeURIComponent(row.external_post_id)+"/insights",token,{metric:"impressions,reach,saved,engagement"});}catch{}
 }
 const views=metricValue(insights.data,"views")??metricValue(insights.data,"impressions")??row.views??0;
 const reach=metricValue(insights.data,"reach")??row.reach??0;
 const saves=metricValue(insights.data,"saved")??row.saves??0;
 const likes=Number(media.like_count||0),comments=Number(media.comments_count||0);
 const engagement=metricValue(insights.data,"total_interactions")??metricValue(insights.data,"engagement")??(likes+comments+saves+Number(row.shares||0));
 await s.from("marketing_post_publications").update({
  permalink:media.permalink||row.permalink||null,views,reach,likes,comments,saves,engagement,
  last_synced_at:new Date().toISOString(),updated_at:new Date().toISOString(),
  metrics:{...(row.metrics||{}),provider:"meta_graph",platform:"instagram",media_type:media.media_type||null,insights_synced:true}
 }).eq("id",row.id).eq("company_id",row.company_id);
}

async function syncFacebook(s:any,row:any,token:string){
 const post=await graphGet(encodeURIComponent(row.external_post_id),token,{
  fields:"id,permalink_url,shares,reactions.limit(0).summary(true),comments.limit(0).summary(true)"
 });
 let insights:any={data:[]};
 try{
  insights=await graphGet(encodeURIComponent(row.external_post_id)+"/insights",token,{metric:"post_impressions,post_impressions_unique,post_engaged_users"});
 }catch{}
 const views=metricValue(insights.data,"post_impressions")??row.views??0;
 const reach=metricValue(insights.data,"post_impressions_unique")??row.reach??0;
 const likes=Number(post?.reactions?.summary?.total_count||0);
 const comments=Number(post?.comments?.summary?.total_count||0);
 const shares=Number(post?.shares?.count||0);
 const engagement=metricValue(insights.data,"post_engaged_users")??(likes+comments+shares);
 await s.from("marketing_post_publications").update({
  permalink:post.permalink_url||row.permalink||null,views,reach,likes,comments,shares,engagement,
  last_synced_at:new Date().toISOString(),updated_at:new Date().toISOString(),
  metrics:{...(row.metrics||{}),provider:"meta_graph",platform:"facebook",insights_synced:true}
 }).eq("id",row.id).eq("company_id",row.company_id);
}

async function syncCompany(companyId:string){
 const s=createAdminClient();
 const [{data:rows},{data:connections}]=await Promise.all([
  s.from("marketing_post_publications").select("*").eq("company_id",companyId).gte("published_at",new Date(Date.now()-90*DAY).toISOString()).order("published_at",{ascending:false}).limit(250),
  s.from("company_social_connections").select("platform,direct_publishing_enabled").eq("company_id",companyId).in("platform",["facebook","instagram"])
 ]);
 const enabled=new Set((connections||[]).filter((x:any)=>x.direct_publishing_enabled).map((x:any)=>x.platform));
 const fb=enabled.has("facebook")?await tokenFor(s,companyId,"facebook"):null;
 const ig=enabled.has("instagram")?(await tokenFor(s,companyId,"instagram"))||fb:null;
 let synced=0,failed=0;
 for(const row of rows||[]){
  try{
   if(row.platform==="instagram"&&ig){await syncInstagram(s,row,ig);synced++;}
   else if(row.platform==="facebook"&&fb){await syncFacebook(s,row,fb);synced++;}
  }catch(error){
   failed++;
   await s.from("marketing_post_publications").update({
    metrics:{...(row.metrics||{}),provider:"meta_graph",sync_error:error instanceof Error?error.message:"sync failed"},
    updated_at:new Date().toISOString()
   }).eq("id",row.id).eq("company_id",companyId);
  }
 }
 await s.from("company_social_connections").update({last_sync_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("company_id",companyId).in("platform",["facebook","instagram"]).eq("direct_publishing_enabled",true);
 return {synced,failed,facebook_connected:!!fb,instagram_connected:!!ig};
}

export async function POST(){
 const ctx=await getAuthorizationContext();
 if(!ctx)return Response.json({error:"Unauthorized"},{status:401});
 if(!(isKingAdmin(ctx)||canAccess(ctx,"ai_marketing","marketing.manage")))return Response.json({error:"Forbidden"},{status:403});
 const companyId=ctx.profile.company_id;if(!companyId)return Response.json({error:"Company not configured"},{status:409});
 const result=await syncCompany(companyId);
 if(!result.facebook_connected&&!result.instagram_connected)return Response.json({error:"Connect Meta Direct first to sync views and reach.",code:"META_DIRECT_REQUIRED",...result},{status:409});
 return Response.json({ok:true,...result});
}

export async function GET(req:NextRequest){
 const secret=process.env.CRON_SECRET;
 const bearer=(req.headers.get("authorization")||"").replace(/^Bearer\s+/i,"").trim();
 const ua=(req.headers.get("user-agent")||"").toLowerCase();
 const schedule=req.headers.get("x-vercel-cron-schedule")||"";
 const authorized=(secret&&bearer===secret)||(ua.includes("vercel-cron/1.0")&&schedule==="0 6 * * *");
 if(!authorized)return Response.json({error:"Unauthorized"},{status:401});
 // Reuse the same India-backed daily generator before syncing social metrics.
 // This internal call follows the authorization check above.
 const dailyResponse=await generateDailyContent();
 const daily=await dailyResponse.json();
 const s=createAdminClient();
 const {data}=await s.from("company_social_connections").select("company_id").eq("direct_publishing_enabled",true).in("platform",["facebook","instagram"]);
 const ids=[...new Set((data||[]).map((x:any)=>x.company_id).filter(Boolean))];
 const results=[] as any[];
 for(const id of ids){results.push({company_id:id,...await syncCompany(String(id))});}
 return Response.json({ok:dailyResponse.ok,foxy_daily:daily,companies:results.length,results},{status:dailyResponse.ok?200:500});
}
