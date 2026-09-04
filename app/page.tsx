import { createClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createClient as createServerClient } from "@/lib/supabase/server";
import Sidebar from "@/app/components/Sidebar";
import DashboardHeader from "@/app/components/DashboardHeader";
import SearchToolbar from "@/app/components/SearchToolbar";
import StatsCards from "@/app/components/StatsCards";
import LeadPipeline from "@/app/components/LeadPipeline";

export const dynamic = "force-dynamic";

export default async function Home() {
  // Check authentication
  const authClient = await createServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // CRM data client (service-role)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!;

  const supabase = createClient(supabaseUrl, supabaseSecretKey);

  // Fetch all leads for stats
  const { data: allLeads } = await supabase
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
    .order("updated_at", { ascending: false });

  console.log("LEADS ERROR: checked");

  const normalizedLeads = (allLeads || []).map((lead: any) => ({
    ...lead,
    customers: Array.isArray(lead.customers)
      ? lead.customers[0] || null
      : lead.customers || null,
  }));

  // Calculate stats
  const totalLeads = normalizedLeads.length;
  const qualifiedCount = normalizedLeads.filter(
    (l) => l.status === "qualified"
  ).length;
  const quotationsCount = normalizedLeads.filter(
    (l) => l.status === "quotation"
  ).length;
  const negotiationsCount = normalizedLeads.filter(
    (l) => l.status === "negotiation"
  ).length;
  const wonCount = normalizedLeads.filter((l) => l.status === "won").length;
  const lostCount = normalizedLeads.filter((l) => l.status === "lost").length;

  const userName = user.user_metadata?.name || user.email?.split("@")[0];

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Sidebar */}
      <Sidebar userEmail={user.email} userName={userName} />

      {/* Main Content */}
      <div className="ml-64 flex flex-col min-h-screen">
        {/* Dashboard Header */}
        <DashboardHeader userEmail={user.email} userName={userName} />

        {/* Search Toolbar */}
        <SearchToolbar />

        {/* Stats Cards */}
        <StatsCards
          totalLeads={totalLeads}
          qualifiedCount={qualifiedCount}
          quotationsCount={quotationsCount}
          negotiationsCount={negotiationsCount}
          wonCount={wonCount}
          lostCount={lostCount}
        />

        {/* Sales Pipeline */}
        <div className="flex-1 px-6 py-6">
          <LeadPipeline leads={normalizedLeads} />
        </div>
      </div>
    </div>
  );
}
