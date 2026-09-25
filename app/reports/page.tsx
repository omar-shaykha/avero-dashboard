import { redirect } from "next/navigation";
import Sidebar from "@/app/components/Sidebar";
import DashboardHeader from "@/app/components/DashboardHeader";
import ReportsWorkspace from "@/app/components/ReportsWorkspace";
import { getAuthorizationContext, hasApp, hasPermission, isKingAdmin, isTenantAdmin } from "@/lib/auth/authorization";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const access = await getAuthorizationContext();
  if (!access) redirect("/login");
  if (!access.profile.company_id) redirect("/workspace");
  const can = (...keys: string[]) => isKingAdmin(access) || isTenantAdmin(access) || keys.some((key) => hasPermission(access, key));
  const allowed = [
    ...(hasApp(access, "app_sell") && can("sales.view", "sales.manage") ? ["sales", "items"] : []),
    ...(hasApp(access, "app_sell") && can("customers.manage", "sales.manage") ? ["customers"] : []),
    ...(hasApp(access, "app_operations") && can("production.view", "production.manage") ? ["production"] : []),
    ...((hasApp(access, "app_operations") || hasApp(access, "app_sell")) && can("purchasing.view", "purchasing.manage") ? ["purchasing"] : []),
    ...(hasApp(access, "app_operations") && can("inventory.view", "inventory.manage", "production.view") ? ["waste"] : []),
    ...(hasApp(access, "app_operations") && can("inventory.view", "inventory.manage") ? ["counts", "stock", "movements"] : []),
  ];
  if (!allowed.length) redirect("/workspace");
  return <div className="min-h-screen bg-slate-950 text-white"><Sidebar access={access}/><div className="min-h-screen md:ml-64"><DashboardHeader userEmail={access.user.email}/><main className="mx-auto max-w-[1600px] px-5 py-8 md:px-8"><ReportsWorkspace allowed={allowed}/></main></div></div>;
}
