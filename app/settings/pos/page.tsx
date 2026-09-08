"use client";
import Link from "next/link";
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-black uppercase tracking-[.2em] text-cyan-400">AVERO SETTINGS</div>
              <h1 className="mt-2 text-3xl font-black">{L("POS, Printing & Invoice Settings","إعدادات نقاط البيع والطباعة والفاتورة")}</h1>
              <p className="mt-2 text-sm text-slate-400">{L("System-level receipt and invoice configuration is managed here, away from the cashier selling screen.","إعدادات الفاتورة والطباعة الخاصة بالنظام تُدار من هنا بعيداً عن شاشة البيع في الكاشير.")}</p>
            </div>
            <div className="flex gap-2">
              <Link href="/settings" className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-bold text-slate-300 hover:bg-slate-900">{L("Company Settings","إعدادات الشركة")}</Link>
              <Link href="/pos" className="rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-black text-slate-950">{L("Back to POS","العودة لنقاط البيع")}</Link>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/45 p-4 text-sm text-slate-400">
            {L("Invoice customization belongs to system settings. Cashier keeps only operational controls such as Open Shift, Track Invoice, Dining Map and Payment Methods.","تخصيص الفاتورة صار ضمن إعدادات النظام. الكاشير يبقى فيه فقط أدوات التشغيل مثل فتح الوردية، تتبع الفاتورة، خريطة الطاولات وطرق الدفع.")}
          </div>
          <CommerceAdminWorkspace mode="invoice"/>
        </div>
      </main>
    </div>
  </div>;
}
