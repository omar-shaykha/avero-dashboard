import { redirect } from "next/navigation";
import Sidebar from "@/app/components/Sidebar";
import DashboardHeader from "@/app/components/DashboardHeader";
import { getAuthorizationContext } from "@/lib/auth/authorization";

export const dynamic = "force-dynamic";

export default async function PosPage() {
  const access = await getAuthorizationContext();
  if (!access) redirect("/login");
  const user = access.user;
  const userName = user.email?.split("@")[0];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Sidebar userEmail={user.email} userName={userName} access={access} />
      <div className="ml-64 min-h-screen">
        <DashboardHeader userEmail={user.email} userName={userName} />
        <main className="p-4 md:p-7">
          <div className="mx-auto max-w-[1600px]">
            <section className="grid min-h-[65vh] place-items-center rounded-3xl border border-dashed border-slate-800 bg-slate-900/30 p-8 text-center">
              <div>
                <p className="text-xs font-black uppercase tracking-[.3em] text-cyan-300">AVERO POS</p>
                <h1 className="mt-3 text-3xl font-black">Clean slate</h1>
                <p className="mt-3 max-w-xl text-sm text-slate-500">The previous POS implementation has been removed. This page is intentionally empty so the new POS can be rebuilt from zero.</p>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
