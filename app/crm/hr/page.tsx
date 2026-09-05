import { redirect } from "next/navigation";
import { getAuthorizationContext } from "@/lib/auth/authorization";
import Sidebar from "@/app/components/Sidebar";
import DashboardHeader from "@/app/components/DashboardHeader";
import DepartmentCrmShell from "@/app/components/DepartmentCrmShell";
export const dynamic = "force-dynamic";
export default async function HrCrmPage(){const access=await getAuthorizationContext();if(!access)redirect("/login");const userName=access.user.email?.split("@")[0];return <div className="min-h-screen bg-slate-950"><Sidebar userEmail={access.user.email} userName={userName} access={access}/><div className="ml-64 flex min-h-screen flex-col"><DashboardHeader userEmail={access.user.email} userName={userName}/><DepartmentCrmShell title="AI HR CRM" description="Candidates, applicants, interviews and employee communication workflows in a dedicated workspace."/></div></div>}
