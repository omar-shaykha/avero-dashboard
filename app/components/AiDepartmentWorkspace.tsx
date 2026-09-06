"use client";

import { useEffect, useMemo, useState, type DragEvent, type LucideIcon } from "react";
import Sidebar from "./Sidebar";
import DashboardHeader from "./DashboardHeader";
import {
  Activity,
  AlertTriangle,
  Bot,
  Brain,
  Building2,
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
} from "lucide-react";

type Agent = "sales" | "marketing" | "hr" | "support";
type Tab = "command" | "workflow";
type RunStatus = "queued" | "running" | "approval_required" | "completed" | "failed" | "cancelled" | string;

type WorkflowNode = {
  id: string;
  label: string;
  type: string;
  x: number;
  y: number;
};

type WorkflowConnection = { from: string; to: string };
type WorkflowLayout = { nodes: WorkflowNode[]; connections: WorkflowConnection[] };

type LiveRun = {
  id: string;
  agent_key: string;
  action: string | null;
  status: RunStatus;
  input: any;
  output: any;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
};

type AgentMeta = {
  title: string;
  officeName: string;
  mission: string;
  accentText: string;
  accentBorder: string;
  accentBg: string;
  icon: LucideIcon;
  defaultLayout: WorkflowLayout;
  stats: { label: string; value: string; icon: LucideIcon }[];
};

const DEFAULT_LAYOUTS: Record<Agent, WorkflowLayout> = {
  sales: {
    nodes: [
      { id: "inbox", label: "WhatsApp Inbox", type: "trigger", x: 40, y: 80 },
      { id: "brain", label: "Company Brain", type: "brain", x: 260, y: 55 },
      { id: "memory", label: "Customer Memory", type: "memory", x: 260, y: 190 },
      { id: "crm", label: "CRM Desk", type: "crm", x: 500, y: 120 },
      { id: "quotation", label: "Quotation", type: "action", x: 710, y: 70 },
      { id: "reply", label: "Reply Sent", type: "output", x: 710, y: 210 },
    ],
    connections: [
      { from: "inbox", to: "brain" },
      { from: "brain", to: "memory" },
      { from: "memory", to: "crm" },
      { from: "crm", to: "quotation" },
      { from: "crm", to: "reply" },
    ],
  },
  marketing: {
    nodes: [
      { id: "brief", label: "Campaign Brief", type: "trigger", x: 40, y: 90 },
      { id: "brand", label: "Brand Voice", type: "brain", x: 260, y: 55 },
      { id: "content", label: "Content Desk", type: "action", x: 500, y: 80 },
      { id: "approval", label: "Approval Queue", type: "approval", x: 710, y: 60 },
      { id: "publish", label: "Publish / Schedule", type: "output", x: 710, y: 210 },
    ],
    connections: [
      { from: "brief", to: "brand" },
      { from: "brand", to: "content" },
      { from: "content", to: "approval" },
      { from: "approval", to: "publish" },
    ],
  },
  hr: {
    nodes: [
      { id: "cv", label: "CV Inbox", type: "trigger", x: 40, y: 95 },
      { id: "screen", label: "Screening", type: "action", x: 260, y: 55 },
      { id: "match", label: "Job Match", type: "crm", x: 500, y: 90 },
      { id: "interview", label: "Interview", type: "action", x: 710, y: 60 },
      { id: "reply", label: "HR Reply", type: "output", x: 710, y: 210 },
    ],
    connections: [
      { from: "cv", to: "screen" },
      { from: "screen", to: "match" },
      { from: "match", to: "interview" },
      { from: "match", to: "reply" },
    ],
  },
  support: {
    nodes: [
      { id: "ticket", label: "Ticket Inbox", type: "trigger", x: 40, y: 95 },
      { id: "history", label: "Customer History", type: "memory", x: 260, y: 55 },
      { id: "knowledge", label: "Knowledge Base", type: "brain", x: 260, y: 205 },
      { id: "solution", label: "Solution Desk", type: "action", x: 500, y: 125 },
      { id: "close", label: "Close Loop", type: "output", x: 710, y: 125 },
    ],
    connections: [
      { from: "ticket", to: "history" },
      { from: "ticket", to: "knowledge" },
      { from: "history", to: "solution" },
      { from: "knowledge", to: "solution" },
      { from: "solution", to: "close" },
    ],
  },
};

