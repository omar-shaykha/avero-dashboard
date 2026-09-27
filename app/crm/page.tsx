import Link from "next/link";
import { redirect } from "next/navigation";
import Sidebar from "@/app/components/Sidebar";
import DashboardHeader from "@/app/components/DashboardHeader";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getAuthorizationContext, canAccess } from "@/lib/auth/authorization";
import AgentAvatar from "@/app/components/AgentAvatar";

export const dynamic="force-dynamic";

function Desk({name,role,avatar,href,badge,kpi}:{name:string;role:string;avatar:"zayn"|"naya"|"eli";href:string;badge:string;kpi:string}){
 return <Link href={href} className="group relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/60 p-5 transition hover:-translate-y-0.5 hover:border-cyan-400/25 hover:shadow-2xl">
  
  <div className="relative z-10 flex items-start justify-between"><div><span className="rounded-full border border-emerald-400/15 bg-emerald-400/5 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wider text-emerald-300">{badge}</span><h2 className="mt-4 text-2xl font-semibold tracking-[-.03em] text-white">{name}</h2><p className="text-sm text-slate-400">{role}</p></div><AgentAvatar agent={avatar} size={64}/></div>
  <div className="relative z-10 mt-6 flex items-center justify-between border-t border-slate-800 pt-4"><div className="rounded-xl border border-slate-800 bg-slate-950/45 px-3 py-2 text-xs text-slate-300">{kpi}</div><div className="text-xs font-semibold text-cyan-200">Open CRM →</div></div>
 </Link>
}

export default async function CrmOffice(){
 const access=await getAuthorizationContext(); if(!access)redirect("/login");
 if(!canAccess(access,"crm","view_crm"))redirect("/");
 const companyId=access.profile.company_id;if(!companyId)redirect("/");
 const s=await createServerClient();
 const today=new Date();today.setHours(0,0,0,0);
 const [{count:leoLeads},{count:foxyPublished},{data:pubs},{count:rivoComments}]=await Promise.all([
  s.from("leads").select("id",{count:"exact",head:true}).eq("company_id",companyId).eq("source_agent_key","ai_sales"),
  s.from("marketing_content_queue").select("id",{count:"exact",head:true}).eq("company_id",companyId).eq("status","published").gte("published_at",today.toISOString()),
  s.from("marketing_post_publications").select("views,comments,messages").eq("company_id",companyId),
  s.from("marketing_social_comments").select("id",{count:"exact",head:true}).eq("company_id",companyId)
 ]);
 const foxyViews=(pubs||[]).reduce((n:any,x:any)=>n+Number(x.views||0),0);
 return <div className="min-h-screen bg-slate-950 text-white"><Sidebar access={access}/><div className="ml-64 min-h-screen"><DashboardHeader userEmail={access.user.email||""}/><main className="p-6">
  <div className="mx-auto max-w-7xl">
   <div><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-cyan-300">AVERO Intelligence · CRM</p><h1 className="mt-2 text-4xl font-semibold tracking-[-.04em]">AI Workforce CRM</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">One operational view for your active digital employees, department activity and customer workflows.</p></div>
   <div className="mt-7 rounded-3xl border border-slate-800 bg-slate-900/35 p-5 md:p-6">
    <div className="mb-5 flex items-center justify-between"><div><h2 className="text-lg font-semibold">Active workforce</h2><p className="text-xs text-slate-500">Department agents with dedicated CRM workspaces</p></div><span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-300">3 ACTIVE</span></div>
    <div className="grid gap-5 lg:grid-cols-3">
      <Desk name="ZAYN" role="AI Sales Director" avatar="zayn" href="/crm/agents/ai_sales" badge="WORKING" kpi={(leoLeads||0)+" leads generated"}/>
      <Desk name="NAYA" role="AI Marketing Director" avatar="naya" href="/crm/agents/ai_marketing" badge="WORKING" kpi={(foxyPublished||0)+" posts today · "+foxyViews+" views tracked"}/>
      <Desk name="ELI" role="AI Community Manager" avatar="eli" href="/crm/agents/rivo" badge="WORKING" kpi={(rivoComments||0)+" comments tracked"}/>
    </div>
   </div>
  </div>
 </main></div></div>
}
