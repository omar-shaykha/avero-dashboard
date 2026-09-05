import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { getAuthorizationContext } from "@/lib/auth/authorization";
import Sidebar from "@/app/components/Sidebar";
import DashboardHeader from "@/app/components/DashboardHeader";
import UniversalAiDashboard from "@/app/components/UniversalAiDashboard";

export const dynamic = "force-dynamic";

export default async function Home() {
  const access = await getAuthorizationContext();
  if (!access) redirect("/login");

  const user = access.user;
  const userName = user.email?.split("@")[0];
  const companyId = access.profile.company_id;

  if (!companyId) {
    return <div className="min-h-screen bg-slate-950"><Sidebar userEmail={user.email} userName={userName} access={access}/><div className="ml-64 flex min-h-screen flex-col"><DashboardHeader userEmail={user.email} userName={userName}/><div className="flex flex-1 items-center justify-center text-slate-400">Account not configured.</div></div></div>;
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!);
  const { data: leads, error } = await supabase.from("leads").select("id,status").eq("company_id", companyId);
  if (error) console.error("Dashboard sales snapshot error:", error);
  const rows = leads || [];
  const count = (status: string) => rows.filter((lead) => (lead.status || "new").toLowerCase() === status).length;
  const features = access.profile.role === "super_admin" ? ["ai_sales","ai_marketing","ai_hr","ai_support"] : access.features;

  return (
    <div className="min-h-screen bg-slate-950">
      <Sidebar userEmail={user.email} userName={userName} access={access} />
      <div className="ml-64 flex min-h-screen flex-col">
        <DashboardHeader userEmail={user.email} userName={userName} />
        <UniversalAiDashboard features={features} sales={{ total: rows.length, qualified: count("qualified"), quotation: count("quotation"), negotiation: count("negotiation"), won: count("won"), lost: count("lost") }} />
      </div>
    </div>
  );
}
