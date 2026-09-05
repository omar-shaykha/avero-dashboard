"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Globe2, UserRound, Settings } from "lucide-react";
import { useLanguage } from "@/app/components/LanguageProvider";

interface DashboardHeaderProps { userName?: string; userEmail?: string; }

export default function DashboardHeader({ userName, userEmail }: DashboardHeaderProps) {
  const [open, setOpen] = useState(false);
  const { language, setLanguage, t } = useLanguage();
  const initials = userName ? userName.split(" ").map((n) => n[0]).join("").toUpperCase() : userEmail?.[0]?.toUpperCase() || "U";

  return (
    <div className="relative flex items-center justify-between border-b border-slate-800 bg-slate-900/50 px-6 py-3">
      <div />
      <div className="flex items-center gap-3">
        <button onClick={() => setLanguage(language === "en" ? "ar" : "en")} className="inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs font-medium text-slate-300 hover:border-slate-700 hover:text-white">
          <Globe2 size={15}/>{language === "en" ? "العربية" : "English"}
        </button>
        <div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-emerald-500"/><span className="text-xs text-slate-300">{t("online")}</span></div>
        <button onClick={() => setOpen((v)=>!v)} className="flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-slate-800/70">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 text-xs font-semibold text-white">{initials}</div>
          <div className="hidden text-left md:block"><p className="max-w-[180px] truncate text-sm font-medium text-white">{userName || userEmail || "User"}</p><p className="text-[11px] text-slate-500">AVERO Account</p></div>
          <ChevronDown size={15} className="text-slate-500"/>
        </button>
      </div>

      {open && (
        <div className="absolute right-6 top-[62px] z-50 w-60 rounded-2xl border border-slate-800 bg-slate-950 p-2 shadow-2xl shadow-black/30">
          <div className="border-b border-slate-800 px-3 py-3"><p className="truncate text-sm font-semibold text-white">{userName || userEmail}</p><p className="truncate text-xs text-slate-500">{userEmail}</p></div>
          <Link href="/profile" onClick={()=>setOpen(false)} className="mt-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-300 hover:bg-slate-900 hover:text-white"><UserRound size={16}/>{t("profile")}</Link>
          <button onClick={() => setLanguage(language === "en" ? "ar" : "en")} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-300 hover:bg-slate-900 hover:text-white"><Globe2 size={16}/>{language === "en" ? "العربية" : "English"}</button>
          <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-500"><Settings size={16}/>{t("settings")}</div>
        </div>
      )}
    </div>
  );
}
