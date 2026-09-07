"use client";

import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bot,
  CheckCircle2,
  Clock3,
  FileText,
  Megaphone,
  Sparkles,
  Trophy,
  UserCheck,
  UsersRound,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useLanguage } from "./LanguageProvider";

type SalesSnapshot = {
  total: number;
  qualified: number;
  quotation: number;
  negotiation: number;
  won: number;
  lost: number;
};

type AgentResult = {
  key: string;
  name: string;
  result: string;
  last_action?: string | null;
  status?: string | null;
  count?: number;
};

type TopPerformer = {
  name: string;
  quotations: number;
  won: number;
  leads: number;
  score: number;
} | null;

const agentLinks: Record<string, string> = {
  ai_sales: "/ai-sales",
  ai_marketing: "/ai-marketing",
  ai_hr: "/ai-hr",
  ai_support: "/ai-support",
  ai_inventory: "/ai-inventory",
  ai_customer_care: "/ai-customer-care",
  ai_analytics: "/ai-analytics",
  ai_warehouse: "/ai-warehouse",
};

const agentIcons: Record<string, string> = {
  ai_sales: "🦁",
  ai_marketing: "🦊",
  ai_hr: "🦅",
  ai_support: "🦍",
  ai_inventory: "🐍",
  ai_customer_care: "🐕",
  ai_analytics: "🐈",
  ai_warehouse: "🐻",
};

