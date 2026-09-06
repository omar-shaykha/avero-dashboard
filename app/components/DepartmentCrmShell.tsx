"use client";

import Link from "next/link";
import { ArrowLeft, Layers3 } from "lucide-react";
import { useLanguage } from "./LanguageProvider";

export default function DepartmentCrmShell({ title, description }: { title: string; description: string }) {
  const { language } = useLanguage(); const ar = language === "ar";
  const translatedTitle = ar ? title.replace("AI Marketing CRM","CRM التسويق").replace("AI HR CRM","CRM الموارد البشرية").replace("AI Support CRM","CRM الدعم") : title;
  const translatedDescription = ar ? description
    .replace("Campaign contacts, audiences, engagement and marketing opportunities.","جهات اتصال الحملات، الجماهير، التفاعل والفرص التسويقية.")
    .replace("Candidates, applicants, interviews and employee communication workflows.","المرشحون، المتقدمون، المقابلات وتدفقات التواصل مع الموظفين.")
    .replace("Support contacts, conversations, cases and service follow-up.","جهات اتصال الدعم، المحادثات، الحالات ومتابعة الخدمة.") : description;
  return <main className="flex-1 overflow-y-auto px-7 py-8"><div className="mx-auto max-w-[1300px]">
    <Link href="/crm" className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"><ArrowLeft size={16}/>{ar?"العودة إلى مركز CRM":"Back to CRM Hub"}</Link>
    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-blue-400">AVERO CRM</p>
    <h1 className="text-3xl font-bold text-white">{translatedTitle}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{translatedDescription}</p>
    <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/60 p-10 text-center"><Layers3 className="mx-auto text-blue-400" size={32}/><h2 className="mt-4 text-lg font-semibold text-white">{ar?"CRM مستقل للقسم":"Independent department CRM"}</h2><p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">{ar?"هذه المساحة منفصلة عن CRM المبيعات وستعرض سجلات القسم الخاصة عند ربط تدفقات الذكاء الاصطناعي والبيانات الخاصة به.":"This workspace is separated from Sales CRM and will display department-specific records as those AI workflows are connected."}</p></div>
  </div></main>;
}