const AGENTS: Record<Agent, AgentMeta> = {
  sales: {
    title: "AI Sales Agent",
    officeName: "Real Sales Workflow",
    mission: "Drag the blocks like Make, then watch real AI Sales activity from WhatsApp, CRM and AI runs.",
    accentText: "text-blue-300",
    accentBorder: "border-blue-500/30",
    accentBg: "bg-blue-500/10",
    icon: Bot,
    defaultLayout: DEFAULT_LAYOUTS.sales,
    stats: [
      { label: "Source", value: "Make + WhatsApp", icon: MessageSquare },
      { label: "CRM", value: "Live", icon: Database },
      { label: "Mode", value: "Real Runs", icon: Activity },
    ],
  },
  marketing: {
    title: "AI Marketing Department",
    officeName: "Real Marketing Workflow",
    mission: "Build the marketing office blocks, then track real campaign drafts and approvals.",
    accentText: "text-violet-300",
    accentBorder: "border-violet-500/30",
    accentBg: "bg-violet-500/10",
    icon: Sparkles,
    defaultLayout: DEFAULT_LAYOUTS.marketing,
    stats: [
      { label: "Content", value: "Drafts", icon: PenTool },
      { label: "Approvals", value: "Queue", icon: CheckCircle2 },
      { label: "Mode", value: "Real Runs", icon: Activity },
    ],
  },
  hr: {
    title: "AI HR Department",
    officeName: "Real HR Workflow",
    mission: "Arrange CV, screening, job match and interview steps like a live HR workflow.",
    accentText: "text-emerald-300",
    accentBorder: "border-emerald-500/30",
    accentBg: "bg-emerald-500/10",
    icon: Users,
    defaultLayout: DEFAULT_LAYOUTS.hr,
    stats: [
      { label: "CVs", value: "Screening", icon: FileText },
      { label: "Interviews", value: "Ready", icon: CalendarClock },
      { label: "Mode", value: "Real Runs", icon: Activity },
    ],
  },
  support: {
    title: "AI Support Agent",
    officeName: "Real Support Workflow",
    mission: "Move ticket, knowledge and solution blocks, then watch real support activity.",
    accentText: "text-orange-300",
    accentBorder: "border-orange-500/30",
    accentBg: "bg-orange-500/10",
    icon: ShieldCheck,
    defaultLayout: DEFAULT_LAYOUTS.support,
    stats: [
      { label: "Tickets", value: "Watching", icon: MessageSquare },
      { label: "Knowledge", value: "Loaded", icon: Brain },
      { label: "Mode", value: "Real Runs", icon: Activity },
    ],
  },
};

const NODE_ICONS: Record<string, LucideIcon> = {
  trigger: MessageSquare,
  brain: Brain,
  memory: Database,
  crm: Database,
  action: ClipboardList,
  approval: CheckCircle2,
  output: Send,
  step: Activity,
};

