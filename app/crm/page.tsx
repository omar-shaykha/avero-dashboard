import { redirect } from "next/navigation";
import { canAccess, getAuthorizationContext } from "@/lib/auth/authorization";
import Sidebar from "@/app/components/Sidebar";
import DashboardHeader from "@/app/components/DashboardHeader";
import CrmHub from "@/app/components/CrmHub";

export const dynamic = "force-dynamic";

export default async function CrmPage() {
  const access = await getAuthorizationContext();
  if (!access) redirect("/login");
  if (!canAccess(access, "crm", "view_crm")) {
    return <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">Access Denied</main>;
  }
  const userName = access.user.email?.split("@")[0];
  return (
    <div className="min-h-screen bg-slate-950">
      <Sidebar userEmail={access.user.email} userName={userName} access={access} />
      <div className="ml-64 flex min-h-screen flex-col">
        <DashboardHeader userEmail={access.user.email} userName={userName} />
        <CrmHub />
      </div>
    </div>
  );
}
