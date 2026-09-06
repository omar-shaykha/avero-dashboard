"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "./Sidebar";
import DashboardHeader from "./DashboardHeader";
import {
  Activity,
  Bot,
  Brain,
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Database,
  FileText,
  MessageSquare,
  PenTool,
  PhoneCall,
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
type Tab = "command" | "live";

type Station = { label: string; icon: LucideIcon };
type AgentMeta = {
  title: string;
  officeName: string;
  mission: string;
  accentText: string;
  accentBorder: string;
  accentBg: string;
  botClass: string;
  icon: LucideIcon;
  stations: Station[];
  tasks: string[];
  stats: { label: string; value: string; icon: LucideIcon }[];
};

const AGENTS: Record<Agent, AgentMeta> = {
  sales: {
    title: "AI Sales Agent",
    officeName: "Sales Mini Office",
    mission: "A tiny AI sales employee receives messages, checks the client brain, prepares quotations, updates CRM, and sends replies.",
    accentText: "text-blue-300",
    accentBorder: "border-blue-500/30",
    accentBg: "bg-blue-500/10",
    botClass: "sales-bot",
    icon: Bot,
    stations: [
      { label: "WhatsApp Inbox", icon: MessageSquare },
      { label: "Company Brain", icon: Brain },
      { label: "CRM Desk", icon: Database },
      { label: "Quotation", icon: ClipboardList },
      { label: "Reply Sent", icon: Send },
    ],
    tasks: ["New message received", "Reading company brain", "Checking customer memory", "Preparing quotation", "Updating CRM", "Sending WhatsApp reply"],
    stats: [
      { label: "Conversations", value: "Live", icon: MessageSquare },
      { label: "CRM", value: "Synced", icon: Database },
      { label: "Quotations", value: "Ready", icon: ClipboardList },
    ],
  },
  marketing: {
    title: "AI Marketing Department",
    officeName: "Marketing Studio",
    mission: "A small creative AI employee moves between brand voice, content desk, approvals, and publishing channels.",
    accentText: "text-violet-300",
    accentBorder: "border-violet-500/30",
    accentBg: "bg-violet-500/10",
    botClass: "marketing-bot",
    icon: Sparkles,
    stations: [
      { label: "Brand Voice", icon: Brain },
      { label: "Content Desk", icon: PenTool },
      { label: "Campaign", icon: Sparkles },
      { label: "Approval", icon: CheckCircle2 },
      { label: "Publish", icon: Send },
    ],
    tasks: ["Reading brand voice", "Writing campaign idea", "Preparing caption", "Waiting approval", "Scheduling post", "Tracking engagement"],
    stats: [
      { label: "Content", value: "Drafting", icon: PenTool },
      { label: "Approvals", value: "Queue", icon: CheckCircle2 },
      { label: "Channels", value: "Ready", icon: Send },
    ],
  },
  hr: {
    title: "AI HR Department",
    officeName: "HR Screening Office",
    mission: "A tiny HR AI employee reads CVs, compares jobs, prepares interview steps, and organizes candidate follow-up.",
    accentText: "text-emerald-300",
    accentBorder: "border-emerald-500/30",
    accentBg: "bg-emerald-500/10",
    botClass: "hr-bot",
    icon: Users,
    stations: [
      { label: "CV Inbox", icon: FileText },
      { label: "Screening", icon: Users },
      { label: "Job Match", icon: ClipboardList },
      { label: "Interview", icon: CalendarClock },
      { label: "HR Reply", icon: Send },
    ],
    tasks: ["Receiving CV", "Reading experience", "Matching position", "Preparing interview", "Updating candidate file", "Sending HR reply"],
    stats: [
      { label: "Candidates", value: "Screening", icon: Users },
      { label: "Interviews", value: "Ready", icon: CalendarClock },
      { label: "Records", value: "Synced", icon: Database },
    ],
  },
  support: {
    title: "AI Support Agent",
    officeName: "Support Help Desk",
    mission: "A small support AI employee checks customer history, reads knowledge, solves tickets, and escalates when needed.",
    accentText: "text-orange-300",
    accentBorder: "border-orange-500/30",
    accentBg: "bg-orange-500/10",
    botClass: "support-bot",
    icon: ShieldCheck,
    stations: [
      { label: "Ticket Inbox", icon: MessageSquare },
      { label: "Customer History", icon: Database },
      { label: "Knowledge", icon: Brain },
      { label: "Solution", icon: ShieldCheck },
      { label: "Close Loop", icon: CheckCircle2 },
    ],
    tasks: ["Receiving ticket", "Checking customer history", "Reading knowledge", "Drafting solution", "Escalating if needed", "Closing ticket"],
    stats: [
      { label: "Tickets", value: "Watching", icon: Activity },
      { label: "Knowledge", value: "Loaded", icon: Brain },
      { label: "Replies", value: "Ready", icon: Send },
    ],
  },
};

export default function AiDepartmentWorkspace({ agent, title }: { agent: Agent; title: string }) {
  const meta = AGENTS[agent];
  const [activeTab, setActiveTab] = useState<Tab>("command");
  const [activeTask, setActiveTask] = useState(0);
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
    const timer = window.setInterval(() => setActiveTask((current) => (current + 1) % meta.tasks.length), 1300);
    return () => window.clearInterval(timer);
  }, [meta.tasks.length]);

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
            <section className={`overflow-hidden rounded-3xl border ${meta.accentBorder} bg-slate-900/70 p-6 shadow-2xl`}>
              <div className="grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
                <div>
                  <p className={`text-xs font-bold uppercase tracking-[.28em] ${meta.accentText}`}>AVERO AI Department</p>
                  <h1 className="mt-3 text-4xl font-black tracking-tight">{displayTitle}</h1>
                  <p className="mt-3 text-sm leading-6 text-slate-400">{meta.mission}</p>
                  <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    {meta.stats.map((stat) => (
                      <SmallStat key={stat.label} stat={stat} />
                    ))}
                  </div>
                  <div className="mt-6 flex rounded-2xl border border-slate-800 bg-slate-950/60 p-1">
                    <TabButton active={activeTab === "command"} onClick={() => setActiveTab("command")} icon={Settings} text="Command" />
                    <TabButton active={activeTab === "live"} onClick={() => setActiveTab("live")} icon={Bot} text="AI Office" />
                  </div>
                </div>

                <OfficeScene meta={meta} activeTask={activeTask} compact />
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
                onSet={set}
                onSave={save}
                onUpload={upload}
              />
            ) : (
              <LivePanel meta={meta} activeTask={activeTask} filesCount={files.length} />
            )}
          </div>
        </main>
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
  onSet,
  onSave,
  onUpload,
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
  onSet: (key: string, value: string) => void;
  onSave: () => void;
  onUpload: (file?: File) => void;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_.75fr]">
      <div className="space-y-6">
        <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="flex items-start gap-4">
            <div className={`rounded-2xl ${meta.accentBg} p-3 ${meta.accentText}`}>
              <Building2 />
            </div>
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
            <button onClick={onSave} disabled={saving || !data} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold hover:bg-blue-500 disabled:opacity-50">
              <Save size={16} />
              {saving ? "Saving..." : "Save Brain"}
            </button>
          </div>
        </section>
      </div>

      <aside className="space-y-6">
        <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold">PDF Knowledge</h2>
              <p className="mt-1 text-sm text-slate-500">Menus, price lists, company profiles, policies, services and FAQs.</p>
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm font-semibold hover:border-blue-500">
              <Upload size={16} />
              {uploading ? "Uploading..." : "Upload"}
              <input
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                disabled={uploading}
                onChange={(event) => {
                  onUpload(event.target.files?.[0]);
                  event.currentTarget.value = "";
                }}
              />
            </label>
          </div>
          {uploadError && <p className="mt-3 text-sm text-red-400">{uploadError}</p>}
          <div className="mt-4 space-y-2">
            {files.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-800 p-5 text-center text-sm text-slate-600">No PDF knowledge uploaded yet.</p>
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
          <h2 className="text-lg font-bold">Identity Lock</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">The customer should feel they are speaking with this client company, not with AVERO. AVERO stays hidden as the platform.</p>
        </section>
      </aside>
    </div>
  );
}

