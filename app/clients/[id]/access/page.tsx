"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Sidebar from "@/app/components/Sidebar";
import DashboardHeader from "@/app/components/DashboardHeader";

type Feature = { id:string; key:string; enabled:boolean; expires_at:string|null };
type Overview = { company:{name:string}; users:{user_id:string}[]; subscription:{status:string;subscription_plans?:{name:string}}|null };
const apps = [
  {key:"app_sell", name:"AVERO SELL / POS", detail:"الكاشير، إضافة الأصناف والمنتجات، العملاء والمبيعات"},
  {key:"app_operations", name:"AVERO Operations / ERP", detail:"المخزون، المشتريات، الإنتاج والمحاسبة"},
  {key:"app_go", name:"AVERO GO", detail:"منيو الزبائن وطلبات الاستلام (يحتاج SELL)"},
  {key:"app_intelligence", name:"AVERO Intelligence / AI Agents", detail:"تفعيل الوكلاء المشترك بهم فقط"},
] as const;
const agents = [
  {key:"ai_sales",name:"LEO",detail:"مبيعات · متاح",ready:true},
  {key:"ai_marketing",name:"FOXY",detail:"تسويق · متاح",ready:true},
  {key:"ai_hr",name:"VEXA",detail:"موارد بشرية · قيد التطوير",ready:false},
  {key:"ai_inventory",name:"GORE",detail:"مخزون · قيد التطوير",ready:false},
  {key:"ai_support",name:"AREO",detail:"عمليات · قيد التطوير",ready:false},
] as const;

