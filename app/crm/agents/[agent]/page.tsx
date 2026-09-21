import { redirect } from "next/navigation";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { canAccess, getAuthorizationContext } from "@/lib/auth/authorization";
import Sidebar from "@/app/components/Sidebar";
import DashboardHeader from "@/app/components/DashboardHeader";
import SearchToolbar from "@/app/components/SearchToolbar";
import StatsCards from "@/app/components/StatsCards";
import LeadPipeline, { type LeadData } from "@/app/components/LeadPipeline";
import LocalizedState from "@/app/components/LocalizedState";
import LocalizedPageHeader from "@/app/components/LocalizedPageHeader";

export const dynamic = "force-dynamic";

const AGENTS:Record<string,{name:string,department:string}> = {
  ai_sales:{name:"Leo",department:"Sales"},
  ai_marketing:{name:"Foxy",department:"Marketing"},
  ai_hr:{name:"Aero",department:"HR"},
  ai_support:{name:"Gor",department:"Support"},
  ai_inventory:{name:"Vexa",department:"Inventory"},
  ai_warehouse:{name:"Bruno",department:"Warehouse"},
  ai_customer_care:{name:"Rex",department:"Customer Care"},
  ai_analytics:{name:"Nova",department:"Analytics"},
};

export default async function AgentCrmPage({params}:{params:Promise<{agent:string}>}) {
  const {agent}=await params;
  const meta=AGENTS[agent];
  if(!meta) redirect("/crm/sales");

  const access = await getAuthorizationContext();
  if (!access) redirect("/login");
  if (!canAccess(access, "crm", "view_crm")) return <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6"><LocalizedState enTitle="Access Denied" arTitle="تم رفض الوصول" enDescription="You do not have access to CRM." arDescription="ليس لديك صلاحية للوصول إلى CRM."/></main>;

  const user = access.user;
  const userName = user.email?.split("@")[0];
  const companyId = access.profile.company_id;
  if (!companyId) redirect("/");

  const supabase = await createServerClient();
  const { data: allLeads, error } = await supabase
    .from("leads")
    .select("id,title,service_type,status,interest_level,estimated_value,people_count,appointment_date,city,notes,updated_at,lead_source,priority,next_follow_up_at,next_action,probability,last_contact_at,tags,custom_fields,source_agent_key,source_agent_name,customers(name,phone,email)")
    .eq("company_id", companyId)
    .eq("source_agent_key", agent)
    .order("updated_at", { ascending:false });

  if (error) console.error("Agent CRM leads error:", error);
  const leads = (allLeads || []).map((lead:Record<string,unknown>)=>({...lead,customers:Array.isArray(lead.customers)?lead.customers[0]||null:lead.customers||null})) as LeadData[];

  return <div className="min-h-screen bg-slate-950">
    <Sidebar userEmail={user.email} userName={userName} access={access}/>
    <div className="ml-64 flex min-h-screen flex-col">
      <DashboardHeader userEmail={user.email} userName={userName}/>
      <div className="px-6 pt-6">
        <LocalizedPageHeader enEyebrow={"AGENT CRM / "+meta.department} arEyebrow={"CRM الوكيل / "+meta.name} enTitle={meta.name+" CRM"} arTitle={"CRM "+meta.name}/>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4"><div className="text-xs text-slate-500">Leads Generated</div><div className="mt-1 text-3xl font-black text-white">{leads.length}</div></div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4"><div className="text-xs text-slate-500">Qualified</div><div className="mt-1 text-3xl font-black text-white">{leads.filter(l=>l.status==="qualified").length}</div></div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4"><div className="text-xs text-slate-500">Won</div><div className="mt-1 text-3xl font-black text-white">{leads.filter(l=>l.status==="won").length}</div></div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4"><div className="text-xs text-slate-500">Pipeline Value</div><div className="mt-1 text-3xl font-black text-white">{leads.reduce((n,l:any)=>n+Number(l.estimated_value||0),0).toLocaleString()}</div></div>
        </div>
      </div>
      <SearchToolbar/>
      <StatsCards totalLeads={leads.length} qualifiedCount={leads.filter(l=>l.status==="qualified").length} quotationsCount={leads.filter(l=>l.status==="quotation").length} negotiationsCount={leads.filter(l=>l.status==="negotiation").length} wonCount={leads.filter(l=>l.status==="won").length} lostCount={leads.filter(l=>l.status==="lost").length}/>
      <div className="flex-1 px-6 py-6"><LeadPipeline leads={leads}/></div>
    </div>
  </div>;
}
