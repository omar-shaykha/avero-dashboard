"use client";

import Link from "next/link";
import { ArrowRight, FileText, Megaphone, Trophy, UsersRound } from "lucide-react";
import { useLanguage } from "./LanguageProvider";

type SalesSnapshot = { total:number; qualified:number; quotation:number; negotiation:number; won:number; lost:number };
type AgentResult = { key:string; name:string; result:string; last_action?:string|null; status?:string|null; count?:number };
type TopPerformer = { name:string; quotations:number; won:number; leads:number; score:number } | null;

export default function UniversalAiDashboard({sales}:{sales:SalesSnapshot;features:string[];agentResults?:AgentResult[];topPerformer?:TopPerformer}){
  const {language}=useLanguage(); const ar=language==="ar";
  return <main className="flex-1 overflow-y-auto px-4 py-6 md:px-7 md:py-8"><div className="mx-auto max-w-6xl space-y-6">
    <section className="rounded-3xl border border-cyan-500/20 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,.15),transparent_35%),#020617] p-6 md:p-8"><p className="text-xs font-black uppercase tracking-[.28em] text-cyan-300">AVERO OS</p><h1 className="mt-3 text-3xl font-black text-white md:text-4xl">{ar?"شغلك اليوم، بشكل واضح.":"Your business today, at a glance."}</h1><p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">{ar?"ركز على العملاء والمبيعات والتسويق. منضيف باقي الأقسام لما تصير جاهزة فعلياً.":"Focus on leads, sales and marketing. More departments appear only when their real engines are ready."}</p></section>

    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Kpi label="Leads" value={sales.total} icon={<UsersRound/>}/><Kpi label="Qualified" value={sales.qualified} icon={<UsersRound/>}/><Kpi label="Quotations" value={sales.quotation} icon={<FileText/>}/><Kpi label="Won" value={sales.won} icon={<Trophy/>}/></section>

    <section className="grid gap-5 lg:grid-cols-2">
      <Link href="/ai-sales" className="group rounded-3xl border border-amber-400/20 bg-amber-400/10 p-6 transition hover:border-amber-300/50"><div className="flex items-start justify-between"><div><p className="text-xs font-black uppercase tracking-[.2em] text-amber-300">LIVE · VERCEL</p><h2 className="mt-2 text-2xl font-black text-white">🦁 Leo · Lead Generator</h2><p className="mt-3 text-sm leading-7 text-amber-100/75">Watch WhatsApp conversations become qualified leads and sales actions in real time.</p></div><ArrowRight className="text-amber-300 transition group-hover:translate-x-1"/></div></Link>
      <Link href="/ai-marketing" className="group rounded-3xl border border-violet-400/20 bg-violet-400/10 p-6 transition hover:border-violet-300/50"><div className="flex items-start justify-between"><div><p className="text-xs font-black uppercase tracking-[.2em] text-violet-300">NEXT DEPARTMENT</p><h2 className="mt-2 text-2xl font-black text-white">🦊 Foxy · PR & Marketing</h2><p className="mt-3 text-sm leading-7 text-violet-100/75">Content, campaigns, social publishing and brand growth — the next AVERO engine we are activating.</p></div><Megaphone className="text-violet-300"/></div></Link>
    </section>
  </div></main>
}
function Kpi({label,value,icon}:{label:string;value:number;icon:React.ReactNode}){return <div className="rounded-3xl border border-slate-800 bg-slate-900/65 p-5"><div className="flex items-center justify-between text-slate-400"><span className="text-sm font-semibold">{label}</span><span className="text-cyan-300">{icon}</span></div><p className="mt-5 text-4xl font-black text-white">{value}</p></div>}
