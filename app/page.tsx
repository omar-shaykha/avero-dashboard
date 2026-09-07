import { redirect } from "next/navigation";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getAuthorizationContext, isKingAdmin } from "@/lib/auth/authorization";
import Sidebar from "@/app/components/Sidebar";
import DashboardHeader from "@/app/components/DashboardHeader";
import UniversalAiDashboard from "@/app/components/UniversalAiDashboard";
import LocalizedState from "@/app/components/LocalizedState";

export const dynamic = "force-dynamic";

const AGENT_KEYS = [
  "ai_sales",
  "ai_marketing",
  "ai_hr",
  "ai_support",
  "ai_inventory",
  "ai_customer_care",
  "ai_analytics",
  "ai_warehouse",
] as const;

type LeadRow = {
  id: string;
  status: string | null;
  assigned_to?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
};

type RunRow = {
  id: string;
  agent_key: string | null;
  action: string | null;
  status: string | null;
  created_at: string | null;
  completed_at?: string | null;
};

type MarketingRow = {
  id: string;
  status: string | null;
  channel: string | null;
  platforms?: string[] | null;
  created_at: string | null;
  published_at?: string | null;
};

type ProfileRow = {
  user_id: string;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  role?: string | null;
};

function statusOf(lead: LeadRow) {
  return (lead.status || "new").toLowerCase();
}

function countStatus(rows: LeadRow[], status: string) {
  return rows.filter((lead) => statusOf(lead) === status).length;
}

function displayProfile(profile?: ProfileRow | null) {
  if (!profile) return null;
  return profile.full_name || [profile.first_name, profile.last_name].filter(Boolean).join(" ") || profile.role || null;
}

function buildOwnerLabel(owner: string, profiles: ProfileRow[]) {
  const profile = profiles.find((item) => item.user_id === owner);
  return displayProfile(profile) || owner;
}

function buildTopPerformer(leads: LeadRow[], profiles: ProfileRow[]) {
  const scores = new Map<string, { quotations: number; won: number; leads: number; score: number }>();
  for (const lead of leads) {
    const owner = String(lead.assigned_to || "").trim();
    if (!owner) continue;
    const current = scores.get(owner) || { quotations: 0, won: 0, leads: 0, score: 0 };
    const status = statusOf(lead);
    current.leads += 1;
    if (status === "quotation") current.quotations += 1;
    if (status === "won") current.won += 1;
    current.score = current.quotations * 3 + current.won * 5 + current.leads;
    scores.set(owner, current);
  }
  const top = [...scores.entries()].sort((a, b) => b[1].score - a[1].score)[0];
  if (!top) return null;
  return {
    name: buildOwnerLabel(top[0], profiles),
    quotations: top[1].quotations,
    won: top[1].won,
    leads: top[1].leads,
    score: top[1].score,
  };
}

function countRuns(runs: RunRow[], agentKey: string, status?: string) {
  return runs.filter((run) => run.agent_key === agentKey && (!status || (run.status || "").toLowerCase() === status)).length;
}

function latestRun(runs: RunRow[], agentKey: string) {
  return runs.find((run) => run.agent_key === agentKey) || null;
}

