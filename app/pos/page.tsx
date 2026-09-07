import { redirect } from "next/navigation";
import Sidebar from "@/app/components/Sidebar";
import DashboardHeader from "@/app/components/DashboardHeader";
import SuppliersWorkspace from "@/app/components/SuppliersWorkspace";
import { getAuthorizationContext } from "@/lib/auth/authorization";

export const dynamic = "force-dynamic";

export default async function PosPage() {
  const access = await getAuthorizationContext();
  if (!access) redirect("/login");
  const user = access.user;
  const userName = user.email?.split("@")[0];
  return <div className="min-h-screen bg-slate-950 text-white"><Sidebar userEmail={user.email} userName={userName} access={access} /><div className="ml-64 min-h-screen"><DashboardHeader userEmail={user.email} userName={userName} /><main className="p-4 md:p-7"><div className="mx-auto max-w-[1600px]"><SuppliersWorkspace /></div></main></div></div>;
}
