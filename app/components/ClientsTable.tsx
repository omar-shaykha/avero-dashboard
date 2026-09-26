"use client";

import Link from "next/link";
import { Fragment, useState } from "react";
import { Rocket, ShieldCheck } from "lucide-react";
import { useLanguage } from "./LanguageProvider";
import KingClientLinks from "./KingClientLinks";

interface Company { id: string; name: string; whatsapp_phone_number_id?: string; created_at: string; online?: boolean; }
interface ClientsTableProps { companies: Company[]; }

export default function ClientsTable({ companies }: ClientsTableProps) {
  const { t, language } = useLanguage();
  const [openLinks, setOpenLinks] = useState<string | null>(null);
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString(language === "ar" ? "ar-SA" : "en-US", { year: "numeric", month: "short", day: "numeric" });

  if (companies.length === 0) return <div className="rounded-2xl border border-slate-800 bg-slate-900/50 py-12 text-center"><p className="text-slate-400">{t("noClients")}</p></div>;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50">
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full">
          <thead><tr className="border-b border-slate-800 bg-slate-800/50">
            <th className="px-6 py-4 text-start text-sm font-semibold text-slate-200">{t("companyName")}</th>
            <th className="px-6 py-4 text-start text-sm font-semibold text-slate-200">{language === "ar" ? "الحالة" : "Status"}</th>
            <th className="px-6 py-4 text-start text-sm font-semibold text-slate-200">{t("companyId")}</th>
            <th className="px-6 py-4 text-start text-sm font-semibold text-slate-200">{t("whatsappPhoneId")}</th>
            <th className="px-6 py-4 text-start text-sm font-semibold text-slate-200">{t("createdDate")}</th>
            <th className="px-6 py-4 text-end text-sm font-semibold text-slate-200">Actions</th>
          </tr></thead>
          <tbody>{companies.map((company)=><Fragment key={company.id}><tr className="border-b border-slate-800 transition-colors hover:bg-slate-800/30">
            <td className="px-6 py-4 text-sm font-medium text-white"><Link href={`/clients/${company.id}/access`} className="hover:text-cyan-300">{company.name}</Link></td>
            <td className="px-6 py-4"><span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-bold ${company.online ? "bg-emerald-500/15 text-emerald-300" : "bg-slate-800 text-slate-400"}`}><span className={`h-2 w-2 rounded-full ${company.online ? "bg-emerald-400 animate-pulse" : "bg-slate-500"}`}/>{company.online ? (language === "ar" ? "أونلاين" : "Online") : (language === "ar" ? "أوفلاين" : "Offline")}</span></td>
            <td className="px-6 py-4 font-mono text-xs text-slate-300">{company.id}</td>
            <td className="px-6 py-4 text-sm text-slate-300">{company.whatsapp_phone_number_id || "—"}</td>
            <td className="px-6 py-4 text-sm text-slate-400">{formatDate(company.created_at)}</td>
            <td className="px-6 py-4 text-end"><div className="flex justify-end gap-2"><button type="button" onClick={() => setOpenLinks(openLinks === company.id ? null : company.id)} aria-expanded={openLinks === company.id} className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-3 py-2 text-xs font-bold text-white hover:bg-cyan-500"><ShieldCheck size={14}/>{language === "ar" ? "روابط العميل" : "Client links"}</button><Link href={`/clients/${company.id}/access`} className="inline-flex items-center gap-2 rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-xs font-medium text-blue-300 hover:bg-blue-500/15">{language === "ar" ? "تفاصيل وصلاحيات" : "Details & access"}</Link><Link href={`/clients/${company.id}/command`} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800"><Rocket size={14}/>Launch</Link></div></td>
          </tr>{openLinks === company.id && <tr><td colSpan={6} className="p-4"><KingClientLinks companyId={company.id} companyName={company.name} /></td></tr>}</Fragment>)}</tbody>
        </table>
      </div>

      <div className="grid gap-3 p-3 lg:hidden">
        {companies.map((company) => <div key={company.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <div className="flex items-start justify-between gap-3"><div><Link href={`/clients/${company.id}/access`} className="font-bold text-white hover:text-cyan-300">{company.name}</Link><p className="mt-1 text-xs text-slate-500">{formatDate(company.created_at)}</p></div><span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-bold ${company.online ? "bg-emerald-500/15 text-emerald-300" : "bg-slate-800 text-slate-400"}`}><span className={`h-1.5 w-1.5 rounded-full ${company.online ? "bg-emerald-400" : "bg-slate-500"}`}/>{company.online ? (language === "ar" ? "أونلاين" : "Online") : (language === "ar" ? "أوفلاين" : "Offline")}</span></div>
          <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900/80 p-3"><p className="text-[10px] uppercase tracking-[.14em] text-slate-500">WhatsApp ID</p><p className="mt-1 break-all text-sm text-slate-300">{company.whatsapp_phone_number_id || "—"}</p></div>
          <div className="mt-4 grid grid-cols-2 gap-2"><button type="button" onClick={() => setOpenLinks(openLinks === company.id ? null : company.id)} aria-expanded={openLinks === company.id} className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-600 px-3 py-2 text-xs font-bold text-white"><ShieldCheck size={14}/>{language === "ar" ? "روابط العميل" : "Client links"}</button><Link href={`/clients/${company.id}/access`} className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-500/20 px-3 py-2 text-xs font-bold text-blue-300">{language === "ar" ? "تفاصيل وصلاحيات" : "Details & access"}</Link></div>
          {openLinks === company.id && <div className="mt-4"><KingClientLinks companyId={company.id} companyName={company.name} /></div>}
        </div>)}
      </div>
    </div>
  );
}
