"use client";
import Sidebar from "@/app/components/Sidebar";
import DashboardHeader from "@/app/components/DashboardHeader";
import CommerceAdminWorkspace from "@/app/components/CommerceAdminWorkspace";
import { useLanguage } from "@/app/components/LanguageProvider";

export default function PosSettingsPage(){
  const {language}=useLanguage();
  const ar=language==="ar";
  const L=(en:string,arabic:string)=>ar?arabic:en;
  return <div className="min-h-screen bg-slate-950 text-white">
    <Sidebar/>
    <div className="ml-64 flex min-h-screen flex-col">
      <DashboardHeader/>
      <main className="flex-1 px-6 py-7">
        <div className="mx-auto max-w-7xl space-y-6">
          <div>
            <div className="text-xs font-black uppercase tracking-[.2em] text-cyan-400">AVERO SETTINGS</div>
            <h1 className="mt-2 text-3xl font-black">{L("POS, Printing & Invoice Settings","إعدادات نقاط البيع والطباعة والفاتورة")}</h1>
            <p className="mt-2 text-sm text-slate-400">{L("Receipt, invoice and printing customization belongs to Settings, not the cashier selling screen.","تخصيص الإيصال والفاتورة والطباعة موجود ضمن الإعدادات وليس ضمن شاشة البيع في الكاشير.")}</p>
          </div>
          <CommerceAdminWorkspace mode="invoice"/>
        </div>
      </main>
    </div>
  </div>;
}
