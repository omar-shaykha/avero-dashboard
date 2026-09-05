import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { canAccess, getAuthorizationContext } from "@/lib/auth/authorization";
import Sidebar from "@/app/components/Sidebar";
import DashboardHeader from "@/app/components/DashboardHeader";
import AnalyticsWorkspaceV2 from "@/app/components/AnalyticsWorkspaceV2";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const access = await getAuthorizationContext();
  if (!access) redirect("/login");

  if (!canAccess(access, "analytics", "view_analytics")) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6">
        <div className="text-center"><h1 className="text-2xl font-bold text-white">Access Denied</h1><p className="mt-2 text-slate-400">You do not have access to Analytics.</p></div>
      </main>
    );
  }

  const companyId = access.profile.company_id;
  if (!companyId) redirect("/");

  const userName = access.user.email?.split("@")[0];
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!);
  const { data: leads, error } = await supabase
    .from("leads")
    .select(`id,service_type,status,city,estimated_value,created_at,updated_at,customers(source)`)
    .eq("company_id", companyId)
    .order("updated_at", { ascending: false });

  if (error) console.error("Analytics leads error:", error);

  const normalized = (leads || []).map((lead: Record<string, unknown>) => ({
    ...lead,
    customers: Array.isArray(lead.customers) ? lead.customers[0] || null : lead.customers || null,
  }));

  return (
    <div className="min-h-screen bg-slate-950">
      <Sidebar userEmail={access.user.email} userName={userName} access={access} />
      <div className="ml-64 flex min-h-screen flex-col">
        <DashboardHeader userEmail={access.user.email} userName={userName} />
        <AnalyticsWorkspaceV2 leads={normalized as never[]} />
      </div>
    </div>
  );
}
