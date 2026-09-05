import Link from "next/link";
import { ArrowLeft, Layers3 } from "lucide-react";

export default function DepartmentCrmShell({ title, description }: { title: string; description: string }) {
  return (
    <main className="flex-1 overflow-y-auto px-7 py-8">
      <div className="mx-auto max-w-[1300px]">
        <Link href="/crm" className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"><ArrowLeft size={16} /> Back to CRM Hub</Link>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-blue-400">AVERO CRM</p>
        <h1 className="text-3xl font-bold text-white">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{description}</p>
        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/60 p-10 text-center">
          <Layers3 className="mx-auto text-blue-400" size={32} />
          <h2 className="mt-4 text-lg font-semibold text-white">Independent department CRM</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">This workspace is separated from Sales CRM and will display department-specific records as those AI workflows are connected.</p>
        </div>
      </div>
    </main>
  );
}
