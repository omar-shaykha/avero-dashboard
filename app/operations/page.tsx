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
  if (!requested || !areas.includes(requested as OperationsArea)) redirect(`/operations?area=${areas[0]}`);
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
        {current}
      </main>
    </div>
  </div>;
}
