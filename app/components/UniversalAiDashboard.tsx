"use client";

import Link from "next/link";
import { Sparkles, Megaphone, BriefcaseBusiness, MessagesSquare, ArrowRight, UsersRound, Trophy, FileText, Activity, ShieldCheck } from "lucide-react";
import { useLanguage } from "./LanguageProvider";

type SalesSnapshot = { total: number; qualified: number; quotation: number; negotiation: number; won: number; lost: number; };
type Agent = { key: string; name: string; description: string; href: string; crm: string; icon: typeof Sparkles; enabled: boolean; metric?: string; };

export default function UniversalAiDashboard({ sales, features }: { sales: SalesSnapshot; features: string[] }) {
  const { language } = useLanguage();
  const ar = language === "ar";
  const agents: Agent[] = [
    { key: "ai_sales", name: ar ? "وكيل المبيعات" : "AI Sales", description: ar ? "مبيعات واتساب، تأهيل العملاء المحتملين، عروض الأسعار والمتابعة." : "WhatsApp sales, lead qualification, quotations and follow-up.", href: "/ai-sales", crm: "/crm/sales", icon: Sparkles, enabled: features.includes("ai_sales"), metric: ar ? `${sales.total} عميل محتمل` : `${sales.total} leads` },
    { key: "ai_marketing", name: ar ? "وكيل التسويق" : "AI Marketing", description: ar ? "الحملات، الجماهير، الاستحواذ وأتمتة التسويق." : "Campaigns, audiences, acquisition and marketing automation.", href: "/ai-marketing", crm: "/crm/marketing", icon: Megaphone, enabled: features.includes("ai_marketing") },
    { key: "ai_hr", name: ar ? "وكيل الموارد البشرية" : "AI HR", description: ar ? "أتمتة المرشحين والموظفين واتصالات الموارد البشرية." : "Candidate, employee and HR communication automation.", href: "/ai-hr", crm: "/crm/hr", icon: BriefcaseBusiness, enabled: features.includes("ai_hr") },
    { key: "ai_support", name: ar ? "وكيل الدعم" : "AI Support", description: ar ? "خدمة العملاء، محادثات الدعم وإدارة الحالات." : "Customer service, support conversations and case handling.", href: "/ai-support", crm: "/crm/support", icon: MessagesSquare, enabled: features.includes("ai_support") },
  ];
  const enabledCount = agents.filter((agent) => agent.enabled).length;
  const snapshot = ar ? [["الإجمالي",sales.total],["مؤهلون",sales.qualified],["عرض سعر",sales.quotation],["تفاوض",sales.negotiation],["تم الفوز",sales.won],["مفقود",sales.lost]] : [["Total",sales.total],["Qualified",sales.qualified],["Quotation",sales.quotation],["Negotiation",sales.negotiation],["Won",sales.won],["Lost",sales.lost]];

  return (
    <main className="flex-1 overflow-y-auto px-7 py-8">
      <div className="mx-auto max-w-[1500px] space-y-7">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-blue-400">{ar ? "ذكاء AVERO" : "AVERO Intelligence"}</p>
          <h1 className="text-3xl font-bold tracking-tight text-white">{ar ? "نظرة عامة على عمليات الذكاء الاصطناعي" : "AI Operations Overview"}</h1>
          <p className="mt-2 text-sm text-slate-400">{ar ? "مركز تحكم واحد لكل قسم ذكاء اصطناعي في شركتك." : "One control center for every AI department in your company."}</p>
        </div>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi label={ar ? "أقسام الذكاء الاصطناعي النشطة" : "Active AI Departments"} value={enabledCount} icon={Activity} />
          <Kpi label={ar ? "عملاء المبيعات المحتملون" : "Sales Leads"} value={sales.total} icon={UsersRound} />
          <Kpi label={ar ? "عروض الأسعار" : "Quotations"} value={sales.quotation} icon={FileText} />
          <Kpi label={ar ? "الصفقات المكتسبة" : "Won Deals"} value={sales.won} icon={Trophy} />
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between"><div><h2 className="text-xl font-semibold text-white">{ar ? "أقسام الذكاء الاصطناعي" : "AI Departments"}</h2><p className="mt-1 text-sm text-slate-500">{ar ? "افتح أي وكيل ذكاء اصطناعي أو انتقل مباشرة إلى CRM الخاص به." : "Open any AI agent or jump directly into its dedicated CRM."}</p></div><ShieldCheck className="text-blue-400" /></div>
          <div className="grid gap-5 lg:grid-cols-2">
            {agents.map(({ name, description, href, crm, icon: Icon, enabled, metric }) => (
              <div key={name} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-4"><div className="rounded-xl border border-slate-700 bg-slate-950 p-3"><Icon size={24} className="text-blue-400"/></div><div><div className="flex items-center gap-2"><h3 className="text-lg font-semibold text-white">{name}</h3><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${enabled ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-800 text-slate-500"}`}>{enabled ? (ar ? "مفعّل" : "ENABLED") : (ar ? "غير مفعّل" : "NOT ENABLED")}</span></div><p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>{metric && <p className="mt-3 text-sm font-medium text-blue-300">{metric}</p>}</div></div>
                </div>
                <div className="mt-5 flex gap-3 border-t border-slate-800 pt-4"><Link href={href} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500">{ar ? "فتح الوكيل" : "Open AI"} <ArrowRight size={14}/></Link><Link href={crm} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-300 hover:border-slate-600 hover:text-white">{ar ? "فتح CRM" : "Open CRM"}</Link></div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-lg font-semibold text-white">{ar ? "ملخص CRM المبيعات" : "Sales CRM Snapshot"}</h2>
          <p className="mt-1 text-sm text-slate-500">{ar ? "بيانات مباشرة من مسار المبيعات المتصل حاليًا بـ AVERO." : "Live sales pipeline data currently connected to AVERO."}</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            {snapshot.map(([label,value]) => <div key={String(label)} className="rounded-xl border border-slate-800 bg-slate-950/50 p-4"><div className="text-xs text-slate-500">{label}</div><div className="mt-2 text-2xl font-bold text-white">{value}</div></div>)}
          </div>
        </section>
      </div>
    </main>
  );
}

function Kpi({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Activity }) { return <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"><div className="flex items-center justify-between"><span className="text-sm text-slate-400">{label}</span><Icon size={20} className="text-blue-400"/></div><div className="mt-5 text-3xl font-bold text-white">{value}</div></div> }
