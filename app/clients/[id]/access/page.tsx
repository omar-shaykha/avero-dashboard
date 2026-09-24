"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Sidebar from "@/app/components/Sidebar";
import DashboardHeader from "@/app/components/DashboardHeader";

type Feature = { id:string; key:string; enabled:boolean; expires_at:string|null };
type Overview = { company:{name:string}; users:{user_id:string;email?:string;role:string}[]; subscription:{status:string;subscription_plans?:{name:string}}|null };
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
  const [menuPublished,setMenuPublished]=useState(false);
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
    setOverview(await o.json());setFeatures((await f.json()).features||[]);const linkData=await l.json();setSlug(linkData.slug||null);setMenuPublished(Boolean(linkData.menu_enabled));setLoaded(true);
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
  const clientLinks=[
    {label:"لوحة الشركة · Dashboard",path:`/workspace/${slug||id}`,key:null},
    {label:"الدخول · Login",path:"/login",key:null},
    {label:"الملف الشخصي",path:"/profile",key:null},
    {label:"الكاشير · POS",path:"/pos?area=cashier",key:"app_sell"},
    {label:"الأصناف · Add Items",path:"/pos?area=add-items",key:"app_sell"},
    {label:"مشتريات POS",path:"/pos?area=purchasing",key:"app_sell"},
    {label:"العمليات · ERP",path:"/operations",key:"app_operations"},
    {label:"المخزون",path:"/operations?area=inventory",key:"app_operations"},
    {label:"مشتريات ERP",path:"/operations?area=purchasing",key:"app_operations"},
    {label:"الإنتاج",path:"/operations?area=production",key:"app_operations"},
    {label:"المحاسبة",path:"/operations?area=accounting",key:"app_operations"},
    {label:"تقارير المدير",path:"/manager-monitoring",key:"app_operations"},
    {label:"CRM",path:"/crm",key:"crm"},
    {label:"إدارة المنيو · GO",path:"/go",key:"app_go"},
    ...(slug?[{label:"منيو الزبائن · Public menu",path:`/go/${slug}`,key:"app_go"}]:[]),
    {label:"وكلاء AI",path:"/ai-agents",key:"app_intelligence"},
    {label:"LEO",path:"/ai-sales",key:"ai_sales"},
    {label:"FOXY",path:"/ai-marketing",key:"ai_marketing"},
  ];
  const linkActive=(key:string|null)=>!key||(enabled(key)&&(!["app_go","crm"].includes(key)||enabled("app_sell"))&&(!key.startsWith("ai_")||enabled("app_intelligence")));
  const switchButton=(key:string,locked=false)=><button type="button" role="switch" aria-label={`Toggle ${key}`} aria-checked={enabled(key)} disabled={saving!==null||locked} onClick={()=>toggle(key)} className={`rounded-full px-4 py-2 text-sm font-bold disabled:opacity-40 ${enabled(key)?"bg-emerald-500/20 text-emerald-300":"bg-slate-800 text-slate-400"}`}>{saving===key?"…":enabled(key)?"ON":"OFF"}</button>;
  return <div className="min-h-screen bg-slate-950 text-white"><Sidebar/><div className="min-h-screen lg:ml-64"><DashboardHeader/><main className="mx-auto max-w-5xl space-y-6 p-5 md:p-8">
    <header><p className="text-xs font-bold uppercase tracking-widest text-cyan-300">AVERO ADMIN · Client</p><h1 className="mt-2 text-3xl font-black">{overview?.company.name||"Client"}</h1>{overview?.users.filter(u=>u.role==="super_admin").map(u=><p key={u.user_id} className="mt-1 text-sm text-cyan-300">Super Admin · {u.email}</p>)}<p className="mt-2 text-slate-400">فعّل التطبيقات التي اشترك بها العميل، ثم اختَر وكلاء AI واحدًا واحدًا.</p></header>
    {error&&<p role="alert" className="rounded-xl border border-rose-700 bg-rose-900/20 p-4 text-rose-200">{error}</p>}
    {!loaded?<p className="text-slate-400">Loading…</p>:!overview?<p className="text-slate-400">بيانات العميل غير متاحة حاليًا.</p>:<>
      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"><h2 className="text-xl font-bold">التطبيقات الأساسية · Apps</h2><p className="mt-1 text-sm text-slate-400">مركز التحكم والحساب موجودان دائمًا.</p><div className="mt-4 divide-y divide-slate-800">{apps.map(app=><div key={app.key} className="flex items-center justify-between gap-4 py-4"><div><h3 className="font-bold">{app.name}</h3><p className="mt-1 text-sm text-slate-400">{app.detail}</p></div>{switchButton(app.key)}</div>)}</div></section>
      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"><h2 className="text-xl font-bold">AI Agents · الوكلاء</h2><p className="mt-1 text-sm text-slate-400">فعّل Intelligence أولًا. الوكلاء قيد التطوير لا تفتح لهم شاشات غير جاهزة.</p><div className="mt-4 divide-y divide-slate-800">{agents.map(agent=><div key={agent.key} className="flex items-center justify-between gap-4 py-4"><div><h3 className="font-bold">{agent.name}</h3><p className="text-sm text-slate-400">{agent.detail}</p></div>{switchButton(agent.key,!enabled("app_intelligence")||!agent.ready)}</div>)}</div></section>
      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
        <h2 className="text-xl font-bold">روابط العميل · King only</h2>
        <p className="mt-1 text-sm text-slate-400">الروابط معروضة هون عندك فقط. تنسخ وتشارك ما تختاره؛ العميل ما بيشوف قائمة الروابط. التطبيق المطفّي ما بيظهر له حتى لو معه الرابط.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">{clientLinks.map(({label,path,key})=><div key={label} className="rounded-xl border border-slate-800 p-3">
          <div className="flex items-center justify-between gap-2"><strong className="text-sm">{label}</strong><span className={`text-xs ${!linkActive(key)?"text-slate-500":"text-emerald-300"}`}>{!key?"أساسي":linkActive(key)?"مفعّل":"غير مفعّل"}</span></div>
          <p className="mt-2 break-all text-xs text-slate-400">{origin}{path}</p>
          <button type="button" onClick={()=>copy(path,label).catch(()=>setError("تعذّر نسخ الرابط"))} className="mt-3 rounded-lg border border-cyan-500/40 px-3 py-2 text-sm text-cyan-300">{copied===label?"تم النسخ ✓":"نسخ الرابط"}</button>
        </div>)}</div>
        {slug&&(!menuPublished||!enabled("app_go"))&&<p className="mt-3 text-sm text-amber-300">منيو الزبائن غير جاهز للطلبات؛ لازم GO والفرع والأصناف ونشر المنيو.</p>}
      </section>
      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"><h2 className="text-xl font-bold">الحساب والاشتراك</h2><p className="mt-3 text-slate-300">الخطة: {overview?.subscription?.subscription_plans?.name||"لم تحدد"} · الحالة: {overview?.subscription?.status||"—"}</p><p className="mt-2 text-sm text-slate-400">{overview?.users.length||0} مستخدمين · تفعيل التطبيقات والوكلاء من لوحة الـKing فقط.</p></section>
    </>}
  </main></div></div>;
}
