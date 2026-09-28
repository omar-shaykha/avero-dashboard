"use client";

import Link from "next/link";
import Sidebar from "./Sidebar";
import DashboardHeader from "./DashboardHeader";
import type { AuthorizationContext } from "@/lib/auth/authorization";
import { ArrowUpRight, Activity, ShieldCheck, Sparkles, Radio } from "lucide-react";
import AgentAvatar from "./AgentAvatar";

const agents = [
  { name: "ZAYN", avatar: "zayn" as const, title: "Sales Director", href: "/ai-sales", metric: "Sales pipeline", task: "Qualifying leads & follow-ups", permission: "Sales + CRM", accent: "from-cyan-400/15 to-blue-500/5" },
  { name: "NAYA", avatar: "naya" as const, title: "Marketing Director", href: "/ai-marketing", metric: "Growth engine", task: "Content, campaigns & publishing", permission: "Marketing", accent: "from-blue-400/15 to-cyan-500/5" },
  { name: "ELI", avatar: "eli" as const, title: "Community Manager", href: "/crm/agents/rivo", metric: "Community inbox", task: "Monitoring & replying to customers", permission: "Social CRM", accent: "from-cyan-300/12 to-slate-500/5" },
];

type AiAgentsHomeProps = { userEmail?: string; userName?: string; access?: AuthorizationContext | null };

export default function AiAgentsHome({ userEmail, userName, access }: AiAgentsHomeProps) {
  const visible = agents.filter(a => access?.profile.role === "king_admin" || (access?.features.includes("app_intelligence") && (
    a.name === "ZAYN" ? access.features.includes("ai_sales") && access.permissions.includes("sales.view") :
    a.name === "NAYA" ? access.features.includes("ai_marketing") && access.permissions.includes("marketing.manage") :
    access.features.includes("ai_customer_care") && access.permissions.includes("customer_care.view")
  )));

  return <div className="min-h-screen bg-slate-950 text-white">
    <Sidebar userEmail={userEmail} userName={userName} access={access}/>
    <div className="ml-64 min-h-screen">
      <DashboardHeader userEmail={userEmail} userName={userName}/>
      <main className="p-4 md:p-7 lg:p-8">
        <div className="mx-auto max-w-[1500px] space-y-7">
          <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70 p-6 md:p-8">
            <div className="absolute -right-24 -top-32 h-80 w-80 rounded-full bg-cyan-400/5 blur-3xl"/>
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/15 bg-cyan-400/5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[.18em] text-cyan-200"><Sparkles size={13}/> AVERO Intelligence</div>
                <h1 className="max-w-3xl text-3xl font-semibold tracking-[-.04em] md:text-5xl">Your AI workforce.</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 md:text-base">Digital employees built into your operating system. Each agent owns a department, its workflows and its CRM.</p>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/50 px-4 py-3">
                <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40"/><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400"/></span>
                <div><p className="text-xs font-semibold text-white">{visible.length} agents online</p><p className="text-[11px] text-slate-500">Systems operational</p></div>
              </div>
            </div>
          </section>

          <div className="grid gap-4 md:grid-cols-3">
            <Stat icon={<Activity size={16}/>} label="Active workforce" value={String(visible.length)} note="AI employees online"/>
            <Stat icon={<Radio size={16}/>} label="Automation" value="Live" note="Connected workflows"/>
            <Stat icon={<ShieldCheck size={16}/>} label="Workspace" value="Secured" note="Role-based access"/>
          </div>

          <section>
            <div className="mb-4 flex items-end justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-slate-500">AI Workforce</p><h2 className="mt-1 text-xl font-semibold tracking-tight">Department leaders</h2></div><p className="hidden text-xs text-slate-500 sm:block">Select an agent to open its workspace</p></div>
            <div className="grid gap-5 lg:grid-cols-3">
              {visible.map((a)=><Link key={a.name} href={a.href} className="group relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70 p-5 transition hover:-translate-y-0.5 hover:border-cyan-400/30 hover:shadow-2xl">
                <div className={"absolute inset-x-0 top-0 h-28 bg-gradient-to-b "+a.accent+" opacity-70"}/>
                <div className="relative">
                  <div className="flex items-start justify-between">
                    <div className="relative h-16 w-16 overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-xl"><AgentAvatar agent={a.avatar} size={64}/><span className="absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full border-2 border-slate-950 bg-emerald-400"/></div>
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-950/60 text-slate-400 transition group-hover:border-cyan-400/20 group-hover:text-cyan-200"><ArrowUpRight size={16}/></div>
                  </div>
                  <div className="mt-5"><div className="flex items-center gap-2"><h3 className="text-2xl font-semibold tracking-[-.03em]">{a.name}</h3><span className="rounded-full border border-emerald-400/15 bg-emerald-400/5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-300">Online</span></div><p className="mt-1 text-sm font-medium text-cyan-200">{a.title}</p></div>
                  <div className="mt-5 space-y-3 border-t border-slate-800 pt-4">
                    <Row label="Current task" value={a.task}/>
                    <Row label="Workspace" value={a.metric}/>
                    <Row label="Access" value={a.permission}/>
                  </div>
                  <div className="mt-5 flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/45 px-3.5 py-3"><span className="text-xs font-medium text-slate-400">Open workspace</span><span className="text-xs font-semibold text-cyan-200">Launch →</span></div>
                </div>
              </Link>)}
            </div>
          </section>
        </div>
      </main>
    </div>
  </div>;
}

function Stat({icon,label,value,note}:{icon:React.ReactNode;label:string;value:string;note:string}) {
  return <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4"><div className="flex items-center gap-2 text-slate-500">{icon}<span className="text-xs font-medium">{label}</span></div><div className="mt-3 flex items-end justify-between"><span className="text-2xl font-semibold tracking-tight">{value}</span><span className="text-[11px] text-slate-500">{note}</span></div></div>;
}
function Row({label,value}:{label:string;value:string}) { return <div className="flex items-start justify-between gap-4 text-xs"><span className="text-slate-500">{label}</span><span className="max-w-[65%] text-right font-medium text-slate-300">{value}</span></div>; }
