import { redirect } from "next/navigation";
import Sidebar from "@/app/components/Sidebar";
import DashboardHeader from "@/app/components/DashboardHeader";
import CoreOperationsWorkspace from "@/app/components/CoreOperationsWorkspace";
import { getAuthorizationContext, hasPermission, isKingAdmin, isTenantAdmin } from "@/lib/auth/authorization";
import { canOpenSell } from "@/lib/os/catalog";

export const dynamic = "force-dynamic";

export default async function PosPage({ searchParams }: { searchParams: Promise<{ area?: string }> }) {
  const access = await getAuthorizationContext();
  if (!access) redirect("/login");
  if (!access.profile.company_id || !canOpenSell(access)) redirect("/workspace");

  const params = await searchParams;
  if ((params?.area === "add-items" || params?.area === "products") && !isKingAdmin(access) && !isTenantAdmin(access) && !hasPermission(access, "sales.manage")) redirect("/pos?area=cashier");
  if (params?.area === "purchasing" && !isKingAdmin(access) && !isTenantAdmin(access) && !["purchasing.view", "purchasing.manage"].some((permission) => hasPermission(access, permission))) redirect("/pos?area=cashier");
  const user = access.user;
  const userName = user.email?.split("@")[0];

  return <div className="min-h-screen bg-slate-950 text-white">
    <Sidebar userEmail={user.email} userName={userName} access={access} />
    <div className="ml-64 min-h-screen">
      <DashboardHeader userEmail={user.email} userName={userName} />
      <main className="p-4 md:p-7">
        <div className="mx-auto max-w-[1600px]">
          <CoreOperationsWorkspace initialArea={params?.area || "cashier"} />
        </div>
      </main>
    </div>
  </div>;
}
