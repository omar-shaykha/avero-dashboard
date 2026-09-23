import { redirect } from "next/navigation";
import Sidebar from "@/app/components/Sidebar";
import DashboardHeader from "@/app/components/DashboardHeader";
import WorkspaceHome from "@/app/components/WorkspaceHome";
import { getAuthorizationContext, hasPermission, isKingAdmin, isTenantAdmin } from "@/lib/auth/authorization";
import { createAdminClient } from "@/lib/supabase/admin";
import { availableOsApps } from "@/lib/os/catalog";

export const dynamic = "force-dynamic";

export default async function WorkspacePage() {
  const access = await getAuthorizationContext();
  if (!access) redirect("/login");
  const companyId = access.profile.company_id;
  if (!companyId) redirect("/profile");

  const db = createAdminClient();
  const [company, membership, branches] = await Promise.all([
    db.from("companies").select("id,name,industry,activity_label").eq("id", companyId).maybeSingle(),
    db.from("company_memberships").select("id,status").eq("company_id", companyId).eq("user_id", access.user.id).maybeSingle(),
    db.from("branches").select("id,name").eq("company_id", companyId).eq("status", "active"),
  ]);
  if (company.error || membership.error || branches.error) throw new Error("Could not load the company workspace");
  // During the legacy-to-membership transition only AVERO's internal king
  // account can bypass company membership. Customer access must be active.
  if (!isKingAdmin(access) && membership.data?.status !== "active") {
    return <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-center text-white"><div><h1 className="text-2xl font-bold">Workspace access unavailable</h1><p className="mt-3 text-slate-400">Your company membership is not active. Contact your company administrator.</p></div></main>;
  }
  if (!company.data) throw new Error("Company not found");

  return <div className="min-h-screen bg-slate-950 text-white">
    <Sidebar access={access} />
    <div className="min-h-screen md:ml-64">
      <DashboardHeader userEmail={access.user.email} />
      <WorkspaceHome companyName={company.data.name} businessType={company.data.activity_label || company.data.industry || ""} branchCount={branches.data?.length || 0} apps={availableOsApps(access)} canViewSettings={isKingAdmin(access) || isTenantAdmin(access) || hasPermission(access, "settings.view")} canViewIntegrations={isKingAdmin(access) || hasPermission(access, "apps.view")} />
    </div>
  </div>;
}
