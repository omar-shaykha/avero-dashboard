import { redirect } from "next/navigation";
import Link from "next/link";
import Sidebar from "@/app/components/Sidebar";
import DashboardHeader from "@/app/components/DashboardHeader";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getAuthorizationContext, canAccess } from "@/lib/auth/authorization";

export const dynamic="force-dynamic";

function K({label,value,sub}:{label:string;value:string|number;sub?:string}){return <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4"><p className="text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</p><p className="mt-2 text-3xl font-black text-white">{value}</p>{sub&&<p className="mt-1 text-xs text-slate-500">{sub}</p>}</div>}

export default async function FoxyCrm(){
 const access=await getAuthorizationContext();if(!access)redirect("/login");
 if(!canAccess(access,"crm","view_crm"))redirect("/");
 const companyId=access.profile.company_id;if(!companyId)redirect("/");
 const s=await createServerClient();
 const today=new Date();today.setHours(0,0,0,0);
 const [{data:content},{data:pubs},{data:runs},{data:connections}]=await Promise.all([
  s.from("marketing_content_queue").select("id,campaign_name,caption,status,platforms,content_type,created_at,published_at,media_url").eq("company_id",companyId).order("created_at",{ascending:false}).limit(60),
  s.from("marketing_post_publications").select("*").eq("company_id",companyId).order("published_at",{ascending:false}).limit(150),
  s.from("ai_agent_runs").select("id,action,status,created_at,completed_at,error_message").eq("company_id",companyId).eq("agent_key","ai_marketing").gte("created_at",today.toISOString()).order("created_at",{ascending:false}).limit(100),
  s.from("company_social_connections").select("platform,connection_status,health_status,last_sync_at").eq("company_id",companyId).in("platform",["facebook","instagram"])
 ]);
 const rows=content||[], publications=pubs||[];
 const byContent=new Map<string,any[]>(); for(const p of publications){const a=byContent.get(p.content_id)||[];a.push(p);byContent.set(p.content_id,a)}
 const todayRows=rows.filter((x:any)=>new Date(x.created_at)>=today);
 const publishedToday=rows.filter((x:any)=>x.published_at&&new Date(x.published_at)>=today);
 const totals=publications.reduce((a:any,p:any)=>({views:a.views+Number(p.views||0),reach:a.reach+Number(p.reach||0),comments:a.comments+Number(p.comments||0),likes:a.likes+Number(p.likes||0),messages:a.messages+Number(p.messages||0),shares:a.shares+Number(p.shares||0)}),{views:0,reach:0,comments:0,likes:0,messages:0,shares:0});
 return <div className="min-h-screen bg-slate-950 text-white"><Sidebar access={access}/><div className="ml-64 min-h-screen"><DashboardHeader userEmail={access.user.email||""}/><main className="p-6"><div className="mx-auto max-w-[1500px] space-y-6">
  <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.28em] text-fuchsia-300">FOXY · MARKETING CRM</p><h1 className="mt-2 text-4xl font-black">Marketing Command Center</h1><p className="mt-2 text-sm text-slate-400">What Foxy worked on today, what was published, and performance by post.</p></div><div className="flex gap-2"><Link href="/ai-marketing" className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-black text-fuchsia-300">Open Foxy</Link><Link href="/crm" className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-black text-cyan-300">← Office</Link></div></div>
  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6"><K label="Worked Today" value={runs?.length||0}/><K label="Content Today" value={todayRows.length}/><K label="Published Today" value={publishedToday.length}/><K label="Views" value={totals.views}/><K label="Comments" value={totals.comments}/><K label="Messages" value={totals.messages}/></div>
  <div className="grid gap-5 xl:grid-cols-[1.4fr_.6fr]">
   <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-xl font-black">Post Performance</h2><p className="text-xs text-slate-500">Facebook + Instagram publication tracking</p></div><span className="text-xs text-slate-500">{publications.filter((p:any)=>p.last_synced_at).length}/{publications.length} synced</span></div>
    <div className="space-y-3">{rows.filter((x:any)=>x.status==="published").slice(0,20).map((post:any)=>{const pp=byContent.get(post.id)||[];const t=pp.reduce((a:any,p:any)=>({views:a.views+Number(p.views||0),comments:a.comments+Number(p.comments||0),likes:a.likes+Number(p.likes||0),messages:a.messages+Number(p.messages||0),shares:a.shares+Number(p.shares||0)}),{views:0,comments:0,likes:0,messages:0,shares:0});return <div key={post.id} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="max-w-2xl"><h3 className="font-black">{post.campaign_name}</h3><p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{post.caption}</p><p className="mt-2 text-[10px] uppercase tracking-wider text-slate-600">{(post.platforms||[]).join(" · ")} · {post.published_at?new Date(post.published_at).toLocaleString():""}</p></div>{post.media_url&&<img src={post.media_url} alt="" className="h-20 w-20 rounded-xl object-cover"/>}</div><div className="mt-4 grid grid-cols-5 gap-2">{[["Views",t.views],["Likes",t.likes],["Comments",t.comments],["Shares",t.shares],["Messages",t.messages]].map(([l,v]:any)=><div key={l} className="rounded-xl bg-slate-900 p-2 text-center"><div className="text-lg font-black">{v}</div><div className="text-[9px] uppercase text-slate-500">{l}</div></div>)}</div>{pp.length===0?<p className="mt-3 text-xs text-amber-300">Publication ID not captured for this post.</p>:pp.some((p:any)=>!p.last_synced_at)?<p className="mt-3 text-xs text-amber-300">Published ID captured. Performance sync is waiting for social-insights sync.</p>:null}</div>})}</div>
   </section>
   <section className="space-y-5">
    <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5"><h2 className="text-xl font-black">Today’s Work</h2><div className="mt-4 space-y-2">{(runs||[]).slice(0,18).map((r:any)=><div key={r.id} className="rounded-xl border border-slate-800 bg-slate-950 p-3"><div className="flex justify-between gap-2"><b className="text-xs">{r.action.replaceAll("_"," ")}</b><span className={String(r.status).startsWith("completed")?"text-xs text-emerald-300":"text-xs text-amber-300"}>{r.status}</span></div><p className="mt-1 text-[10px] text-slate-600">{new Date(r.created_at).toLocaleTimeString()}</p></div>)}</div></div>
    <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5"><h2 className="text-xl font-black">Channels</h2><div className="mt-4 space-y-2">{(connections||[]).map((c:any)=><div key={c.platform} className="flex items-center justify-between rounded-xl bg-slate-950 p-3"><span className="font-bold capitalize">{c.platform}</span><span className={c.connection_status==="connected"?"text-xs font-black text-emerald-300":"text-xs font-black text-rose-300"}>{c.connection_status}</span></div>)}</div><p className="mt-4 text-xs leading-5 text-slate-500">Views/comments/messages are shown from synced social metrics. Publishing IDs are now stored automatically for every new Facebook/Instagram post.</p></div>
   </section>
  </div>
 </div></main></div></div>
}