export default function AiDepartmentWorkspace({ agent, title }: { agent: Agent; title: string }) {
  const meta = AGENTS[agent];
  const [activeTab, setActiveTab] = useState<Tab>("command");
  const [data, setData] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [files, setFiles] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [layout, setLayout] = useState<WorkflowLayout>(meta.defaultLayout);
  const [workflowDirty, setWorkflowDirty] = useState(false);
  const [workflowSaving, setWorkflowSaving] = useState(false);
  const [runs, setRuns] = useState<LiveRun[]>([]);
  const [testTask, setTestTask] = useState("Test this agent with the current saved company brain and show me the next action.");
  const [runningTest, setRunningTest] = useState(false);

  const displayTitle = title || meta.title;
  const latestRun = runs[0];
  const isLive = latestRun?.status === "running" || latestRun?.status === "queued";
  const activeNodeId = getActiveNodeId(agent, latestRun);

  const load = async () => {
    const [profileResponse, knowledgeResponse, workflowResponse, runsResponse] = await Promise.all([
      fetch(`/api/ai-departments/${agent}`, { cache: "no-store" }),
      fetch(`/api/ai-departments/${agent}/knowledge`, { cache: "no-store" }),
      fetch(`/api/ai-departments/${agent}/workflow`, { cache: "no-store" }),
      fetch(`/api/ai-departments/${agent}/runs`, { cache: "no-store" }),
    ]);

    if (profileResponse.ok) {
      const payload = await profileResponse.json();
      setData(payload);
      setForm({ ...payload.company_profile, ...payload.config });
    }

    if (knowledgeResponse.ok) {
      const payload = await knowledgeResponse.json();
      setFiles(payload.files || []);
    }

    if (workflowResponse.ok) {
      const payload = await workflowResponse.json();
      setLayout(payload.layout?.nodes?.length ? payload.layout : meta.defaultLayout);
      setWorkflowDirty(false);
    }

    if (runsResponse.ok) {
      const payload = await runsResponse.json();
      setRuns(payload.runs || []);
    }
  };

  const loadRuns = async () => {
    const response = await fetch(`/api/ai-departments/${agent}/runs`, { cache: "no-store" });
    if (response.ok) {
      const payload = await response.json();
      setRuns(payload.runs || []);
    }
  };

  useEffect(() => {
    setLayout(meta.defaultLayout);
    setRuns([]);
    load();
  }, [agent]);

  useEffect(() => {
    const timer = window.setInterval(loadRuns, 6000);
    return () => window.clearInterval(timer);
  }, [agent]);

  const set = (key: string, value: string) => setForm((current: any) => ({ ...current, [key]: value }));

  const save = async () => {
    setSaving(true);
    setDone(false);
    const response = await fetch(`/api/ai-departments/${agent}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (response.ok) {
      setDone(true);
      await load();
    }
  };

  const saveWorkflow = async () => {
    setWorkflowSaving(true);
    const response = await fetch(`/api/ai-departments/${agent}/workflow`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ layout }),
    });
    setWorkflowSaving(false);
    if (response.ok) setWorkflowDirty(false);
  };

  const resetWorkflow = () => {
    setLayout(meta.defaultLayout);
    setWorkflowDirty(true);
  };

  const upload = async (file?: File) => {
    if (!file) return;
    setUploadError("");
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setUploadError("Only PDF files are allowed.");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch(`/api/ai-departments/${agent}/knowledge`, { method: "POST", body: formData });
    setUploading(false);

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setUploadError(payload.error || "Upload failed");
      return;
    }

    await load();
  };

  const runRealTest = async () => {
    if (!testTask.trim()) return;
    setRunningTest(true);
    await fetch(`/api/ai-departments/${agent}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task: testTask, channel: agent === "sales" ? "whatsapp" : "dashboard", content_type: "workflow_test" }),
    }).catch(() => null);
    setRunningTest(false);
    await loadRuns();
  };

  const commandTemplate = useMemo(
    () =>
      form.instructions ||
      `You are the ${displayTitle} working inside this client company. Use only the saved company brain, approved knowledge files, and tenant-scoped CRM records. Never mention AVERO to end customers. Never assume the industry. Ask only for missing information that is truly needed.`,
    [displayTitle, form.instructions]
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Sidebar />
      <div className="ml-64 min-h-screen">
        <DashboardHeader />
        <main className="p-7">
          <div className="mx-auto max-w-7xl space-y-6">
            <section className={`overflow-hidden rounded-3xl border ${meta.accentBorder} bg-slate-900/70 p-6 shadow-2xl`}>
              <div className="grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
                <div>
                  <p className={`text-xs font-bold uppercase tracking-[.28em] ${meta.accentText}`}>AVERO Real AI Workflow</p>
                  <h1 className="mt-3 text-4xl font-black tracking-tight">{displayTitle}</h1>
                  <p className="mt-3 text-sm leading-6 text-slate-400">{meta.mission}</p>
                  <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    {meta.stats.map((stat) => <SmallStat key={stat.label} stat={stat} />)}
                  </div>
                  <div className="mt-6 flex rounded-2xl border border-slate-800 bg-slate-950/60 p-1">
                    <TabButton active={activeTab === "command"} onClick={() => setActiveTab("command")} icon={Settings} text="Command" />
                    <TabButton active={activeTab === "workflow"} onClick={() => setActiveTab("workflow")} icon={Grip} text="Workflow" />
                  </div>
                </div>

                <LiveSummary meta={meta} latestRun={latestRun} isLive={isLive} />
              </div>
            </section>

            {activeTab === "command" ? (
              <CommandPanel
                meta={meta}
                form={form}
                data={data}
                files={files}
                saving={saving}
                done={done}
                uploading={uploading}
                uploadError={uploadError}
                commandTemplate={commandTemplate}
                testTask={testTask}
                runningTest={runningTest}
                onSet={set}
                onSave={save}
                onUpload={upload}
                onTestTask={setTestTask}
                onRunTest={runRealTest}
              />
            ) : (
              <WorkflowPanel
                meta={meta}
                layout={layout}
                setLayout={setLayout}
                workflowDirty={workflowDirty}
                setWorkflowDirty={setWorkflowDirty}
                workflowSaving={workflowSaving}
                onSave={saveWorkflow}
                onReset={resetWorkflow}
                runs={runs}
                activeNodeId={activeNodeId}
                isLive={isLive}
                filesCount={files.length}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function getActiveNodeId(agent: Agent, run?: LiveRun) {
  if (!run) return "inbox";
  if (run.status === "failed" || run.status === "cancelled") return agent === "support" ? "solution" : "crm";
  if (run.status === "approval_required") return agent === "marketing" ? "approval" : agent === "hr" ? "interview" : "quotation";
  if (run.status === "completed") return agent === "support" ? "close" : "reply";
  if (agent === "sales") return "crm";
  if (agent === "marketing") return "content";
  if (agent === "hr") return "screen";
  return "solution";
}

function LiveSummary({ meta, latestRun, isLive }: { meta: AgentMeta; latestRun?: LiveRun; isLive: boolean }) {
  const Icon = meta.icon;
  return (
    <div className="relative min-h-[250px] overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/70 p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,.08),transparent_60%)]" />
      <div className="relative flex h-full flex-col justify-between">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-white">{meta.officeName}</p>
            <p className="mt-1 text-xs text-slate-500">Connected to tenant AI runs. No fake auto-loop.</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${isLive ? "bg-emerald-500/15 text-emerald-300" : "bg-slate-800 text-slate-400"}`}>{isLive ? "LIVE" : "STANDBY"}</span>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className={`relative flex h-28 w-28 items-center justify-center rounded-full border ${meta.accentBorder} ${meta.accentBg}`}>
            {isLive && <span className="absolute h-full w-full animate-ping rounded-full border border-white/10" />}
            <Icon className={meta.accentText} size={44} />
          </div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <p className="text-xs uppercase tracking-[.22em] text-slate-500">Latest real activity</p>
          <p className="mt-2 text-sm font-semibold text-white">{latestRun ? `${latestRun.action || "AI run"} · ${latestRun.status}` : "No live runs yet"}</p>
          <p className="mt-1 text-xs text-slate-500">{latestRun ? formatDate(latestRun.created_at) : "Run a real test or wait for Make/WhatsApp activity."}</p>
        </div>
      </div>
    </div>
  );
}

function CommandPanel({
  meta,
  form,
  data,
  files,
  saving,
  done,
  uploading,
  uploadError,
  commandTemplate,
  testTask,
  runningTest,
  onSet,
  onSave,
  onUpload,
  onTestTask,
  onRunTest,
}: {
  meta: AgentMeta;
  form: any;
  data: any;
  files: any[];
  saving: boolean;
  done: boolean;
  uploading: boolean;
  uploadError: string;
  commandTemplate: string;
  testTask: string;
  runningTest: boolean;
  onSet: (key: string, value: string) => void;
  onSave: () => void;
  onUpload: (file?: File) => void;
  onTestTask: (value: string) => void;
  onRunTest: () => void;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_.75fr]">
      <div className="space-y-6">
        <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="flex items-start gap-4">
            <div className={`rounded-2xl ${meta.accentBg} p-3 ${meta.accentText}`}><Building2 /></div>
            <div>
              <h2 className="text-xl font-bold">Company Brain</h2>
              <p className="mt-1 text-sm leading-6 text-slate-400">This is the client-specific brain. The agent uses this company only and never behaves like a generic AVERO bot.</p>
            </div>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Field label="Industry" value={form.industry} onChange={(value) => onSet("industry", value)} />
            <Field label="Locations" value={form.locations} onChange={(value) => onSet("locations", value)} />
            <Area label="Business description" value={form.business_description} onChange={(value) => onSet("business_description", value)} />
            <Area label="Products / Services" value={form.products_services} onChange={(value) => onSet("products_services", value)} />
            <Area label="Target audience" value={form.target_audience} onChange={(value) => onSet("target_audience", value)} />
            <Area label="Brand voice" value={form.brand_voice} onChange={(value) => onSet("brand_voice", value)} />
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-bold">Agent Command</h2>
              <p className="mt-1 text-sm text-slate-500">Saved per client and per department. This controls the AI employee behavior.</p>
            </div>
            <select value={form.autonomy_mode || "draft"} onChange={(event) => onSet("autonomy_mode", event.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm">
              <option value="draft">Draft only</option>
              <option value="approval">Approval required</option>
              <option value="automatic">Automatic</option>
            </select>
          </div>
          <textarea value={commandTemplate} onChange={(event) => onSet("instructions", event.target.value)} rows={10} className="mt-5 w-full rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm leading-6 outline-none focus:border-blue-500" />
          <div className="mt-5 flex items-center justify-end gap-3">
            {done && <span className="text-sm font-semibold text-emerald-400">Saved ✓</span>}
            <button onClick={onSave} disabled={saving || !data} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold hover:bg-blue-500 disabled:opacity-50"><Save size={16} />{saving ? "Saving..." : "Save Brain"}</button>
          </div>
        </section>
      </div>

      <aside className="space-y-6">
        <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-lg font-bold">Run Real Test</h2>
          <p className="mt-1 text-sm text-slate-500">This creates a real row in ai_agent_runs, then the Workflow board reacts to it.</p>
          <textarea value={testTask} onChange={(event) => onTestTask(event.target.value)} rows={4} className="mt-4 w-full rounded-2xl border border-slate-800 bg-slate-950 p-3 text-sm outline-none focus:border-blue-500" />
          <button onClick={onRunTest} disabled={runningTest || !testTask.trim()} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold hover:bg-emerald-500 disabled:opacity-50"><Play size={16} />{runningTest ? "Running..." : "Run Real Test"}</button>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">PDF Knowledge</h2>
              <p className="mt-1 text-sm text-slate-500">Approved files for this agent.</p>
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-sm font-semibold hover:bg-slate-800">
              <Upload size={15} /> {uploading ? "Uploading..." : "Upload"}
              <input type="file" accept="application/pdf" className="hidden" onChange={(event) => onUpload(event.target.files?.[0])} disabled={uploading} />
            </label>
          </div>
          {uploadError && <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{uploadError}</p>}
          <div className="mt-4 space-y-2">
            {files.length ? files.map((file) => <div key={file.id || file.file_name} className="rounded-xl border border-slate-800 bg-slate-950 p-3"><p className="text-sm font-semibold text-white">{file.file_name}</p><p className="mt-1 text-xs text-slate-500">{file.status || "uploaded"}</p></div>) : <p className="rounded-xl border border-dashed border-slate-700 p-4 text-sm text-slate-500">No PDF knowledge files yet.</p>}
          </div>
        </section>
      </aside>
    </div>
  );
}

function WorkflowPanel({
  meta,
  layout,
  setLayout,
  workflowDirty,
  setWorkflowDirty,
  workflowSaving,
  onSave,
  onReset,
  runs,
  activeNodeId,
  isLive,
  filesCount,
}: {
  meta: AgentMeta;
  layout: WorkflowLayout;
  setLayout: (layout: WorkflowLayout) => void;
  workflowDirty: boolean;
  setWorkflowDirty: (value: boolean) => void;
  workflowSaving: boolean;
  onSave: () => void;
  onReset: () => void;
  runs: LiveRun[];
  activeNodeId: string;
  isLive: boolean;
  filesCount: number;
}) {
  const moveNode = (id: string, x: number, y: number) => {
    setLayout({
      ...layout,
      nodes: layout.nodes.map((node) => node.id === id ? { ...node, x: Math.max(8, Math.min(800, x)), y: Math.max(8, Math.min(360, y)) } : node),
    });
    setWorkflowDirty(true);
  };

  const handleDragStart = (event: DragEvent<HTMLDivElement>, node: WorkflowNode) => {
    event.dataTransfer.setData("nodeId", node.id);
    event.dataTransfer.setData("offsetX", String(event.nativeEvent.offsetX));
    event.dataTransfer.setData("offsetY", String(event.nativeEvent.offsetY));
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const nodeId = event.dataTransfer.getData("nodeId");
    if (!nodeId) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const offsetX = Number(event.dataTransfer.getData("offsetX") || 0);
    const offsetY = Number(event.dataTransfer.getData("offsetY") || 0);
    moveNode(nodeId, event.clientX - rect.left - offsetX, event.clientY - rect.top - offsetY);
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_.36fr]">
      <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-black">Workflow Builder</h2>
            <p className="mt-1 text-sm text-slate-500">Drag blocks like Make. Save the layout per client and per agent.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={onReset} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-sm font-semibold hover:bg-slate-800"><RotateCcw size={15} />Reset</button>
            <button onClick={onSave} disabled={workflowSaving || !workflowDirty} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold hover:bg-blue-500 disabled:opacity-50"><Save size={15} />{workflowSaving ? "Saving..." : workflowDirty ? "Save Workflow" : "Saved"}</button>
          </div>
        </div>

        <div className="relative h-[460px] overflow-hidden rounded-3xl border border-slate-800 bg-slate-950" onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}>
          <div className="absolute inset-0 opacity-[.08]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.9) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.9) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
          <svg className="absolute inset-0 h-full w-full">
            {layout.connections.map((connection) => {
              const from = layout.nodes.find((node) => node.id === connection.from);
              const to = layout.nodes.find((node) => node.id === connection.to);
              if (!from || !to) return null;
              const active = from.id === activeNodeId || to.id === activeNodeId;
              return <line key={`${connection.from}-${connection.to}`} x1={from.x + 82} y1={from.y + 34} x2={to.x + 82} y2={to.y + 34} stroke={active ? "rgba(16,185,129,.9)" : "rgba(148,163,184,.22)"} strokeWidth={active ? 3 : 2} strokeDasharray={isLive ? "8 8" : "0"} />;
            })}
          </svg>

          {layout.nodes.map((node) => (
            <WorkflowNodeCard key={node.id} node={node} meta={meta} active={node.id === activeNodeId} onDragStart={handleDragStart} />
          ))}

          <div className="absolute bottom-4 left-4 rounded-2xl border border-slate-800 bg-slate-900/90 p-4 backdrop-blur">
            <div className="flex items-center gap-3">
              <div className={`rounded-2xl p-3 ${isLive ? "bg-emerald-500/15 text-emerald-300" : "bg-slate-800 text-slate-400"}`}><Bot size={22} /></div>
              <div>
                <p className="text-sm font-bold">AI mini employee</p>
                <p className="text-xs text-slate-500">{isLive ? "Working from real run data" : "Waiting for a real Make/API event"}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <aside className="space-y-6">
        <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5">
          <h3 className="text-lg font-bold">Live Signal</h3>
          <div className="mt-4 grid gap-3">
            <Signal label="Runs source" value="ai_agent_runs" />
            <Signal label="Knowledge files" value={String(filesCount)} />
            <Signal label="Workflow" value={workflowDirty ? "Unsaved changes" : "Saved"} />
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5">
          <h3 className="text-lg font-bold">Latest Real Runs</h3>
          <div className="mt-4 space-y-3">
            {runs.length ? runs.slice(0, 6).map((run) => <RunCard key={run.id} run={run} />) : <p className="rounded-2xl border border-dashed border-slate-700 p-4 text-sm text-slate-500">No real runs yet. Run a test or send WhatsApp traffic.</p>}
          </div>
        </section>
      </aside>
    </div>
  );
}

function WorkflowNodeCard({ node, meta, active, onDragStart }: { node: WorkflowNode; meta: AgentMeta; active: boolean; onDragStart: (event: DragEvent<HTMLDivElement>, node: WorkflowNode) => void }) {
  const Icon = NODE_ICONS[node.type] || Activity;
  return (
    <div draggable onDragStart={(event) => onDragStart(event, node)} className={`absolute w-40 cursor-move rounded-2xl border p-3 shadow-xl transition ${active ? `${meta.accentBorder} ${meta.accentBg} scale-[1.03]` : "border-slate-800 bg-slate-900 hover:border-slate-600"}`} style={{ left: node.x, top: node.y }}>
      <div className="flex items-center justify-between gap-2">
        <div className={`rounded-xl p-2 ${active ? meta.accentText : "text-slate-400"}`}><Icon size={18} /></div>
        <Grip size={14} className="text-slate-600" />
      </div>
      <p className="mt-2 text-sm font-bold text-white">{node.label}</p>
      <p className="mt-1 text-[11px] uppercase tracking-[.16em] text-slate-500">{node.type}</p>
      {active && <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-emerald-300"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />Active</div>}
    </div>
  );
}

function RunCard({ run }: { run: LiveRun }) {
  const failed = run.status === "failed" || run.status === "cancelled";
  const pending = run.status === "running" || run.status === "queued";
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="truncate text-sm font-bold text-white">{run.action || "AI run"}</p>
        <span className={`rounded-full px-2 py-1 text-[11px] font-bold ${failed ? "bg-red-500/15 text-red-300" : pending ? "bg-blue-500/15 text-blue-300" : "bg-emerald-500/15 text-emerald-300"}`}>{run.status}</span>
      </div>
      <p className="mt-1 text-xs text-slate-500">{formatDate(run.created_at)}</p>
      {run.error_message && <p className="mt-2 flex gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-2 text-xs text-red-300"><AlertTriangle size={14} />{run.error_message}</p>}
    </div>
  );
}

function SmallStat({ stat }: { stat: { label: string; value: string; icon: LucideIcon } }) {
  const Icon = stat.icon;
  return <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4"><Icon size={18} className="text-slate-400" /><p className="mt-3 text-xs text-slate-500">{stat.label}</p><p className="mt-1 text-sm font-bold text-white">{stat.value}</p></div>;
}

function Signal({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950 p-3"><span className="text-sm text-slate-400">{label}</span><span className="text-sm font-bold text-white">{value}</span></div>;
}

function TabButton({ active, onClick, icon: Icon, text }: { active: boolean; onClick: () => void; icon: LucideIcon; text: string }) {
  return <button onClick={onClick} className={`flex-1 rounded-xl px-4 py-3 text-sm font-bold transition ${active ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-900 hover:text-white"}`}><span className="inline-flex items-center justify-center gap-2"><Icon size={16} />{text}</span></button>;
}

function Field({ label, value, onChange }: { label: string; value?: string; onChange: (value: string) => void }) {
  return <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-300">{label}</span><input value={value || ""} onChange={(event) => onChange(event.target.value)} className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-blue-500" /></label>;
}

function Area({ label, value, onChange }: { label: string; value?: string; onChange: (value: string) => void }) {
  return <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-300">{label}</span><textarea value={value || ""} onChange={(event) => onChange(event.target.value)} rows={4} className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-blue-500" /></label>;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  try { return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); } catch { return value; }
}
