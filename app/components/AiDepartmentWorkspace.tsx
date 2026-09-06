"use client";

import { useEffect, useMemo, useState, type DragEvent } from "react";
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
  PenTool,
  Play,
  RotateCcw,
  Save,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Upload,
  Users,
  type LucideIcon,
} from "lucide-react";

type Agent = "sales" | "marketing" | "hr" | "support";
type Tab = "command" | "workflow";
type NodeType = "trigger" | "brain" | "memory" | "crm" | "action" | "approval" | "output";
type WorkflowNode = { id: string; label: string; type: NodeType; x: number; y: number };
type WorkflowConnection = { from: string; to: string };
type WorkflowLayout = { nodes: WorkflowNode[]; connections: WorkflowConnection[] };
type LiveRun = { id: string; action: string | null; status: string; input: any; output: any; error_message: string | null; created_at: string; completed_at: string | null };

type AgentMeta = {
  title: string;
  mission: string;
  accent: string;
  icon: LucideIcon;
  stats: { label: string; value: string; icon: LucideIcon }[];
  layout: WorkflowLayout;
};

const LAYOUTS: Record<Agent, WorkflowLayout> = {
  sales: {
    nodes: [
      { id: "inbox", label: "WhatsApp Inbox", type: "trigger", x: 40, y: 90 },
      { id: "brain", label: "Company Brain", type: "brain", x: 260, y: 45 },
      { id: "memory", label: "Customer Memory", type: "memory", x: 260, y: 190 },
      { id: "crm", label: "CRM Desk", type: "crm", x: 500, y: 120 },
      { id: "quote", label: "Quotation", type: "action", x: 710, y: 70 },
      { id: "reply", label: "Reply Sent", type: "output", x: 710, y: 220 },
    ],
    connections: [{ from: "inbox", to: "brain" }, { from: "brain", to: "memory" }, { from: "memory", to: "crm" }, { from: "crm", to: "quote" }, { from: "crm", to: "reply" }],
  },
  marketing: {
    nodes: [
      { id: "brief", label: "Campaign Brief", type: "trigger", x: 40, y: 110 },
      { id: "brand", label: "Brand Voice", type: "brain", x: 260, y: 65 },
      { id: "content", label: "Content Desk", type: "action", x: 500, y: 95 },
      { id: "approval", label: "Approval Queue", type: "approval", x: 720, y: 65 },
      { id: "publish", label: "Publish / Schedule", type: "output", x: 720, y: 220 },
    ],
    connections: [{ from: "brief", to: "brand" }, { from: "brand", to: "content" }, { from: "content", to: "approval" }, { from: "approval", to: "publish" }],
  },
  hr: {
    nodes: [
      { id: "cv", label: "CV Inbox", type: "trigger", x: 40, y: 110 },
      { id: "screen", label: "Screening", type: "action", x: 260, y: 70 },
      { id: "match", label: "Job Match", type: "crm", x: 500, y: 110 },
      { id: "interview", label: "Interview", type: "action", x: 720, y: 70 },
      { id: "reply", label: "HR Reply", type: "output", x: 720, y: 220 },
    ],
    connections: [{ from: "cv", to: "screen" }, { from: "screen", to: "match" }, { from: "match", to: "interview" }, { from: "match", to: "reply" }],
  },
  support: {
    nodes: [
      { id: "ticket", label: "Ticket Inbox", type: "trigger", x: 40, y: 110 },
      { id: "history", label: "Customer History", type: "memory", x: 260, y: 65 },
      { id: "knowledge", label: "Knowledge Base", type: "brain", x: 260, y: 220 },
      { id: "solution", label: "Solution Desk", type: "action", x: 500, y: 140 },
      { id: "close", label: "Close Loop", type: "output", x: 720, y: 140 },
    ],
    connections: [{ from: "ticket", to: "history" }, { from: "ticket", to: "knowledge" }, { from: "history", to: "solution" }, { from: "knowledge", to: "solution" }, { from: "solution", to: "close" }],
  },
};

