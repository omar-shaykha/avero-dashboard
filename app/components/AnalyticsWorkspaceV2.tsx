"use client";

import { useMemo, useState } from "react";
import { BarChart3, Building2, FileText, MapPin, Target, Trophy, UsersRound } from "lucide-react";

type Lead = {
  id: string;
  service_type: string | null;
  status: string | null;
  city: string | null;
  estimated_value?: number | null;
  created_at?: string | null;
  updated_at: string;
  customers: { source?: string | null } | null;
};

type RangeKey = "30d" | "90d" | "year" | "all";

function money(value: number) {
  return new Intl.NumberFormat("en-SA", { style: "currency", currency: "SAR", maximumFractionDigits: 0 }).format(value);
}

export default function AnalyticsWorkspaceV2({ leads }: { leads: Lead[] }) {
  const [range, setRange] = useState<RangeKey>("90d");

  const data = useMemo(() => {
    const now = new Date();
    let start: Date | null = null;
    if (range === "30d") start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
    if (range === "90d") start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 89);
    if (range === "year") start = new Date(now.getFullYear(), 0, 1);
    if (start) start.setHours(0, 0, 0, 0);

    const filtered = leads.filter((lead) => !start || new Date(lead.created_at || lead.updated_at) >= start!);
    const statuses = ["new", "qualified", "quotation", "negotiation", "won", "lost"];
    const counts = Object.fromEntries(statuses.map((s) => [s, filtered.filter((l) => (l.status || "new").toLowerCase() === s).length]));
    const conversion = filtered.length ? (counts.won / filtered.length) * 100 : 0;
    const wonValue = filtered.filter((l) => (l.status || "").toLowerCase() === "won").reduce((sum, l) => sum + Number(l.estimated_value || 0), 0);
    const pipelineValue = filtered.filter((l) => !["won", "lost"].includes((l.status || "new").toLowerCase())).reduce((sum, l) => sum + Number(l.estimated_value || 0), 0);

    const rank = (field: "service_type" | "city") => {
      const map = new Map<string, number>();
      filtered.forEach((lead) => {
        const key = (lead[field] || "Unknown").trim() || "Unknown";
        map.set(key, (map.get(key) || 0) + 1);
      });
      return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
    };

    const sourceMap = new Map<string, number>();
    filtered.forEach((lead) => {
      const key = (lead.customers?.source || "Other").trim() || "Other";
      sourceMap.set(key, (sourceMap.get(key) || 0) + 1);
    });

    return { filtered, counts, conversion, wonValue, pipelineValue, services: rank("service_type"), cities: rank("city"), sources: [...sourceMap.entries()].sort((a, b) => b[1] - a[1]) };
  }, [leads, range]);

  const maxStage = Math.max(1, ...Object.values(data.counts));
  const maxService = Math.max(1, ...data.services.map(([, v]) => v));
  const maxCity = Math.max(1, ...data.cities.map(([, v]) => v));

  return (
    <main className="flex-1 overflow-y-auto bg-slate-950 px-7 py-8 text-white">
      <div className="mx-auto max-w-[1500px] space-y-7">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-blue-400">AVERO Intelligence</p>
            <h1 className="text-3xl font-bold">Advanced Analytics</h1>
            <p className="mt-2 text-sm text-slate-400">Deep analysis from live CRM records — no demo or invented numbers.</p>
          </div>
          <div className="flex gap-2">
            {([['30d','30 Days'],['90d','90 Days'],['year','This Year'],['all','All Time']] as [RangeKey,string][]).map(([key,label]) => (
              <button key={key} onClick={() => setRange(key)} className={`rounded-lg border px-4 py-2 text-sm ${range === key ? "border-blue-500 bg-blue-500/10 text-blue-300" : "border-slate-700 bg-slate-900 text-slate-400"}`}>{label}</button>
            ))}
          </div>
        </div>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <Card label="Leads Analyzed" value={String(data.filtered.length)} icon={UsersRound} />
          <Card label="Conversion Rate" value={`${data.conversion.toFixed(1)}%`} icon={Target} />
          <Card label="Won Deals" value={String(data.counts.won)} icon={Trophy} />
          <Card label="Pipeline Value" value={money(data.pipelineValue)} icon={BarChart3} />
          <Card label="Won Value" value={money(data.wonValue)} icon={Building2} />
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
          <Panel title="Sales Funnel" subtitle="Real lead distribution by current CRM stage" icon={BarChart3}>
            <div className="space-y-4">
              {Object.entries(data.counts).map(([stage, value]) => (
                <div key={stage}><div className="mb-1.5 flex justify-between text-sm"><span className="capitalize text-slate-300">{stage}</span><span>{value}</span></div><div className="h-3 rounded-full bg-slate-800"><div className="h-full rounded-full bg-blue-500" style={{ width: `${(value / maxStage) * 100}%` }} /></div></div>
              ))}
            </div>
          </Panel>
          <Panel title="Lead Sources" subtitle="Channels recorded on customer records" icon={Building2}>
            <div className="space-y-3">{data.sources.length ? data.sources.map(([source, count]) => <div key={source} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3"><span>{source}</span><strong>{count}</strong></div>) : <Empty />}</div>
          </Panel>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <Ranking title="Top Services" icon={FileText} rows={data.services} max={maxService} />
          <Ranking title="Top Cities" icon={MapPin} rows={data.cities} max={maxCity} />
        </section>
      </div>
    </main>
  );
}

function Card({ label, value, icon: Icon }: { label: string; value: string; icon: typeof UsersRound }) {
  return <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"><div className="mb-5 flex items-center justify-between"><span className="text-sm text-slate-400">{label}</span><Icon size={20} className="text-blue-400" /></div><div className="text-2xl font-bold">{value}</div></div>;
}

function Panel({ title, subtitle, icon: Icon, children }: { title: string; subtitle: string; icon: typeof UsersRound; children: React.ReactNode }) {
  return <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6"><div className="mb-6 flex items-center gap-3"><Icon className="text-blue-400" /><div><h2 className="text-xl font-semibold">{title}</h2><p className="text-sm text-slate-500">{subtitle}</p></div></div>{children}</div>;
}

function Ranking({ title, icon: Icon, rows, max }: { title: string; icon: typeof UsersRound; rows: [string,number][]; max: number }) {
  return <Panel title={title} subtitle="Ranked from live CRM records" icon={Icon}><div className="space-y-4">{rows.length ? rows.map(([label,value]) => <div key={label}><div className="mb-1.5 flex justify-between text-sm"><span className="text-slate-300">{label}</span><span>{value}</span></div><div className="h-2 rounded-full bg-slate-800"><div className="h-full rounded-full bg-blue-500" style={{ width: `${(value / max) * 100}%` }} /></div></div>) : <Empty />}</div></Panel>;
}

function Empty() {
  return <div className="rounded-xl border border-dashed border-slate-800 py-8 text-center text-sm text-slate-500">No data available for this period.</div>;
}
