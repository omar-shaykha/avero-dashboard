"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  BadgeCheck,
  BarChart3,
  Building2,
  CircleDollarSign,
  CircleX,
  FileText,
  Handshake,
  MapPin,
  MessageCircle,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  UsersRound,
} from "lucide-react";

type Lead = {
  id: string;
  title: string | null;
  service_type: string | null;
  status: string | null;
  interest_level: string | null;
  estimated_value: number | null;
  city: string | null;
  created_at: string | null;
  updated_at: string | null;
  customers: { name?: string | null; source?: string | null } | null;
};

type Conversation = {
  id: string;
  direction: string | null;
  ai_generated: boolean | null;
  message_type: string | null;
  created_at: string | null;
};

type RangeKey = "30d" | "90d" | "year" | "all";

const STAGES = ["new", "qualified", "quotation", "negotiation", "won", "lost"];
const LABELS: Record<string, string> = {
  new: "New",
  qualified: "Qualified",
  quotation: "Quotation",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
};

function money(value: number) {
  return new Intl.NumberFormat("en-SA", { style: "currency", currency: "SAR", maximumFractionDigits: 0 }).format(value);
}

function norm(value?: string | null) {
  return (value || "Unknown").trim() || "Unknown";
}

export default function AdvancedAnalytics({ leads, conversations }: { leads: Lead[]; conversations: Conversation[] }) {
  const [range, setRange] = useState<RangeKey>("90d");

  const data = useMemo(() => {
    const now = new Date();
    let start: Date | null = null;
    if (range === "30d") start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
    if (range === "90d") start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 89);
    if (range === "year") start = new Date(now.getFullYear(), 0, 1);
    if (start) start.setHours(0, 0, 0, 0);

    const filtered = leads.filter((lead) => !start || new Date(lead.created_at || lead.updated_at || 0) >= start!);
    const filteredConversations = conversations.filter((item) => !start || new Date(item.created_at || 0) >= start!);
    const byStatus = Object.fromEntries(STAGES.map((stage) => [stage, filtered.filter((l) => (l.status || "new").toLowerCase() === stage).length]));
    const won = byStatus.won || 0;
    const lost = byStatus.lost || 0;
    const pipelineValue = filtered.filter((l) => !["won", "lost"].includes((l.status || "new").toLowerCase())).reduce((sum, l) => sum + Number(l.estimated_value || 0), 0);
    const wonValue = filtered.filter((l) => (l.status || "").toLowerCase() === "won").reduce((sum, l) => sum + Number(l.estimated_value || 0), 0);
    const conversion = filtered.length ? (won / filtered.length) * 100 : 0;
    const closeRate = won + lost ? (won / (won + lost)) * 100 : 0;

    const countBy = (key: "service_type" | "city") => {
      const map = new Map<string, number>();
      filtered.forEach((lead) => map.set(norm(lead[key]), (map.get(norm(lead[key])) || 0) + 1));
      return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
    };

    const sources = new Map<string, number>();
    filtered.forEach((lead) => {
      const source = norm(lead.customers?.source).toLowerCase();
      sources.set(source, (sources.get(source) || 0) + 1);
    });

    const aiOutbound = filteredConversations.filter((c) => c.direction === "outbound" && c.ai_generated).length;
    const outbound = filteredConversations.filter((c) => c.direction === "outbound").length;
    const inbound = filteredConversations.filter((c) => c.direction === "inbound").length;
    const voice = filteredConversations.filter((c) => c.message_type === "audio").length;

    return {
      filtered,
      byStatus,
      pipelineValue,
      wonValue,
      conversion,
      closeRate,
      services: countBy("service_type"),
      cities: countBy("city"),
      sources: [...sources.entries()].sort((a, b) => b[1] - a[1]),
      aiOutbound,
      outbound,
      inbound,
      voice,
    };
  }, [leads, conversations, range]);

  const maxStage = Math.max(1, ...STAGES.map((s) => data.byStatus[s] || 0));
  const maxService = Math.max(1, ...data.services.map(([, value]) => value));
  const maxCity = Math.max(1, ...data.cities.map(([, value]) => value));

  const cards = [
    { label: "Leads Analyzed", value: data.filtered.length.toString(), icon: UsersRound },
    { label: "Conversion Rate", value: `${data.conversion.toFixed(1)}%`, icon: Target },
    { label: "Close Rate", value: `${data.closeRate.toFixed(1)}%`, icon: BadgeCheck },
    { label: "Pipeline Value", value: money(data.pipelineValue), icon: CircleDollarSign },
    { label: "Won Value", value: money(data.wonValue), icon: Trophy },
    { label: "AI Replies", value: data.aiOutbound.toString(), icon: Sparkles },
  ];

  return (
    <main className="flex-1 overflow-y-auto bg-slate-950 px-7 py-8 text-white">
      <div className="mx-auto max-w-[1500px] space-y-7">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-blue-400">AVERO Intelligence</p>
            <h1 className="text-3xl font-bold tracking-tight">Advanced Analytics</h1>
            <p className="mt-2 text-sm text-slate-400">Deep sales, customer and AI performance intelligence from your live company data.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {([['30d','30 Days'],['90d','90 Days'],['year','This Year'],['all','All Time']] as [RangeKey,string][]).map(([key,label]) => (
              <button key={key} onClick={() => setRange(key)} className={`rounded-lg border px-4 py-2 text-sm transition ${range === key ? "border-blue-500 bg-blue-500/10 text-blue-300" : "border-slate-700 bg-slate-900 text-slate-400 hover:text-white"}`}>{label}</button>
            ))}
          </div>
        </div>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          {cards.map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
              <div className="mb-5 flex items-center justify-between"><span className="text-sm text-slate-400">{label}</span><Icon size={20} className="text-blue-400" /></div>
              <div className="text-2xl font-bold">{value}</div>
            </div>
          ))}
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.45fr_1fr]">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <div className="mb-6 flex items-center gap-3"><BarChart3 className="text-blue-400" /><div><h2 className="text-xl font-semibold">Conversion Funnel</h2><p className="text-sm text-slate-500">Lead movement through the complete sales lifecycle</p></div></div>
            <div className="space-y-4">
              {STAGES.map((stage) => {
                const value = data.byStatus[stage] || 0;
                return <div key={stage}><div className="mb-1.5 flex justify-between text-sm"><span className="text-slate-300">{LABELS[stage]}</span><span className="font-semibold">{value}</span></div><div className="h-3 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.max(value ? 6 : 0, (value / maxStage) * 100)}%` }} /></div></div>;
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <div className="mb-6 flex items-center gap-3"><Activity className="text-emerald-400" /><div><h2 className="text-xl font-semibold">AI Activity</h2><p className="text-sm text-slate-500">Real WhatsApp conversation activity</p></div></div>
            <div className="grid grid-cols-2 gap-3">
              <Metric label="Inbound" value={data.inbound} icon={MessageCircle} />
              <Metric label="Outbound" value={data.outbound} icon={TrendingUp} />
              <Metric label="AI Replies" value={data.aiOutbound} icon={Sparkles} />
              <Metric label="Voice Messages" value={data.voice} icon={Activity} />
            </div>
            <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/50 p-4 text-sm text-slate-400">AI share of outbound replies: <span className="font-semibold text-white">{data.outbound ? ((data.aiOutbound / data.outbound) * 100).toFixed(0) : 0}%</span></div>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <Ranking title="Top Services" subtitle="Most requested services" icon={FileText} rows={data.services} max={maxService} />
          <Ranking title="Top Cities" subtitle="Where demand is coming from" icon={MapPin} rows={data.cities} max={maxCity} />
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <div className="mb-5 flex items-center gap-3"><Building2 className="text-violet-400" /><div><h2 className="text-xl font-semibold">Lead Sources</h2><p className="text-sm text-slate-500">Acquisition channels recorded in CRM</p></div></div>
            <div className="space-y-3">{data.sources.length ? data.sources.map(([source,value]) => <div key={source} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3"><span className="capitalize text-slate-300">{source}</span><span className="font-semibold">{value}</span></div>) : <Empty />}</div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <div className="mb-5 flex items-center gap-3"><Handshake className="text-amber-400" /><div><h2 className="text-xl font-semibold">Outcome Intelligence</h2><p className="text-sm text-slate-500">Won and lost performance from real lead stages</p></div></div>
            <div className="grid grid-cols-2 gap-4"><Metric label="Won Deals" value={data.byStatus.won || 0} icon={Trophy} /><Metric label="Lost Deals" value={data.byStatus.lost || 0} icon={CircleX} /></div>
            <p className="mt-5 text-xs leading-5 text-slate-500">Win/loss reasons are not displayed because the current schema does not store a structured reason field. AVERO will not invent this data.</p>
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Activity }) {
  return <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4"><Icon size={18} className="mb-4 text-blue-400" /><div className="text-2xl font-bold">{value}</div><div className="mt-1 text-xs text-slate-500">{label}</div></div>;
}

function Ranking({ title, subtitle, icon: Icon, rows, max }: { title: string; subtitle: string; icon: typeof Activity; rows: [string,number][]; max: number }) {
  return <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6"><div className="mb-5 flex items-center gap-3"><Icon className="text-blue-400" /><div><h2 className="text-xl font-semibold">{title}</h2><p className="text-sm text-slate-500">{subtitle}</p></div></div><div className="space-y-4">{rows.length ? rows.map(([label,value]) => <div key={label}><div className="mb-1.5 flex justify-between text-sm"><span className="truncate pr-4 text-slate-300">{label}</span><span className="font-semibold">{value}</span></div><div className="h-2 rounded-full bg-slate-800"><div className="h-full rounded-full bg-blue-500" style={{width:`${(value/max)*100}%`}} /></div></div>) : <Empty />}</div></div>;
}

function Empty() {
  return <div className="rounded-xl border border-dashed border-slate-800 py-8 text-center text-sm text-slate-500">No data available for this period.</div>;
}
