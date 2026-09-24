import { redirect } from "next/navigation";
import Sidebar from "@/app/components/Sidebar";
import DashboardHeader from "@/app/components/DashboardHeader";
import ManagerMonitoringWorkspace from "@/app/components/ManagerMonitoringWorkspace";
import { getAuthorizationContext, hasPermission, isKingAdmin, isTenantAdmin } from "@/lib/auth/authorization";

export const dynamic = "force-dynamic";

export default async function ManagerMonitoringPage() {
  const access = await getAuthorizationContext();
  if (!access) redirect("/login");
  const allowed = isKingAdmin(access) || isTenantAdmin(access) || hasPermission(access, "analytics.view");
  if (!allowed) redirect("/workspace");
  if (!access.profile.company_id) redirect("/profile");
  const userName = access.user.email?.split("@")[0];
  return <div className="min-h-screen bg-slate-950"><Sidebar userEmail={access.user.email} userName={userName} access={access}/><div className="min-h-screen md:ml-64"><DashboardHeader userEmail={access.user.email} userName={userName}/><ManagerMonitoringWorkspace/></div></div>;
}
