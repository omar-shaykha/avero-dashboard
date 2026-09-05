import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { getAuthorizationContext } from "@/lib/auth/authorization";
import Sidebar from "@/app/components/Sidebar";
import DashboardHeader from "@/app/components/DashboardHeader";
import AnalyticsOverview from "@/app/components/AnalyticsOverview";
import type { LeadData } from "@/app/components/LeadPipeline";

export const dynamic = "force-dynamic";

export default async function Home() {
  const access = await getAuthorizationContext();
  if (!access) {
    redirect("/login");
  }

  const user = access.user;
  const userProfile = access.profile;
  const userName = user.email?.split("@")[0];

  if (!userProfile.company_id) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Sidebar userEmail={user.email} userName={userName} access={access} />
        <div className="ml-64 flex min-h-screen flex-col">
          <DashboardHeader userEmail={user.email} userName={userName} />
          <div className="flex flex-1 items-center justify-center px-6 py-12">
            <div className="w-full max-w-md text-center">
              <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full border border-slate-700 bg-slate-800/50">
                <span className="text-2xl text-slate-400">i</span>
              </div>
              <h2 className="mb-2 text-2xl font-bold text-white">Account not configured</h2>
              <p className="mb-8 text-slate-400">Your account is not assigned to a company yet.</p>
              <p className="text-sm text-slate-500">Please contact your administrator to set up your account.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );

  const { data: allLeads, error: leadsError } = await supabase
    .from("leads")
    .select(`
      id,
      title,
      service_type,
      status,
      interest_level,
      people_count,
      event_date,
      city,
      notes,
      estimated_value,
      created_at,
      updated_at,
      customers (
        name,
        phone,
        email,
        source
      )
    `)
    .eq("company_id", userProfile.company_id)
    .order("updated_at", { ascending: false });

  if (leadsError) {
    console.error("Leads error:", leadsError);
  }

  const normalizedLeads = (allLeads || []).map((lead: Record<string, unknown>) => ({
    ...lead,
    customers: Array.isArray(lead.customers)
      ? lead.customers[0] || null
      : lead.customers || null,
  })) as (LeadData & {
    created_at?: string | null;
    estimated_value?: number | null;
    customers: (LeadData["customers"] & { source?: string | null }) | null;
  })[];

  return (
    <div className="min-h-screen bg-slate-950">
      <Sidebar userEmail={user.email} userName={userName} access={access} />
      <div className="ml-64 flex min-h-screen flex-col">
        <DashboardHeader userEmail={user.email} userName={userName} />
        <AnalyticsOverview leads={normalizedLeads} />
      </div>
    </div>
  );
}
