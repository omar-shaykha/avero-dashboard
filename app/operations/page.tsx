import Link from "next/link";
import { redirect } from "next/navigation";
import Sidebar from "@/app/components/Sidebar";
import DashboardHeader from "@/app/components/DashboardHeader";
import InventoryWorkspace from "@/app/components/InventoryWorkspace";
import PurchasingWorkspace from "@/app/components/PurchasingWorkspace";
import ProductionWorkspace from "@/app/components/ProductionWorkspace";
import AccountingWorkspace from "@/app/components/AccountingWorkspace";
import { getAuthorizationContext, isKingAdmin } from "@/lib/auth/authorization";
import { createAdminClient } from "@/lib/supabase/admin";
import { allowedOperationsAreas, type OperationsArea } from "@/lib/os/catalog";

export const dynamic = "force-dynamic";

const labels: Record<OperationsArea, string> = {
  inventory: "Inventory / المخزون",
  purchasing: "Purchasing / المشتريات",
  production: "Production / الإنتاج",
  accounting: "Accounting / المحاسبة",
};

export default async function OperationsPage({ searchParams }: { searchParams: Promise<{ area?: string }> }) {
  const access = await getAuthorizationContext();
  if (!access) redirect("/login");
  const companyId = access.profile.company_id;
  if (!companyId) redirect("/profile");
  if (!isKingAdmin(access)) {
    const { data, error } = await createAdminClient().from("company_memberships").select("status").eq("company_id", companyId).eq("user_id", access.user.id).maybeSingle();
    if (error) throw error;
    if (data?.status !== "active") redirect("/workspace");
  }

  const areas = allowedOperationsAreas(access);
  if (!areas.length) redirect("/workspace");
  const requested = (await searchParams).area;
  const area = requested && areas.includes(requested as OperationsArea) ? requested as OperationsArea : areas[0];
  const current = area === "inventory" ? <InventoryWorkspace />
    : area === "purchasing" ? <PurchasingWorkspace />
    : area === "production" ? <ProductionWorkspace />
    : area === "accounting" ? <AccountingWorkspace /> : null;

  return <div className="min-h-screen bg-slate-950 text-white">
    <Sidebar access={access} />
    <div className="min-h-screen md:ml-64">
      <DashboardHeader userEmail={access.user.email}/>
      <main className="mx-auto max-w-[1600px] space-y-6 px-5 py-8 md:px-8">
        <header><Link href="/workspace" className="text-sm text-cyan-300 hover:underline">← AVERO OS</Link><h1 className="mt-4 text-3xl font-black">AVERO Operations</h1><p className="mt-2 text-slate-400">إدارة العمليات الداخلية للشركة · Company operations</p></header>
        {area ? <><nav aria-label="Operations areas" className="flex flex-wrap gap-2">{areas.map((item) => <Link key={item} href={`/operations?area=${item}`} aria-current={item === area ? "page" : undefined} className={`rounded-xl border px-4 py-2 text-sm ${item === area ? "border-cyan-400 bg-cyan-400/10 text-cyan-200" : "border-slate-700 text-slate-300 hover:border-slate-500"}`}>{labels[item]}</Link>)}</nav>{current}</>
          : <div className="rounded-2xl border border-slate-800 p-7 text-slate-300">You do not have permission to access Operations. / ليس لديك صلاحية للوصول إلى العمليات.</div>}
      </main>
    </div>
  </div>;
}
