import { redirect } from "next/navigation";
import Sidebar from "@/app/components/Sidebar";
import DashboardHeader from "@/app/components/DashboardHeader";
import ManagerMonitoringWorkspace from "@/app/components/ManagerMonitoringWorkspace";
import KingManagerMonitoring from "@/app/components/KingManagerMonitoring";
import { getAuthorizationContext, hasApp, hasPermission, isKingAdmin, isTenantAdmin } from "@/lib/auth/authorization";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function ManagerMonitoringPage({ searchParams }: { searchParams: Promise<{ company?: string }> }) {
  const access = await getAuthorizationContext();
  if (!access) redirect("/login");
  const allowed = isKingAdmin(access) || (hasApp(access, "app_manager") && (isTenantAdmin(access) || hasPermission(access, "analytics.view")));
  if (!allowed) redirect("/workspace");
  if (!access.profile.company_id) redirect("/profile");
  const db = createAdminClient();
  const selectedCompanyId = isKingAdmin(access) ? (await searchParams).company?.trim() : undefined;
  if (isKingAdmin(access) && !selectedCompanyId) {
    const [companies,features,entitlements]=await Promise.all([db.from("companies").select("id,name,status").order("name"),db.from("features").select("id,key").in("key",["app_sell","app_accounting","app_hr","app_loyalty","app_intelligence","app_zatca"]),db.from("company_features").select("company_id,feature_id,enabled,expires_at").eq("enabled",true)]);
    const byId=new Map((features.data||[]).map(f=>[f.id,f.key]));const subscribers:Record<string,string[]>={};for(const row of entitlements.data||[]){const key=byId.get(row.feature_id);if(key&&(!row.expires_at||new Date(row.expires_at).getTime()>Date.now()))(subscribers[key]??=[]).push(row.company_id)}
    return <div className="min-h-screen bg-slate-950"><Sidebar access={access}/><div className="min-h-screen md:ml-64"><DashboardHeader userEmail={access.user.email}/><KingManagerMonitoring companies={companies.data||[]} subscribers={subscribers}/></div></div>;
  }
  const [{ data: company }, { data: profile }] = await Promise.all([
    db.from("companies").select("name").eq("id", selectedCompanyId || access.profile.company_id).maybeSingle(),
    db.from("user_profiles").select("full_name").eq("user_id", access.user.id).maybeSingle(),
  ]);
  const userName = profile?.full_name || access.user.email?.split("@")[0] || "User";
  return <div className="min-h-screen bg-slate-950"><Sidebar userEmail={access.user.email} userName={userName} access={access}/><div className="min-h-screen md:ml-64"><DashboardHeader userEmail={access.user.email} userName={userName}/><ManagerMonitoringWorkspace companyName={company?.name || "AVERO"} userName={userName} companyId={selectedCompanyId}/></div></div>;
}
