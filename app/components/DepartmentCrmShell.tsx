"use client";

import Link from "next/link";
import { ArrowLeft, Bot, CheckCircle2, Clock3, Facebook, Instagram, MessageCircle, Megaphone, TrendingUp } from "lucide-react";
import { useLanguage } from "./LanguageProvider";

const cards = [
  { label:"Total Comments", ar:"إجمالي التعليقات", value:"—", icon:MessageCircle },
  { label:"Pending", ar:"بانتظار الرد", value:"—", icon:Clock3 },
  { label:"AI Replied", ar:"ردّ عليها RIVO", value:"—", icon:Bot },
  { label:"Engagement", ar:"التفاعل", value:"—", icon:TrendingUp },
];

export default function DepartmentCrmShell({ title, description }: { title: string; description: string }) {
  const { language } = useLanguage(); const ar = language === "ar";
  const marketing = title.includes("Marketing");
  const translatedTitle = ar ? title.replace("CRM Marketing Department","CRM قسم التسويق").replace("AI Marketing CRM","CRM التسويق").replace("AI HR CRM","CRM الموارد البشرية").replace("AI Support CRM","CRM الدعم") : title;
  const translatedDescription = ar && marketing ? "مساحة FOXY وRIVO لإدارة الحملات والتفاعل وتعليقات فيسبوك وإنستغرام والردود الذكية من مكان واحد." : description;

  return <main className="flex-1 overflow-y-auto px-7 py-8"><div className="mx-auto max-w-[1400px]">
    <Link href="/crm" className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"><ArrowLeft size={16}/>{ar?"العودة إلى مركز CRM":"Back to CRM Hub"}</Link>
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-blue-400">AVERO CRM</p><h1 className="text-3xl font-bold text-white">{translatedTitle}</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">{translatedDescription}</p></div>
      {marketing && <div className="flex gap-2"><span className="rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 px-3 py-1.5 text-xs font-bold text-fuchsia-300">FOXY · Marketing</span><span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-300">RIVO · Community</span></div>}
    </div>

    {marketing ? <>
      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">{cards.map(({label,ar:arl,value,icon:Icon})=><div key={label} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"><div className="flex items-center justify-between"><Icon size={20} className="text-blue-400"/><span className="text-2xl font-black text-white">{value}</span></div><p className="mt-4 text-sm font-semibold text-slate-300">{ar?arl:label}</p></div>)}</div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_.7fr]">
        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
          <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4"><div><h2 className="font-bold text-white">{ar?"صندوق التعليقات":"Comments Inbox"}</h2><p className="mt-1 text-xs text-slate-500">{ar?"فيسبوك وإنستغرام في مكان واحد":"Facebook & Instagram in one place"}</p></div><div className="flex gap-2"><Facebook size={18} className="text-blue-400"/><Instagram size={18} className="text-pink-400"/></div></div>
          <div className="p-8 text-center"><MessageCircle className="mx-auto text-slate-600" size={30}/><p className="mt-3 text-sm font-semibold text-slate-300">{ar?"RIVO متصل — التعليقات الجديدة ستظهر هنا":"RIVO connected — new comments will appear here"}</p><p className="mt-1 text-xs text-slate-500">{ar?"Pending · Replied · Escalated · Spam":"Pending · Replied · Escalated · Spam"}</p></div>
        </section>
        <aside className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5"><div className="flex items-center gap-3"><div className="rounded-xl bg-emerald-500/10 p-2.5"><Bot className="text-emerald-400" size={22}/></div><div><h2 className="font-bold text-white">RIVO</h2><p className="text-xs text-emerald-400">{ar?"نشط · Social Community Agent":"Active · Social Community Agent"}</p></div></div><div className="mt-5 space-y-3 text-sm text-slate-400"><p className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-400"/>{ar?"يراقب تعليقات Facebook":"Watching Facebook comments"}</p><p className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-400"/>{ar?"يراقب تعليقات Instagram":"Watching Instagram comments"}</p><p className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-400"/>{ar?"ردود ذكية بنفس لغة العميل":"AI replies in customer language"}</p></div></aside>
      </div>
    </> : <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/60 p-10 text-center"><Megaphone className="mx-auto text-blue-400" size={32}/><h2 className="mt-4 text-lg font-semibold text-white">{ar?"CRM مستقل للقسم":"Independent department CRM"}</h2></div>}
  </div></main>;
}