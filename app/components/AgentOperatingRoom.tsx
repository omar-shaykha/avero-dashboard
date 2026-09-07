"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import Link from "next/link";
import Sidebar from "./Sidebar";
import DashboardHeader from "./DashboardHeader";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bot,
  Boxes,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Copy,
  FileText,
  Headphones,
  ImagePlus,
  Megaphone,
  MessageSquare,
  PackageCheck,
  Play,
  RefreshCw,
  Rocket,
  Save,
  Send,
  Sparkles,
  Upload,
  UsersRound,
  Warehouse,
  Wand2,
  type LucideIcon,
} from "lucide-react";

type AgentSlug = "sales" | "marketing" | "hr" | "support" | "inventory" | "customer-care" | "analytics" | "warehouse";
type Run = { id: string; action?: string | null; status?: string | null; error_message?: string | null; created_at?: string | null; completed_at?: string | null };
type WorkerRow = {
  id: string;
  boss_agent_key: string;
  worker_key: string;
  worker_name: string;
  role_title: string;
  responsibility: string;
  instructions: string;
  make_scenario_id?: number | null;
  make_module_label?: string | null;
  status: "active" | "inactive" | "needs_setup" | string;
  sort_order?: number | null;
  last_run_at?: string | null;
};
type ContentItem = { id: string; campaign_name?: string | null; status?: string | null; caption?: string | null; platforms?: string[] | null; channel?: string | null; approval_notes?: string | null; media_url?: string | null; created_at?: string | null };
type BrandKit = {
  brand_name?: string | null;
  slogan?: string | null;
  logo_data_url?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  accent_color?: string | null;
  tone_of_voice?: string | null;
  visual_style?: string | null;
  target_audience?: string | null;
  content_pillars?: string[] | null;
  default_platforms?: string[] | null;
  daily_time?: string | null;
  timezone?: string | null;
};
type AgentConfig = {
  slug: AgentSlug;
  agentKey: string;
  head: string;
  animal: string;
  department: string;
  title: string;
  mission: string;
  quote: string;
  accent: "cyan" | "violet" | "emerald" | "amber" | "rose";
  href: string;
  crmHref?: string;
  fallbackWorkers: WorkerRow[];
  flow: string[];
  quickTasks: string[];
  icon: LucideIcon;
};

function worker(worker_key: string, worker_name: string, role_title: string, responsibility: string, make_scenario_id: number, sort_order: number): WorkerRow {
  return { id: worker_key, boss_agent_key: "", worker_key, worker_name, role_title, responsibility, instructions: responsibility, make_scenario_id, make_module_label: worker_name, status: "needs_setup", sort_order };
}

