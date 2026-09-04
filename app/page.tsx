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

  // Step 1: Get user's company_id from user_profiles
  const { data: userProfile, error: userProfileError } = await supabase
    .from("user_profiles")
    .select("company_id")
    .eq("user_id", user.id)
    .single();

  // Handle userProfileError explicitly
  if (userProfileError) {
    console.error("User profile error:", userProfileError);
  }

  // Check if company_id exists - if not, show empty state
  if (!userProfile?.company_id) {
    const userName = user.user_metadata?.name || user.email?.split("@")[0];

    return (
      <div className="min-h-screen bg-slate-950">
        {/* Sidebar */}
        <Sidebar userEmail={user.email} userName={userName} />

        {/* Main Content */}
        <div className="ml-64 flex flex-col min-h-screen">
          {/* Dashboard Header */}
          <DashboardHeader userEmail={user.email} userName={userName} />

          {/* Empty State */}
          <div className="flex-1 flex items-center justify-center px-6 py-12">
            <div className="w-full max-w-md text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-800/50 border border-slate-700 mb-6">
                <svg
                  className="w-8 h-8 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>

              <h2 className="text-2xl font-bold text-white mb-2">
                Account not configured
              </h2>

              <p className="text-slate-400 mb-8">
                Your account is not assigned to a company yet.
              </p>

              <p className="text-sm text-slate-500">
                Please contact your administrator to set up your account.
              </p>

              {/* Temporary Debug Info */}
              <div className="mt-8 pt-6 border-t border-slate-700 space-y-2 text-xs">
                <p className="text-slate-500">
                  <span className="font-mono text-slate-400">Authenticated User ID:</span> <br />
                  <span className="font-mono text-yellow-400/80">{user.id}</span>
                </p>
                <p className="text-slate-500">
                  <span className="font-mono text-slate-400">Profile Error:</span> <br />
                  <span className="font-mono text-yellow-400/80">
                    {userProfileError?.message || "none"}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const companyId = userProfile.company_id;

  // Step 2: Fetch all leads filtered by company_id
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
      updated_at,
      customers (
        name,
        phone,
        email
      )
    `)
    .eq("company_id", companyId)
    .order("updated_at", { ascending: false });

  if (leadsError) {
    console.error("Leads error:", leadsError);
  }

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