function LivePanel({ meta, activeTask, filesCount }: { meta: AgentMeta; activeTask: number; filesCount: number }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_.38fr]">
      <OfficeScene meta={meta} activeTask={activeTask} />
      <div className="space-y-6">
        <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-lg font-bold">Now working</h2>
          <div className="mt-4 space-y-2">
            {meta.tasks.map((task, index) => (
              <div key={task} className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition ${index === activeTask ? `${meta.accentBorder} ${meta.accentBg} text-white` : "border-slate-800 bg-slate-950/60 text-slate-500"}`}>
                <span className={`h-2.5 w-2.5 rounded-full ${index === activeTask ? "animate-pulse bg-emerald-400" : "bg-slate-700"}`} />
                {task}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-lg font-bold">Office data</h2>
          <div className="mt-4 grid gap-3">
            <DataLine label="Knowledge files" value={String(filesCount)} />
            <DataLine label="Isolation" value="Company + number + customer" />
            <DataLine label="Status" value="Ready" />
          </div>
        </section>
      </div>
    </div>
  );
}

function OfficeScene({ meta, activeTask, compact = false }: { meta: AgentMeta; activeTask: number; compact?: boolean }) {
  return (
    <section className={`relative overflow-hidden rounded-3xl border ${meta.accentBorder} bg-slate-950 p-5 ${compact ? "min-h-[300px]" : "min-h-[560px]"}`}>
      <style>{`
        @keyframes salesRun { 0%,100% { transform: translate(18px, 178px) } 20% { transform: translate(185px, 48px) } 40% { transform: translate(372px, 172px) } 60% { transform: translate(540px, 54px) } 80% { transform: translate(650px, 180px) } }
        @keyframes marketingRun { 0%,100% { transform: translate(32px, 62px) } 24% { transform: translate(230px, 180px) } 46% { transform: translate(390px, 62px) } 68% { transform: translate(550px, 184px) } 86% { transform: translate(665px, 70px) } }
        @keyframes hrRun { 0%,100% { transform: translate(22px, 190px) } 22% { transform: translate(210px, 60px) } 45% { transform: translate(390px, 190px) } 65% { transform: translate(548px, 62px) } 85% { transform: translate(660px, 188px) } }
        @keyframes supportRun { 0%,100% { transform: translate(28px, 70px) } 20% { transform: translate(208px, 188px) } 42% { transform: translate(384px, 70px) } 63% { transform: translate(548px, 190px) } 84% { transform: translate(662px, 76px) } }
        @keyframes bob { 0%,100% { margin-top: 0 } 50% { margin-top: -7px } }
        .office-grid { background-image: linear-gradient(rgba(148,163,184,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,.08) 1px, transparent 1px); background-size: 42px 42px; }
        .office-bot { animation-duration: 8s; animation-timing-function: ease-in-out; animation-iteration-count: infinite; }
        .office-bot-inner { animation: bob .8s ease-in-out infinite; }
        .sales-bot { animation-name: salesRun; }
        .marketing-bot { animation-name: marketingRun; }
        .hr-bot { animation-name: hrRun; }
        .support-bot { animation-name: supportRun; }
        @media (prefers-reduced-motion: reduce) { .office-bot, .office-bot-inner { animation: none !important; } }
      `}</style>
      <div className="office-grid absolute inset-0 opacity-80" />
      <div className={`absolute -right-20 -top-20 h-64 w-64 rounded-full ${meta.accentBg} blur-3xl`} />
      <div className="relative z-10 flex items-center justify-between gap-4">
        <div>
          <p className={`text-xs font-bold uppercase tracking-[.24em] ${meta.accentText}`}>{meta.officeName}</p>
          <h2 className="mt-2 text-2xl font-black">Tiny AI employee at work</h2>
        </div>
        <div className={`rounded-2xl border ${meta.accentBorder} ${meta.accentBg} px-4 py-3 text-sm font-semibold`}>
          {meta.tasks[activeTask]}
        </div>
      </div>

      <div className={`relative z-10 mt-8 ${compact ? "h-[220px]" : "h-[430px]"}`}>
        <div className="absolute inset-x-0 bottom-8 h-24 rounded-[2rem] border border-slate-800 bg-slate-900/70 shadow-2xl" />
        <div className="absolute left-[46%] top-[38%] h-32 w-44 rounded-3xl border border-slate-700 bg-slate-900 p-4 shadow-2xl">
          <div className="h-4 w-24 rounded-full bg-slate-700" />
          <div className={`mt-4 h-12 rounded-2xl ${meta.accentBg} border ${meta.accentBorder}`} />
          <p className="mt-3 text-center text-xs font-semibold text-slate-400">Main desk</p>
        </div>

        {meta.stations.map((station, index) => (
          <StationCard key={station.label} station={station} index={index} meta={meta} active={index === activeTask % meta.stations.length} />
        ))}

        <div className={`office-bot ${meta.botClass} absolute left-0 top-0 z-20 h-16 w-16`}>
          <div className="office-bot-inner flex h-16 w-16 flex-col items-center justify-center rounded-3xl border border-white/20 bg-slate-100 text-slate-950 shadow-2xl">
            <Bot size={28} />
            <div className="mt-1 flex gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-950" />
              <span className="h-1.5 w-1.5 rounded-full bg-slate-950" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StationCard({ station, index, meta, active }: { station: Station; index: number; meta: AgentMeta; active: boolean }) {
  const Icon = station.icon;
  const positions = [
    "left-2 top-24",
    "left-[24%] top-2",
    "left-[50%] bottom-10",
    "right-[18%] top-4",
    "right-3 bottom-20",
  ];

  return (
    <div className={`absolute ${positions[index]} w-36 rounded-2xl border p-3 shadow-xl transition ${active ? `${meta.accentBorder} ${meta.accentBg}` : "border-slate-800 bg-slate-900/80"}`}>
      <Icon size={20} className={active ? meta.accentText : "text-slate-500"} />
      <p className="mt-2 text-xs font-semibold text-white">{station.label}</p>
      <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${active ? "bg-emerald-400/15 text-emerald-300" : "bg-slate-800 text-slate-500"}`}>{active ? "Working" : "Ready"}</span>
    </div>
  );
}

