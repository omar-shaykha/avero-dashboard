"use client";

import Link from "next/link";
import { Rocket, ShieldCheck } from "lucide-react";
import { useLanguage } from "./LanguageProvider";

interface Company { id: string; name: string; whatsapp_phone_number_id?: string; created_at: string; }
interface ClientsTableProps { companies: Company[]; }

export default function ClientsTable({ companies }: ClientsTableProps) {
  const { t, language } = useLanguage();
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString(language === "ar" ? "ar-SA" : "en-US", { year: "numeric", month: "short", day: "numeric" });

  if (companies.length === 0) return <div className="rounded-2xl border border-slate-800 bg-slate-900/50 py-12 text-center"><p className="text-slate-400">{t("noClients")}</p></div>;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50">
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full">
          <thead><tr className="border-b border-slate-800 bg-slate-800/50">
            <th className="px-6 py-4 text-start text-sm font-semibold text-slate-200">{t("companyName")}</th>
            <th className="px-6 py-4 text-start text-sm font-semibold text-slate-200">{t("companyId")}</th>
            <th className="px-6 py-4 text-start text-sm font-semibold text-slate-200">{t("whatsappPhoneId")}</th>
            <th className="px-6 py-4 text-start text-sm font-semibold text-slate-200">{t("createdDate")}</th>
            <th className="px-6 py-4 text-end text-sm font-semibold text-slate-200">Actions</th>
          </tr></thead>
          <tbody>{companies.map((company)=><tr key={company.id} className="border-b border-slate-800 transition-colors hover:bg-slate-800/30">
            <td className="px-6 py-4 text-sm font-medium text-white">{company.name}</td>
            <td className="px-6 py-4 font-mono text-xs text-slate-300">{company.id}</td>
            <td className="px-6 py-4 text-sm text-slate-300">{company.whatsapp_phone_number_id || "—"}</td>
            <td className="px-6 py-4 text-sm text-slate-400">{formatDate(company.created_at)}</td>
            <td className="px-6 py-4 text-end"><div className="flex justify-end gap-2"><Link href={`/clients/${company.id}/command`} className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-300 hover:bg-cyan-500/15"><Rocket size={14}/>Launch</Link><Link href={`/clients/${company.id}/access`} className="inline-flex items-center gap-2 rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-xs font-medium text-blue-300 hover:bg-blue-500/15"><ShieldCheck size={14}/>{t("manageAccess")}</Link></div></td>
          </tr>)}</tbody>
        </table>
      </div>

      <div className="grid gap-3 p-3 lg:hidden">
        {companies.map((company) => <div key={company.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <div className="flex items-start justify-between gap-3"><div><h3 className="font-bold text-white">{company.name}</h3><p className="mt-1 text-xs text-slate-500">{formatDate(company.created_at)}</p></div><span className="rounded-full bg-slate-800 px-2 py-1 text-[10px] text-slate-300">Client</span></div>
          <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900/80 p-3"><p className="text-[10px] uppercase tracking-[.14em] text-slate-500">WhatsApp ID</p><p className="mt-1 break-all text-sm text-slate-300">{company.whatsapp_phone_number_id || "—"}</p></div>
          <div className="mt-4 grid grid-cols-2 gap-2"><Link href={`/clients/${company.id}/command`} className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-600 px-3 py-2 text-xs font-bold text-white"><Rocket size={14}/>Launch</Link><Link href={`/clients/${company.id}/access`} className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-xs font-bold text-blue-300"><ShieldCheck size={14}/>Access</Link></div>
        </div>)}
      </div>
    </div>
  );
}
