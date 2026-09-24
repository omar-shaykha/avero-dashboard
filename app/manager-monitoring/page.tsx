import { redirect } from "next/navigation";
import Sidebar from "@/app/components/Sidebar";
import DashboardHeader from "@/app/components/DashboardHeader";
import ManagerMonitoringWorkspace from "@/app/components/ManagerMonitoringWorkspace";
import { getAuthorizationContext, hasApp, hasPermission, isKingAdmin, isTenantAdmin } from "@/lib/auth/authorization";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function ManagerMonitoringPage() {
  const access = await getAuthorizationContext();
  if (!access) redirect("/login");
  const allowed = hasApp(access, "app_manager") && (isKingAdmin(access) || isTenantAdmin(access) || hasPermission(access, "analytics.view"));
  if (!allowed) redirect("/workspace");
  if (!access.profile.company_id) redirect("/profile");
  const db = createAdminClient();
  const [{ data: company }, { data: profile }] = await Promise.all([
    db.from("companies").select("name").eq("id", access.profile.company_id).maybeSingle(),
    db.from("user_profiles").select("full_name").eq("user_id", access.user.id).maybeSingle(),
  ]);
  const userName = profile?.full_name || access.user.email?.split("@")[0] || "User";
  return <div className="min-h-screen bg-slate-950"><Sidebar userEmail={access.user.email} userName={userName} access={access}/><div className="min-h-screen md:ml-64"><DashboardHeader userEmail={access.user.email} userName={userName}/><ManagerMonitoringWorkspace companyName={company?.name || "AVERO"} userName={userName}/></div></div>;
}