export default function ClientAccessPage(){
  const {id}=useParams<{id:string}>();
  const [overview,setOverview]=useState<Overview|null>(null);
  const [features,setFeatures]=useState<Feature[]>([]);
  const [slug,setSlug]=useState<string|null>(null);
  const [loaded,setLoaded]=useState(false);
  const [saving,setSaving]=useState<string|null>(null);
  const [error,setError]=useState("");
  const [copied,setCopied]=useState("");
  const [origin,setOrigin]=useState("");
  useEffect(()=>setOrigin(window.location.origin),[]);
  const load=useCallback(async()=>{
    const [o,f,l]=await Promise.all([
      fetch(`/api/clients/${id}/overview`,{cache:"no-store"}),
      fetch(`/api/clients/${id}/features`,{cache:"no-store"}),
      fetch(`/api/clients/${id}/links`,{cache:"no-store"}),
    ]);
    if([o,f,l].some(response=>response.status===401)){window.location.assign("/login");return}
    if([o,f,l].some(response=>response.status===403)){window.location.assign("/workspace");return}
    if(!o.ok||!f.ok||!l.ok)throw new Error("تعذّر تحميل إعدادات العميل");
    setOverview(await o.json());setFeatures((await f.json()).features||[]);setSlug((await l.json()).slug||null);setLoaded(true);
  },[id]);
  useEffect(()=>{load().catch(e=>{setError(e.message);setLoaded(true)})},[load]);
  const enabled=(key:string)=>features.some(f=>f.key===key&&f.enabled&&(!f.expires_at||new Date(f.expires_at).getTime()>Date.now()));
  async function toggle(key:string){
    const f=features.find(item=>item.key===key);if(!f)return;
    setSaving(key);setError("");
    try{
      const response=await fetch(`/api/clients/${id}/features`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({feature_id:f.id,enabled:!enabled(key),expires_at:null})});
      if(!response.ok)throw new Error("تعذّر حفظ التفعيل");
      await load();
    }catch(e){setError(e instanceof Error?e.message:"تعذّر الحفظ")}finally{setSaving(null)}
  }
  async function copy(path:string,label:string){await navigator.clipboard.writeText(`${window.location.origin}${path}`);setCopied(label);window.setTimeout(()=>setCopied(""),2000)}
  const switchButton=(key:string,locked=false)=><button type="button" role="switch" aria-label={`Toggle ${key}`} aria-checked={enabled(key)} disabled={saving!==null||locked} onClick={()=>toggle(key)} className={`rounded-full px-4 py-2 text-sm font-bold disabled:opacity-40 ${enabled(key)?"bg-emerald-500/20 text-emerald-300":"bg-slate-800 text-slate-400"}`}>{saving===key?"…":enabled(key)?"ON":"OFF"}</button>;
  return <div className="min-h-screen bg-slate-950 text-white"><Sidebar/><div className="min-h-screen lg:ml-64"><DashboardHeader/><main className="mx-auto max-w-5xl space-y-6 p-5 md:p-8">
    <header><p className="text-xs font-bold uppercase tracking-widest text-cyan-300">AVERO ADMIN · Client</p><h1 className="mt-2 text-3xl font-black">{overview?.company.name||"Client"}</h1><p className="mt-2 text-slate-400">فعّل التطبيقات التي اشترك بها العميل، ثم اختَر وكلاء AI واحدًا واحدًا.</p></header>
    {error&&<p role="alert" className="rounded-xl border border-rose-700 bg-rose-900/20 p-4 text-rose-200">{error}</p>}
    {!loaded?<p className="text-slate-400">Loading…</p>:!overview?<p className="text-slate-400">بيانات العميل غير متاحة حاليًا.</p>:<>
      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"><h2 className="text-xl font-bold">التطبيقات الأساسية · Apps</h2><p className="mt-1 text-sm text-slate-400">مركز التحكم والحساب موجودان دائمًا.</p><div className="mt-4 divide-y divide-slate-800">{apps.map(app=><div key={app.key} className="flex items-center justify-between gap-4 py-4"><div><h3 className="font-bold">{app.name}</h3><p className="mt-1 text-sm text-slate-400">{app.detail}</p></div>{switchButton(app.key)}</div>)}</div></section>
      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"><h2 className="text-xl font-bold">AI Agents · الوكلاء</h2><p className="mt-1 text-sm text-slate-400">فعّل Intelligence أولًا. الوكلاء قيد التطوير لا تفتح لهم شاشات غير جاهزة.</p><div className="mt-4 divide-y divide-slate-800">{agents.map(agent=><div key={agent.key} className="flex items-center justify-between gap-4 py-4"><div><h3 className="font-bold">{agent.name}</h3><p className="text-sm text-slate-400">{agent.detail}</p></div>{switchButton(agent.key,!enabled("app_intelligence")||!agent.ready)}</div>)}</div></section>
      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"><h2 className="text-xl font-bold">روابط العميل · Links</h2><p className="mt-1 text-sm text-slate-400">رابط الدخول واحد؛ كل مستخدم يدخل بحسابه ويرى شركته فقط. رابط المنيو يخص هذه الشركة.</p><div className="mt-4 space-y-3">{[["تسجيل الدخول","/login"],["مساحة الشركة","/workspace"],...(slug?[["منيو الزبائن",`/go/${slug}`]]:[])].map(([label,path])=><div key={label} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 p-3"><div><span className="block font-bold">{label}</span><span className="break-all text-xs text-slate-400">{origin}{path}</span></div><button type="button" onClick={()=>copy(path,label).catch(()=>setError("تعذّر نسخ الرابط"))} className="rounded-lg border border-cyan-500/40 px-3 py-2 text-sm text-cyan-300">{copied===label?"تم النسخ ✓":"نسخ الرابط"}</button></div>)}</div>{slug&&!enabled("app_go")&&<p className="mt-3 text-sm text-amber-300">رابط المنيو لا يستقبل طلبات ما دام GO غير مفعّل.</p>}</section>
      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"><h2 className="text-xl font-bold">الحساب والاشتراك</h2><p className="mt-3 text-slate-300">الخطة: {overview?.subscription?.subscription_plans?.name||"لم تحدد"} · الحالة: {overview?.subscription?.status||"—"}</p><p className="mt-2 text-sm text-slate-400">{overview?.users.length||0} مستخدمين · صلاحيات الموظفين التفصيلية داخل إعدادات الشركة.</p></section>
    </>}
  </main></div></div>;
}