export default function UniversalAiDashboard({
  sales,
  features,
  agentResults = [],
  topPerformer = null,
}: {
  sales: SalesSnapshot;
  features: string[];
  agentResults?: AgentResult[];
  topPerformer?: TopPerformer;
}) {
  const { language } = useLanguage();
  const ar = language === "ar";
  const activeAgents = agentResults.filter((agent) => features.includes(agent.key)).length || features.filter((feature) => feature.startsWith("ai_")).length;
  const activeNow = agentResults
    .filter((agent) => features.includes(agent.key))
    .sort((a, b) => (b.count || 0) - (a.count || 0))[0];

  const snapshot = ar
    ? [
        ["الإجمالي", sales.total],
        ["مؤهلون", sales.qualified],
        ["عرض سعر", sales.quotation],
        ["تفاوض", sales.negotiation],
        ["تم الفوز", sales.won],
        ["مفقود", sales.lost],
      ]
    : [
        ["Total", sales.total],
        ["Qualified", sales.qualified],
        ["Quotation", sales.quotation],
        ["Negotiation", sales.negotiation],
        ["Won", sales.won],
        ["Lost", sales.lost],
      ];

  return (
    <main className="flex-1 overflow-y-auto px-4 py-6 md:px-7 md:py-8">
      <div className="mx-auto max-w-[1500px] space-y-7">
        <section className="overflow-hidden rounded-3xl border border-cyan-500/20 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,.16),transparent_32%),radial-gradient(circle_at_top_right,rgba(168,85,247,.12),transparent_34%),#020617] p-6 shadow-2xl">
          <div className="grid gap-6 xl:grid-cols-[1.05fr_.95fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-cyan-300">{ar ? "لوحة القيادة" : "Operations Dashboard"}</p>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-white md:text-4xl">
                {ar ? "نتائج العمل اليوم — بدون تعقيد" : "Today’s business results — clean and actionable"}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
                {ar
                  ? "هنا بتشوف شو صار فعلياً: مبيعات، عروض أسعار، صفقات، ونشاط كل AI داخل النظام."
                  : "Track real outputs: sales leads, quotations, won deals, and what every AI agent completed from one dashboard."}
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href="/crm/sales" className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-cyan-400">
                  {ar ? "افتح المبيعات" : "Open Sales CRM"} <ArrowRight size={15} />
                </Link>
                <Link href="/ai-marketing" className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:border-cyan-400">
                  {ar ? "افتح التسويق" : "Open Marketing"} <Megaphone size={15} />
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border border-amber-400/25 bg-amber-400/10 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-200">{ar ? "أفضل أداء" : "Top performer"}</p>
                  <h2 className="mt-2 text-2xl font-black text-white">{topPerformer?.name || activeNow?.name || (ar ? "بانتظار النشاط" : "Waiting for activity")}</h2>
                  <p className="mt-2 text-sm leading-6 text-amber-100/80">
                    {topPerformer
                      ? ar
                        ? `${topPerformer.quotations} عروض أسعار · ${topPerformer.won} صفقات رابحة · ${topPerformer.leads} leads`
                        : `${topPerformer.quotations} quotations · ${topPerformer.won} won deals · ${topPerformer.leads} leads`
                      : activeNow
                        ? activeNow.result
                        : ar
                          ? "أول ما يتسجل نشاط مبيعات أو AI، رح يطلع هون تلقائياً."
                          : "As soon as sales or AI activity is logged, the best performer will be highlighted here."}
                  </p>
                </div>
                <div className="rounded-2xl bg-amber-300/20 p-3 text-amber-200">
                  <Trophy size={28} />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi label={ar ? "Active Agents" : "Active Agents"} value={activeAgents} icon={Activity} helper={ar ? "شغّالين بالنظام" : "enabled in this workspace"} />
          <Kpi label={ar ? "Sales Leads" : "Sales Leads"} value={sales.total} icon={UsersRound} helper={ar ? "كل العملاء المحتملين" : "total lead pipeline"} />
          <Kpi label={ar ? "Quotation" : "Quotations"} value={sales.quotation} icon={FileText} helper={ar ? "طلبات وصلت لعرض سعر" : "quotes in progress"} />
          <Kpi label={ar ? "Won Deals" : "Won Deals"} value={sales.won} icon={Trophy} helper={ar ? "صفقات مكتسبة" : "closed successfully"} />
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">{ar ? "نتائج الوكلاء" : "Agent Results"}</p>
                <h2 className="mt-1 text-xl font-bold text-white">{ar ? "شو اشتغل كل AI" : "What every AI worked on"}</h2>
              </div>
              <Bot className="text-cyan-300" />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {agentResults.filter((agent) => features.includes(agent.key)).map((agent) => (
                <AgentResultCard key={agent.key} agent={agent} ar={ar} />
              ))}
              {!agentResults.length && <EmptyResult text={ar ? "لا يوجد نشاط AI بعد." : "No AI activity yet."} />}
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-violet-300">{ar ? "حالة المبيعات" : "Sales stages"}</p>
                  <h2 className="mt-1 text-xl font-bold text-white">{ar ? "ملخص سريع" : "Quick snapshot"}</h2>
                </div>
                <BarChart3 className="text-violet-300" />
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {snapshot.map(([label, value]) => (
                  <div key={String(label)} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                    <p className="text-xs text-slate-500">{label}</p>
                    <p className="mt-2 text-2xl font-black text-white">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-5">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-emerald-300/15 p-3 text-emerald-300">
                  <Zap />
                </div>
                <div>
                  <h3 className="font-black text-white">{ar ? "التركيز الحالي" : "Current focus"}</h3>
                  <p className="mt-2 text-sm leading-6 text-emerald-100/80">
                    {sales.quotation > 0
                      ? ar
                        ? "تابع عروض الأسعار أولاً، لأن هيدي أقرب مرحلة للتحويل والبيع."
                        : "Follow quotations first. They are the closest stage to conversion and revenue."
                      : ar
                        ? "زِد عدد العملاء المؤهلين حتى يبدأ النظام يطلع فرص عروض أسعار أكثر."
                        : "Grow qualified leads so the system can produce more quotation opportunities."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Kpi({ label, value, icon: Icon, helper }: { label: string; value: number; icon: LucideIcon; helper: string }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl shadow-slate-950/30">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-400">{label}</span>
        <Icon size={21} className="text-cyan-300" />
      </div>
      <div className="mt-5 text-4xl font-black text-white">{value}</div>
      <p className="mt-2 text-xs text-slate-500">{helper}</p>
    </div>
  );
}

function AgentResultCard({ agent, ar }: { agent: AgentResult; ar: boolean }) {
  const href = agentLinks[agent.key] || "/ai-agents";
  const status = String(agent.status || "ready").toLowerCase();
  const good = ["completed", "active", "approval_required", "approved", "ready"].includes(status);
  return (
    <Link href={href} className="group rounded-2xl border border-slate-800 bg-slate-950/60 p-4 transition hover:border-cyan-400/60 hover:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-700 bg-slate-900 text-2xl">{agentIcons[agent.key] || "🤖"}</div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-white">{agent.name}</h3>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${good ? "bg-emerald-500/10 text-emerald-300" : "bg-red-500/10 text-red-300"}`}>
                {agent.status || "ready"}
              </span>
            </div>
            <p className="mt-2 text-sm font-semibold text-cyan-100">{agent.result}</p>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{agent.last_action || (ar ? "جاهز للتشغيل" : "Ready to work")}</p>
          </div>
        </div>
        {good ? <CheckCircle2 className="text-emerald-300" size={18} /> : <Clock3 className="text-amber-300" size={18} />}
      </div>
    </Link>
  );
}

function EmptyResult({ text }: { text: string }) {
  return <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 text-sm text-slate-500">{text}</div>;
}
