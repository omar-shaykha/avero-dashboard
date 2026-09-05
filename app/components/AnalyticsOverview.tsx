"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  UsersRound,
  BadgeCheck,
  FileText,
  Handshake,
  Trophy,
  CircleX,
  TrendingUp,
  TrendingDown,
  Minus,
  WalletCards,
  Target,
  CalendarDays,
  ArrowRight,
  MessageCircle,
  Globe2,
  Instagram,
  Facebook,
  Layers3,
} from "lucide-react";

interface DashboardLead {
  id: string;
  title: string;
  service_type: string;
  status: string;
  interest_level: string;
  people_count: number | null;
  event_date: string | null;
  city: string | null;
  notes: string | null;
  estimated_value?: number | null;
  created_at?: string | null;
  updated_at: string;
  customers: {
    name: string;
    phone: string | null;
    email: string | null;
    source?: string | null;
  } | null;
}

type RangeKey = "today" | "7d" | "30d" | "month" | "year" | "custom";

const STAGES = ["new", "qualified", "quotation", "negotiation", "won"] as const;
const STAGE_LABELS: Record<string, string> = {
  new: "New",
  qualified: "Qualified",
  quotation: "Quotation",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
};

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function getRange(range: RangeKey, customStart: string, customEnd: string) {
  const now = new Date();
  let start = startOfDay(now);
  let end = endOfDay(now);

  if (range === "7d") start = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6));
  if (range === "30d") start = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29));
  if (range === "month") start = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
  if (range === "year") start = startOfDay(new Date(now.getFullYear(), 0, 1));
  if (range === "custom" && customStart && customEnd) {
    start = startOfDay(new Date(`${customStart}T00:00:00`));
    end = endOfDay(new Date(`${customEnd}T00:00:00`));
  }

  const duration = Math.max(1, end.getTime() - start.getTime() + 1);
  const previousEnd = new Date(start.getTime() - 1);
  const previousStart = new Date(previousEnd.getTime() - duration + 1);
  return { start, end, previousStart, previousEnd };
}

function percentChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? null : 100;
  return ((current - previous) / previous) * 100;
}

function currency(value: number) {
  return new Intl.NumberFormat("en-SA", {
    style: "currency",
    currency: "SAR",
    maximumFractionDigits: 0,
  }).format(value);
}

