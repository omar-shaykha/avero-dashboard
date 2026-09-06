"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Sidebar from "@/app/components/Sidebar";
import DashboardHeader from "@/app/components/DashboardHeader";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Bot,
  Brain,
  CheckCircle2,
  Gauge,
  Loader2,
  MessageCircle,
  Power,
  Save,
  Settings2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

type Agent = { agent_key: string; enabled: boolean; autonomy_mode: string; instructions?: string | null };
type Feature = { id: string; key: string; enabled: boolean };
type Engine = { agent_key: string; persona_name: string; make_scenario_id: number; enabled: boolean; status: string };
type ReadinessItem = { key: string; label: string; ok: boolean };
type ActivationData = {
  company: { id: string; name: string; whatsapp_phone_number_id?: string | null; status?: string | null };
  users: Array<{ email?: string | null; role?: string | null; last_sign_in_at?: string | null; must_change_password?: boolean | null }>;
  brain: Record<string, string | string[] | null> | null;
  agents: Agent[];
  features: Feature[];
  engines: Engine[];
  social_connections: Array<{ platform: string; connection_status: string; health_status?: string | null }>;
  lead_metrics: { total: number; won: number; lost: number; active_pipeline: number; avg_probability: number; estimated_value: number; with_probability: number; stage_counts: Array<{ stage: string; count: number }> };
  readiness: { score: number; items: ReadinessItem[]; whatsapp_warning?: string | null };
};

const PERSONAS: Record<string, { name: string; animal: string; title: string }> = {
  ai_sales: { name: "Leo", animal: "🦁", title: "Sales" },
  ai_marketing: { name: "Foxy", animal: "🦊", title: "Marketing" },
  ai_hr: { name: "Aero", animal: "🦅", title: "HR & Booking" },
  ai_support: { name: "Gor", animal: "🦍", title: "Support" },
  ai_inventory: { name: "Vexa", animal: "🐍", title: "Inventory" },
  ai_customer_care: { name: "Rex", animal: "🐕", title: "Customer Care" },
  ai_analytics: { name: "Nova", animal: "🐈", title: "Analytics" },
  ai_warehouse: { name: "Bruno", animal: "🐻", title: "Warehouse" },
};

const BRAIN_FIELDS = [
  ["industry", "Industry"],
  ["business_description", "Business description"],
  ["products_services", "Products / services"],
  ["target_audience", "Target audience"],
  ["brand_voice", "Brand voice"],
  ["locations", "Locations"],
  ["website_url", "Website"],
  ["social_notes", "Social notes"],
] as const;

