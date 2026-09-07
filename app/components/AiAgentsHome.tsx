"use client";

import Link from "next/link";
import Sidebar from "./Sidebar";
import DashboardHeader from "./DashboardHeader";
import type { AuthorizationContext } from "@/lib/auth/authorization";
import { ArrowRight, Bot, LockKeyhole } from "lucide-react";

const agents = [
  { name: "Leo", animal: "🦁", title: "Sales Agent", line: "The Opportunity Hunter", href: "/ai-sales", live: true },
  { name: "Foxy", animal: "🦊", title: "Marketing Agent", line: "The Growth Creator", live: false },
  { name: "Aero", animal: "🦅", title: "HR & Booking Agent", line: "The Planner", live: false },
  { name: "Gor", animal: "🦍", title: "Support Agent", line: "The Problem Solver", live: false },
  { name: "Vexa", animal: "🐍", title: "Inventory Agent", line: "The Watcher", live: false },
  { name: "Rex", animal: "🐕", title: "Customer Care Agent", line: "The Loyal Companion", live: false },
  { name: "Nova", animal: "🐈", title: "Analytics Agent", line: "The Insight Maker", live: false },
  { name: "Bruno", animal: "🐻", title: "Warehouse Agent", line: "The Organizer", live: false },
];

type AiAgentsHomeProps = { userEmail?: string; userName?: string; access?: AuthorizationContext | null };
export default function AiAgentsHome({ userEmail, userName, access }: AiAgentsHomeProps) {
  return <div className="min-h-screen bg-slate-950 text-white"><Sidebar userEmail={userEmail} userName={userName} access={access}/><div className="ml-64 min-h-screen"><DashboardHeader userEmail={userEmail} userName={userName}/><main className="p-4 md:p-7"><div className="mx-auto max-w-7xl space-y-6">
    <section className="rounded-3xl border border-cyan-400/20 bg-[radial-gradient(circle_at_top,rgba(34,211,238,.14),transparent_38%),#020617] p-6 md:p-8"><p className="text-xs font-black uppercase tracking-[.3em] text-cyan-300">AVERO AI Add-ons</p><h1 className="mt-3 text-3xl font-black md:text-5xl">Add AI only when the business wants it.</h1><p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">AVERO POS runs as the core business system. Leo and the AVERO Chatbox are optional AI subscription add-ons. Foxy and the rest stay Coming Soon until their production engines are ready.</p></section>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{agents.map((a)=>{const card=<div className={`h-full rounded-3xl border p-5 ${a.live ? "border-slate-800 bg-slate-900/70 transition hover:-translate-y-1 hover:border-cyan-400/50" : "border-slate-800/70 bg-slate-900/35 opacity-65"}`}><div className="flex items-start justify-between"><div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-slate-700 bg-slate-950 text-4xl">{a.animal}</div>{a.live ? <Bot className="text-cyan-300"/> : <LockKeyhole className="text-slate-600"/>}</div><h2 className="mt-4 text-2xl font-black">{a.name}</h2><p className="text-sm font-bold text-cyan-200">{a.title}</p><p className="mt-1 text-xs uppercase tracking-[.15em] text-slate-500">{a.line}</p><div className={`mt-5 inline-flex rounded-full px-3 py-1 text-xs font-black ${a.live ? "bg-emerald-500/10 text-emerald-300" : "bg-slate-800 text-slate-400"}`}>{a.live ? "OPTIONAL AI ADD-ON" : "COMING SOON"}</div>{a.live && <div className="mt-5 flex items-center gap-2 text-xs font-black text-cyan-300">Open Agent <ArrowRight size={14}/></div>}</div>;return a.live && a.href ? <Link key={a.name} href={a.href}>{card}</Link> : <div key={a.name}>{card}</div>})}</section>
  </div></main></div></div>;
}