function SmallStat({ stat }: { stat: { label: string; value: string; icon: LucideIcon } }) {
  const Icon = stat.icon;
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
      <Icon size={18} className="text-slate-400" />
      <p className="mt-3 text-xs text-slate-500">{stat.label}</p>
      <p className="text-sm font-bold text-white">{stat.value}</p>
    </div>
  );
}

function StatusPill({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300">
      <Icon size={13} />
      {text}
    </span>
  );
}

function TabButton({ active, onClick, icon: Icon, text }: { active: boolean; onClick: () => void; icon: LucideIcon; text: string }) {
  return (
    <button onClick={onClick} className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition ${active ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-900 hover:text-white"}`}>
      <Icon size={16} />
      {text}
    </button>
  );
}

function Field({ label, value, onChange }: { label: string; value?: string; onChange: (value: string) => void }) {
  return (
    <label className="text-sm font-medium text-slate-400">
      {label}
      <input value={value || ""} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500" />
    </label>
  );
}

function Area({ label, value, onChange }: { label: string; value?: string; onChange: (value: string) => void }) {
  return (
    <label className="text-sm font-medium text-slate-400">
      {label}
      <textarea rows={4} value={value || ""} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 p-4 text-white outline-none focus:border-blue-500" />
    </label>
  );
}

function DataLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-white">{value}</span>
    </div>
  );
}
