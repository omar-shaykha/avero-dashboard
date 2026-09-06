"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, Globe2, UserRound, Settings, Headphones, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/app/components/LanguageProvider";

interface DashboardHeaderProps { userName?: string; userEmail?: string; }
type Meta = { full_name?:string; username?:string; nickname?:string; job_title?:string; avatar_url?:string; age?:number|string; talents?:string; bio?:string };

export default function DashboardHeader({ userName, userEmail }: DashboardHeaderProps) {
  const [open, setOpen] = useState(false);
  const [meta, setMeta] = useState<Meta>({});
  const { language, setLanguage, t } = useLanguage();
  const ar = language === "ar";

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({data}) => setMeta((data.user?.user_metadata || {}) as Meta));
  }, []);

  const displayName = meta.full_name || meta.nickname || meta.username || userName || userEmail || (ar ? "مستخدم" : "User");
  const initials = displayName.split(" ").map((n)=>n[0]).join("").slice(0,2).toUpperCase();

  return (
    <div className="relative flex items-center justify-between border-b border-slate-800 bg-slate-900/50 px-6 py-3">
      <div />
      <div className="flex items-center gap-3">
        <Link href="/help-center" className="inline-flex items-center gap-2 rounded-xl border border-violet-500/20 bg-violet-500/10 px-3 py-2 text-xs font-medium text-violet-200 transition hover:border-violet-400/40 hover:bg-violet-500/15">
          <Headphones size={15}/><span className="hidden lg:inline">{ar ? "مركز المساعدة" : "Help Center"}</span><span className="flex items-center gap-1 text-[10px] text-emerald-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400"/>24/7</span>
        </Link>
        <button onClick={() => setLanguage(language === "en" ? "ar" : "en")} className="inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs font-medium text-slate-300 hover:border-slate-700 hover:text-white"><Globe2 size={15}/>{language === "en" ? "العربية" : "English"}</button>
        <div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-emerald-500"/><span className="text-xs text-slate-300">{t("online")}</span></div>
        <button onClick={() => setOpen((v)=>!v)} className="flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-slate-800/70">
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 text-xs font-semibold text-white">{meta.avatar_url ? <img src={meta.avatar_url} alt="" className="h-full w-full object-cover"/> : initials}</div>
          <div className={`hidden md:block ${ar ? "text-right" : "text-left"}`}><p className="max-w-[180px] truncate text-sm font-medium text-white">{displayName}</p><p className="max-w-[180px] truncate text-[11px] text-slate-500">{meta.job_title || (ar ? "حساب AVERO" : "AVERO Account")}</p></div>
          <ChevronDown size={15} className="text-slate-500"/>
        </button>
      </div>

      {open && <div className={`absolute top-[66px] z-50 w-72 rounded-2xl border border-slate-800 bg-slate-950 p-2 shadow-2xl shadow-black/30 ${ar ? "left-6" : "right-6"}`}>
        <div className="rounded-xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-4">
          <div className="flex items-center gap-3"><div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 font-bold text-white">{meta.avatar_url ? <img src={meta.avatar_url} alt="" className="h-full w-full object-cover"/> : initials}</div><div className="min-w-0"><p className="truncate font-semibold text-white">{displayName}</p><p className="truncate text-xs text-blue-300">{meta.job_title || meta.username || userEmail}</p>{meta.nickname && <p className="truncate text-[11px] text-slate-500">@{meta.nickname}</p>}</div></div>
          {(meta.bio || meta.talents) && <p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-400">{meta.bio || meta.talents}</p>}
        </div>
        <Link href="/profile" onClick={()=>setOpen(false)} className="mt-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-300 hover:bg-slate-900 hover:text-white"><UserRound size={16}/>{t("profile")}</Link>
        <Link href="/help-center" onClick={()=>setOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-300 hover:bg-slate-900 hover:text-white"><Sparkles size={16}/>{ar ? "مساعد AVERO الذكي" : "AVERO AI Assistant"}</Link>
        <button onClick={() => setLanguage(language === "en" ? "ar" : "en")} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-300 hover:bg-slate-900 hover:text-white"><Globe2 size={16}/>{language === "en" ? "العربية" : "English"}</button>
        <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-500"><Settings size={16}/>{t("settings")}</div>
      </div>}
    </div>
  );
}
