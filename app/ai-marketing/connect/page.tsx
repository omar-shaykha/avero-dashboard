import { redirect } from "next/navigation";
import { canAccess, getAuthorizationContext, isKingAdmin } from "@/lib/auth/authorization";
import Sidebar from "@/app/components/Sidebar";
import DashboardHeader from "@/app/components/DashboardHeader";
import MarketingPublisherConnect from "@/app/components/MarketingPublisherConnect";

export const dynamic = "force-dynamic";

export default async function FoxyConnectPage(){
  const access = await getAuthorizationContext();
  if(!access) redirect("/login");
  if(!(isKingAdmin(access) || canAccess(access,"ai_marketing","marketing.manage"))) redirect("/ai-marketing");
  return <div className="min-h-screen bg-slate-950 text-white"><Sidebar/><div className="ml-64 min-h-screen"><DashboardHeader/><main className="p-7"><MarketingPublisherConnect/></main></div></div>;
}