const AGENTS: Record<Agent, AgentMeta> = {
  sales: { title: "AI Sales Agent", mission: "Drag the workflow blocks and watch real WhatsApp, CRM and quotation activity.", accent: "blue", icon: Bot, layout: LAYOUTS.sales, stats: [{ label: "Source", value: "WhatsApp", icon: MessageSquare }, { label: "CRM", value: "Live", icon: Database }, { label: "Mode", value: "Real Runs", icon: Activity }] },
  marketing: { title: "AI Marketing Department", mission: "Build campaigns, drafts, approvals and publishing steps as a real AI office workflow.", accent: "violet", icon: Sparkles, layout: LAYOUTS.marketing, stats: [{ label: "Content", value: "Drafts", icon: PenTool }, { label: "Approvals", value: "Queue", icon: CheckCircle2 }, { label: "Mode", value: "Real Runs", icon: Activity }] },
  hr: { title: "AI HR Department", mission: "Arrange CV screening, job match, interview and HR reply steps like a live workflow.", accent: "emerald", icon: Users, layout: LAYOUTS.hr, stats: [{ label: "CVs", value: "Screening", icon: FileText }, { label: "Interviews", value: "Ready", icon: CalendarClock }, { label: "Mode", value: "Real Runs", icon: Activity }] },
  support: { title: "AI Support Agent", mission: "Move ticket, history, knowledge and solution blocks, then track real support activity.", accent: "orange", icon: ShieldCheck, layout: LAYOUTS.support, stats: [{ label: "Tickets", value: "Watching", icon: MessageSquare }, { label: "Knowledge", value: "Loaded", icon: Brain }, { label: "Mode", value: "Real Runs", icon: Activity }] },
};

const NODE_ICONS: Record<NodeType, LucideIcon> = { trigger: MessageSquare, brain: Brain, memory: Database, crm: Database, action: ClipboardList, approval: CheckCircle2, output: Send };

