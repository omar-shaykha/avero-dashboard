"use client";

import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import DashboardHeader from "./DashboardHeader";
import { ArrowRight, CheckCircle2, MessageCircle, Sparkles, UserRoundPlus } from "lucide-react";

type Conversation = { id: string; direction: "inbound" | "outbound"; message: string; created_at: string; external_message_id?: string | null };
type Run = { id: string; status?: string | null; input?: Record<string, unknown> | null; output?: Record<string, unknown> | null; created_at?: string | null };

export default function LeoSalesLive() {
  const [messages, setMessages] = useState<Conversation[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);

  async function load() {
    try {
      const res = await fetch("/api/ai-departments/sales", { cache: "no-store" });
      const json = await res.json();
      setRuns(Array.isArray(json.runs) ? json.runs : []);
      const conversationRes = await fetch("/api/ai-departments/sales/conversations", { cache: "no-store" });
      if (conversationRes.ok) {
        const c = await conversationRes.json();
        setMessages(Array.isArray(c.conversations) ? c.conversations : []);
      }
    } catch {}
  }

  useEffect(() => { load(); const timer = setInterval(load, 5000); return () => clearInterval(timer); }, []);

  const latestRun = runs[0];
  const latestInbound = messages.find((m) => m.direction === "inbound");
  const latestOutbound = messages.find((m) => m.direction === "outbound");
  const leadStatus = String(latestRun?.output?.crm_status || latestRun?.output?.interest_level || "Lead captured");

  return <div className="min-h-screen bg-slate-950 text-white"><Sidebar /><div className="ml-64 min-h-screen"><DashboardHeader /><main className="p-4 md:p-7"><div className="mx-auto max-w-6xl space-y-6">
    <section className="rounded-3xl border border-amber-400/20 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,.13),transparent_35%),#020617] p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.3em] text-amber-300">Leo · Sales AI</p><h1 className="mt-3 text-3xl font-black md:text-4xl">Watch Leo turn WhatsApp messages into leads</h1><p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">Simple live view. Customer message in, Leo understands it, creates or updates the lead, then replies from AVERO.</p></div><div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-amber-400/20 bg-amber-400/10 text-5xl">🦁</div></div>
    </section>

    <section className="grid gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] md:items-stretch">
      <Step icon={<MessageCircle size={20}/>} title="1. Customer message" text={latestInbound?.message || "Waiting for a WhatsApp message…"} pulse={!!latestInbound}/><FlowArrow/>
      <Step icon={<Sparkles size={20}/>} title="2. Leo understands" text={latestRun ? "Intent, need and lead context analyzed" : "Ready to analyze the next message"} pulse={!!latestRun}/><FlowArrow/>
      <Step icon={<UserRoundPlus size={20}/>} title="3. Lead updated" text={leadStatus} pulse={!!latestRun}/><FlowArrow/>
      <Step icon={<CheckCircle2 size={20}/>} title="4. Leo replies" text={latestOutbound?.message || String(latestRun?.output?.reply || "Waiting to reply…")} pulse={!!latestOutbound}/>
    </section>

    <section className="grid gap-5 lg:grid-cols-2">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5"><div className="mb-4 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-cyan-300">Live conversation</p><h2 className="mt-1 text-xl font-black">Customer ↔ Leo</h2></div><span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-300">Vercel Native</span></div><div className="space-y-3">{messages.slice(0,8).reverse().map((m)=><div key={m.id} className={`flex ${m.direction === "outbound" ? "justify-end" : "justify-start"}`}><div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${m.direction === "outbound" ? "bg-cyan-500 text-slate-950" : "border border-slate-800 bg-slate-950 text-slate-200"}`}><p className="mb-1 text-[10px] font-black uppercase opacity-60">{m.direction === "outbound" ? "Leo" : "Customer"}</p>{m.message}</div></div>)}{!messages.length && <p className="py-12 text-center text-sm text-slate-500">Send a WhatsApp message to see the conversation here.</p>}</div></div>
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5"><p className="text-xs font-bold uppercase tracking-[.2em] text-violet-300">Latest result</p><h2 className="mt-1 text-xl font-black">What Leo did</h2><div className="mt-5 space-y-3"><Info label="Runtime" value="Meta → Vercel → Leo → Supabase"/><Info label="Status" value={latestRun?.status || "Ready"}/><Info label="Lead status" value={leadStatus}/><Info label="Worker" value={String(latestRun?.output?.worker_name || latestRun?.input?.worker_name || "Leo")}/></div></div>
    </section>
  </div></main></div></div>;
}

function Step({icon,title,text,pulse}:{icon:React.ReactNode;title:string;text:string;pulse?:boolean}){return <div className="relative min-h-40 rounded-3xl border border-slate-800 bg-slate-900/65 p-5"><div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300 ${pulse ? "animate-pulse" : ""}`}>{icon}</div><h3 className="font-black">{title}</h3><p className="mt-2 line-clamp-4 text-sm leading-6 text-slate-400">{text}</p></div>}
function FlowArrow(){return <div className="hidden items-center justify-center text-cyan-400 md:flex"><ArrowRight size={22}/></div>}
function Info({label,value}:{label:string;value:string}){return <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 font-bold text-slate-100">{value}</p></div>}
