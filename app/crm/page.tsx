import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { canAccess, getAuthorizationContext } from "@/lib/auth/authorization";
import Sidebar from "@/app/components/Sidebar";
import DashboardHeader from "@/app/components/DashboardHeader";
import SearchToolbar from "@/app/components/SearchToolbar";
import StatsCards from "@/app/components/StatsCards";
import LeadPipeline, { type LeadData } from "@/app/components/LeadPipeline";

export const dynamic = "force-dynamic";

export default async function CrmPage() {
  const access = await getAuthorizationContext();
  if (!access) redirect("/login");

  if (!canAccess(access, "crm", "view_crm")) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Access Denied</h1>
          <p className="mt-2 text-slate-400">You do not have access to CRM.</p>
        </div>
      </main>
    );
  }

  const user = access.user;
  const userName = user.email?.split("@")[0];
  const companyId = access.profile.company_id;

  if (!companyId) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Sidebar userEmail={user.email} userName={userName} access={access} />
        <div className="ml-64 flex min-h-screen flex-col">
          <DashboardHeader userEmail={user.email} userName={userName} />
          <div className="flex flex-1 items-center justify-center text-slate-400">Account not configured.</div>
        </div>
      </div>
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );

  const { data: allLeads, error } = await supabase
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
      updated_at,
      customers (
        name,
        phone,
        email
      )
    `)
    .eq("company_id", companyId)
    .order("updated_at", { ascending: false });

  if (error) console.error("CRM leads error:", error);

  const leads = (allLeads || []).map((lead: Record<string, unknown>) => ({
    ...lead,
    customers: Array.isArray(lead.customers)
      ? lead.customers[0] || null
      : lead.customers || null,
  })) as LeadData[];

  const totalLeads = leads.length;
  const qualifiedCount = leads.filter((lead) => lead.status === "qualified").length;
  const quotationsCount = leads.filter((lead) => lead.status === "quotation").length;
  const negotiationsCount = leads.filter((lead) => lead.status === "negotiation").length;
  const wonCount = leads.filter((lead) => lead.status === "won").length;
  const lostCount = leads.filter((lead) => lead.status === "lost").length;

  return (
    <div className="min-h-screen bg-slate-950">
      <Sidebar userEmail={user.email} userName={userName} access={access} />
      <div className="ml-64 flex min-h-screen flex-col">
        <DashboardHeader userEmail={user.email} userName={userName} />
        <SearchToolbar />
        <StatsCards
          totalLeads={totalLeads}
          qualifiedCount={qualifiedCount}
          quotationsCount={quotationsCount}
          negotiationsCount={negotiationsCount}
          wonCount={wonCount}
          lostCount={lostCount}
        />
        <div className="flex-1 px-6 py-6">
          <LeadPipeline leads={leads} />
        </div>
      </div>
    </div>
  );
}