function RangeTrend({ current, previous }: { current: number; previous: number }) {
  const change = percentChange(current, previous);
  if (change === null) {
    return <span className="inline-flex items-center gap-1 text-xs text-slate-500"><Minus size={13} /> No prior data</span>;
  }
  const positive = change > 0;
  const negative = change < 0;
  const Icon = positive ? TrendingUp : negative ? TrendingDown : Minus;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${positive ? "text-emerald-400" : negative ? "text-rose-400" : "text-slate-400"}`}>
      <Icon size={13} strokeWidth={2} /> {Math.abs(change).toFixed(0)}% vs previous
    </span>
  );
}

export default function AnalyticsOverview({ leads }: { leads: DashboardLead[] }) {
  const [range, setRange] = useState<RangeKey>("30d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const analytics = useMemo(() => {
    const dates = getRange(range, customStart, customEnd);
    const leadDate = (lead: DashboardLead) => new Date(lead.created_at || lead.updated_at);
    const inWindow = (lead: DashboardLead, start: Date, end: Date) => {
      const date = leadDate(lead);
      return date >= start && date <= end;
    };

    const current = leads.filter((lead) => inWindow(lead, dates.start, dates.end));
    const previous = leads.filter((lead) => inWindow(lead, dates.previousStart, dates.previousEnd));
    const count = (items: DashboardLead[], status: string) => items.filter((lead) => (lead.status || "new").toLowerCase() === status).length;

    const currentCounts = {
      total: current.length,
      qualified: count(current, "qualified"),
      quotation: count(current, "quotation"),
      negotiation: count(current, "negotiation"),
      won: count(current, "won"),
      lost: count(current, "lost"),
    };
    const previousCounts = {
      total: previous.length,
      qualified: count(previous, "qualified"),
      quotation: count(previous, "quotation"),
      negotiation: count(previous, "negotiation"),
      won: count(previous, "won"),
      lost: count(previous, "lost"),
    };

    const conversion = currentCounts.total ? (currentCounts.won / currentCounts.total) * 100 : 0;
    const previousConversion = previousCounts.total ? (previousCounts.won / previousCounts.total) * 100 : 0;
    const pipelineValue = current
      .filter((lead) => !["won", "lost"].includes((lead.status || "new").toLowerCase()))
      .reduce((sum, lead) => sum + Number(lead.estimated_value || 0), 0);
    const previousPipelineValue = previous
      .filter((lead) => !["won", "lost"].includes((lead.status || "new").toLowerCase()))
      .reduce((sum, lead) => sum + Number(lead.estimated_value || 0), 0);

    const dayMs = 86_400_000;
    const spanDays = Math.max(1, Math.ceil((dates.end.getTime() - dates.start.getTime() + 1) / dayMs));
    const bucketCount = Math.min(spanDays, 12);
    const bucketSize = Math.max(1, Math.ceil(spanDays / bucketCount));
    const chart = Array.from({ length: bucketCount }, (_, index) => {
      const bucketStart = new Date(dates.start.getTime() + index * bucketSize * dayMs);
      const bucketEnd = new Date(Math.min(dates.end.getTime(), bucketStart.getTime() + bucketSize * dayMs - 1));
      const items = current.filter((lead) => {
        const d = leadDate(lead);
        return d >= bucketStart && d <= bucketEnd;
      });
      return {
        label: bucketStart.toLocaleDateString("en", { month: "short", day: "numeric" }),
        leads: items.length,
        quotations: items.filter((lead) => lead.status === "quotation").length,
        won: items.filter((lead) => lead.status === "won").length,
      };
    });

    const sourceMap = new Map<string, number>();
    current.forEach((lead) => {
      const source = (lead.customers?.source || "Other").trim() || "Other";
      sourceMap.set(source, (sourceMap.get(source) || 0) + 1);
    });
    const sources = [...sourceMap.entries()].sort((a, b) => b[1] - a[1]);

    return { current, currentCounts, previousCounts, conversion, previousConversion, pipelineValue, previousPipelineValue, chart, sources };
  }, [leads, range, customStart, customEnd]);

  const kpis = [
    { label: "Total Leads", value: analytics.currentCounts.total, previous: analytics.previousCounts.total, icon: UsersRound, accent: "text-blue-400" },
    { label: "Qualified", value: analytics.currentCounts.qualified, previous: analytics.previousCounts.qualified, icon: BadgeCheck, accent: "text-emerald-400" },
    { label: "Quotations", value: analytics.currentCounts.quotation, previous: analytics.previousCounts.quotation, icon: FileText, accent: "text-amber-400" },
    { label: "Negotiations", value: analytics.currentCounts.negotiation, previous: analytics.previousCounts.negotiation, icon: Handshake, accent: "text-violet-400" },
    { label: "Won", value: analytics.currentCounts.won, previous: analytics.previousCounts.won, icon: Trophy, accent: "text-cyan-400" },
    { label: "Lost", value: analytics.currentCounts.lost, previous: analytics.previousCounts.lost, icon: CircleX, accent: "text-rose-400" },
  ];

  const chartMax = Math.max(1, ...analytics.chart.flatMap((item) => [item.leads, item.quotations, item.won]));
  const sourceIcon = (source: string) => {
    const lower = source.toLowerCase();
    if (lower.includes("whatsapp")) return MessageCircle;
    if (lower.includes("instagram")) return Instagram;
    if (lower.includes("facebook")) return Facebook;
    if (lower.includes("web")) return Globe2;
    return Layers3;
  };

  return (
    <main className="flex-1 overflow-x-hidden px-6 py-6">
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">AVERO Intelligence</p>
          <h1 className="text-3xl font-bold tracking-tight text-white">Business Overview</h1>
          <p className="mt-2 text-sm text-slate-400">Live sales performance, conversion and pipeline health for your company.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(["today", "7d", "30d", "month", "year", "custom"] as RangeKey[]).map((item) => (
            <button key={item} onClick={() => setRange(item)} className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${range === item ? "border-blue-500 bg-blue-500/15 text-blue-300" : "border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-600 hover:text-white"}`}>
              {{ today: "Today", "7d": "7 Days", "30d": "30 Days", month: "This Month", year: "This Year", custom: "Custom" }[item]}
            </button>
          ))}
        </div>
      </div>

      {range === "custom" && (
        <div className="mb-5 flex flex-wrap items-end gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <label className="text-xs text-slate-400">From<input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="mt-1 block rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white" /></label>
          <label className="text-xs text-slate-400">To<input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="mt-1 block rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white" /></label>
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6">
        {kpis.map(({ label, value, previous, icon: Icon, accent }) => (
          <div key={label} className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 shadow-sm shadow-black/20">
            <div className="mb-4 flex items-center justify-between"><span className="text-sm text-slate-400">{label}</span><Icon size={20} strokeWidth={1.8} className={accent} /></div>
            <p className="text-3xl font-semibold text-white">{value}</p>
            <div className="mt-2"><RangeTrend current={value} previous={previous} /></div>
          </div>
        ))}
      </section>

      <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-900/60 p-5">
          <div className="flex items-start justify-between"><div><p className="text-sm text-slate-400">Conversion Rate</p><p className="mt-1 text-3xl font-semibold text-white">{analytics.conversion.toFixed(1)}%</p></div><Target className="text-blue-400" size={26} /></div>
          <div className="mt-3"><RangeTrend current={analytics.conversion} previous={analytics.previousConversion} /></div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-900/60 p-5">
          <div className="flex items-start justify-between"><div><p className="text-sm text-slate-400">Estimated Pipeline Value</p><p className="mt-1 text-3xl font-semibold text-white">{currency(analytics.pipelineValue)}</p></div><WalletCards className="text-emerald-400" size={26} /></div>
          <div className="mt-3"><RangeTrend current={analytics.pipelineValue} previous={analytics.previousPipelineValue} /></div>
        </div>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 rounded-xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="mb-6 flex items-center justify-between"><div><h2 className="text-lg font-semibold text-white">Sales Performance</h2><p className="text-sm text-slate-500">Leads, quotations and won deals over the selected period</p></div><TrendingUp className="text-blue-400" size={22} /></div>
          {analytics.chart.length ? (
            <div className="overflow-x-auto"><div className="flex h-64 min-w-[620px] items-end gap-3 border-b border-slate-800 pb-7">
              {analytics.chart.map((item) => (
                <div key={item.label} className="flex h-full flex-1 flex-col justify-end">
                  <div className="flex h-[200px] items-end justify-center gap-1">
                    <div title={`Leads: ${item.leads}`} className="w-2.5 rounded-t bg-blue-500/80" style={{ height: `${Math.max(3, (item.leads / chartMax) * 100)}%` }} />
                    <div title={`Quotations: ${item.quotations}`} className="w-2.5 rounded-t bg-amber-500/80" style={{ height: `${Math.max(3, (item.quotations / chartMax) * 100)}%` }} />
                    <div title={`Won: ${item.won}`} className="w-2.5 rounded-t bg-emerald-500/80" style={{ height: `${Math.max(3, (item.won / chartMax) * 100)}%` }} />
                  </div>
                  <span className="mt-2 truncate text-center text-[10px] text-slate-500">{item.label}</span>
                </div>
              ))}
            </div></div>
          ) : <div className="flex h-64 items-center justify-center text-sm text-slate-500">No activity in this period</div>}
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-400"><span>● <b className="text-blue-400">Leads</b></span><span>● <b className="text-amber-400">Quotations</b></span><span>● <b className="text-emerald-400">Won</b></span></div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
          <h2 className="text-lg font-semibold text-white">Lead Sources</h2><p className="mb-5 text-sm text-slate-500">Real acquisition channels from customer records</p>
          <div className="space-y-4">
            {analytics.sources.length ? analytics.sources.map(([source, count]) => {
              const Icon = sourceIcon(source); const pct = analytics.current.length ? (count / analytics.current.length) * 100 : 0;
              return <div key={source}><div className="mb-1.5 flex items-center justify-between text-sm"><span className="flex items-center gap-2 text-slate-300"><Icon size={15} />{source}</span><span className="font-medium text-white">{count}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-blue-500" style={{ width: `${pct}%` }} /></div></div>;
            }) : <div className="rounded-lg border border-dashed border-slate-700 px-4 py-8 text-center text-sm text-slate-500">No source data in this period</div>}
          </div>
        </div>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="mb-5 flex items-center justify-between"><div><h2 className="text-lg font-semibold text-white">Sales Funnel</h2><p className="text-sm text-slate-500">Stage-by-stage progress</p></div><Layers3 className="text-violet-400" size={22} /></div>
          <div className="space-y-3">
            {STAGES.map((stage, index) => {
              const value = analytics.current.filter((lead) => (lead.status || "new").toLowerCase() === stage).length;
              const previousStage = index === 0 ? analytics.current.length : analytics.current.filter((lead) => (lead.status || "new").toLowerCase() === STAGES[index - 1]).length;
              const stageRate = index === 0 ? 100 : previousStage ? Math.min(100, (value / previousStage) * 100) : 0;
              return <div key={stage}><div className="mb-1 flex justify-between text-xs"><span className="text-slate-400">{STAGE_LABELS[stage]}</span><span className="text-white">{value} <span className="text-slate-500">({stageRate.toFixed(0)}%)</span></span></div><div className="h-7 overflow-hidden rounded-md bg-slate-800"><div className="flex h-full items-center rounded-md bg-gradient-to-r from-blue-600/80 to-violet-600/70 px-2 text-xs text-white" style={{ width: `${Math.max(value ? 16 : 0, analytics.current.length ? (value / analytics.current.length) * 100 : 0)}%` }}>{value || ""}</div></div></div>;
            })}
          </div>
          <Link href="/crm" className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-blue-400 hover:text-blue-300">Open full pipeline <ArrowRight size={14} /></Link>
        </div>

        <div className="xl:col-span-2 rounded-xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="mb-5 flex items-center justify-between"><div><h2 className="text-lg font-semibold text-white">Recent Leads</h2><p className="text-sm text-slate-500">Latest customer activity in the selected period</p></div><CalendarDays className="text-blue-400" size={22} /></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[660px] text-left text-sm"><thead className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-500"><tr><th className="pb-3 font-medium">Customer</th><th className="pb-3 font-medium">Service</th><th className="pb-3 font-medium">Stage</th><th className="pb-3 font-medium">City</th><th className="pb-3 font-medium">Interest</th><th className="pb-3 text-right font-medium">Updated</th></tr></thead><tbody className="divide-y divide-slate-800/80">
            {analytics.current.slice().sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 7).map((lead) => <tr key={lead.id} className="text-slate-300"><td className="py-3 font-medium text-white">{lead.customers?.name || "Unknown"}</td><td className="py-3">{lead.service_type || "—"}</td><td className="py-3"><span className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs">{STAGE_LABELS[(lead.status || "new").toLowerCase()] || lead.status}</span></td><td className="py-3">{lead.city || "—"}</td><td className="py-3">{lead.interest_level || "—"}</td><td className="py-3 text-right text-slate-500">{new Date(lead.updated_at).toLocaleDateString()}</td></tr>)}
          </tbody></table>{analytics.current.length === 0 && <div className="py-12 text-center text-sm text-slate-500">No leads found for this period.</div>}</div>
        </div>
      </section>
    </main>
  );
}
