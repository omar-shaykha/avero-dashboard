"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "./Sidebar";
import DashboardHeader from "./DashboardHeader";
import { AlertTriangle, CalendarClock, CheckCircle2, Facebook, Megaphone, PenTool, Play, RefreshCw, Rocket, Send, Sparkles, ThumbsUp, Wand2, type LucideIcon } from "lucide-react";

type Platform = "facebook" | "instagram" | "tiktok" | "snapchat";
type Tab = "studio" | "queue" | "channels" | "live";
type Connection = { id?: string; platform: Platform; account_name?: string | null; connection_status: string; health_status?: string | null };
type ContentItem = { id: string; campaign_name?: string | null; objective?: string | null; audience?: string | null; budget?: number | null; currency?: string | null; creative_brief?: string | null; channel: string; platforms?: string[]; content_type: string; caption?: string | null; media_url?: string | null; hashtags?: string[]; scheduled_for?: string | null; status: string; approval_notes?: string | null; published_at?: string | null; error_message?: string | null; metrics?: Record<string, unknown>; created_at: string };
type Run = { id: string; action: string; status: string; error_message?: string | null; created_at: string; completed_at?: string | null };

const platforms: { id: Platform; label: string; icon: LucideIcon; description: string }[] = [
  { id: "facebook", label: "Facebook", icon: Facebook, description: "Posts, campaigns, page content" },
  { id: "instagram", label: "Instagram", icon: Sparkles, description: "Captions, reels, stories" },
  { id: "tiktok", label: "TikTok", icon: Play, description: "Short video hooks and campaign ideas" },
  { id: "snapchat", label: "Snapchat", icon: Rocket, description: "Stories, quick offers and ads" },
];

const defaultForm = {
  platforms: ["facebook", "instagram"] as Platform[],
  objective: "Generate qualified leads for AVERO OS",
  audience: "Business owners and companies that need POS, CRM, operations automation and AI agents",
  budget: "",
  currency: "SAR",
  content_type: "post",
  creative_brief: "Create a premium campaign showing that AVERO OS runs the business from one smart platform: POS, CRM, inventory, operations and AI agents.",
};

