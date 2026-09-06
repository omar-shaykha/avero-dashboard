"use client";

import Link from "next/link";
import { Sparkles, Megaphone, BriefcaseBusiness, MessagesSquare, ArrowRight, UsersRound } from "lucide-react";
import { useLanguage } from "./LanguageProvider";

export default function CrmHub() {
  const { language } = useLanguage(); const ar = language === "ar";
  const crmModules = [
    { name: ar ? "CRM المبيعات" : "AI Sales CRM", desc: ar ? "العملاء المحتملون، عروض الأسعار، المفاوضات، الصفقات المكتسبة والمفقودة ومسار العملاء." : "Leads, quotations, negotiations, won/lost deals and customer pipeline.", href: "/crm/sales", icon: Sparkles, live: true },
    { name: ar ? "CRM التسويق" : "AI Marketing CRM", desc: ar ? "جهات اتصال الحملات، الجماهير، التفاعل والفرص التسويقية." : "Campaign contacts, audiences, engagement and marketing opportunities.", href: "/crm/marketing", icon: Megaphone, live: false },
    { name: ar ? "CRM الموارد البشرية" : "AI HR CRM", desc: ar ? "المرشحون، المتقدمون، المقابلات وتدفقات التواصل مع الموظفين." : "Candidates, applicants, interviews and employee communication workflows.", href: "/crm/hr", icon: BriefcaseBusiness, live: false },
    { name: ar ? "CRM الدعم" : "AI Support CRM", desc: ar ? "جهات اتصال الدعم، المحادثات، الحالات ومتابعة الخدمة." : "Support contacts, conversations, cases and service follow-up.", href: "/crm/support", icon: MessagesSquare, live: false },
  ];
  return <main className="flex-1 overflow-y-auto px-7 py-8"><div className="mx-auto max-w-[1450px]">
    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-blue-400">AVERO CRM</p>
    <h1 className="text-3xl font-bold text-white">{ar ? "أنظمة CRM لأقسام الذكاء الاصطناعي" : "AI Department CRMs"}</h1>
    <p className="mt-2 max-w-3xl text-sm text-slate-400">{ar ? "لكل قسم ذكاء اصطناعي مساحة CRM مستقلة، بينما يحتفظ AVERO بمركز تحكم موحد للشركة." : "Each AI department has its own CRM workspace, while AVERO keeps one company-level control center."}</p>
    <div className="mt-8 grid gap-5 lg:grid-cols-2">{crmModules.map(({name,desc,href,icon:Icon,live})=><Link key={name} href={href} className="group rounded-2xl border border-slate-800 bg-slate-900/70 p-6 transition hover:border-blue-500/50 hover:bg-slate-900"><div className="flex items-start justify-between gap-4"><div className="flex items-start gap-4"><div className="rounded-xl border border-slate-700 bg-slate-950 p-3"><Icon className="text-blue-400" size={24}/></div><div><div className="flex items-center gap-2"><h2 className="text-lg font-semibold text-white">{name}</h2><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${live?"bg-emerald-500/10 text-emerald-400":"bg-slate-800 text-slate-500"}`}>{live ? (ar?"مباشر":"LIVE") : (ar?"جاهز للبيانات":"READY FOR DATA")}</span></div><p className="mt-2 text-sm leading-6 text-slate-400">{desc}</p></div></div><ArrowRight className="mt-1 text-slate-600 transition group-hover:translate-x-1 group-hover:text-blue-400" size={20}/></div></Link>)}</div>
    <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/50 p-5"><div className="flex items-center gap-3"><UsersRound className="text-violet-400" size={20}/><p className="text-sm text-slate-300">{ar ? "CRM المبيعات متصل حاليًا ببيانات العملاء الحقيقية. أما أنظمة CRM للأقسام الأخرى فهي منفصلة وجاهزة للتفعيل عند ربط تدفقات العمل والبيانات الخاصة بها." : "Sales CRM is connected to your existing live leads. The other department CRMs are separated at the UI level now and will activate with real data as their workflows are connected."}</p></div></div>
  </div></main>;
}
