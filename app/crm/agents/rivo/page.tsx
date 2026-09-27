import { redirect } from "next/navigation";
import Sidebar from "@/app/components/Sidebar";
import DashboardHeader from "@/app/components/DashboardHeader";
import DepartmentCrmShell from "@/app/components/DepartmentCrmShell";
import { getAuthorizationContext, canAccess, isKingAdmin } from "@/lib/auth/authorization";

export const dynamic = "force-dynamic";

export default async function EliCrmPage(){
 const access=await getAuthorizationContext();
 if(!access)redirect("/login");
 if(!(isKingAdmin(access)||canAccess(access,"ai_marketing","marketing.manage")))redirect("/crm");
 return <div className="min-h-screen bg-slate-950 text-white"><Sidebar access={access}/><div className="ml-64 min-h-screen"><DashboardHeader userEmail={access.user.email||""}/><DepartmentCrmShell title="ELI CRM" description="Social community workspace for Facebook and Instagram comments, AI replies, follow-up, moderation and community engagement."/></div></div>;
}