function buildAgentResults(leads: LeadRow[], runs: RunRow[], marketing: MarketingRow[]) {
  const salesQuotations = countStatus(leads, "quotation");
  const salesWon = countStatus(leads, "won");
  const pendingMarketing = marketing.filter((item) => ["approval_required", "draft", "idea"].includes((item.status || "").toLowerCase())).length;
  const publishedMarketing = marketing.filter((item) => ["published", "posted"].includes((item.status || "").toLowerCase()) || item.published_at).length;

  return [
    {
      key: "ai_sales",
      name: "Leo Sales",
      result: `${leads.length} leads · ${salesQuotations} quotations · ${salesWon} won`,
      last_action: latestRun(runs, "ai_sales")?.action || "Lead pipeline follow-up",
      status: latestRun(runs, "ai_sales")?.status || (leads.length ? "active" : "ready"),
      count: leads.length + salesQuotations + salesWon,
    },
    {
      key: "ai_marketing",
      name: "Foxy Marketing",
      result: `${pendingMarketing} pending approval · ${publishedMarketing} published/posted`,
      last_action: latestRun(runs, "ai_marketing")?.action || "Content planning and campaign drafts",
      status: latestRun(runs, "ai_marketing")?.status || (marketing.length ? "active" : "ready"),
      count: marketing.length + publishedMarketing,
    },
    {
      key: "ai_hr",
      name: "Aero HR & Booking",
      result: `${countRuns(runs, "ai_hr")} recent actions`,
      last_action: latestRun(runs, "ai_hr")?.action || "Booking and team planning standby",
      status: latestRun(runs, "ai_hr")?.status || "ready",
      count: countRuns(runs, "ai_hr"),
    },
    {
      key: "ai_support",
      name: "Gor Support",
      result: `${countRuns(runs, "ai_support")} support actions`,
      last_action: latestRun(runs, "ai_support")?.action || "Support inbox standby",
      status: latestRun(runs, "ai_support")?.status || "ready",
      count: countRuns(runs, "ai_support"),
    },
    {
      key: "ai_inventory",
      name: "Vexa Inventory",
      result: `${countRuns(runs, "ai_inventory")} stock checks`,
      last_action: latestRun(runs, "ai_inventory")?.action || "Stock monitoring standby",
      status: latestRun(runs, "ai_inventory")?.status || "ready",
      count: countRuns(runs, "ai_inventory"),
    },
    {
      key: "ai_customer_care",
      name: "Rex Customer Care",
      result: `${countRuns(runs, "ai_customer_care")} care actions`,
      last_action: latestRun(runs, "ai_customer_care")?.action || "Customer care standby",
      status: latestRun(runs, "ai_customer_care")?.status || "ready",
      count: countRuns(runs, "ai_customer_care"),
    },
    {
      key: "ai_analytics",
      name: "Nova Analytics",
      result: `${countRuns(runs, "ai_analytics")} insights generated`,
      last_action: latestRun(runs, "ai_analytics")?.action || "Performance analysis standby",
      status: latestRun(runs, "ai_analytics")?.status || "ready",
      count: countRuns(runs, "ai_analytics"),
    },
    {
      key: "ai_warehouse",
      name: "Bruno Warehouse",
      result: `${countRuns(runs, "ai_warehouse")} warehouse actions`,
      last_action: latestRun(runs, "ai_warehouse")?.action || "Warehouse flow standby",
      status: latestRun(runs, "ai_warehouse")?.status || "ready",
      count: countRuns(runs, "ai_warehouse"),
    },
  ];
}

export default async function Home() {
  const access = await getAuthorizationContext();
  if (!access) redirect("/login");

  const user = access.user;
  const userName = user.email?.split("@")[0];
  const companyId = access.profile.company_id;

  if (!companyId) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Sidebar userEmail={user.email} userName={userName} access={access} />
        <div className="ml-64 flex min-h-screen flex-col">
          <DashboardHeader userEmail={user.email} userName={userName} />
          <div className="flex flex-1 items-center justify-center px-6">
            <LocalizedState
              enTitle="Account not configured"
              arTitle="الحساب غير مهيأ"
              enDescription="Your account is not assigned to a company yet."
              arDescription="لم يتم ربط حسابك بشركة بعد."
            />
          </div>
        </div>
      </div>
    );
  }

  const supabase = await createServerClient();
  const [leadsRes, runsRes, marketingRes, profilesRes] = await Promise.all([
    supabase.from("leads").select("id,status,assigned_to,updated_at,created_at").eq("company_id", companyId),
    supabase
      .from("ai_agent_runs")
      .select("id,agent_key,action,status,created_at,completed_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(120),
    supabase
      .from("marketing_content_queue")
      .select("id,status,channel,platforms,created_at,published_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(80),
    supabase.from("user_profiles").select("user_id,full_name,first_name,last_name,role").eq("company_id", companyId),
  ]);

  if (leadsRes.error) console.error("Dashboard sales snapshot error:", leadsRes.error);
  if (runsRes.error) console.error("Dashboard agent runs error:", runsRes.error);
  if (marketingRes.error) console.error("Dashboard marketing snapshot error:", marketingRes.error);
  if (profilesRes.error) console.error("Dashboard user profile snapshot error:", profilesRes.error);

  const leads = (leadsRes.data || []) as LeadRow[];
  const runs = (runsRes.data || []) as RunRow[];
  const marketing = (marketingRes.data || []) as MarketingRow[];
  const profiles = (profilesRes.data || []) as ProfileRow[];
  const features = isKingAdmin(access)
    ? [...AGENT_KEYS, "crm", "analytics"]
    : access.features;

  return (
    <div className="min-h-screen bg-slate-950">
      <Sidebar userEmail={user.email} userName={userName} access={access} />
      <div className="ml-64 flex min-h-screen flex-col">
        <DashboardHeader userEmail={user.email} userName={userName} />
        <UniversalAiDashboard
          features={features}
          sales={{
            total: leads.length,
            qualified: countStatus(leads, "qualified"),
            quotation: countStatus(leads, "quotation"),
            negotiation: countStatus(leads, "negotiation"),
            won: countStatus(leads, "won"),
            lost: countStatus(leads, "lost"),
          }}
          agentResults={buildAgentResults(leads, runs, marketing)}
          topPerformer={buildTopPerformer(leads, profiles)}
        />
      </div>
    </div>
  );
}
