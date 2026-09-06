"use client";

import { useEffect, useMemo, useState, type DragEvent, type ChangeEvent } from "react";
import Sidebar from "./Sidebar";
import DashboardHeader from "./DashboardHeader";
import {
  Activity,
  Bot,
  Brain,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Database,
  FileText,
  Grip,
  MessageSquare,
  Play,
  RotateCcw,
  Save,
  Send,
  Settings,
  ShieldCheck,
  Upload,
  Users,
  type LucideIcon,
} from "lucide-react";

type Agent = "sales" | "hr" | "support";
type Tab = "command" | "workflow";
type NodeType = "trigger" | "brain" | "memory" | "crm" | "action" | "approval" | "output";
type WorkflowNode = { id: string; label: string; type: NodeType; x: number; y: number };
type WorkflowConnection = { from: string; to: string };
type WorkflowLayout = { nodes: WorkflowNode[]; connections: WorkflowConnection[] };
type LiveRun = { id: string; action: string | null; status: string; input?: unknown; output?: unknown; error_message: string | null; created_at: string; completed_at: string | null };
type AgentMeta = { name: string; animal: string; title: string; line: string; mission: string; quote: string; icon: LucideIcon; layout: WorkflowLayout; stats: { label: string; value: string; icon: LucideIcon }[]; defaultTask: string };

const layouts: Record<Agent, WorkflowLayout> = {
  sales: {
    nodes: [
      { id: "inbox", label: "WhatsApp Inbox", type: "trigger", x: 35, y: 105 },
      { id: "brain", label: "Company Brain", type: "brain", x: 235, y: 55 },
      { id: "memory", label: "Customer Memory", type: "memory", x: 235, y: 200 },
      { id: "crm", label: "CRM Desk", type: "crm", x: 470, y: 125 },
      { id: "quote", label: "Quotation", type: "action", x: 675, y: 65 },
      { id: "reply", label: "Reply Sent", type: "output", x: 675, y: 220 },
    ],
    connections: [{ from: "inbox", to: "brain" }, { from: "brain", to: "memory" }, { from: "memory", to: "crm" }, { from: "crm", to: "quote" }, { from: "crm", to: "reply" }],
  },
  hr: {
    nodes: [
      { id: "request", label: "Booking / HR Request", type: "trigger", x: 35, y: 110 },
      { id: "calendar", label: "Calendar Planner", type: "action", x: 245, y: 55 },
      { id: "rules", label: "Company Rules", type: "brain", x: 245, y: 205 },
      { id: "schedule", label: "Schedule Match", type: "crm", x: 495, y: 125 },
      { id: "confirm", label: "Confirm & Remind", type: "output", x: 700, y: 125 },
    ],
    connections: [{ from: "request", to: "calendar" }, { from: "request", to: "rules" }, { from: "calendar", to: "schedule" }, { from: "rules", to: "schedule" }, { from: "schedule", to: "confirm" }],
  },
  support: {
    nodes: [
      { id: "ticket", label: "Ticket Inbox", type: "trigger", x: 35, y: 110 },
      { id: "history", label: "Customer History", type: "memory", x: 245, y: 55 },
      { id: "knowledge", label: "Knowledge Base", type: "brain", x: 245, y: 205 },
      { id: "solution", label: "Solution Desk", type: "action", x: 500, y: 135 },
      { id: "close", label: "Close Loop", type: "output", x: 710, y: 135 },
    ],
    connections: [{ from: "ticket", to: "history" }, { from: "ticket", to: "knowledge" }, { from: "history", to: "solution" }, { from: "knowledge", to: "solution" }, { from: "solution", to: "close" }],
  },
};

const agents: Record<Agent, AgentMeta> = {
  sales: { name: "Leo", animal: "🦁", title: "Sales Agent", line: "The Opportunity Hunter", mission: "Qualify leads, follow up automatically, turn inquiries into customers and schedule meetings.", quote: "More customers. Bigger opportunities.", icon: Bot, layout: layouts.sales, defaultTask: "Qualify a new WhatsApp lead, ask only the next missing detail and update the CRM next action.", stats: [{ label: "Channel", value: "WhatsApp", icon: MessageSquare }, { label: "CRM", value: "Live", icon: Database }, { label: "Mode", value: "Tenant brain", icon: Brain }] },
  hr: { name: "Aero", animal: "🦅", title: "Booking Agent", line: "The Planner", mission: "Manage bookings, confirmations, reminders, scheduling and organized business planning.", quote: "A fuller calendar. A smoother business.", icon: CalendarClock, layout: layouts.hr, defaultTask: "Plan a booking flow for a client request, confirm the next step and prepare a reminder.", stats: [{ label: "Bookings", value: "Ready", icon: CalendarClock }, { label: "Rules", value: "Controlled", icon: ShieldCheck }, { label: "Mode", value: "Approval", icon: CheckCircle2 }] },
  support: { name: "Gor", animal: "🦍", title: "Support Agent", line: "The Problem Solver", mission: "Handle customer questions, solve issues, provide product support and keep customers happy.", quote: "Happier customers. Stronger loyalty.", icon: HeadphonesIcon, layout: layouts.support, defaultTask: "Solve a customer support question using the saved company brain and respond with a clear next step.", stats: [{ label: "Tickets", value: "Watching", icon: MessageSquare }, { label: "Knowledge", value: "Loaded", icon: FileText }, { label: "Mode", value: "Real runs", icon: Activity }] },
};

