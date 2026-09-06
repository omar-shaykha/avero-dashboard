"use client";

import Link from "next/link";
import Sidebar from "./Sidebar";
import DashboardHeader from "./DashboardHeader";
import type { AuthorizationContext } from "@/lib/auth/authorization";
import { BarChart3, Bot, CalendarDays, Headphones, Home, Megaphone, PackageCheck, ShieldCheck, Sparkles, Store, Warehouse } from "lucide-react";

type AgentCard = {
  name: string;
  animal: string;
  role: string;
  line: string;
  href?: string;
  status: "live" | "ready" | "planned";
  icon: typeof Bot;
  duties: string[];
  quote: string;
};

const agents: AgentCard[] = [
  { name: "Leo", animal: "Lion", role: "Sales Agent", line: "The Opportunity Hunter", href: "/ai-sales", status: "live", icon: Bot, duties: ["Qualifies leads", "Follows up automatically", "Turns inquiries into customers", "Schedules meetings"], quote: "More customers. Bigger opportunities." },
  { name: "Gor", animal: "Gorilla", role: "Support Agent", line: "The Problem Solver", href: "/ai-support", status: "live", icon: Headphones, duties: ["Handles customer questions", "Solves issues fast", "Provides product support", "Keeps customers happy"], quote: "Happier customers. Stronger loyalty." },
  { name: "Aero", animal: "Eagle", role: "Booking Agent", line: "The Planner", href: "/ai-hr", status: "ready", icon: CalendarDays, duties: ["Manages bookings", "Confirms and reminds", "Preschedules automatically", "Syncs with calendar and POS"], quote: "A fuller calendar. A smoother business." },
  { name: "Foxy", animal: "Fox", role: "Marketing Agent", line: "The Growth Creator", href: "/ai-marketing", status: "live", icon: Megaphone, duties: ["Creates content", "Runs campaigns", "Manages social media", "Suggests new ideas"], quote: "More reach. More customers. A stronger brand." },
  { name: "Vexa", animal: "Snake", role: "Inventory Agent", line: "The Watcher", status: "planned", icon: PackageCheck, duties: ["Tracks stock levels", "Alerts low stock", "Suggests purchases", "Prevents stockouts"], quote: "The right stock. At the right time." },
  { name: "Rex", animal: "Dog", role: "Customer Care Agent", line: "The Loyal Companion", status: "ready", icon: ShieldCheck, duties: ["Welcomes new customers", "Follows up after purchase", "Collects feedback", "Handles complaints"], quote: "Customers for today. Loyalty for tomorrow." },
  { name: "Nova", animal: "Cat", role: "Analytics Agent", line: "The Insight Maker", status: "planned", icon: BarChart3, duties: ["Analyzes sales", "Creates smart reports", "Finds growth opportunities", "Gives recommendations"], quote: "Clear insights. Smarter decisions." },
  { name: "Bruno", animal: "Bear", role: "Warehouse Agent", line: "The Organizer", status: "planned", icon: Warehouse, duties: ["Manages receiving", "Tracks item movement", "Monitors expiry dates", "Keeps records updated"], quote: "A more organized warehouse. A smoother operation." },
];

export default function AiAgentsHome({ userEmail, userName, access }: { userEmail?: string; userName?: string; access?: AuthorizationContext | null }) {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Sidebar userEmail={userEmail} userName={userName} access={access} />
      <div className="ml-64 min-h-screen">
        <DashboardHeader userEmail={userEmail} userName={userName} />
        <main className="p-7">
          <div className="mx-auto max-w-7xl space-y-6">
            <section className="overflow-hidden rounded-3xl border border-cyan-400/20 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.18),transparent_35%),#020617] p-7 shadow-2xl">
              <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[.22em] text-cyan-200">
                    <Sparkles size={14} /> AVERO OS AI Team
                  </div>
                  <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-tight md:text-5xl">A complete AI team for every part of your business.</h1>
                  <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">Different skills, one platform. Each agent has a simple page, clear settings, real runs, approval controls and a workflow that connects with Supabase, Make and the company brain.</p>
                </div>
                <Link href="/" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-100 hover:bg-cyan-400/20"><Home size={17} /> Home</Link>
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {agents.map((agent) => <AgentProfileCard key={agent.name} agent={agent} />)}
            </section>

            <section className="grid gap-4 lg:grid-cols-4">
              {["Higher revenue", "Lower costs", "Save time", "Happier customers"].map((item) => (
                <div key={item} className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5">
                  <Store className="text-cyan-300" />
                  <p className="mt-3 text-lg font-black">{item}</p>
                  <p className="mt-1 text-sm text-slate-500">Built for real businesses, branches, teams and daily operations.</p>
                </div>
              ))}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

function AgentProfileCard({ agent }: { agent: AgentCard }) {
  const Icon = agent.icon;
  const statusClass = agent.status === "live" ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" : agent.status === "ready" ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-200" : "border-amber-400/30 bg-amber-400/10 text-amber-200";
  const body = (
    <div className="group h-full rounded-3xl border border-slate-800 bg-slate-900/70 p-5 transition hover:-translate-y-1 hover:border-cyan-400/30 hover:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-3xl">{animalEmoji(agent.animal)}</div>
          <div>
            <p className="text-2xl font-black">{agent.name}</p>
            <p className="text-xs font-bold uppercase tracking-[.16em] text-cyan-300">{agent.role}</p>
          </div>
        </div>
        <span className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase ${statusClass}`}>{agent.status}</span>
      </div>
      <p className="mt-4 text-sm font-semibold text-slate-200">“{agent.line}”</p>
      <div className="mt-4 space-y-2">
        {agent.duties.map((duty) => (
          <div key={duty} className="flex items-center gap-2 text-xs text-slate-400"><Icon size={13} className="text-cyan-300" /> {duty}</div>
        ))}
      </div>
      <p className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/70 p-3 text-xs font-semibold text-cyan-100">“{agent.quote}”</p>
    </div>
  );
  return agent.href ? <Link href={agent.href}>{body}</Link> : body;
}

function animalEmoji(animal: string) {
  const map: Record<string, string> = { Lion: "🦁", Gorilla: "🦍", Eagle: "🦅", Fox: "🦊", Snake: "🐍", Dog: "🐕", Cat: "🐈", Bear: "🐻" };
  return map[animal] || "🤖";
}