export default function AiDepartmentWorkspace({ agent, title }: { agent: Agent; title: string }) {
  const meta = AGENTS[agent];
  const [tab, setTab] = useState<Tab>("command");
  const [form, setForm] = useState<any>({});
  const [files, setFiles] = useState<any[]>([]);
  const [layout, setLayout] = useState<WorkflowLayout>(meta.layout);
  const [runs, setRuns] = useState<LiveRun[]>([]);
  const [saving, setSaving] = useState(false);
  const [workflowDirty, setWorkflowDirty] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [testTask, setTestTask] = useState("Test this agent with the saved company brain and show the next action.");
  const displayTitle = title || meta.title;
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

  useEffect(() => {
    setLayout(meta.layout);
    setRuns([]);
    load();
  }, [agent]);

  useEffect(() => {
    const timer = window.setInterval(loadRuns, 6000);
    return () => window.clearInterval(timer);
  }, [agent]);

  function setField(key: string, value: string) {
    setForm((current: any) => ({ ...current, [key]: value }));
  }

  async function saveBrain() {
    setSaving(true);
    await fetch(`/api/ai-departments/${agent}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setSaving(false);
    await load();
  }

  async function saveWorkflow() {
    setSaving(true);
    await fetch(`/api/ai-departments/${agent}/workflow`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ layout }) });
    setWorkflowDirty(false);
    setSaving(false);
  }

  async function upload(file?: File) {
    if (!file) return;
    setUploading(true);
    const data = new FormData();
    data.append("file", file);
    await fetch(`/api/ai-departments/${agent}/knowledge`, { method: "POST", body: data });
    setUploading(false);
    await load();
  }

  async function runTest() {
    if (!testTask.trim()) return;
    await fetch(`/api/ai-departments/${agent}/run`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ task: testTask, channel: "dashboard", content_type: "workflow_test" }) });
    await loadRuns();
  }

  function moveNode(id: string, event: DragEvent<HTMLDivElement>) {
    const rect = event.currentTarget.parentElement?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.max(10, Math.min(760, event.clientX - rect.left - 70));
    const y = Math.max(10, Math.min(260, event.clientY - rect.top - 28));
    setLayout((current) => ({ ...current, nodes: current.nodes.map((node) => (node.id === id ? { ...node, x, y } : node)) }));
    setWorkflowDirty(true);
  }

  const instructions = useMemo(() => form.instructions || `You are the ${displayTitle} working inside this client company. Use only this tenant company brain, approved knowledge and tenant-scoped records. Never mention AVERO to end customers unless this tenant company itself is AVERO.`, [displayTitle, form.instructions]);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Sidebar />
      <div className="ml-64 min-h-screen">
        <DashboardHeader />
        <main className="p-7">
          <div className="mx-auto max-w-7xl space-y-6">
            <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[.28em] text-slate-400">AVERO Real AI Workflow</p>
                  <h1 className="mt-3 text-4xl font-black tracking-tight">{displayTitle}</h1>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">{meta.mission}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {meta.stats.map((stat) => <Stat key={stat.label} {...stat} />)}
                </div>
              </div>
            </section>

            <div className="flex gap-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-2">
              <button onClick={() => setTab("command")} className={`rounded-xl px-4 py-2 text-sm font-semibold ${tab === "command" ? "bg-blue-600" : "text-slate-400 hover:bg-slate-800"}`}><Settings className="mr-2 inline" size={15} />Command</button>
              <button onClick={() => setTab("workflow")} className={`rounded-xl px-4 py-2 text-sm font-semibold ${tab === "workflow" ? "bg-blue-600" : "text-slate-400 hover:bg-slate-800"}`}><Bot className="mr-2 inline" size={15} />Workflow</button>
            </div>

            {tab === "command" ? (
              <div className="grid gap-6 xl:grid-cols-[1fr_.7fr]">
                <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
                  <h2 className="text-xl font-bold">Company Brain</h2>
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <Field label="Industry" value={form.industry || ""} onChange={(v) => setField("industry", v)} />
                    <Field label="Locations" value={form.locations || ""} onChange={(v) => setField("locations", v)} />
                    <Area label="Business description" value={form.business_description || ""} onChange={(v) => setField("business_description", v)} />
                    <Area label="Products / Services" value={form.products_services || ""} onChange={(v) => setField("products_services", v)} />
                    <Area label="Target audience" value={form.target_audience || ""} onChange={(v) => setField("target_audience", v)} />
                    <Area label="Brand voice" value={form.brand_voice || ""} onChange={(v) => setField("brand_voice", v)} />
                  </div>
                </section>
                <aside className="space-y-6">
                  <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
                    <h2 className="text-xl font-bold">Agent Command</h2>
                    <textarea value={instructions} onChange={(event) => setField("instructions", event.target.value)} rows={11} className="mt-4 w-full rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm leading-6 outline-none focus:border-blue-500" />
                    <button onClick={saveBrain} disabled={saving} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold disabled:opacity-60"><Save size={16} />{saving ? "Saving..." : "Save Brain"}</button>
                  </section>
                  <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
                    <h2 className="text-xl font-bold">PDF Knowledge</h2>
                    <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-700 bg-slate-950 p-6 text-sm text-slate-400 hover:border-blue-500"><Upload size={18} />{uploading ? "Uploading..." : "Upload PDF"}<input type="file" accept="application/pdf" className="hidden" onChange={(e) => upload(e.target.files?.[0])} /></label>
                    <p className="mt-3 text-sm text-slate-500">{files.length} knowledge files connected.</p>
                  </section>
                </aside>
              </div>
            ) : (
              <div className="grid gap-6 xl:grid-cols-[1fr_.45fr]">
                <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div><h2 className="text-xl font-bold">Drag & Drop Workflow</h2><p className="mt-1 text-sm text-slate-500">Move blocks like Make. Real runs light up the matching step.</p></div>
                    <div className="flex gap-2"><button onClick={() => { setLayout(meta.layout); setWorkflowDirty(true); }} className="rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-300"><RotateCcw size={15} /></button><button onClick={saveWorkflow} disabled={!workflowDirty || saving} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold disabled:opacity-50">Save</button></div>
                  </div>
                  <div className="relative mt-5 h-[360px] overflow-hidden rounded-3xl border border-slate-800 bg-slate-950">
                    <svg className="absolute inset-0 h-full w-full">
                      {layout.connections.map((connection) => {
                        const from = layout.nodes.find((node) => node.id === connection.from);
                        const to = layout.nodes.find((node) => node.id === connection.to);
                        if (!from || !to) return null;
                        return <line key={`${connection.from}-${connection.to}`} x1={from.x + 70} y1={from.y + 28} x2={to.x + 70} y2={to.y + 28} className="stroke-slate-700" strokeWidth="2" strokeDasharray="6 7" />;
                      })}
                    </svg>
                    {layout.nodes.map((node) => <NodeCard key={node.id} node={node} active={node.id === activeNode} onDragEnd={moveNode} />)}
                  </div>
                </section>
                <aside className="space-y-6">
                  <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
                    <h2 className="text-xl font-bold">Run Real Test</h2>
                    <textarea value={testTask} onChange={(e) => setTestTask(e.target.value)} rows={5} className="mt-4 w-full rounded-2xl border border-slate-800 bg-slate-950 p-3 text-sm outline-none focus:border-blue-500" />
                    <button onClick={runTest} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold"><Play size={16} />Run Test</button>
                  </section>
                  <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
                    <h2 className="text-xl font-bold">Latest Real Runs</h2>
                    <div className="mt-4 space-y-3">{runs.length ? runs.slice(0, 6).map((run) => <RunRow key={run.id} run={run} />) : <p className="text-sm text-slate-500">No runs yet.</p>}</div>
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

function activeNodeFor(agent: Agent, run?: LiveRun) {
  if (!run) return "";
  if (run.status === "queued" || run.status === "running") return agent === "marketing" ? "content" : agent === "sales" ? "crm" : "screen";
  if (run.status === "approval_required") return "approval";
  if (run.status === "completed") return agent === "sales" ? "reply" : agent === "marketing" ? "publish" : "close";
  return "";
}

function Stat({ label, value, icon: Icon }: { label: string; value: string; icon: LucideIcon }) {
  return <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"><Icon className="text-blue-300" size={19} /><p className="mt-2 text-xs text-slate-500">{label}</p><p className="font-black">{value}</p></div>;
}

function NodeCard({ node, active, onDragEnd }: { node: WorkflowNode; active: boolean; onDragEnd: (id: string, event: DragEvent<HTMLDivElement>) => void }) {
  const Icon = NODE_ICONS[node.type];
  return <div draggable onDragEnd={(event) => onDragEnd(node.id, event)} className={`absolute w-[150px] cursor-grab rounded-2xl border p-3 shadow-xl transition ${active ? "border-emerald-400 bg-emerald-500/10 shadow-emerald-500/20" : "border-slate-700 bg-slate-900"}`} style={{ left: node.x, top: node.y }}><div className="flex items-center justify-between"><Icon className={active ? "text-emerald-300" : "text-blue-300"} size={19} /><Grip className="text-slate-600" size={15} /></div><p className="mt-2 text-sm font-bold">{node.label}</p><p className="text-[11px] uppercase tracking-wide text-slate-500">{node.type}</p></div>;
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block"><span className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span><input value={value} onChange={(e) => onChange(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm outline-none focus:border-blue-500" /></label>;
}

function Area({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block"><span className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span><textarea value={value} onChange={(e) => onChange(e.target.value)} rows={5} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm leading-6 outline-none focus:border-blue-500" /></label>;
}

function RunRow({ run }: { run: LiveRun }) {
  return <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3"><div className="flex items-center justify-between gap-3"><p className="text-sm font-bold">{run.action || "AI run"}</p><span className="rounded-full bg-slate-800 px-2 py-1 text-[11px] font-bold text-slate-300">{run.status}</span></div><p className="mt-1 text-xs text-slate-500">{new Date(run.created_at).toLocaleString()}</p>{run.error_message && <p className="mt-2 text-xs text-red-300">{run.error_message}</p>}</div>;
}