const configs: Record<AgentSlug, AgentConfig> = {
  sales: {
    slug: "sales",
    agentKey: "ai_sales",
    head: "Leo",
    animal: "🦁",
    department: "Sales Department",
    title: "Revenue Head Agent",
    mission: "Leo leads the real sales team: captures leads, qualifies intent, follows up, prepares quotation actions and keeps the CRM moving.",
    quote: "Every lead needs a clear next step.",
    accent: "cyan",
    href: "/ai-sales",
    crmHref: "/crm/sales",
    icon: UsersRound,
    fallbackWorkers: [
      worker("lead_hunter", "Lead Hunter", "Lead Capture Worker", "Captures new leads and identifies service interest.", 7207540, 1),
      worker("qualifier", "Qualifier", "Sales Qualification Worker", "Qualifies leads and scores buying intent.", 7207540, 2),
      worker("quotation_builder", "Quotation Builder", "Quotation Worker", "Prepares quotation-ready summaries and next action.", 7207540, 3),
      worker("followup_closer", "Follow-up Closer", "Follow-up Worker", "Follows up and moves deals toward won/lost.", 7207540, 4),
    ],
    flow: ["New lead", "Qualification", "Quotation", "Follow-up", "Won / Lost"],
    quickTasks: ["Review today's leads and tell me which ones need follow-up first.", "Prepare a sales follow-up message for a qualified lead.", "Find quotation opportunities and suggest the next action."],
  },
  marketing: {
    slug: "marketing",
    agentKey: "ai_marketing",
    head: "Foxy",
    animal: "🦊",
    department: "Marketing Department",
    title: "Growth Head Agent",
    mission: "Foxy manages the marketing team: plans content, writes copy, prepares creative briefs, queues approvals and sends posts to publishing after approval.",
    quote: "Plan, create, approve, publish, learn.",
    accent: "violet",
    href: "/ai-marketing",
    crmHref: "/crm/marketing",
    icon: Megaphone,
    fallbackWorkers: [
      worker("content_planner", "Content Planner", "Planning Worker", "Plans daily content themes and campaign angles.", 7264446, 1),
      worker("copywriter", "Copywriter", "Copy Worker", "Writes captions, hooks, CTAs and hashtags.", 7264446, 2),
      worker("creative_designer", "Creative Designer", "Creative Brief Worker", "Creates visual prompts, covers, stories and ad directions.", 7264446, 3),
      worker("publisher", "Publisher", "Publishing Worker", "Prepares approved posts for publishing and tracks status.", 7264446, 4),
    ],
    flow: ["Idea", "Caption", "Creative brief", "Approval", "Publish"],
    quickTasks: ["Create today's AVERO OS content pack for Facebook and Instagram.", "Write a premium post about AVERO OS AI agents and operations dashboard.", "Prepare a repost version from the best evergreen content."],
  },
  hr: {
    slug: "hr",
    agentKey: "ai_hr",
    head: "Aero",
    animal: "🦅",
    department: "HR & Booking Department",
    title: "Planning Head Agent",
    mission: "Aero leads planning, booking, schedules, reminders, employee requests and organized confirmations.",
    quote: "A smooth calendar means a smooth operation.",
    accent: "amber",
    href: "/ai-hr",
    crmHref: "/crm/hr",
    icon: CalendarClock,
    fallbackWorkers: [
      worker("booking_intake", "Booking Intake", "Booking Worker", "Collects booking and HR request details.", 7264449, 1),
      worker("availability_checker", "Availability Checker", "Availability Worker", "Checks availability and plans options.", 7264449, 2),
      worker("reminder_agent", "Reminder Agent", "Reminder Worker", "Creates reminders and confirmation messages.", 7264449, 3),
      worker("hr_desk", "HR Desk", "HR Worker", "Handles staff and internal requests.", 7264449, 4),
    ],
    flow: ["Request", "Check rules", "Schedule", "Confirm", "Remind"],
    quickTasks: ["Prepare a clean booking workflow for today's requests.", "Write a confirmation and reminder message.", "Organize HR requests by priority and next action."],
  },
  support: {
    slug: "support",
    agentKey: "ai_support",
    head: "Gor",
    animal: "🦍",
    department: "Support Department",
    title: "Problem Solving Head Agent",
    mission: "Gor leads support: classifies tickets, searches company knowledge, suggests replies and escalates when human help is needed.",
    quote: "Fast answers build trust.",
    accent: "emerald",
    href: "/ai-support",
    crmHref: "/crm/support",
    icon: Headphones,
    fallbackWorkers: [
      worker("ticket_sorter", "Ticket Sorter", "Support Triage Worker", "Classifies support messages and urgency.", 7272144, 1),
      worker("faq_agent", "FAQ Agent", "Knowledge Worker", "Answers questions from approved knowledge.", 7272144, 2),
      worker("escalation_agent", "Escalation Agent", "Escalation Worker", "Escalates complaints and sensitive cases.", 7272144, 3),
      worker("close_loop", "Close Loop", "Resolution Worker", "Closes tickets and logs outcome.", 7272144, 4),
    ],
    flow: ["Inbox", "Classify", "Suggested reply", "Escalate / solve", "Close"],
    quickTasks: ["Classify this support issue and suggest the best reply.", "Create a human-friendly answer from the company knowledge.", "Prepare an escalation note for a complex customer issue."],
  },
  inventory: {
    slug: "inventory",
    agentKey: "ai_inventory",
    head: "Vexa",
    animal: "🐍",
    department: "Inventory Department",
    title: "Stock Control Head Agent",
    mission: "Vexa watches stock, expiry, waste and reorder needs so the business does not run out or overbuy.",
    quote: "Stock should warn you before it becomes a problem.",
    accent: "rose",
    href: "/ai-inventory",
    icon: PackageCheck,
    fallbackWorkers: [
      worker("stock_monitor", "Stock Monitor", "Stock Worker", "Monitors stock levels and risks.", 7272262, 1),
      worker("reorder_agent", "Reorder Agent", "Purchasing Worker", "Suggests reorder actions.", 7272262, 2),
      worker("expiry_watch", "Expiry Watch", "Expiry Worker", "Tracks expiry and aging inventory.", 7272262, 3),
      worker("waste_guard", "Waste Guard", "Waste Worker", "Reduces waste and shrinkage.", 7272262, 4),
    ],
    flow: ["Stock data", "Risk check", "Alert", "Suggested order", "Approval"],
    quickTasks: ["Review stock risk and suggest the next reorder action.", "Create a low-stock alert summary.", "Find items that may cause waste or expiry risk."],
  },
  "customer-care": {
    slug: "customer-care",
    agentKey: "ai_customer_care",
    head: "Rex",
    animal: "🐕",
    department: "Customer Care Department",
    title: "Loyalty Head Agent",
    mission: "Rex handles after-sales follow-up, feedback, complaints, loyalty messages and customer retention actions.",
    quote: "A cared customer comes back.",
    accent: "cyan",
    href: "/ai-customer-care",
    icon: UsersRound,
    fallbackWorkers: [
      worker("welcome_agent", "Welcome Agent", "Customer Welcome Worker", "Welcomes and profiles customers.", 7272265, 1),
      worker("feedback_collector", "Feedback Collector", "Feedback Worker", "Collects reviews and feedback.", 7272265, 2),
      worker("loyalty_agent", "Loyalty Agent", "Loyalty Worker", "Builds repeat customer actions.", 7272265, 3),
      worker("complaint_care", "Complaint Care", "Complaint Worker", "Handles complaints carefully.", 7272265, 4),
    ],
    flow: ["Customer", "Feedback", "Care action", "Loyalty", "Review"],
    quickTasks: ["Write a post-purchase follow-up message.", "Prepare a complaint recovery reply.", "Suggest a loyalty campaign for repeat customers."],
  },
  analytics: {
    slug: "analytics",
    agentKey: "ai_analytics",
    head: "Nova",
    animal: "🐈",
    department: "Analytics Department",
    title: "Insight Head Agent",
    mission: "Nova reads business data, explains performance, highlights risks and suggests practical next decisions.",
    quote: "Better decisions come from clearer numbers.",
    accent: "violet",
    href: "/ai-analytics",
    icon: BarChart3,
    fallbackWorkers: [
      worker("data_reader", "Data Reader", "Data Worker", "Reads business data and prepares summaries.", 7272271, 1),
      worker("trend_analyst", "Trend Analyst", "Analysis Worker", "Finds trends and performance changes.", 7272271, 2),
      worker("kpi_reporter", "KPI Reporter", "Reporting Worker", "Creates KPI summaries.", 7272271, 3),
      worker("recommendation_agent", "Recommendation Agent", "Decision Worker", "Suggests actions from insights.", 7272271, 4),
    ],
    flow: ["Data", "Trend", "KPI", "Insight", "Decision"],
    quickTasks: ["Analyze latest business activity and give top three insights.", "Create a KPI summary with risks and opportunities.", "Recommend the next operational decision."],
  },
  warehouse: {
    slug: "warehouse",
    agentKey: "ai_warehouse",
    head: "Bruno",
    animal: "🐻",
    department: "Warehouse Department",
    title: "Warehouse Head Agent",
    mission: "Bruno controls receiving, transfers, stock counts, item movement and warehouse records.",
    quote: "Clean warehouse records make operations faster.",
    accent: "emerald",
    href: "/ai-warehouse",
    icon: Warehouse,
    fallbackWorkers: [
      worker("receiving_checker", "Receiving Checker", "Receiving Worker", "Checks receiving and deliveries.", 7272275, 1),
      worker("movement_logger", "Movement Logger", "Movement Worker", "Logs warehouse item movement.", 7272275, 2),
      worker("cycle_counter", "Cycle Counter", "Counting Worker", "Supports stock counts.", 7272275, 3),
      worker("warehouse_controller", "Warehouse Controller", "Control Worker", "Controls warehouse next actions.", 7272275, 4),
    ],
    flow: ["Receiving", "Movement", "Count", "Discrepancy", "Control"],
    quickTasks: ["Review receiving and warehouse movement then suggest next action.", "Prepare a cycle count task list.", "Summarize warehouse discrepancies and control action."],
  },
};

