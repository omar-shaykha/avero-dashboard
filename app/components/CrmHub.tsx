"use client";

import Link from "next/link";
import { ArrowRight, UsersRound } from "lucide-react";
import { useLanguage } from "./LanguageProvider";

export default function CrmHub() {
  const { language } = useLanguage();
  const ar = language === "ar";

  return <main className="flex-1 overflow-y-auto px-7 py-8"><div className="mx-auto max-w-5xl">
    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-blue-400">AVERO CRM</p>
    <h1 className="text-3xl font-bold text-white">CRM Hub</h1>
    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{ar ? "مركز العملاء والمبيعات في AVERO. منضيف أقسام CRM ثانية لاحقاً لما تصير جاهزة فعلياً." : "Your customer and sales workspace in AVERO. More CRM departments will appear only when they are fully ready."}</p>

    <Link href="/crm/sales" className="group mt-8 block rounded-3xl border border-blue-500/20 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,.12),transparent_40%),rgba(15,23,42,.72)] p-6 transition hover:border-blue-400/50">
      <div className="flex items-start justify-between gap-4"><div className="flex items-start gap-4"><div className="rounded-2xl border border-slate-700 bg-slate-950 p-3"><UsersRound className="text-blue-400" size={26}/></div><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-2xl font-black text-white">{ar ? "CRM المبيعات" : "Sales CRM"}</h2><span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black text-emerald-400">LIVE</span></div><p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">{ar ? "العملاء المحتملون، عروض الأسعار، المفاوضات، الصفقات المكتسبة والمفقودة ومسار العميل." : "Leads, quotations, negotiations, won and lost deals, and the complete customer pipeline."}</p></div></div><ArrowRight className="mt-1 text-blue-400 transition group-hover:translate-x-1" size={22}/></div>
    </Link>
  </div></main>;
}
