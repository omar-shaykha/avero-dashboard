import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { canAccess, getAuthorizationContext } from "@/lib/auth/authorization";
import Sidebar from "@/app/components/Sidebar";
import DashboardHeader from "@/app/components/DashboardHeader";
import SearchToolbar from "@/app/components/SearchToolbar";
import StatsCards from "@/app/components/StatsCards";
import LeadPipeline, { type LeadData } from "@/app/components/LeadPipeline";

export const dynamic = "force-dynamic";

export default async function SalesCrmPage() {
  const access = await getAuthorizationContext();
  if (!access) redirect("/login");
  if (!canAccess(access, "crm", "view_crm")) {
    return <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">Access Denied</main>;
  }
  const user = access.user;
  const userName = user.email?.split("@")[0];
  const companyId = access.profile.company_id;
  if (!companyId) redirect("/");

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!);
  const { data: allLeads, error } = await supabase
    .from("leads")
    .select(`id,title,service_type,status,interest_level,people_count,event_date,city,notes,updated_at,customers(name,phone,email)`)
    .eq("company_id", companyId)
    .order("updated_at", { ascending: false });
  if (error) console.error("Sales CRM leads error:", error);

  const leads = (allLeads || []).map((lead: Record<string, unknown>) => ({
    ...lead,
    customers: Array.isArray(lead.customers) ? lead.customers[0] || null : lead.customers || null,
  })) as LeadData[];

  return (
    <div className="min-h-screen bg-slate-950">
      <Sidebar userEmail={user.email} userName={userName} access={access} />
      <div className="ml-64 flex min-h-screen flex-col">
        <DashboardHeader userEmail={user.email} userName={userName} />
        <div className="px-6 pt-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">AVERO CRM / AI SALES</p>
          <h1 className="mt-1 text-2xl font-bold text-white">Sales CRM</h1>
        </div>
        <SearchToolbar />
        <StatsCards
          totalLeads={leads.length}
          qualifiedCount={leads.filter((lead) => lead.status === "qualified").length}
          quotationsCount={leads.filter((lead) => lead.status === "quotation").length}
          negotiationsCount={leads.filter((lead) => lead.status === "negotiation").length}
          wonCount={leads.filter((lead) => lead.status === "won").length}
          lostCount={leads.filter((lead) => lead.status === "lost").length}
        />
        <div className="flex-1 px-6 py-6"><LeadPipeline leads={leads} /></div>
      </div>
    </div>
  );
}