const workerIcons: LucideIcon[] = [UsersRound, CheckCircle2, FileText, Send, CalendarClock, MessageSquare, ImagePlus, PackageCheck, BarChart3, Warehouse];

const accentClasses = {
  cyan: "border-cyan-400/25 bg-cyan-400/10 text-cyan-100",
  violet: "border-violet-400/25 bg-violet-400/10 text-violet-100",
  emerald: "border-emerald-400/25 bg-emerald-400/10 text-emerald-100",
  amber: "border-amber-400/25 bg-amber-400/10 text-amber-100",
  rose: "border-rose-400/25 bg-rose-400/10 text-rose-100",
};

export default function AgentOperatingRoom({ agent }: { agent: AgentSlug }) {
  const config = configs[agent];
  const [runs, setRuns] = useState<Run[]>([]);
  const [workers, setWorkers] = useState<WorkerRow[]>(config.fallbackWorkers);
  const [task, setTask] = useState(config.quickTasks[0] || "");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [brandKit, setBrandKit] = useState<BrandKit | null>(null);
  const [queue, setQueue] = useState<ContentItem[]>([]);
  const [brandSaving, setBrandSaving] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["facebook", "instagram"]);

  async function loadRuns() {
    const response = await fetch(`/api/ai-departments/${agent}/runs`, { cache: "no-store" });
    if (response.ok) setRuns((await response.json()).runs || []);
  }

  async function loadWorkers() {
    const response = await fetch(`/api/ai-departments/${agent}/workers`, { cache: "no-store" });
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data.workers) && data.workers.length) setWorkers(data.workers);
    }
  }

  async function loadMarketing() {
    if (agent !== "marketing") return;
    const [brandRes, queueRes] = await Promise.all([
      fetch("/api/marketing/brand-kit", { cache: "no-store" }),
      fetch("/api/marketing/content", { cache: "no-store" }),
    ]);
    if (brandRes.ok) {
      const data = await brandRes.json();
      setBrandKit(data.brand_kit || null);
      if (data.brand_kit?.default_platforms) setSelectedPlatforms(data.brand_kit.default_platforms);
    }
    if (queueRes.ok) setQueue((await queueRes.json()).items || []);
  }

  async function loadAll() {
    await Promise.all([loadRuns(), loadWorkers(), loadMarketing()]);
  }

  useEffect(() => {
    setTask(config.quickTasks[0] || "");
    setWorkers(config.fallbackWorkers);
    loadAll();
  }, [agent]);

  useEffect(() => {
    const timer = window.setInterval(loadRuns, 6000);
    return () => window.clearInterval(timer);
  }, [agent]);

  const latestRun = runs[0];
  const activeWorker = useMemo(() => {
    if (!workers.length) return null;
    const index = Math.abs((latestRun?.action || config.agentKey).split("").reduce((sum, char) => sum + char.charCodeAt(0), 0)) % workers.length;
    return workers[index];
  }, [latestRun, workers, config.agentKey]);

  async function runCommand() {
    if (!task.trim()) return;
    setLoading(true);
    setMessage("Sending command to the real agent engine...");
    const response = await fetch(`/api/ai-departments/${agent}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task, action: "manual_command", channel: "dashboard", content_type: agent === "marketing" ? "content_pack" : "operating_room_command", platforms: selectedPlatforms }),
    });
    const data = await response.json().catch(() => ({}));
    setLoading(false);
    setMessage(response.ok ? `Command sent to ${config.head}. Status: ${data.status || "running"}` : data.error || "Command failed.");
    await loadAll();
  }

  async function generateMarketing() {
    setTask(`Create a complete content pack using the saved Brand Kit. Platforms: ${selectedPlatforms.join(", ")}. Keep it approval-ready, include caption, hashtags, visual idea, video idea and CTA.`);
    setTimeout(runCommand, 50);
  }

  async function updateContent(id: string, action: "approve" | "publish" | "reject" | "repost") {
    const response = await fetch(`/api/marketing/content/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setMessage(response.ok ? `Content ${action} request saved.` : `Could not ${action} content.`);
    await loadMarketing();
  }

  async function saveBrandKit() {
    if (!brandKit) return;
    setBrandSaving(true);
    const response = await fetch("/api/marketing/brand-kit", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...brandKit, default_platforms: selectedPlatforms }),
    });
    setBrandSaving(false);
    setMessage(response.ok ? "Brand Kit saved." : "Could not save Brand Kit.");
    await loadMarketing();
  }

  async function uploadLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !brandKit) return;
    const reader = new FileReader();
    reader.onload = () => setBrandKit({ ...brandKit, logo_data_url: String(reader.result || "") });
    reader.readAsDataURL(file);
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Sidebar />
      <div className="ml-64 min-h-screen">
        <DashboardHeader />
        <main className="p-4 md:p-7">
          <div className="mx-auto max-w-[1500px] space-y-6">
            <section className="overflow-hidden rounded-3xl border border-cyan-400/20 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,.16),transparent_34%),radial-gradient(circle_at_top_right,rgba(168,85,247,.13),transparent_34%),#020617] p-6 shadow-2xl">
              <div className="grid gap-6 xl:grid-cols-[1fr_.8fr]">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.28em] text-cyan-300">AVERO OS Operating Room</p>
                  <div className="mt-4 flex flex-wrap items-center gap-4">
                    <div className="relative flex h-24 w-24 items-center justify-center rounded-[2rem] border border-cyan-300/30 bg-cyan-300/10 text-6xl shadow-[0_0_55px_rgba(34,211,238,.22)]">
                      <span className="absolute -right-1 -top-1 h-4 w-4 animate-pulse rounded-full bg-emerald-400" />
                      {config.animal}
                    </div>
                    <div>
                      <h1 className="text-3xl font-black tracking-tight md:text-5xl">{config.head}</h1>
                      <p className="mt-1 text-sm font-bold uppercase tracking-[0.22em] text-cyan-200">{config.title}</p>
                      <p className="mt-2 text-sm text-slate-400">{config.department}</p>
                    </div>
                  </div>
                  <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-300">{config.mission}</p>
                  <div className={`mt-5 rounded-2xl border p-4 text-sm font-semibold ${accentClasses[config.accent]}`}>“{config.quote}”</div>
                </div>

                <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-300">Real connection</p>
                      <h2 className="mt-1 text-xl font-black">Boss + workers + Make</h2>
                    </div>
                    <Bot className="text-emerald-300" />
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <MiniStat label="Workers" value={workers.length} icon={UsersRound} />
                    <MiniStat label="Live runs" value={runs.length} icon={Activity} />
                    <MiniStat label="Engine" value="Make" icon={Play} />
                  </div>
                  <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300">
                    Active now: <span className="font-bold text-white">{activeWorker?.worker_name || config.head}</span>
                    <br />
                    Boss: <span className="font-bold text-cyan-200">{config.head}</span> · Scenario: <span className="font-bold text-cyan-200">{activeWorker?.make_scenario_id || "linked"}</span>
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
              <div className="rounded-3xl border border-slate-800 bg-slate-900/65 p-5">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">Department Team</p>
                    <h2 className="mt-1 text-2xl font-black">{config.head} workers</h2>
                  </div>
                  <RefreshCw onClick={loadAll} className="cursor-pointer text-slate-400 hover:text-white" />
                </div>
                <div className="relative rounded-3xl border border-slate-800 bg-slate-950/50 p-5">
                  <div className="mx-auto flex max-w-sm items-center justify-center rounded-2xl border border-cyan-400/25 bg-cyan-400/10 px-4 py-3 text-center shadow-[0_0_40px_rgba(34,211,238,.12)]">
                    <span className="mr-3 text-3xl">{config.animal}</span>
                    <div className="text-left">
                      <p className="text-sm font-black text-white">{config.head}</p>
                      <p className="text-xs text-cyan-200">Head Agent / Boss</p>
                    </div>
                  </div>
                  <div className="mt-6 grid gap-3 md:grid-cols-2">
                    {workers.map((item, index) => {
                      const Icon = workerIcons[index % workerIcons.length];
                      const isActive = activeWorker?.worker_key === item.worker_key;
                      return <WorkerCard key={item.id || item.worker_key} worker={item} icon={Icon} active={isActive} />;
                    })}
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <CommandCenter config={config} task={task} setTask={setTask} runCommand={runCommand} loading={loading} />
                <FlowCard flow={config.flow} />
              </div>
            </section>

            {agent === "marketing" && (
              <MarketingPanel
                brandKit={brandKit}
                setBrandKit={setBrandKit}
                selectedPlatforms={selectedPlatforms}
                setSelectedPlatforms={setSelectedPlatforms}
                uploadLogo={uploadLogo}
                saveBrandKit={saveBrandKit}
                brandSaving={brandSaving}
                generateMarketing={generateMarketing}
                queue={queue}
                updateContent={updateContent}
              />
            )}

            {message && <div className="rounded-2xl border border-cyan-400/25 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100">{message}</div>}

            <section className="rounded-3xl border border-slate-800 bg-slate-900/65 p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-violet-300">Live Results</p>
                  <h2 className="mt-1 text-2xl font-black">Real agent runs</h2>
                </div>
                <Activity className="text-violet-300" />
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {runs.slice(0, 6).map((run) => <RunCard key={run.id} run={run} />)}
                {!runs.length && <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-5 text-sm text-slate-400">No runs yet. Send a command to start a real run.</div>}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

function MiniStat({ label, value, icon: Icon }: { label: string; value: string | number; icon: LucideIcon }) {
  return <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4"><Icon size={18} className="text-cyan-300" /><p className="mt-3 text-xs text-slate-500">{label}</p><p className="mt-1 text-xl font-black text-white">{value}</p></div>;
}

function WorkerCard({ worker, icon: Icon, active }: { worker: WorkerRow; icon: LucideIcon; active: boolean }) {
  const isOk = worker.status === "active";
  return (
    <div className={`rounded-2xl border p-4 transition ${active ? "border-cyan-300 bg-cyan-300/10 shadow-[0_0_32px_rgba(34,211,238,.12)]" : "border-slate-800 bg-slate-900/70"}`}>
      <div className="flex items-start gap-3">
        <div className="rounded-2xl border border-slate-700 bg-slate-950 p-3 text-cyan-300"><Icon size={20} /></div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-black text-white">{worker.worker_name}</h3>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${isOk ? "bg-emerald-400/10 text-emerald-300" : "bg-amber-400/10 text-amber-300"}`}>{isOk ? "ACTIVE" : "SETUP"}</span>
          </div>
          <p className="mt-1 text-xs font-semibold text-cyan-200">{worker.role_title}</p>
          <p className="mt-2 text-sm leading-6 text-slate-400">{worker.responsibility}</p>
          <p className="mt-3 text-xs text-slate-500">Make scenario: {worker.make_scenario_id || "not linked"} · Module: {worker.make_module_label || worker.worker_name}</p>
        </div>
      </div>
    </div>
  );
}

function CommandCenter({ config, task, setTask, runCommand, loading }: { config: AgentConfig; task: string; setTask: (value: string) => void; runCommand: () => void; loading: boolean }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/65 p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">Command Center</p>
          <h2 className="mt-1 text-2xl font-black">Give {config.head} a task</h2>
        </div>
        <Send className="text-cyan-300" />
      </div>
      <textarea value={task} onChange={(event) => setTask(event.target.value)} className="min-h-32 w-full rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-white outline-none focus:border-cyan-400" />
      <div className="mt-3 flex flex-wrap gap-2">
        {config.quickTasks.map((item) => <button key={item} onClick={() => setTask(item)} className="rounded-full border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-cyan-400 hover:text-white">{item}</button>)}
      </div>
      <button onClick={runCommand} disabled={loading} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 text-sm font-black text-slate-950 hover:bg-cyan-400 disabled:opacity-60">
        {loading ? "Running..." : "Run real command"} <ArrowRight size={16} />
      </button>
    </div>
  );
}