export default function MarketingDepartmentWorkspace() {
  const [tab, setTab] = useState<Tab>("studio");
  const [connections, setConnections] = useState<Connection[]>([]);
  const [items, setItems] = useState<ContentItem[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState("");

  const connectedCount = connections.filter((connection) => connection.connection_status === "connected").length;
  const pendingApprovals = items.filter((item) => ["approval_required", "draft", "idea"].includes(item.status)).length;
  const scheduled = items.filter((item) => item.status === "scheduled").length;
  const latestCaption = useMemo(() => items[0]?.caption || "No campaign generated yet.", [items]);

  async function load() {
    setLoading(true);
    const [connectionsRes, queueRes, runsRes] = await Promise.all([
      fetch("/api/marketing/social-connections", { cache: "no-store" }),
      fetch("/api/marketing/content", { cache: "no-store" }),
      fetch("/api/ai-departments/marketing/runs", { cache: "no-store" }),
    ]);
    if (connectionsRes.ok) setConnections((await connectionsRes.json()).connections || []);
    if (queueRes.ok) setItems((await queueRes.json()).items || []);
    if (runsRes.ok) setRuns((await runsRes.json()).runs || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function togglePlatform(platform: Platform) {
    setForm((current) => {
      const exists = current.platforms.includes(platform);
      return { ...current, platforms: exists ? current.platforms.filter((item) => item !== platform) : [...current.platforms, platform] };
    });
  }

  async function generateCampaign() {
    setGenerating(true); setMessage("");
    const response = await fetch("/api/marketing/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setGenerating(false);
    if (!response.ok) { const payload = await response.json().catch(() => ({})); setMessage(payload.error || "Generation failed"); return; }
    setMessage("Foxy generated a campaign and moved it to approval queue.");
    setTab("queue"); await load();
  }

  async function updateItem(id: string, action: string, scheduled_for?: string) {
    setMessage("");
    const response = await fetch(`/api/marketing/content/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, scheduled_for }) });
    if (!response.ok) { const payload = await response.json().catch(() => ({})); setMessage(payload.error || "Action failed"); return; }
    await load();
  }

  return <div className="min-h-screen bg-slate-950 text-white"><Sidebar /><div className="ml-64 min-h-screen"><DashboardHeader /><main className="p-7"><div className="mx-auto max-w-7xl space-y-6">
    <section className="overflow-hidden rounded-3xl border border-violet-500/20 bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,.16),transparent_38%),#020617] p-6 shadow-2xl"><div className="grid gap-6 xl:grid-cols-[1fr_.85fr]"><div><p className="text-xs font-bold uppercase tracking-[.28em] text-violet-300">AVERO OS AI Agent</p><div className="mt-4 flex flex-wrap items-center gap-4"><div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-violet-400/30 bg-violet-400/10 text-5xl">🦊</div><div><h1 className="text-4xl font-black tracking-tight">Foxy Marketing Agent</h1><p className="mt-1 text-sm font-semibold uppercase tracking-[.18em] text-violet-300">The Growth Creator</p></div></div><p className="mt-5 max-w-2xl text-sm leading-7 text-slate-300">Creates content, prepares campaigns, manages social channels, suggests new ideas and sends every post to approval before publishing.</p><p className="mt-4 rounded-2xl border border-violet-400/20 bg-violet-400/10 p-4 text-sm font-semibold text-violet-100">“More reach. More customers. A stronger brand.”</p></div><div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1"><Stat label="Channels" value={`${connectedCount}/4 connected`} icon={Megaphone} /><Stat label="Approvals" value={`${pendingApprovals}`} icon={ThumbsUp} /><Stat label="Scheduled" value={`${scheduled}`} icon={CalendarClock} /></div></div></section>
    <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-2"><TabButton active={tab === "studio"} onClick={() => setTab("studio")} text="Campaign Builder" /><TabButton active={tab === "queue"} onClick={() => setTab("queue")} text="Approval Queue" /><TabButton active={tab === "channels"} onClick={() => setTab("channels")} text="Channels" /><TabButton active={tab === "live"} onClick={() => setTab("live")} text="Live Runs" /><button onClick={load} className="ml-auto inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"><RefreshCw size={15} />Refresh</button></div>
    {message && <div className="rounded-2xl border border-violet-500/30 bg-violet-500/10 px-4 py-3 text-sm text-violet-100">{message}</div>}
    {loading && <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 text-slate-400">Loading Foxy...</div>}
    {tab === "studio" && <section className="grid gap-6 xl:grid-cols-[.9fr_1.1fr]"><div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6"><div className="flex items-center gap-3"><div className="rounded-2xl bg-violet-500/10 p-3 text-violet-300"><Wand2 /></div><div><h2 className="text-xl font-bold">Easy Campaign Builder</h2><p className="text-sm text-slate-500">Pick platforms, objective and brief. Foxy creates a ready campaign and sends it to approval.</p></div></div><div className="mt-6 grid gap-3 sm:grid-cols-2">{platforms.map((platform) => { const selected = form.platforms.includes(platform.id); const Icon = platform.icon; return <button key={platform.id} onClick={() => togglePlatform(platform.id)} className={`rounded-2xl border p-4 text-left transition ${selected ? "border-violet-400 bg-violet-500/10" : "border-slate-800 bg-slate-950 hover:border-slate-600"}`}><div className="flex items-center justify-between"><Icon className="text-violet-300" size={22} />{selected && <CheckCircle2 className="text-emerald-300" size={18} />}</div><p className="mt-3 font-bold">{platform.label}</p><p className="mt-1 text-xs text-slate-500">{platform.description}</p></button>; })}</div><div className="mt-5 space-y-4"><Field label="Campaign objective" value={form.objective} onChange={(value) => setForm({ ...form, objective: value })} /><Field label="Target audience" value={form.audience} onChange={(value) => setForm({ ...form, audience: value })} /><div className="grid grid-cols-2 gap-3"><Field label="Budget" value={form.budget} onChange={(value) => setForm({ ...form, budget: value })} /><Field label="Currency" value={form.currency} onChange={(value) => setForm({ ...form, currency: value })} /></div><Area label="Creative brief" value={form.creative_brief} onChange={(value) => setForm({ ...form, creative_brief: value })} /></div><button onClick={generateCampaign} disabled={generating} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-bold hover:bg-violet-500 disabled:opacity-60"><Sparkles size={17} />{generating ? "Generating..." : "Generate Campaign"}</button></div><div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6"><div className="flex items-center gap-3"><div className="rounded-2xl bg-slate-800 p-3 text-violet-300"><PenTool /></div><div><h2 className="text-xl font-bold">Latest Creative Output</h2><p className="text-sm text-slate-500">Preview of the latest campaign.</p></div></div><div className="mt-5 min-h-[300px] whitespace-pre-wrap rounded-2xl border border-slate-800 bg-slate-950 p-5 text-sm leading-7 text-slate-200">{latestCaption}</div></div></section>}
    {tab === "queue" && <section className="grid gap-4">{items.length === 0 ? <Empty text="No marketing content yet." /> : items.map((item) => <QueueCard key={item.id} item={item} onAction={updateItem} />)}</section>}
    {tab === "channels" && <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{connections.map((connection) => <ConnectionCard key={connection.platform} connection={connection} />)}</section>}
    {tab === "live" && <section className="grid gap-4">{runs.length === 0 ? <Empty text="No marketing AI runs yet." /> : runs.map((run) => <RunCard key={run.id} run={run} />)}</section>}
  </div></main></div></div>;
}

function TabButton({ active, onClick, text }: { active: boolean; onClick: () => void; text: string }) { return <button onClick={onClick} className={`rounded-xl px-4 py-2 text-sm font-semibold ${active ? "bg-violet-600 text-white" : "text-slate-400 hover:bg-slate-800"}`}>{text}</button>; }
function Stat({ label, value, icon: Icon }: { label: string; value: string; icon: LucideIcon }) { return <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"><Icon className="text-violet-300" size={20} /><p className="mt-3 text-xs text-slate-500">{label}</p><p className="text-lg font-black">{value}</p></div>; }
function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="block"><span className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span><input value={value || ""} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm outline-none focus:border-violet-500" /></label>; }
function Area({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="block"><span className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span><textarea value={value || ""} onChange={(event) => onChange(event.target.value)} rows={6} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm leading-6 outline-none focus:border-violet-500" /></label>; }
function QueueCard({ item, onAction }: { item: ContentItem; onAction: (id: string, action: string, scheduled_for?: string) => void }) { const [date, setDate] = useState(item.scheduled_for ? item.scheduled_for.slice(0, 16) : ""); return <article className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5"><div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between"><div className="max-w-3xl"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-violet-500/10 px-3 py-1 text-xs font-bold text-violet-300">{item.status}</span>{(item.platforms || [item.channel]).map((platform) => <span key={platform} className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">{platform}</span>)}</div><h3 className="mt-3 text-lg font-black">{item.campaign_name || item.objective || "Untitled campaign"}</h3><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">{item.caption || "No caption"}</p>{item.hashtags?.length ? <p className="mt-3 text-sm text-violet-300">{item.hashtags.map((tag) => `#${tag.replace(/^#/, "")}`).join(" ")}</p> : null}</div><div className="min-w-[280px] space-y-3 rounded-2xl border border-slate-800 bg-slate-950 p-4"><label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Schedule</label><input type="datetime-local" value={date} onChange={(event) => setDate(event.target.value)} className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm" /><div className="grid grid-cols-2 gap-2"><button onClick={() => onAction(item.id, "approve")} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold hover:bg-emerald-500"><CheckCircle2 className="mr-1 inline" size={14} />Approve</button><button onClick={() => onAction(item.id, "schedule", date)} className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold hover:bg-blue-500"><CalendarClock className="mr-1 inline" size={14} />Schedule</button><button onClick={() => onAction(item.id, "publish")} className="rounded-xl bg-violet-600 px-3 py-2 text-xs font-bold hover:bg-violet-500"><Send className="mr-1 inline" size={14} />Publish</button><button onClick={() => onAction(item.id, "reject")} className="rounded-xl bg-slate-800 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-700"><AlertTriangle className="mr-1 inline" size={14} />Reject</button></div></div></div></article>; }
function ConnectionCard({ connection }: { connection: Connection }) { const meta = platforms.find((platform) => platform.id === connection.platform) || platforms[0]; const Icon = meta.icon; const connected = connection.connection_status === "connected"; return <article className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5"><div className="flex items-center justify-between"><Icon className="text-violet-300" size={24} /><span className={`rounded-full px-3 py-1 text-xs font-bold ${connected ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>{connection.connection_status}</span></div><h3 className="mt-4 text-lg font-black">{meta.label}</h3><p className="mt-2 text-sm text-slate-400">{connection.account_name || "AVERO account pending connection"}</p><p className="mt-4 text-xs leading-5 text-slate-500">{connection.health_status || "Ready for official connection."}</p></article>; }
function RunCard({ run }: { run: Run }) { return <article className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4"><div className="flex items-center justify-between gap-3"><div><p className="font-bold">{run.action}</p><p className="text-xs text-slate-500">{new Date(run.created_at).toLocaleString()}</p></div><span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-bold text-slate-300">{run.status}</span></div>{run.error_message && <p className="mt-2 text-sm text-red-300">{run.error_message}</p>}</article>; }
function Empty({ text }: { text: string }) { return <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8 text-center text-slate-400">{text}</div>; }
