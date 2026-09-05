"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";

interface Company { id: string; name: string; whatsapp_phone_number_id?: string; created_at: string; }
interface ClientsTableProps { companies: Company[]; }

export default function ClientsTable({ companies }: ClientsTableProps) {
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

  if (companies.length === 0) return <div className="rounded-lg border border-slate-800 bg-slate-900/50 py-12 text-center"><p className="text-slate-400">No clients yet. Create one to get started.</p></div>;

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/50">
      <table className="w-full">
        <thead><tr className="border-b border-slate-800 bg-slate-800/50">
          <th className="px-6 py-4 text-left text-sm font-semibold text-slate-200">Company Name</th>
          <th className="px-6 py-4 text-left text-sm font-semibold text-slate-200">Company ID</th>
          <th className="px-6 py-4 text-left text-sm font-semibold text-slate-200">WhatsApp Phone ID</th>
          <th className="px-6 py-4 text-left text-sm font-semibold text-slate-200">Created Date</th>
          <th className="px-6 py-4 text-right text-sm font-semibold text-slate-200">Subscription</th>
        </tr></thead>
        <tbody>{companies.map((company)=><tr key={company.id} className="border-b border-slate-800 transition-colors hover:bg-slate-800/30">
          <td className="px-6 py-4 text-sm font-medium text-white">{company.name}</td>
          <td className="px-6 py-4 font-mono text-xs text-slate-300">{company.id}</td>
          <td className="px-6 py-4 text-sm text-slate-300">{company.whatsapp_phone_number_id || "—"}</td>
          <td className="px-6 py-4 text-sm text-slate-400">{formatDate(company.created_at)}</td>
          <td className="px-6 py-4 text-right"><Link href={`/clients/${company.id}/access`} className="inline-flex items-center gap-2 rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-xs font-medium text-blue-300 hover:bg-blue-500/15"><ShieldCheck size={14}/>Manage Access</Link></td>
        </tr>)}</tbody>
      </table>
    </div>
  );
}
