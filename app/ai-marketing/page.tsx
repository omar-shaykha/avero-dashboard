import { redirect } from "next/navigation";
import Sidebar from "@/app/components/Sidebar";
import DashboardHeader from "@/app/components/DashboardHeader";
import { getAuthorizationContext } from "@/lib/auth/authorization";
import { LockKeyhole } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AiMarketingPage(){
  const access = await getAuthorizationContext();
  if(!access) redirect("/login");
  const user = access.user;
  const userName = user.email?.split("@")[0];
  return <div className="min-h-screen bg-slate-950 text-white"><Sidebar userEmail={user.email} userName={userName} access={access}/><div className="ml-64 min-h-screen"><DashboardHeader userEmail={user.email} userName={userName}/><main className="grid min-h-[75vh] place-items-center p-6"><section className="max-w-xl rounded-3xl border border-slate-800 bg-slate-900/60 p-8 text-center"><div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-slate-950 text-3xl">🦊</div><h1 className="mt-5 text-3xl font-black">Foxy Marketing</h1><div className="mt-3 inline-flex items-center gap-2 rounded-full bg-slate-800 px-4 py-2 text-xs font-black text-slate-400"><LockKeyhole size={14}/>COMING SOON</div><p className="mt-5 text-sm leading-7 text-slate-400">Foxy is paused while AVERO focuses on the universal POS core. It will return later as an optional AI subscription add-on.</p></section></main></div></div>
}
