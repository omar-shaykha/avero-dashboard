"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "./Sidebar";
import DashboardHeader from "./DashboardHeader";
import {
  Activity,
  BarChart3,
  Bot,
  Brain,
  Building2,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Database,
  FileText,
  MessageSquare,
  Radio,
  Save,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Upload,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";

type Agent = "sales" | "marketing" | "hr" | "support";
type Tab = "command" | "live";

type AgentMeta = {
  title: string;
  department: string;
  mission: string;
  accentText: string;
  accentBorder: string;
  accentBg: string;
  glow: string;
  icon: LucideIcon;
  steps: string[];
  liveStats: { label: string; value: string; icon: LucideIcon }[];
  nodes: string[];
};

const AGENTS: Record<Agent, AgentMeta> = {
  sales: {
    title: "AI Sales Agent",
    department: "Sales Operating Room",
    mission: "Qualify leads, answer customers, update CRM, and move opportunities forward.",
    accentText: "text-blue-300",
    accentBorder: "border-blue-500/30",
    accentBg: "bg-blue-500/10",
    glow: "shadow-blue-500/20",
    icon: Bot,
    steps: ["Receiving WhatsApp", "Loading client brain", "Reading customer memory", "Qualifying request", "Updating CRM", "Generating reply", "Sending message", "Saving timeline"],
    liveStats: [
      { label: "Conversations", value: "Live", icon: MessageSquare },
      { label: "CRM Sync", value: "Active", icon: Database },
      { label: "Follow-ups", value: "Ready", icon: CalendarClock },
    ],
    nodes: ["WhatsApp", "CRM", "Leads", "Customers", "Follow-up"],
  },
  marketing: {
    title: "AI Marketing Department",
    department: "Marketing Content Room",
    mission: "Plan campaigns, generate content, prepare approvals, and coordinate channels.",
    accentText: "text-violet-300",
    accentBorder: "border-violet-500/30",
    accentBg: "bg-violet-500/10",
    glow: "shadow-violet-500/20",
    icon: Sparkles,
    steps: ["Reading brand voice", "Scanning offers", "Planning campaign", "Writing content", "Preparing creatives", "Waiting approval", "Scheduling posts", "Tracking results"],
    liveStats: [
      { label: "Content Queue", value: "Ready", icon: FileText },
      { label: "Approvals", value: "Draft", icon: CheckCircle2 },
      { label: "Channels", value: "Multi", icon: Radio },
    ],
    nodes: ["Instagram", "Facebook", "TikTok", "LinkedIn", "WhatsApp"],
  },
  hr: {
    title: "AI HR Department",
    department: "HR Screening Room",
    mission: "Screen candidates, summarize CVs, organize interviews, and support HR workflows.",
    accentText: "text-emerald-300",
    accentBorder: "border-emerald-500/30",
    accentBg: "bg-emerald-500/10",
    glow: "shadow-emerald-500/20",
    icon: Users,
    steps: ["Receiving candidate", "Reading CV", "Matching position", "Scoring profile", "Preparing questions", "Scheduling interview", "Updating HR CRM", "Sending response"],
    liveStats: [
      { label: "Candidates", value: "Screening", icon: Users },
      { label: "Interview Queue", value: "Ready", icon: CalendarClock },
      { label: "HR Records", value: "Synced", icon: Database },
    ],
    nodes: ["CVs", "Jobs", "Candidates", "Interviews", "Payroll"],
  },
  support: {
    title: "AI Support Agent",
    department: "Support Control Desk",
    mission: "Handle questions, detect issues, escalate cases, and keep support history organized.",
    accentText: "text-orange-300",
    accentBorder: "border-orange-500/30",
    accentBg: "bg-orange-500/10",
    glow: "shadow-orange-500/20",
    icon: ShieldCheck,
    steps: ["Receiving ticket", "Checking customer history", "Reading knowledge", "Detecting urgency", "Drafting solution", "Escalating if needed", "Updating ticket", "Closing loop"],
    liveStats: [
      { label: "Tickets", value: "Watching", icon: Activity },
      { label: "SLA", value: "Tracked", icon: Clock3 },
      { label: "Knowledge", value: "Loaded", icon: Brain },
    ],
    nodes: ["Tickets", "SLA", "Knowledge", "Escalation", "Customers"],
  },
};

export default function AiDepartmentWorkspace({ agent, title }: { agent: Agent; title: string }) {
  const meta = AGENTS[agent];
  const [activeTab, setActiveTab] = useState<Tab>("command");
  const [activeStep, setActiveStep] = useState(0);
  const [data, setData] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [files, setFiles] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const displayTitle = title || meta.title;

  const load = async () => {
    const [profileResponse, knowledgeResponse] = await Promise.all([
      fetch(`/api/ai-departments/${agent}`, { cache: "no-store" }),
      fetch(`/api/ai-departments/${agent}/knowledge`, { cache: "no-store" }),
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
  };

  useEffect(() => {
    load();
  }, [agent]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveStep((current) => (current + 1) % meta.steps.length);
    }, 1400);

    return () => window.clearInterval(timer);
  }, [meta.steps.length]);

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
            <section className={`relative overflow-hidden rounded-3xl border ${meta.accentBorder} bg-slate-900/70 p-6 shadow-2xl ${meta.glow}`}>
              <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/5 blur-3xl" />
              <div className="absolute -bottom-24 left-20 h-72 w-72 rounded-full bg-white/5 blur-3xl" />

              <div className="relative grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
                <div>
                  <p className={`text-xs font-semibold uppercase tracking-[.28em] ${meta.accentText}`}>AVERO AI Operating Center</p>
                  <h1 className="mt-3 text-4xl font-black tracking-tight">{displayTitle}</h1>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">{meta.mission}</p>

                  <div className="mt-6 flex flex-wrap gap-2">
                    <StatusPill icon={Activity} text="Online" />
                    <StatusPill icon={Database} text="Tenant isolated" />
                    <StatusPill icon={Brain} text="Company brain controlled" />
                  </div>

                  <div className="mt-6 flex rounded-2xl border border-slate-800 bg-slate-950/60 p-1">
                    <TabButton active={activeTab === "command"} onClick={() => setActiveTab("command")} icon={Settings} text="Command & Brain" />
                    <TabButton active={activeTab === "live"} onClick={() => setActiveTab("live")} icon={Radio} text="Live Operating View" />
                  </div>
                </div>

                <LiveCore meta={meta} activeStep={activeStep} />
              </div>
            </section>

            {activeTab === "command" ? (
              <CommandPanel
                agent={agent}
                meta={meta}
                form={form}
                data={data}
                files={files}
                saving={saving}
                done={done}
                uploading={uploading}
                uploadError={uploadError}
                commandTemplate={commandTemplate}
                onSet={set}
                onSave={save}
                onUpload={upload}
              />
            ) : (
              <LivePanel meta={meta} activeStep={activeStep} filesCount={files.length} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function LiveCore({ meta, activeStep }: { meta: AgentMeta; activeStep: number }) {
  const Icon = meta.icon;
  return (
    <div className="relative min-h-[280px] rounded-3xl border border-slate-800 bg-slate-950/60 p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,.12),transparent_55%)]" />
      <div className="relative flex h-full flex-col items-center justify-center">
        <div className="relative flex h-40 w-40 items-center justify-center rounded-full border border-white/10 bg-slate-900 shadow-2xl">
          <span className="absolute h-full w-full animate-ping rounded-full border border-white/10" />
          <span className="absolute h-28 w-28 animate-pulse rounded-full bg-white/5" />
          <Icon size={54} className={meta.accentText} />
        </div>
        <div className="mt-5 text-center">
          <p className="text-sm font-semibold text-white">{meta.department}</p>
          <p className={`mt-1 text-xs font-semibold ${meta.accentText}`}>{meta.steps[activeStep]}</p>
        </div>
      </div>
    </div>
  );
}

function CommandPanel({
  agent,
  meta,
  form,
  data,
  files,
  saving,
  done,
  uploading,
  uploadError,
  commandTemplate,
  onSet,
  onSave,
  onUpload,
}: {
  agent: Agent;
  meta: AgentMeta;
  form: any;
  data: any;
  files: any[];
  saving: boolean;
  done: boolean;
  uploading: boolean;
  uploadError: string;
  commandTemplate: string;
  onSet: (key: string, value: string) => void;
  onSave: () => void;
  onUpload: (file?: File) => void;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_.8fr]">
      <div className="space-y-6">
        <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="flex items-start gap-4">
            <div className={`rounded-2xl ${meta.accentBg} p-3 ${meta.accentText}`}>
              <Building2 />
            </div>
            <div>
              <h2 className="text-xl font-bold">Company Brain</h2>
              <p className="mt-1 text-sm leading-6 text-slate-400">This is the client-specific business brain. The agent must use this company only and never behave as a generic AVERO bot.</p>
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
              <p className="mt-1 text-sm text-slate-500">Saved per company and per department. This controls how the agent works.</p>
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
            <button onClick={onSave} disabled={saving || !data} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold hover:bg-blue-500 disabled:opacity-50">
              <Save size={16} />
              {saving ? "Saving..." : "Save Brain & Command"}
            </button>
          </div>
        </section>
      </div>

      <div className="space-y-6">
        <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-xl font-bold">Knowledge Files</h2>
          <p className="mt-1 text-sm text-slate-500">Upload approved PDF menus, profiles, price lists, service catalogs, policies, SOPs and FAQs.</p>
          <label className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm font-semibold hover:border-blue-500">
            <Upload size={16} />
            {uploading ? "Uploading..." : "Upload PDF"}
            <input type="file" accept="application/pdf,.pdf" className="hidden" disabled={uploading} onChange={(event) => { onUpload(event.target.files?.[0]); event.currentTarget.value = ""; }} />
          </label>
          {uploadError && <p className="mt-3 text-sm text-red-400">{uploadError}</p>}

          <div className="mt-5 space-y-2">
            {files.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/50 p-4 text-sm text-slate-600">No PDF knowledge uploaded yet.</p>
            ) : (
              files.map((file) => (
                <div key={file.id} className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <FileText size={18} className={meta.accentText} />
                    <div>
                      <p className="text-sm font-medium">{file.file_name}</p>
                      <p className="text-xs text-slate-600">{Math.ceil((file.file_size || 0) / 1024)} KB</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs text-slate-400">{file.status}</span>
                </div>
              ))
            )}
          </div>
        </section>

        <section className={`rounded-3xl border ${meta.accentBorder} ${meta.accentBg} p-6`}>
          <h2 className={`font-semibold ${meta.accentText}`}>{agent.toUpperCase()} Department Rule</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">The customer-facing agent speaks only as the client company. AVERO stays hidden as the operating platform, while every answer is powered by the saved brain, approved knowledge and tenant-scoped records.</p>
        </section>
      </div>
    </div>
  );
}

function LivePanel({ meta, activeStep, filesCount }: { meta: AgentMeta; activeStep: number; filesCount: number }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
      <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Live Agent Workflow</h2>
            <p className="mt-1 text-sm text-slate-500">Visual operating sequence for what this department is doing.</p>
          </div>
          <span className={`inline-flex items-center gap-2 rounded-full border ${meta.accentBorder} ${meta.accentBg} px-3 py-1 text-xs font-semibold ${meta.accentText}`}>
            <Radio size={14} className="animate-pulse" /> Live
          </span>
        </div>

        <div className="mt-6 space-y-3">
          {meta.steps.map((step, index) => {
            const active = index === activeStep;
            const done = index < activeStep;
            return (
              <div key={step} className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition ${active ? `${meta.accentBorder} ${meta.accentBg}` : "border-slate-800 bg-slate-950/60"}`}>
                <div className={`flex h-9 w-9 items-center justify-center rounded-full ${active ? `${meta.accentBg} ${meta.accentText}` : done ? "bg-emerald-500/10 text-emerald-300" : "bg-slate-800 text-slate-500"}`}>
                  {active ? <Zap size={17} className="animate-pulse" /> : done ? <CheckCircle2 size={17} /> : <Clock3 size={17} />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">{step}</p>
                  <p className="text-xs text-slate-500">{active ? "Working now..." : done ? "Completed in this cycle" : "Waiting in queue"}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="space-y-6">
        <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-xl font-bold">Department Network</h2>
          <p className="mt-1 text-sm text-slate-500">Animated operating map for the systems connected to this agent.</p>
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3">
            {meta.nodes.map((node, index) => (
              <div key={node} className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <div className={`absolute right-3 top-3 h-2.5 w-2.5 rounded-full ${index === activeStep % meta.nodes.length ? "animate-ping bg-emerald-400" : "bg-slate-700"}`} />
                <p className="text-sm font-semibold text-white">{node}</p>
                <p className="mt-1 text-xs text-slate-500">Connected node</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-3">
          {meta.liveStats.map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <stat.icon size={18} className={meta.accentText} />
              <p className="mt-3 text-xs text-slate-500">{stat.label}</p>
              <p className="mt-1 font-bold text-white">{stat.value}</p>
            </div>
          ))}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <FileText size={18} className={meta.accentText} />
            <p className="mt-3 text-xs text-slate-500">Knowledge Files</p>
            <p className="mt-1 font-bold text-white">{filesCount}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <BarChart3 size={18} className={meta.accentText} />
            <p className="mt-3 text-xs text-slate-500">Performance</p>
            <p className="mt-1 font-bold text-white">Tracking</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <Send size={18} className={meta.accentText} />
            <p className="mt-3 text-xs text-slate-500">Outbound</p>
            <p className="mt-1 font-bold text-white">Ready</p>
          </div>
        </section>
      </div>
    </div>
  );
}

function StatusPill({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1.5 text-xs font-semibold text-slate-300">
      <Icon size={14} />
      {text}
    </span>
  );
}

function TabButton({ active, onClick, icon: Icon, text }: { active: boolean; onClick: () => void; icon: LucideIcon; text: string }) {
  return (
    <button onClick={onClick} className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${active ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" : "text-slate-400 hover:bg-slate-900 hover:text-white"}`}>
      <Icon size={16} />
      {text}
    </button>
  );
}

function Field({ label, value, onChange }: { label: string; value?: string; onChange: (value: string) => void }) {
  return (
    <label className="text-sm text-slate-400">
      {label}
      <input value={value || ""} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500" />
    </label>
  );
}

function Area({ label, value, onChange }: { label: string; value?: string; onChange: (value: string) => void }) {
  return (
    <label className="text-sm text-slate-400">
      {label}
      <textarea rows={4} value={value || ""} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 p-4 text-white outline-none focus:border-blue-500" />
    </label>
  );
}
