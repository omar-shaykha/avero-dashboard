"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Sidebar from "@/app/components/Sidebar";
import DashboardHeader from "@/app/components/DashboardHeader";
import { Check, LockKeyhole, ShieldCheck } from "lucide-react";
import { useLanguage } from "@/app/components/LanguageProvider";

type Feature = { id:string; key:string; name?:string|null; description?:string|null; enabled:boolean; expires_at?:string|null };

export default function ClientAccessPage() {
  const params = useParams<{ id: string }>();
  const { language } = useLanguage();
  const ar = language === "ar";
  const [company, setCompany] = useState<{id:string;name:string}|null>(null);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string|null>(null);

  const load = async () => {
    const res = await fetch(`/api/clients/${params.id}/features`);
    const data = await res.json();
    if (res.ok) { setCompany(data.company); setFeatures(data.features || []); }
    setLoading(false);
  };
  useEffect(() => { load(); }, [params.id]);

  const toggle = async (feature: Feature) => {
    setSaving(feature.id);
    const next = !feature.enabled;
    const res = await fetch(`/api/clients/${params.id}/features`, { method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ feature_id:feature.id, enabled:next, expires_at:feature.expires_at || null }) });
    if (res.ok) setFeatures((items)=>items.map((item)=>item.id===feature.id?{...item,enabled:next}:item));
    setSaving(null);
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <Sidebar />
      <div className="ml-64 flex min-h-screen flex-col">
        <DashboardHeader />
        <main className="flex-1 px-6 py-7 text-white">
          <div className="mx-auto max-w-5xl">
            <div className="mb-6 flex items-start justify-between">
              <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">AVERO Access Control</p><h1 className="mt-2 text-3xl font-bold">{company?.name || (ar?"صلاحيات العميل":"Client Access")}</h1><p className="mt-2 text-slate-400">{ar?"فعّل أو أوقف أي وحدة حسب اشتراك العميل.":"Enable or disable every AVERO module based on this client's subscription."}</p></div>
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-emerald-300"><ShieldCheck size={24}/></div>
            </div>

            {loading ? <div className="text-slate-500">Loading...</div> : (
              <div className="grid gap-4 md:grid-cols-2">
                {features.map((feature)=><div key={feature.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div><div className="flex items-center gap-2"><LockKeyhole size={17} className="text-blue-400"/><h2 className="font-semibold">{feature.name || feature.key}</h2></div><p className="mt-2 text-sm leading-6 text-slate-500">{feature.description || feature.key}</p></div>
                    <button disabled={saving===feature.id} onClick={()=>toggle(feature)} className={`relative h-7 w-12 rounded-full transition ${feature.enabled?"bg-emerald-500":"bg-slate-700"}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${feature.enabled?"left-6":"left-1"}`}/></button>
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">{feature.enabled?<><Check size={13} className="text-emerald-400"/>{ar?"مفعّل لهذا العميل":"Enabled for this client"}</>:<>{ar?"غير مشمول بالاشتراك":"Not included in subscription"}</>}</div>
                </div>)}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
