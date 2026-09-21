import { redirect } from "next/navigation";
import Link from "next/link";
import Sidebar from "@/app/components/Sidebar";
import DashboardHeader from "@/app/components/DashboardHeader";
import AgentHireWizard from "@/app/components/AgentHireWizard";
import { getAuthorizationContext } from "@/lib/auth/authorization";

const valid=new Set(["ai_hr","ai_support","ai_inventory","ai_warehouse","ai_customer_care","ai_analytics"]);
export const dynamic="force-dynamic";

export default async function SubscriptionsPage({searchParams}:{searchParams:Promise<{agent?:string}>}){
 const access=await getAuthorizationContext();
 if(!access)redirect("/login");
 const params=await searchParams;
 const key=String(params?.agent||"");
 if(!valid.has(key))redirect("/crm");

 return <div className="min-h-screen bg-slate-950 text-white"><Sidebar access={access}/><div className="ml-64 min-h-screen"><DashboardHeader userEmail={access.user.email||""}/><main className="p-6"><div className="mx-auto max-w-6xl">
  <div className="mb-7 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.28em] text-cyan-300">AI EMPLOYEE ONBOARDING</p><h1 className="mt-2 text-4xl font-black">Hire AI Employee</h1><p className="mt-2 text-sm text-slate-400">Configure the employee, choose monthly or yearly billing, then complete payment. Activation happens only after payment is verified.</p></div><Link href="/crm" className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-black text-cyan-300">← CRM Office</Link></div>
  <AgentHireWizard agentKey={key}/>
 </div></main></div></div>;
}
