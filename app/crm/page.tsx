import Link from "next/link";
import { redirect } from "next/navigation";
import Sidebar from "@/app/components/Sidebar";
import DashboardHeader from "@/app/components/DashboardHeader";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getAuthorizationContext, canAccess } from "@/lib/auth/authorization";

export const dynamic="force-dynamic";

function Desk({name,role,emoji,href,badge,kpi}:{name:string;role:string;emoji:string;href:string;badge:string;kpi:string}){
 return <Link href={href} className="group relative overflow-hidden rounded-[28px] border border-cyan-400/20 bg-[linear-gradient(180deg,rgba(15,23,42,.96),rgba(2,6,23,.96))] p-5 shadow-[0_20px_60px_rgba(0,0,0,.32)] transition hover:-translate-y-1 hover:border-cyan-300/50">
  <div className="absolute inset-x-6 bottom-5 h-16 rounded-2xl border border-slate-700 bg-slate-900/90 shadow-inner"/>
  <div className="relative z-10 flex items-start justify-between"><div><span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-black tracking-widest text-emerald-300">{badge}</span><h2 className="mt-3 text-2xl font-black text-white">{name}</h2><p className="text-sm text-slate-400">{role}</p></div><div className="grid h-16 w-16 place-items-center rounded-2xl border border-slate-700 bg-slate-950 text-4xl shadow-lg">{emoji}</div></div>
  <div className="relative z-10 mt-7 flex items-end justify-between"><div className="rounded-xl border border-slate-700 bg-slate-950/90 px-3 py-2 text-xs text-cyan-200">{kpi}</div><div className="grid h-10 w-16 place-items-center rounded-t-xl border border-slate-600 bg-slate-800 text-[10px] font-black text-slate-300">DESK</div></div>
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
   <div><p className="text-xs font-black uppercase tracking-[.28em] text-cyan-300">AVERO AI OFFICE</p><h1 className="mt-2 text-4xl font-black">CRM Office</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Your AI employees live here. Only hired and activated agents get a desk and their own CRM.</p></div>
   <div className="mt-7 rounded-[32px] border border-slate-800 bg-[radial-gradient(circle_at_top,rgba(34,211,238,.08),transparent_35%),linear-gradient(180deg,#0f172a,#020617)] p-5 md:p-7">
    <div className="mb-5 flex items-center justify-between"><div><h2 className="text-lg font-black">Active Office</h2><p className="text-xs text-slate-500">3 AI employees currently hired</p></div><span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-300">3 ACTIVE</span></div>
    <div className="grid gap-5 lg:grid-cols-3">
      <Desk name="Leo" role="AI Sales Director" emoji="🦁" href="/crm/agents/ai_sales" badge="WORKING" kpi={(leoLeads||0)+" leads generated"}/>
      <Desk name="Foxy" role="AI Marketing Director" emoji="🦊" href="/crm/agents/ai_marketing" badge="WORKING" kpi={(foxyPublished||0)+" posts today · "+foxyViews+" views tracked"}/>
      <Desk name="Rivo" role="AI Social Community Agent" emoji="🦝" href="/crm/agents/rivo" badge="WORKING" kpi={(rivoComments||0)+" comments tracked"}/>
    </div>
   </div>
  </div>
 </main></div></div>
}
