import Link from "next/link";
import { redirect } from "next/navigation";
import Sidebar from "@/app/components/Sidebar";
import DashboardHeader from "@/app/components/DashboardHeader";
import GoMerchantWorkspace from "@/app/components/GoMerchantWorkspace";
import { getAuthorizationContext, hasPermission, isKingAdmin, isTenantAdmin } from "@/lib/auth/authorization";
import { hasApp } from "@/lib/auth/authorization";
import GoPageHeader from "@/app/components/GoPageHeader";

export const dynamic = "force-dynamic";

export default async function GoPage() {
  const access = await getAuthorizationContext();
  if (!access) redirect("/login");
  if (!access.profile.company_id) redirect("/profile");
  if (!hasApp(access,"app_go") || !hasApp(access,"app_sell")) redirect("/workspace");
  if (!isKingAdmin(access) && !isTenantAdmin(access) && !hasPermission(access, "sales.view")
    && !hasPermission(access, "sales.cashier") && !hasPermission(access, "sales.manage")) redirect("/workspace");
  return <div className="min-h-screen bg-slate-950 text-white">
    <Sidebar access={access} />
    <div className="min-h-screen md:ml-64">
      <DashboardHeader userEmail={access.user.email} />
      <main className="mx-auto max-w-6xl px-5 py-8 md:px-8">
        <GoPageHeader />
        <GoMerchantWorkspace />
      </main>
    </div>
  </div>;
}
