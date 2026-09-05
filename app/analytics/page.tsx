import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { canAccess, getAuthorizationContext } from "@/lib/auth/authorization";
import Sidebar from "@/app/components/Sidebar";
import DashboardHeader from "@/app/components/DashboardHeader";
import AdvancedAnalytics from "@/app/components/AdvancedAnalytics";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  // AVERO Analytics V1 — force a fresh preview build from this branch.
  const access = await getAuthorizationContext();
  if (!access) redirect("/login");
  if (!canAccess(access, "analytics", "view_analytics")) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6">
        <div className="text-center"><h1 className="text-2xl font-bold text-white">Access Denied</h1><p className="mt-2 text-slate-400">You do not have access to Analytics.</p></div>
      </main>
    );
  }

  const userName = access.user.email?.split("@")[0];
  const companyId = access.profile.company_id;
  if (!companyId) redirect("/");

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!);
  const [{ data: leads, error: leadsError }, { data: conversations, error: conversationsError }] = await Promise.all([
    supabase.from("leads").select(`id,title,service_type,status,interest_level,estimated_value,city,created_at,updated_at,customers(name,source)`).eq("company_id", companyId).order("created_at", { ascending: false }),
    supabase.from("conversations").select("id,direction,ai_generated,message_type,created_at").eq("company_id", companyId).order("created_at", { ascending: false }).limit(5000),
  ]);

  if (leadsError) console.error("Analytics leads error:", leadsError);
  if (conversationsError) console.error("Analytics conversations error:", conversationsError);

  const normalizedLeads = (leads || []).map((lead: Record<string, unknown>) => ({
    ...lead,
    customers: Array.isArray(lead.customers) ? lead.customers[0] || null : lead.customers || null,
  }));

  return (
    <div className="min-h-screen bg-slate-950">
      <Sidebar userEmail={access.user.email} userName={userName} access={access} />
      <div className="ml-64 flex min-h-screen flex-col">
        <DashboardHeader userEmail={access.user.email} userName={userName} />
        <AdvancedAnalytics leads={normalizedLeads as never[]} conversations={(conversations || []) as never[]} />
      </div>
    </div>
  );
}