function HeadphonesIcon(props: React.ComponentProps<LucideIcon>) { return <ShieldCheck {...props} />; }

const nodeIcons: Record<NodeType, LucideIcon> = { trigger: MessageSquare, brain: Brain, memory: Database, crm: Database, action: ClipboardList, approval: CheckCircle2, output: Send };

export default function AiDepartmentWorkspace({ agent, title }: { agent: Agent; title?: string }) {
  const meta = agents[agent];
  const [tab, setTab] = useState<Tab>("command");
  const [form, setForm] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<Array<{ id: string; file_name?: string; created_at?: string }>>([]);
  const [layout, setLayout] = useState<WorkflowLayout>(meta.layout);
  const [runs, setRuns] = useState<LiveRun[]>([]);
  const [saving, setSaving] = useState(false);
  const [workflowDirty, setWorkflowDirty] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [testTask, setTestTask] = useState(meta.defaultTask);
  const [message, setMessage] = useState("");
  const displayTitle = title || `${meta.name} ${meta.title}`;
  const latestRun = runs[0];
  const activeNode = activeNodeFor(agent, latestRun);

  async function load() {
    const [profileRes, filesRes, workflowRes, runsRes] = await Promise.all([
      fetch(`/api/ai-departments/${agent}`, { cache: "no-store" }),
      fetch(`/api/ai-departments/${agent}/knowledge`, { cache: "no-store" }),
      fetch(`/api/ai-departments/${agent}/workflow`, { cache: "no-store" }),
      fetch(`/api/ai-departments/${agent}/runs`, { cache: "no-store" }),
    ]);
    if (profileRes.ok) {
      const data = await profileRes.json();
      setForm({ ...(data.company_profile || {}), ...(data.config || {}) });
    }
    if (filesRes.ok) setFiles((await filesRes.json()).files || []);
    if (workflowRes.ok) {
      const data = await workflowRes.json();
      setLayout(data.layout?.nodes?.length ? data.layout : meta.layout);
      setWorkflowDirty(false);
    }
    if (runsRes.ok) setRuns((await runsRes.json()).runs || []);
  }

  async function loadRuns() {
    const response = await fetch(`/api/ai-departments/${agent}/runs`, { cache: "no-store" });
    if (response.ok) setRuns((await response.json()).runs || []);
  }

  useEffect(() => { setLayout(meta.layout); setTestTask(meta.defaultTask); load(); }, [agent]);
  useEffect(() => { const timer = window.setInterval(loadRuns, 6000); return () => window.clearInterval(timer); }, [agent]);

  function setField(key: string, value: string) { setForm((current) => ({ ...current, [key]: value })); }

  async function saveBrain() {
    setSaving(true); setMessage("");
    const response = await fetch(`/api/ai-departments/${agent}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setSaving(false);
    setMessage(response.ok ? "Agent brain saved." : "Could not save agent brain.");
    await load();
  }

  async function saveWorkflow() {
    setSaving(true); setMessage("");
    const response = await fetch(`/api/ai-departments/${agent}/workflow`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ layout }) });
    setSaving(false);
    setWorkflowDirty(!response.ok);
    setMessage(response.ok ? "Workflow layout saved." : "Could not save workflow layout.");
  }

  async function upload(file?: File) {
    if (!file) return;
    setUploading(true); setMessage("");
    const data = new FormData(); data.append("file", file);
    const response = await fetch(`/api/ai-departments/${agent}/knowledge`, { method: "POST", body: data });
    setUploading(false);
    setMessage(response.ok ? "Knowledge file uploaded." : "Could not upload file.");
    await load();
  }

  async function runTest() {
    if (!testTask.trim()) return;
    setMessage("Running real test...");
    await fetch(`/api/ai-departments/${agent}/run`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ task: testTask, channel: "dashboard", content_type: "workflow_test" }) });
    await loadRuns();
    setMessage("Real test sent. Live runs will refresh automatically.");
  }

  function moveNode(id: string, event: DragEvent<HTMLDivElement>) {
    const rect = event.currentTarget.parentElement?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.max(10, Math.min(760, event.clientX - rect.left - 70));
    const y = Math.max(10, Math.min(260, event.clientY - rect.top - 28));
    setLayout((current) => ({ ...current, nodes: current.nodes.map((node) => node.id === id ? { ...node, x, y } : node) }));
    setWorkflowDirty(true);
  }

  const instructions = useMemo(() => form.instructions || `You are ${meta.name}, the ${meta.title} for this client company. Work only from this tenant company brain, approved knowledge and tenant-scoped records. Never reveal Make, Supabase, Gemini, automation internals or AVERO OS to end customers unless the tenant itself is AVERO. Keep replies short, useful and human.`, [form.instructions, meta.name, meta.title]);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Sidebar />
      <div className="ml-64 min-h-screen">
        <DashboardHeader />
        <main className="p-7">
          <div className="mx-auto max-w-7xl space-y-6">
            <section className="overflow-hidden rounded-3xl border border-cyan-400/20 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,.14),transparent_35%),#020617] p-6 shadow-2xl">
              <div className="grid gap-6 xl:grid-cols-[1fr_.75fr]">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[.28em] text-cyan-300">AVERO OS AI Agent</p>
                  <div className="mt-4 flex flex-wrap items-center gap-4"><div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-cyan-400/30 bg-cyan-400/10 text-5xl shadow-[0_0_35px_rgba(34,211,238,.18)]">{meta.animal}</div><div><h1 className="text-4xl font-black tracking-tight">{displayTitle}</h1><p className="mt-1 text-sm font-semibold uppercase tracking-[.18em] text-cyan-300">{meta.line}</p></div></div>
                  <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-300">{meta.mission}</p>
                  <p className="mt-4 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4 text-sm font-semibold text-cyan-100">“{meta.quote}”</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                  {meta.stats.map((stat) => <Stat key={stat.label} {...stat} />)}
                </div>
              </div>
            </section>

            <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-2">
              <button onClick={() => setTab("command")} className={`rounded-xl px-4 py-2 text-sm font-semibold ${tab === "command" ? "bg-cyan-600" : "text-slate-400 hover:bg-slate-800"}`}><Settings className="mr-2 inline" size={15} /> Easy Settings</button>
              <button onClick={() => setTab("workflow")} className={`rounded-xl px-4 py-2 text-sm font-semibold ${tab === "workflow" ? "bg-cyan-600" : "text-slate-400 hover:bg-slate-800"}`}><Bot className="mr-2 inline" size={15} /> Workflow & Runs</button>
              <button onClick={load} className="ml-auto rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">Refresh</button>
            </div>

            {message && <div className="rounded-2xl border border-cyan-400/25 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100">{message}</div>}

            {tab === "command" ? (
              <div className="grid gap-6 xl:grid-cols-[1fr_.7fr]">
                <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
                  <h2 className="text-xl font-bold">Company Brain</h2>
                  <p className="mt-2 text-sm text-slate-500">Simple setup for the business this agent works inside.</p>
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <Field label="Industry" value={form.industry || ""} onChange={(value) => setField("industry", value)} />
                    <Field label="Locations" value={form.locations || ""} onChange={(value) => setField("locations", value)} />
                    <Area label="Business description" value={form.business_description || ""} onChange={(value) => setField("business_description", value)} />
                    <Area label="Products / Services" value={form.products_services || ""} onChange={(value) => setField("products_services", value)} />
                    <Area label="Target audience" value={form.target_audience || ""} onChange={(value) => setField("target_audience", value)} />
                    <Area label="Brand voice" value={form.brand_voice || ""} onChange={(value) => setField("brand_voice", value)} />
                    <Field label="Website" value={form.website_url || ""} onChange={(value) => setField("website_url", value)} />
                    <Field label="Autonomy mode" value={form.autonomy_mode || "approval"} onChange={(value) => setField("autonomy_mode", value)} />
                  </div>
                </section>
                <aside className="space-y-6">
                  <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
                    <h2 className="text-xl font-bold">Agent Command</h2>
                    <textarea value={instructions} onChange={(event) => setField("instructions", event.target.value)} rows={11} className="mt-4 w-full rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm leading-6 outline-none focus:border-cyan-500" />
                    <button onClick={saveBrain} disabled={saving} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-bold disabled:opacity-60"><Save size={16} />{saving ? "Saving..." : "Save Agent Settings"}</button>
                  </section>
                  <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
                    <h2 className="text-xl font-bold">Knowledge Files</h2>
                    <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-700 bg-slate-950 p-5 text-sm text-slate-300 hover:border-cyan-400"><Upload size={16} /> {uploading ? "Uploading..." : "Upload PDF knowledge"}<input type="file" accept="application/pdf" className="hidden" onChange={(event: ChangeEvent<HTMLInputElement>) => upload(event.target.files?.[0])} /></label>
                    <div className="mt-4 space-y-2">{files.slice(0, 5).map((file) => <div key={file.id} className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-400">{file.file_name || "Knowledge file"}</div>)}{files.length === 0 && <p className="text-sm text-slate-500">No files uploaded yet.</p>}</div>
                  </section>
                </aside>
              </div>
            ) : (
              <div className="grid gap-6 xl:grid-cols-[1fr_.65fr]">
                <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">Drag & Drop Workflow</h2><p className="mt-1 text-sm text-slate-500">Move the blocks like Make. The layout is saved per company and per agent.</p></div><div className="flex gap-2"><button onClick={() => { setLayout(meta.layout); setWorkflowDirty(true); }} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"><RotateCcw size={15} />Reset</button><button onClick={saveWorkflow} disabled={!workflowDirty || saving} className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-bold disabled:opacity-50"><Save size={15} />Save Workflow</button></div></div>
                  <div className="relative mt-5 h-[340px] overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/80">
                    <svg className="absolute inset-0 h-full w-full">{layout.connections.map((connection) => { const from = layout.nodes.find((node) => node.id === connection.from); const to = layout.nodes.find((node) => node.id === connection.to); if (!from || !to) return null; return <line key={`${connection.from}-${connection.to}`} x1={from.x + 70} y1={from.y + 28} x2={to.x + 70} y2={to.y + 28} stroke="rgba(34,211,238,.38)" strokeWidth="2" strokeDasharray="7 7" />; })}</svg>
                    {layout.nodes.map((node) => <WorkflowNodeCard key={node.id} node={node} active={activeNode === node.id} onDrop={(event) => moveNode(node.id, event)} />)}
                  </div>
                </section>
                <aside className="space-y-6">
                  <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
                    <h2 className="text-xl font-bold">Run Real Test</h2>
                    <textarea value={testTask} onChange={(event) => setTestTask(event.target.value)} rows={5} className="mt-4 w-full rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm outline-none focus:border-cyan-500" />
                    <button onClick={runTest} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-bold"><Play size={16} />Run Real Test</button>
                  </section>
                  <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
                    <h2 className="text-xl font-bold">Latest Real Runs</h2>
                    <div className="mt-4 space-y-3">{runs.slice(0, 6).map((run) => <div key={run.id} className="rounded-2xl border border-slate-800 bg-slate-950 p-3"><div className="flex items-center justify-between gap-2"><span className="text-xs font-bold text-cyan-200">{run.action || "agent_run"}</span><span className="rounded-full bg-slate-800 px-2 py-1 text-[10px] uppercase text-slate-300">{run.status}</span></div><p className="mt-2 text-[11px] text-slate-500">{new Date(run.created_at).toLocaleString()}</p>{run.error_message && <p className="mt-2 text-xs text-red-300">{run.error_message}</p>}</div>)}{runs.length === 0 && <p className="text-sm text-slate-500">No runs yet.</p>}</div>
                  </section>
                </aside>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function activeNodeFor(agent: Agent, run?: LiveRun) { if (!run) return agent === "sales" ? "inbox" : agent === "hr" ? "request" : "ticket"; if (run.status === "failed") return agent === "sales" ? "crm" : agent === "hr" ? "schedule" : "solution"; if (run.status === "completed") return agent === "sales" ? "reply" : agent === "hr" ? "confirm" : "close"; return agent === "sales" ? "brain" : agent === "hr" ? "calendar" : "knowledge"; }
function Stat({ label, value, icon: Icon }: { label: string; value: string; icon: LucideIcon }) { return <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4"><Icon className="text-cyan-300" size={19} /><p className="mt-3 text-xs text-slate-500">{label}</p><p className="text-lg font-black">{value}</p></div>; }
function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="block"><span className="text-xs font-semibold uppercase tracking-[.15em] text-slate-500">{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-cyan-500" /></label>; }
function Area({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="block"><span className="text-xs font-semibold uppercase tracking-[.15em] text-slate-500">{label}</span><textarea value={value} onChange={(event) => onChange(event.target.value)} rows={4} className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm leading-6 outline-none focus:border-cyan-500" /></label>; }
function WorkflowNodeCard({ node, active, onDrop }: { node: WorkflowNode; active: boolean; onDrop: (event: DragEvent<HTMLDivElement>) => void }) { const Icon = nodeIcons[node.type]; return <div draggable onDragEnd={onDrop} className={`absolute flex w-[150px] cursor-grab items-center gap-3 rounded-2xl border p-3 shadow-xl transition ${active ? "border-cyan-300 bg-cyan-500/20 shadow-cyan-500/20" : "border-slate-700 bg-slate-900"}`} style={{ left: node.x, top: node.y }}><Grip size={14} className="text-slate-500" /><Icon size={18} className="text-cyan-300" /><div><p className="text-xs font-bold">{node.label}</p><p className="text-[10px] uppercase text-slate-500">{node.type}</p></div></div>; }
