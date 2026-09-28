"use client";
import { useState } from "react";
import { useLanguage } from "./LanguageProvider";

export default function KingClientLinks({ companyName }: { companyId: string; companyName: string }) {
  const { language } = useLanguage();
  const L = (en:string, ar:string) => language==="ar" ? ar : en;
  const [copied,setCopied]=useState(false);
  async function copy(){
    const link=window.location.origin+"/login";
    try{await navigator.clipboard.writeText(link);setCopied(true);window.setTimeout(()=>setCopied(false),2200)}catch{}
  }
  return <section className="rounded-2xl border border-cyan-500/30 bg-slate-900 p-4 text-white sm:p-6">
    <h3 className="text-xl font-bold">{L("Client access","دخول العميل")} · {companyName}</h3>
    <p className="mt-1 text-sm text-slate-400">{L("One secure sign-in link. AVERO shows only the applications enabled for this company.","رابط تسجيل دخول واحد وآمن. AVERO يظهر فقط التطبيقات المفعلة لهذه الشركة.")}</p>
    <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950 p-3">
      <strong className="text-sm">{L("Main sign-in","تسجيل الدخول الأساسي")}</strong>
      <p className="mt-2 break-all select-all text-xs text-slate-300">{typeof window==="undefined"?"/login":window.location.origin+"/login"}</p>
      <button type="button" onClick={copy} className="mt-3 rounded-lg border border-cyan-500/40 px-3 py-2 text-xs font-bold text-cyan-300">{copied?L("Copied ✓","تم النسخ ✓"):L("Copy link","نسخ الرابط")}</button>
    </div>
  </section>;
}