export default function ClientLaunchCenter({ clientId }: { clientId: string }) {
  const [data, setData] = useState<ActivationData | null>(null);
  const [brain, setBrain] = useState<Record<string, string>>({});
  const [companyName, setCompanyName] = useState("");
  const [whatsappId, setWhatsappId] = useState("");
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    const response = await fetch(`/api/clients/${clientId}/activation`, { cache: "no-store" });
    if (!response.ok) {
      setError("Could not load client activation center.");
      setLoading(false);
      return;
    }
    const next = (await response.json()) as ActivationData;
    setData(next);
    setCompanyName(next.company.name || "");
    setWhatsappId(next.company.whatsapp_phone_number_id || "");
    setAgents(next.agents || []);
    const nextBrain: Record<string, string> = {};
    for (const [key] of BRAIN_FIELDS) {
      const value = next.brain?.[key];
      nextBrain[key] = Array.isArray(value) ? value.join(", ") : String(value || "");
    }
    nextBrain.languages = Array.isArray(next.brain?.languages) ? next.brain?.languages.join(", ") : String(next.brain?.languages || "ar, en");
    setBrain(nextBrain);
    setLoading(false);
  }

  useEffect(() => { load(); }, [clientId]);

  const enabledAgents = useMemo(() => agents.filter((agent) => agent.enabled).length, [agents]);
  const engineMap = useMemo(() => new Map((data?.engines || []).map((engine) => [engine.agent_key, engine])), [data?.engines]);

  async function patch(payload: Record<string, unknown>, label: string) {
    setSaving(label);
    setMessage(null);
    setError(null);
    const response = await fetch(`/api/clients/${clientId}/activation`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error || "Could not save changes.");
      setSaving(null);
      return;
    }
    setMessage("Saved. Client activation status refreshed.");
    setSaving(null);
    await load();
  }

  function updateAgent(agentKey: string, changes: Partial<Agent>) {
    setAgents((current) => current.map((agent) => agent.agent_key === agentKey ? { ...agent, ...changes } : agent));
  }

  if (loading) {
    return <Shell><div className="flex min-h-[55vh] items-center justify-center text-slate-400"><Loader2 className="mr-2 animate-spin" size={18} /> Loading client launch center...</div></Shell>;
  }

  if (!data) {
    return <Shell><div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-red-300">{error || "Client not found."}</div></Shell>;
  }

  return <Shell>
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/clients" className="mb-3 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"><ArrowLeft size={16} /> Back to clients</Link>
          <p className="text-xs font-black uppercase tracking-[.24em] text-cyan-300">King Admin / Client Launch Center</p>
          <h1 className="mt-2 text-3xl font-black text-white md:text-4xl">{data.company.name}</h1>
          <p className="mt-2 text-sm text-slate-400">Configure the client once, then let the agents run from the dashboard and connected channels.</p>
        </div>
        <div className="rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-5 text-center">
          <Gauge className="mx-auto text-cyan-300" size={28} />
          <div className="mt-2 text-4xl font-black text-white">{data.readiness.score}%</div>
          <div className="text-xs uppercase tracking-[.18em] text-cyan-200">Ready</div>
        </div>
      </div>

      {message && <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{message}</div>}
      {error && <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}

      <section className="grid gap-4 md:grid-cols-5">
        {data.readiness.items.map((item) => <div key={item.key} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold text-white">{item.label}</span>{item.ok ? <CheckCircle2 className="text-emerald-400" size={20} /> : <AlertTriangle className="text-amber-400" size={20} />}</div>
        </div>)}
      </section>

      <section className="grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 md:p-6">
          <div className="flex items-center gap-3"><Settings2 className="text-cyan-300" /><h2 className="text-xl font-bold">Client Basics</h2></div>
          <div className="mt-5 space-y-4">
            <Field label="Client name" value={companyName} onChange={setCompanyName} />
            <Field label="Meta WhatsApp Phone Number ID" value={whatsappId} onChange={setWhatsappId} placeholder="Example: 1201704893036247" />
            {data.readiness.whatsapp_warning && <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-200"><AlertTriangle className="mr-2 inline" size={16} />{data.readiness.whatsapp_warning}</div>}
            <button onClick={() => patch({ company: { name: companyName, whatsapp_phone_number_id: whatsappId || null } }, "basics")} disabled={saving !== null} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"><Save size={16} />{saving === "basics" ? "Saving..." : "Save Basics"}</button>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 md:p-6">
          <div className="flex items-center gap-3"><Brain className="text-cyan-300" /><h2 className="text-xl font-bold">Company Brain</h2></div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field label="Languages" value={brain.languages || ""} onChange={(value) => setBrain((current) => ({ ...current, languages: value }))} placeholder="ar, en" />
            {BRAIN_FIELDS.map(([key, label]) => <Area key={key} label={label} value={brain[key] || ""} onChange={(value) => setBrain((current) => ({ ...current, [key]: value }))} />)}
          </div>
          <button onClick={() => patch({ brain }, "brain")} disabled={saving !== null} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"><Save size={16} />{saving === "brain" ? "Saving..." : "Save Company Brain"}</button>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><div className="flex items-center gap-3"><Bot className="text-cyan-300" /><h2 className="text-xl font-bold">8 AI Agents</h2></div><p className="mt-1 text-sm text-slate-500">Enable agents and set autonomy mode without opening Supabase or Make.</p></div>
          <button onClick={() => patch({ activate_all: true }, "activate_all")} disabled={saving !== null} className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm font-bold text-emerald-300 disabled:opacity-50"><Power size={16} /> Activate All</button>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {agents.map((agent) => {
            const meta = PERSONAS[agent.agent_key] || { name: agent.agent_key, animal: "🤖", title: "Agent" };
            const engine = engineMap.get(agent.agent_key);
            return <div key={agent.agent_key} className="rounded-3xl border border-slate-800 bg-slate-950/70 p-4">
              <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-700 bg-slate-900 text-3xl">{meta.animal}</div><div><h3 className="font-black text-white">{meta.name}</h3><p className="text-xs text-cyan-300">{meta.title}</p></div></div><button onClick={() => updateAgent(agent.agent_key, { enabled: !agent.enabled })} className={`rounded-full px-3 py-1 text-xs font-bold ${agent.enabled ? "bg-emerald-500/15 text-emerald-300" : "bg-slate-800 text-slate-500"}`}>{agent.enabled ? "ON" : "OFF"}</button></div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs"><Badge ok={engine?.enabled && engine.status === "connected"} label="Make" /><Badge ok={agent.enabled} label="DB" /></div>
              <select value={agent.autonomy_mode || "approval"} onChange={(event) => updateAgent(agent.agent_key, { autonomy_mode: event.target.value })} className="mt-4 w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-cyan-500"><option value="approval">Approval</option><option value="automatic">Automatic</option><option value="manual">Manual</option></select>
            </div>;
          })}
        </div>
        <button onClick={() => patch({ agents }, "agents")} disabled={saving !== null} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"><Save size={16} />{saving === "agents" ? "Saving..." : `Save Agents (${enabledAgents}/8 enabled)`}</button>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_.8fr]">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 md:p-6">
          <div className="flex items-center gap-3"><BarChart3 className="text-cyan-300" /><h2 className="text-xl font-bold">Lead Health</h2></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Total Leads" value={data.lead_metrics.total} />
            <Metric label="Active Pipeline" value={data.lead_metrics.active_pipeline} />
            <Metric label="Won" value={data.lead_metrics.won} />
            <Metric label="Avg Probability" value={`${data.lead_metrics.avg_probability}%`} />
          </div>
          <div className="mt-5 space-y-3">{data.lead_metrics.stage_counts.map((stage) => <div key={stage.stage} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3"><div className="mb-2 flex items-center justify-between text-sm"><span className="capitalize text-slate-300">{stage.stage}</span><span className="font-bold text-white">{stage.count}</span></div><div className="h-2 rounded-full bg-slate-800"><div className="h-full rounded-full bg-cyan-500" style={{ width: `${data.lead_metrics.total ? Math.min(100, (stage.count / data.lead_metrics.total) * 100) : 0}%` }} /></div></div>)}</div>
        </div>
        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 md:p-6">
          <div className="flex items-center gap-3"><MessageCircle className="text-cyan-300" /><h2 className="text-xl font-bold">Channels</h2></div>
          <div className="mt-5 space-y-3">
            <Channel label="WhatsApp" ok={data.readiness.items.find((item) => item.key === "whatsapp")?.ok || false} value={data.company.whatsapp_phone_number_id || "Not set"} />
            {data.social_connections.map((item) => <Channel key={item.platform} label={item.platform} ok={item.connection_status === "connected" && item.health_status === "connected"} value={item.health_status || item.connection_status} />)}
            {data.social_connections.length === 0 && <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-500">No social channels connected yet.</div>}
          </div>
        </div>
      </section>
    </div>
  </Shell>;
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-slate-950 text-white"><Sidebar /><div className="min-h-screen md:ml-64"><DashboardHeader /><main className="p-4 md:p-7">{children}</main></div></div>;
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <label className="block"><span className="text-xs font-bold uppercase tracking-[.14em] text-slate-500">{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-cyan-500" /></label>;
}

function Area({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block md:col-span-2"><span className="text-xs font-bold uppercase tracking-[.14em] text-slate-500">{label}</span><textarea value={value} onChange={(event) => onChange(event.target.value)} rows={3} className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm leading-6 outline-none focus:border-cyan-500" /></label>;
}

function Badge({ ok, label }: { ok?: boolean; label: string }) {
  return <div className={`rounded-xl border px-3 py-2 text-center ${ok ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : "border-amber-500/20 bg-amber-500/10 text-amber-300"}`}>{label} {ok ? "OK" : "Check"}</div>;
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-2xl font-black text-white">{value}</p></div>;
}

function Channel({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-4"><div><p className="text-sm font-bold capitalize text-white">{label}</p><p className="mt-1 text-xs text-slate-500">{value}</p></div>{ok ? <CheckCircle2 className="text-emerald-400" size={20} /> : <AlertTriangle className="text-amber-400" size={20} />}</div>;
}
