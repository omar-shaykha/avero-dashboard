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
  Settings,
  Sparkles,
  Upload,
  UsersRound,
  Warehouse,
  Wand2,
  type LucideIcon,
} from "lucide-react";

type AgentSlug = "sales" | "marketing" | "hr" | "support" | "inventory" | "customer-care" | "analytics" | "warehouse";
type Run = { id: string; action?: string | null; status?: string | null; error_message?: string | null; created_at?: string | null; completed_at?: string | null };
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

type Worker = { name: string; role: string; action: string; metric: string; icon: LucideIcon };
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
  workers: Worker[];
  flow: string[];
  quickTasks: string[];
};

const configs: Record<AgentSlug, AgentConfig> = {
  sales: {
    slug: "sales",
    agentKey: "ai_sales",
    head: "Leo",
    animal: "🦁",
    department: "Sales Department",
    title: "Revenue Head Agent",
    mission: "Leo leads the sales team: captures leads, qualifies intent, follows up, prepares quotation actions and keeps the CRM moving.",
    quote: "Every lead needs a clear next step.",
    accent: "cyan",
    href: "/ai-sales",
    crmHref: "/crm/sales",
    workers: [
      { name: "Lead Hunter", role: "Captures new opportunities", action: "Reads WhatsApp / CRM lead signals", metric: "New leads", icon: UsersRound },
      { name: "Qualifier", role: "Understands customer need", action: "Checks service, budget, timing and urgency", metric: "Qualified", icon: CheckCircle2 },
      { name: "Quotation Builder", role: "Moves deals to quote", action: "Prepares next quotation action", metric: "Quotations", icon: FileText },
      { name: "Follow-up Closer", role: "Never leaves a lead cold", action: "Schedules next follow-up and reminders", metric: "Won deals", icon: Rocket },
    ],
    flow: ["New lead", "Qualification", "Quotation", "Follow-up", "Won / Lost"],
    quickTasks: [
      "Review today's leads and tell me which ones need follow-up first.",
      "Prepare a sales follow-up message for a qualified lead.",
      "Find quotation opportunities and suggest the next action.",
    ],
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
    workers: [
      { name: "Content Planner", role: "Builds the daily content plan", action: "Creates topics and schedule ideas", metric: "Daily posts", icon: CalendarClock },
      { name: "Copywriter", role: "Writes captions and hooks", action: "Generates copy, CTA and hashtags", metric: "Captions", icon: Megaphone },
      { name: "Creative Designer", role: "Prepares image/video briefs", action: "Uses logo and brand kit for visuals", metric: "Assets", icon: ImagePlus },
      { name: "Publisher", role: "Posts after approval", action: "Sends approved content to channels", metric: "Published", icon: Send },
    ],
    flow: ["Idea", "Caption", "Creative brief", "Approval", "Publish"],
    quickTasks: [
      "Create today's AVERO OS content pack for Facebook and Instagram.",
      "Write a premium post about AVERO OS AI agents and operations dashboard.",
      "Prepare a repost version from the best evergreen content.",
    ],
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
    workers: [
      { name: "Booking Intake", role: "Collects booking details", action: "Reads request, date, time and party size", metric: "Requests", icon: CalendarClock },
      { name: "Availability Checker", role: "Checks schedule fit", action: "Prepares open slots and conflicts", metric: "Slots", icon: Clock3 },
      { name: "Reminder Agent", role: "Sends follow-up reminders", action: "Prepares confirmations and alerts", metric: "Reminders", icon: MessageSquare },
      { name: "HR Desk", role: "Handles staff requests", action: "Organizes HR tasks and next steps", metric: "Tasks", icon: UsersRound },
    ],
    flow: ["Request", "Check rules", "Schedule", "Confirm", "Remind"],
    quickTasks: [
      "Prepare a clean booking workflow for today's requests.",
      "Write a confirmation and reminder message.",
      "Organize HR requests by priority and next action.",
    ],
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
    workers: [
      { name: "Ticket Sorter", role: "Reads incoming issues", action: "Classifies urgency and topic", metric: "Tickets", icon: Headphones },
      { name: "FAQ Agent", role: "Answers known questions", action: "Uses saved knowledge only", metric: "Solved", icon: FileText },
      { name: "Escalation Agent", role: "Flags sensitive cases", action: "Moves complex issues to human", metric: "Needs human", icon: Rocket },
      { name: "Close Loop", role: "Tracks satisfaction", action: "Prepares follow-up and resolution notes", metric: "Closed", icon: CheckCircle2 },
    ],
    flow: ["Inbox", "Classify", "Suggested reply", "Escalate / solve", "Close"],
    quickTasks: [
      "Classify this support issue and suggest the best reply.",
      "Create a human-friendly answer from the company knowledge.",
      "Prepare an escalation note for a complex customer issue.",
    ],
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
    workers: [
      { name: "Stock Monitor", role: "Tracks stock levels", action: "Reads stock signals and low quantities", metric: "Low stock", icon: PackageCheck },
      { name: "Reorder Agent", role: "Suggests purchase needs", action: "Prepares replenishment actions", metric: "Reorders", icon: Boxes },
      { name: "Expiry Watch", role: "Flags risky items", action: "Checks expiry and slow movement", metric: "Expiry", icon: Clock3 },
      { name: "Waste Guard", role: "Reduces waste", action: "Suggests usage and transfer actions", metric: "Waste", icon: BarChart3 },
    ],
    flow: ["Stock data", "Risk check", "Alert", "Suggested order", "Approval"],
    quickTasks: [
      "Review stock risk and suggest the next reorder action.",
      "Create a low-stock alert summary.",
      "Find items that may cause waste or expiry risk.",
    ],
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
    workers: [
      { name: "Feedback Collector", role: "Asks customers how it went", action: "Creates follow-up questions", metric: "Feedback", icon: MessageSquare },
      { name: "Complaint Handler", role: "Turns complaints into action", action: "Classifies issue and next step", metric: "Complaints", icon: Headphones },
      { name: "Loyalty Agent", role: "Keeps customers returning", action: "Suggests retention messages", metric: "Loyalty", icon: UsersRound },
      { name: "Review Booster", role: "Asks happy customers for reviews", action: "Creates review request prompts", metric: "Reviews", icon: Sparkles },
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
    mission: "Nova reads business data, finds patterns, creates summaries and recommends clear next decisions.",
    quote: "Numbers are useful only when they lead to action.",
    accent: "violet",
    href: "/ai-analytics",
    workers: [
      { name: "KPI Reader", role: "Reads key numbers", action: "Summarizes sales and operations", metric: "KPIs", icon: BarChart3 },
      { name: "Trend Finder", role: "Finds movement", action: "Compares current vs previous performance", metric: "Trends", icon: Activity },
      { name: "Risk Analyst", role: "Flags business risk", action: "Warns about weak areas", metric: "Risks", icon: Rocket },
      { name: "Decision Writer", role: "Turns insight into action", action: "Creates next-step recommendation", metric: "Actions", icon: FileText },
    ],
    flow: ["Data", "Trends", "Risks", "Insight", "Decision"],
    quickTasks: ["Analyze current business performance and give 3 actions.", "Find the strongest and weakest area today.", "Write an executive summary for the owner."],
  },
  warehouse: {
    slug: "warehouse",
    agentKey: "ai_warehouse",
    head: "Bruno",
    animal: "🐻",
    department: "Warehouse Department",
    title: "Warehouse Control Head Agent",
    mission: "Bruno controls receiving, transfers, movement records, stock counts and warehouse discipline.",
    quote: "A clean warehouse makes clean operations.",
    accent: "amber",
    href: "/ai-warehouse",
    workers: [
      { name: "Receiving Clerk", role: "Checks incoming items", action: "Organizes receiving notes", metric: "Received", icon: Warehouse },
      { name: "Transfer Agent", role: "Tracks movements", action: "Logs item movements between locations", metric: "Transfers", icon: Boxes },
      { name: "Cycle Counter", role: "Supports stock counts", action: "Prepares count actions and differences", metric: "Counts", icon: CheckCircle2 },
      { name: "Record Keeper", role: "Keeps warehouse history", action: "Writes clean logs and summaries", metric: "Logs", icon: FileText },
    ],
    flow: ["Receiving", "Record", "Movement", "Count", "Report"],
    quickTasks: ["Prepare a receiving checklist for today.", "Summarize warehouse movements and missing data.", "Create a cycle count action plan."],
  },
};

const accentClass = {
  cyan: "border-cyan-400/25 bg-cyan-400/10 text-cyan-200",
  violet: "border-violet-400/25 bg-violet-400/10 text-violet-200",
  emerald: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
  amber: "border-amber-400/25 bg-amber-400/10 text-amber-200",
  rose: "border-rose-400/25 bg-rose-400/10 text-rose-200",
};

export default function AgentOperatingRoom({ agent }: { agent: AgentSlug }) {
  const config = configs[agent];
  const [runs, setRuns] = useState<Run[]>([]);
  const [queue, setQueue] = useState<ContentItem[]>([]);
  const [brandKit, setBrandKit] = useState<BrandKit | null>(null);
  const [command, setCommand] = useState(config.quickTasks[0]);
  const [sending, setSending] = useState(false);
  const [savingBrand, setSavingBrand] = useState(false);
  const [message, setMessage] = useState("");

  const latestRun = runs[0];
  const activeWorkers = Math.min(config.workers.length, Math.max(1, runs.filter((run) => ["running", "approval_required", "completed"].includes(String(run.status || "").toLowerCase())).length || 2));
  const pendingMarketing = queue.filter((item) => ["approval_required", "draft", "idea"].includes(String(item.status || "").toLowerCase())).length;
  const publishedMarketing = queue.filter((item) => ["published", "posted"].includes(String(item.status || "").toLowerCase())).length;

  async function load() {
    const requests: Promise<Response>[] = [fetch(`/api/ai-departments/${agent}/runs`, { cache: "no-store" })];
    if (agent === "marketing") {
      requests.push(fetch("/api/marketing/content", { cache: "no-store" }));
      requests.push(fetch("/api/marketing/brand-kit", { cache: "no-store" }));
    }
    const [runsRes, queueRes, brandRes] = await Promise.all(requests);
    if (runsRes?.ok) setRuns((await runsRes.json()).runs || []);
    if (queueRes?.ok) setQueue((await queueRes.json()).items || []);
    if (brandRes?.ok) setBrandKit((await brandRes.json()).brand_kit || null);
  }

  useEffect(() => {
    setCommand(config.quickTasks[0]);
    load();
    const timer = window.setInterval(load, 8000);
    return () => window.clearInterval(timer);
  }, [agent]);

  async function sendCommand(task = command) {
    if (!task.trim()) return;
    setSending(true);
    setMessage("Sending command to the real agent engine...");
    const res = await fetch(`/api/ai-departments/${agent}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task, action: "department_command", channel: "dashboard", content_type: agent === "marketing" ? "post" : "operation" }),
    });
    const payload = await res.json().catch(() => ({}));
    setSending(false);
    setMessage(res.ok ? `${config.head} accepted the command. Check Live Results.` : payload.error || "Command failed");
    await load();
  }

  async function generateMarketingPack() {
    setSending(true);
    setMessage("Foxy is generating a marketing pack for approval...");
    const platforms = brandKit?.default_platforms?.length ? brandKit.default_platforms : ["facebook", "instagram"];
    const res = await fetch("/api/marketing/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platforms,
        objective: "Generate leads and trust for the business",
        audience: brandKit?.target_audience || "business owners and operations managers",
        content_type: "post",
        creative_brief: command || "Create a premium brand post with caption, CTA, hashtags and visual idea.",
      }),
    });
    const payload = await res.json().catch(() => ({}));
    setSending(false);
    setMessage(res.ok ? "Marketing draft created in Approval Queue." : payload.error || "Marketing generation failed");
    await load();
  }

  async function updateContent(id: string, action: string) {
    const res = await fetch(`/api/marketing/content/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
    const payload = await res.json().catch(() => ({}));
    setMessage(res.ok ? `Content moved to ${action}.` : payload.error || "Content action failed");
    await load();
  }

  async function saveBrandKit(next = brandKit) {
    if (!next) return;
    setSavingBrand(true);
    const res = await fetch("/api/marketing/brand-kit", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next) });
    const payload = await res.json().catch(() => ({}));
    setSavingBrand(false);
    if (res.ok) setBrandKit(payload.brand_kit || next);
    setMessage(res.ok ? "Brand Kit saved. Foxy will use it for future content." : payload.error || "Could not save Brand Kit");
  }

  async function uploadLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !brandKit) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const next = { ...brandKit, logo_data_url: String(reader.result || "") };
      setBrandKit(next);
      await saveBrandKit(next);
    };
    reader.readAsDataURL(file);
  }

  const currentResult = useMemo(() => {
    if (agent === "marketing") return `${pendingMarketing} pending approvals · ${publishedMarketing} published`;
    if (!latestRun) return "Ready for the first real command";
    return `${latestRun.action || "command"} · ${latestRun.status || "running"}`;
  }, [agent, latestRun, pendingMarketing, publishedMarketing]);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Sidebar />
      <div className="ml-64 min-h-screen">
        <DashboardHeader />
        <main className="p-4 md:p-7">
          <div className="mx-auto max-w-7xl space-y-6">
            <section className="overflow-hidden rounded-3xl border border-slate-800 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,.12),transparent_32%),radial-gradient(circle_at_top_right,rgba(168,85,247,.12),transparent_35%),#020617] p-5 shadow-2xl">
              <div className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[.28em] text-cyan-300">AVERO OS Operating Room</p>
                  <div className="mt-4 flex flex-wrap items-center gap-4">
                    <div className={`relative flex h-24 w-24 items-center justify-center rounded-[2rem] border text-6xl shadow-[0_0_50px_rgba(34,211,238,.18)] ${accentClass[config.accent]}`}>
                      <span className="absolute inset-[-10px] animate-pulse rounded-[2.4rem] border border-cyan-300/20" />
                      {config.animal}
                    </div>
                    <div>
                      <h1 className="text-3xl font-black tracking-tight md:text-5xl">{config.head}</h1>
                      <p className="mt-1 text-sm font-bold uppercase tracking-[.2em] text-slate-400">{config.title}</p>
                      <p className="mt-2 text-sm text-cyan-200">{config.department}</p>
                    </div>
                  </div>
                  <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-300">{config.mission}</p>
                  <p className="mt-4 rounded-2xl border border-slate-700 bg-slate-900/70 p-4 text-sm font-semibold text-slate-100">“{config.quote}”</p>
                </div>
                <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[.22em] text-cyan-300">Current Result</p>
                      <h2 className="mt-2 text-2xl font-black">{currentResult}</h2>
                    </div>
                    <Activity className="text-cyan-300" />
                  </div>
                  <div className="mt-5 grid grid-cols-3 gap-2">
                    <MiniStat label="Workers" value={config.workers.length} />
                    <MiniStat label="Active" value={activeWorkers} />
                    <MiniStat label="Runs" value={runs.length} />
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {config.crmHref && <Link href={config.crmHref} className="rounded-xl border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 hover:border-cyan-400">Open CRM</Link>}
                    <button onClick={load} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 hover:border-cyan-400"><RefreshCw size={15} />Refresh</button>
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.05fr_.95fr]">
              <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[.22em] text-violet-300">Department Team</p>
                    <h2 className="mt-1 text-xl font-black">{config.head} is managing these workers</h2>
                  </div>
                  <Bot className="text-violet-300" />
                </div>
                <div className="relative min-h-[340px] overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 p-5">
                  <div className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/20 bg-cyan-300/5 animate-pulse" />
                  <div className="absolute left-1/2 top-1/2 flex h-28 w-28 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-[2rem] border border-cyan-300/30 bg-slate-900 text-center shadow-[0_0_45px_rgba(34,211,238,.15)]">
                    <div className="text-4xl">{config.animal}</div>
                    <div className="mt-1 text-xs font-black text-cyan-200">{config.head}</div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {config.workers.map((worker, index) => (
                      <WorkerCard key={worker.name} worker={worker} active={index < activeWorkers} />
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[.22em] text-cyan-300">Real Workflow</p>
                      <h2 className="mt-1 text-xl font-black">Task movement</h2>
                    </div>
                    <Wand2 className="text-cyan-300" />
                  </div>
                  <div className="space-y-3">
                    {config.flow.map((step, index) => (
                      <div key={step} className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-black ${index < activeWorkers ? "bg-cyan-400 text-slate-950" : "bg-slate-800 text-slate-400"}`}>{index + 1}</div>
                        <div className="font-semibold text-slate-100">{step}</div>
                        {index < activeWorkers && <div className="ml-auto h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,.8)]" />}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5">
                  <p className="text-xs font-bold uppercase tracking-[.22em] text-emerald-300">Command Center</p>
                  <textarea value={command} onChange={(event) => setCommand(event.target.value)} rows={5} className="mt-4 w-full rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm leading-6 text-slate-100 outline-none focus:border-cyan-400" />
                  <div className="mt-3 flex flex-wrap gap-2">
                    {config.quickTasks.map((task) => <button key={task} onClick={() => setCommand(task)} className="rounded-full border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-cyan-400">{task.slice(0, 42)}...</button>)}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button onClick={() => sendCommand()} disabled={sending} className="inline-flex items-center gap-2 rounded-2xl bg-cyan-500 px-5 py-3 text-sm font-black text-slate-950 hover:bg-cyan-400 disabled:opacity-60"><Send size={16} />Send to {config.head}</button>
                    {agent === "marketing" && <button onClick={generateMarketingPack} disabled={sending} className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-black text-white hover:bg-violet-500 disabled:opacity-60"><Sparkles size={16} />Generate Content Pack</button>}
                  </div>
                  {message && <div className="mt-4 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-3 text-sm text-cyan-100">{message}</div>}
                </div>
              </div>
            </section>

            {agent === "marketing" && brandKit && (
              <section className="grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
                <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[.22em] text-violet-300">Brand Kit</p>
                      <h2 className="mt-1 text-xl font-black">Logo and style Foxy uses</h2>
                    </div>
                    <Settings className="text-violet-300" />
                  </div>
                  <div className="grid gap-4 md:grid-cols-[160px_1fr]">
                    <label className="flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-slate-700 bg-slate-950 text-center hover:border-violet-400">
                      {brandKit.logo_data_url ? <img src={brandKit.logo_data_url} alt="Brand logo" className="max-h-24 max-w-28 object-contain" /> : <Upload className="text-slate-500" />}
                      <span className="mt-3 text-xs font-semibold text-slate-400">Upload logo</span>
                      <input type="file" accept="image/*" onChange={uploadLogo} className="hidden" />
                    </label>
                    <div className="grid gap-3">
                      <TextField label="Brand name" value={brandKit.brand_name || ""} onChange={(value) => setBrandKit({ ...brandKit, brand_name: value })} />
                      <TextField label="Slogan" value={brandKit.slogan || ""} onChange={(value) => setBrandKit({ ...brandKit, slogan: value })} />
                      <TextField label="Daily time" value={brandKit.daily_time || "09:00"} onChange={(value) => setBrandKit({ ...brandKit, daily_time: value })} />
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <ColorField label="Primary" value={brandKit.primary_color || "#7C3AED"} onChange={(value) => setBrandKit({ ...brandKit, primary_color: value })} />
                    <ColorField label="Secondary" value={brandKit.secondary_color || "#06B6D4"} onChange={(value) => setBrandKit({ ...brandKit, secondary_color: value })} />
                    <ColorField label="Accent" value={brandKit.accent_color || "#22C55E"} onChange={(value) => setBrandKit({ ...brandKit, accent_color: value })} />
                  </div>
                  <TextArea label="Visual style" value={brandKit.visual_style || ""} onChange={(value) => setBrandKit({ ...brandKit, visual_style: value })} />
                  <button onClick={() => saveBrandKit()} disabled={savingBrand} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 py-3 text-sm font-black text-white hover:bg-violet-500 disabled:opacity-60"><Save size={16} />{savingBrand ? "Saving..." : "Save Brand Kit"}</button>
                </div>

                <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[.22em] text-cyan-300">Approval Queue</p>
                      <h2 className="mt-1 text-xl font-black">Generated posts before publishing</h2>
                    </div>
                    <Megaphone className="text-cyan-300" />
                  </div>
                  <div className="max-h-[560px] space-y-3 overflow-y-auto pr-1">
                    {queue.slice(0, 8).map((item) => <MarketingQueueCard key={item.id} item={item} onAction={updateContent} />)}
                    {!queue.length && <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 text-sm text-slate-400">No content yet. Use Generate Content Pack.</div>}
                  </div>
                </div>
              </section>
            )}

            <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[.22em] text-cyan-300">Live Results</p>
                  <h2 className="mt-1 text-xl font-black">Real activity from {config.head}</h2>
                </div>
                <Play className="text-cyan-300" />
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {runs.slice(0, 6).map((run) => <RunCard key={run.id} run={run} />)}
                {!runs.length && <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 text-sm text-slate-400">No runs yet. Send the first command.</div>}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-2xl font-black">{value}</p></div>;
}

function WorkerCard({ worker, active }: { worker: Worker; active: boolean }) {
  const Icon = worker.icon;
  return (
    <div className={`relative rounded-3xl border p-4 ${active ? "border-cyan-400/35 bg-cyan-400/10" : "border-slate-800 bg-slate-900/70"}`}>
      <div className="flex items-start gap-3">
        <div className={`rounded-2xl p-3 ${active ? "bg-cyan-400 text-slate-950" : "bg-slate-800 text-slate-400"}`}><Icon size={20} /></div>
        <div>
          <h3 className="font-black text-white">{worker.name}</h3>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{worker.role}</p>
          <p className="mt-2 text-sm leading-6 text-slate-300">{worker.action}</p>
          <p className="mt-3 text-xs font-bold text-cyan-200">{worker.metric}</p>
        </div>
      </div>
      {active && <span className="absolute right-4 top-4 h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_16px_rgba(52,211,153,.9)]" />}
    </div>
  );
}

function RunCard({ run }: { run: Run }) {
  const status = String(run.status || "running").toLowerCase();
  const ok = ["completed", "approval_required", "approved"].includes(status);
  return <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-bold text-white">{run.action || "agent command"}</p><p className="mt-1 text-xs text-slate-500">{run.created_at ? new Date(run.created_at).toLocaleString() : ""}</p></div><span className={`rounded-full px-2 py-1 text-[10px] font-black ${ok ? "bg-emerald-400/10 text-emerald-300" : status === "failed" ? "bg-rose-400/10 text-rose-300" : "bg-cyan-400/10 text-cyan-300"}`}>{status}</span></div>{run.error_message && <p className="mt-3 text-sm text-rose-200">{run.error_message}</p>}</div>;
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block"><span className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm outline-none focus:border-cyan-400" /></label>;
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block"><span className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span><input type="color" value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-800 bg-slate-950 p-1" /></label>;
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="mt-4 block"><span className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span><textarea value={value} onChange={(event) => onChange(event.target.value)} rows={4} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm leading-6 outline-none focus:border-cyan-400" /></label>;
}

function MarketingQueueCard({ item, onAction }: { item: ContentItem; onAction: (id: string, action: string) => void }) {
  return <article className="rounded-2xl border border-slate-800 bg-slate-950 p-4"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-violet-400/10 px-2 py-1 text-[10px] font-black text-violet-300">{item.status || "draft"}</span>{(item.platforms || [item.channel || "dashboard"]).map((platform) => <span key={platform} className="rounded-full bg-slate-800 px-2 py-1 text-[10px] text-slate-300">{platform}</span>)}</div><h3 className="mt-3 font-black text-white">{item.campaign_name || "Marketing content"}</h3><p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm leading-6 text-slate-300">{item.caption || item.approval_notes || "No caption yet"}</p><div className="mt-4 flex flex-wrap gap-2"><button onClick={() => onAction(item.id, "approve")} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white hover:bg-emerald-500">Approve</button><button onClick={() => onAction(item.id, "publish")} className="rounded-xl bg-cyan-500 px-3 py-2 text-xs font-black text-slate-950 hover:bg-cyan-400">Publish</button><button onClick={() => onAction(item.id, "repost")} className="inline-flex items-center gap-1 rounded-xl border border-slate-700 px-3 py-2 text-xs font-black text-slate-300 hover:border-cyan-400"><Copy size={13} />Repost</button></div></article>;
}