function FlowCard({ flow }: { flow: string[] }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/65 p-5">
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-300">Workflow</p>
      <div className="mt-4 space-y-3">
        {flow.map((step, index) => <div key={step} className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/50 p-3"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-400/10 text-xs font-black text-emerald-300">{index + 1}</span><span className="text-sm font-semibold text-slate-200">{step}</span></div>)}
      </div>
    </div>
  );
}

function MarketingPanel({ brandKit, setBrandKit, selectedPlatforms, setSelectedPlatforms, uploadLogo, saveBrandKit, brandSaving, generateMarketing, queue, updateContent }: { brandKit: BrandKit | null; setBrandKit: (value: BrandKit) => void; selectedPlatforms: string[]; setSelectedPlatforms: (value: string[]) => void; uploadLogo: (event: ChangeEvent<HTMLInputElement>) => void; saveBrandKit: () => void; brandSaving: boolean; generateMarketing: () => void; queue: ContentItem[]; updateContent: (id: string, action: "approve" | "publish" | "reject" | "repost") => void }) {
  const platforms = ["facebook", "instagram", "tiktok", "snapchat"];
  const kit = brandKit || {};
  function setKit(key: keyof BrandKit, value: string) { setBrandKit({ ...kit, [key]: value }); }
  function togglePlatform(platform: string) {
    setSelectedPlatforms(selectedPlatforms.includes(platform) ? selectedPlatforms.filter((item) => item !== platform) : [...selectedPlatforms, platform]);
  }
  return (
    <section className="grid gap-5 xl:grid-cols-[.85fr_1.15fr]">
      <div className="rounded-3xl border border-violet-400/20 bg-violet-400/10 p-5">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-violet-200">Foxy Brand Kit</p>
        <h2 className="mt-1 text-2xl font-black text-white">Logo + voice + platforms</h2>
        <div className="mt-5 space-y-3">
          <label className="flex cursor-pointer items-center justify-center rounded-2xl border border-dashed border-violet-300/40 bg-slate-950/50 p-5 text-sm text-violet-100 hover:bg-slate-950/80">
            <Upload className="mr-2" size={18} /> Upload Logo
            <input type="file" accept="image/*" className="hidden" onChange={uploadLogo} />
          </label>
          {kit.logo_data_url && <img src={kit.logo_data_url} alt="Brand logo" className="max-h-24 rounded-2xl border border-slate-700 bg-white/5 p-3" />}
          <Input label="Brand name" value={kit.brand_name || ""} onChange={(v) => setKit("brand_name", v)} />
          <Input label="Slogan" value={kit.slogan || ""} onChange={(v) => setKit("slogan", v)} />
          <Input label="Tone of voice" value={kit.tone_of_voice || ""} onChange={(v) => setKit("tone_of_voice", v)} />
          <Input label="Visual style" value={kit.visual_style || ""} onChange={(v) => setKit("visual_style", v)} />
          <div className="flex flex-wrap gap-2">{platforms.map((platform) => <button key={platform} onClick={() => togglePlatform(platform)} className={`rounded-full px-3 py-1.5 text-xs font-bold ${selectedPlatforms.includes(platform) ? "bg-violet-300 text-slate-950" : "border border-slate-700 text-slate-300"}`}>{platform}</button>)}</div>
          <div className="flex flex-wrap gap-2">
            <button onClick={saveBrandKit} disabled={brandSaving} className="inline-flex items-center gap-2 rounded-xl bg-violet-400 px-4 py-2.5 text-sm font-black text-slate-950 hover:bg-violet-300 disabled:opacity-60"><Save size={15} /> {brandSaving ? "Saving..." : "Save Brand Kit"}</button>
            <button onClick={generateMarketing} className="inline-flex items-center gap-2 rounded-xl border border-violet-300/50 px-4 py-2.5 text-sm font-bold text-violet-100 hover:bg-violet-300/10"><Wand2 size={15} /> Generate Pack</button>
          </div>
        </div>
      </div>
      <div className="rounded-3xl border border-slate-800 bg-slate-900/65 p-5">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-violet-300">Approval Queue</p>
        <h2 className="mt-1 text-2xl font-black">Content waiting for action</h2>
        <div className="mt-5 grid gap-3">
          {queue.slice(0, 5).map((item) => <div key={item.id} className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-black text-white">{item.campaign_name || "Marketing content"}</p><p className="mt-1 text-xs text-slate-500">{item.status || "draft"} · {(item.platforms || [item.channel]).filter(Boolean).join(", ")}</p></div><span className="rounded-full bg-violet-400/10 px-2 py-1 text-xs font-bold text-violet-200">{item.status || "draft"}</span></div><p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-300">{item.caption || item.approval_notes || "No caption yet."}</p><div className="mt-4 flex flex-wrap gap-2"><button onClick={() => updateContent(item.id, "approve")} className="rounded-lg bg-emerald-400 px-3 py-2 text-xs font-black text-slate-950">Approve</button><button onClick={() => updateContent(item.id, "publish")} className="rounded-lg bg-cyan-400 px-3 py-2 text-xs font-black text-slate-950">Publish</button><button onClick={() => updateContent(item.id, "repost")} className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold text-slate-200">Repost</button></div></div>)}
          {!queue.length && <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-5 text-sm text-slate-400">No content yet. Generate a pack to add approval items.</div>}
        </div>
      </div>
    </section>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-400">{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-violet-300" /></label>;
}

function RunCard({ run }: { run: Run }) {
  const status = String(run.status || "running").toLowerCase();
  const ok = ["completed", "success", "approval_required"].includes(status);
  return <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4"><div className="flex items-center justify-between gap-3"><p className="font-black text-white">{run.action || "agent_run"}</p><span className={`rounded-full px-2 py-1 text-[10px] font-black ${ok ? "bg-emerald-400/10 text-emerald-300" : status === "failed" ? "bg-rose-400/10 text-rose-300" : "bg-amber-400/10 text-amber-300"}`}>{status}</span></div><p className="mt-2 text-xs text-slate-500">{run.created_at ? new Date(run.created_at).toLocaleString() : "Just now"}</p>{run.error_message && <p className="mt-2 text-sm text-rose-300">{run.error_message}</p>}</div>;
}
