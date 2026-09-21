import { redirect } from "next/navigation";
import Sidebar from "@/app/components/Sidebar";
import DashboardHeader from "@/app/components/DashboardHeader";
import AgentCrmDashboard from "@/app/components/AgentCrmDashboard";
import { getAuthorizationContext, isKingAdmin, isTenantAdmin, hasPermission } from "@/lib/auth/authorization";
export const dynamic="force-dynamic";
export default async function CrmPage(){
 const access=await getAuthorizationContext(); if(!access)redirect("/login");
 if(!(isKingAdmin(access)||isTenantAdmin(access)||hasPermission(access,"crm.view")||hasPermission(access,"analytics.view")))return <main className="p-10 text-white">Access denied.</main>;
 return <div className="min-h-screen bg-slate-950 text-white"><Sidebar access={access}/><main className="min-h-screen p-4 md:ml-64 md:p-7"><DashboardHeader userEmail={access.user.email||""}/><div className="mx-auto mt-6 max-w-[1600px]"><AgentCrmDashboard/></div></main></div>;
}