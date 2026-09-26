"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Sidebar from "@/app/components/Sidebar";
import DashboardHeader from "@/app/components/DashboardHeader";
import { useLanguage } from "@/app/components/LanguageProvider";

type Feature = { id:string; key:string; enabled:boolean; expires_at:string|null };
type Overview = { company:{name:string}; users:{user_id:string;email?:string;role:string;online?:boolean}[]; subscription:{status:string;subscription_plans?:{name:string}}|null };
const apps = [
  {key:"app_manager",name:"Manager",nameAr:"المدير",detail:"Visible only when King enables it for this company",detailAr:"تظهر فقط عند تفعيلها من لوحة King"},
  {key:"app_sell",name:"AVERO SELL",nameAr:"AVERO SELL",detail:"Cashier, products, customers and sales",detailAr:"الكاشير، الأصناف، العملاء والمبيعات"},
  {key:"app_operations",name:"ERP modules",nameAr:"أقسام ERP",detail:"Inventory, purchasing, production and accounting",detailAr:"المخزون، المشتريات، الإنتاج والمحاسبة"},
  {key:"app_go",name:"AVERO GO",nameAr:"AVERO GO",detail:"Customer menu and pickup orders (requires SELL)",detailAr:"منيو الزبائن وطلبات الاستلام (يحتاج SELL)"},
  {key:"app_intelligence",name:"AVERO Intelligence",nameAr:"ذكاء AVERO",detail:"Enable subscribed agents individually",detailAr:"تفعيل الوكلاء المشترك بهم فقط"},
] as const;
const agents = [
  {key:"ai_sales",name:"LEO",detail:"Sales · Available",detailAr:"مبيعات · متاح",ready:true},
  {key:"ai_marketing",name:"FOXY",detail:"Marketing · Available",detailAr:"تسويق · متاح",ready:true},
  {key:"ai_hr",name:"VEXA",detail:"HR · In development",detailAr:"موارد بشرية · قيد التطوير",ready:false},
  {key:"ai_inventory",name:"GORE",detail:"Inventory · In development",detailAr:"مخزون · قيد التطوير",ready:false},
  {key:"ai_support",name:"AREO",detail:"Operations · In development",detailAr:"عمليات · قيد التطوير",ready:false},
] as const;

export default function ClientAccessPage(){
  const {language}=useLanguage();const L=(en:string,ar:string)=>language==="ar"?ar:en;
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
  const [newEmail,setNewEmail]=useState("");
  const [addingUser,setAddingUser]=useState(false);
  useEffect(()=>setOrigin(window.location.origin),[]);
  const load=useCallback(async()=>{
    const [o,f,l]=await Promise.all([
      fetch(`/api/clients/${id}/overview`,{cache:"no-store"}),
      fetch(`/api/clients/${id}/features`,{cache:"no-store"}),
      fetch(`/api/clients/${id}/links`,{cache:"no-store"}),
    ]);
    if([o,f,l].some(response=>response.status===401)){window.location.assign("/login");return}
    if([o,f,l].some(response=>response.status===403)){window.location.assign("/workspace");return}
    if(!o.ok||!f.ok||!l.ok)throw new Error("Could not load client settings");
    setOverview(await o.json());setFeatures((await f.json()).features||[]);const linkData=await l.json();setSlug(linkData.slug||null);setMenuPublished(Boolean(linkData.menu_enabled));setLoaded(true);
  },[id]);
  useEffect(()=>{load().catch(e=>{setError(e.message);setLoaded(true)})},[load]);
  useEffect(()=>{if(!loaded)return;const timer=window.setInterval(()=>load().catch(()=>undefined),30000);return()=>window.clearInterval(timer)},[load,loaded]);
  const enabled=(key:string)=>features.some(f=>f.key===key&&f.enabled&&(!f.expires_at||new Date(f.expires_at).getTime()>Date.now()));
  async function toggle(key:string){
    const f=features.find(item=>item.key===key);if(!f)return;
    setSaving(key);setError("");
    try{
      const response=await fetch(`/api/clients/${id}/features`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({feature_id:f.id,enabled:!enabled(key),expires_at:null})});
      if(!response.ok)throw new Error("Could not save activation");
      await load();
    }catch(e){setError(e instanceof Error?e.message:L("Could not save","تعذّر الحفظ"))}finally{setSaving(null)}
  }
  async function copy(path:string,label:string){await navigator.clipboard.writeText(`${window.location.origin}${path}`);setCopied(label);window.setTimeout(()=>setCopied(""),2000)}
  async function addUser(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();setAddingUser(true);setError("");
    try{
      const response=await fetch(`/api/clients/${id}/users`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:newEmail})});
      const body=await response.json();if(!response.ok)throw new Error(body.error||L("Could not add user","تعذّر إضافة المستخدم"));
      setNewEmail("");await load();
    }catch(e){setError(e instanceof Error?e.message:L("Could not add user","تعذّر إضافة المستخدم"))}finally{setAddingUser(false)}
  }
  const clientLinks=[
    {label:L("Company dashboard","لوحة الشركة"),path:`/workspace/${slug||id}`,key:null},
    ...(slug?[{label:L("Customer QR menu","منيو الزبائن والـQR"),path:`/go/${slug}`,key:"app_go"}]:[]),
    {label:L("Cashier","الكاشير"),path:"/pos?area=cashier",key:"app_sell"},
    {label:L("Sign in","تسجيل الدخول"),path:"/login",key:null},
    {label:L("Profile","الملف الشخصي"),path:"/profile",key:null},
    {label:L("Add Items","إضافة الأصناف"),path:"/pos?area=add-items",key:"app_sell"},
    {label:L("Inventory","المخزون"),path:"/operations?area=inventory",key:"app_operations"},
    {label:L("Purchasing","المشتريات"),path:enabled("app_operations")?"/operations?area=purchasing":"/pos?area=purchasing",key:enabled("app_operations")?"app_operations":"app_sell"},
    {label:L("Production","الإنتاج"),path:"/operations?area=production",key:"app_operations"},
    {label:L("Accounting","المحاسبة"),path:"/operations?area=accounting",key:"app_operations"},
    {label:L("Manager","المدير"),path:"/manager-monitoring",key:"app_manager"},
    {label:"CRM",path:"/crm",key:"crm"},
    {label:L("GO menu management","إدارة منيو GO"),path:"/go",key:"app_go"},
    {label:L("AI Agents","وكلاء AI"),path:"/ai-agents",key:"app_intelligence"},
    {label:"LEO",path:"/ai-sales",key:"ai_sales"},
    {label:"FOXY",path:"/ai-marketing",key:"ai_marketing"},
  ];
  const linkActive=(key:string|null)=>!key||(enabled(key)&&(!["app_go","crm"].includes(key)||enabled("app_sell"))&&(!key.startsWith("ai_")||enabled("app_intelligence")));
  const switchButton=(key:string,locked=false)=><button type="button" role="switch" aria-label={`Toggle ${key}`} aria-checked={enabled(key)} disabled={saving!==null||locked} onClick={()=>toggle(key)} className={`rounded-full px-4 py-2 text-sm font-bold disabled:opacity-40 ${enabled(key)?"bg-emerald-500/20 text-emerald-300":"bg-slate-800 text-slate-400"}`}>{saving===key?"…":enabled(key)?"ON":"OFF"}</button>;
  return <div className="min-h-screen bg-slate-950 text-white"><Sidebar/><div className="min-h-screen lg:ml-64"><DashboardHeader/><main className="mx-auto max-w-5xl space-y-6 p-5 md:p-8">
    <header><a href="/clients" className="text-sm text-cyan-300 hover:underline">← {L("All clients","كل العملاء")}</a><p className="mt-3 text-xs font-bold uppercase tracking-widest text-cyan-300">AVERO ADMIN · Client</p><h1 className="mt-2 text-3xl font-black">{overview?.company.name||"Client"}</h1>{overview?.users.filter(u=>u.role==="super_admin").map(u=><p key={u.user_id} className="mt-1 text-sm text-cyan-300">Super Admin · {u.email}</p>)}<p className="mt-2 text-slate-400">{L("Enable the subscribed apps, then select AI agents individually.","فعّل التطبيقات التي اشترك بها العميل، ثم اختَر وكلاء AI واحدًا واحدًا.")}</p><a href="#client-links" className="mt-4 inline-flex rounded-xl bg-cyan-600 px-5 py-3 font-bold text-white">{L("View company and menu links ↓","عرض روابط الشركة والمنيو والـPOS ↓")}</a></header>
    {error&&<p role="alert" className="rounded-xl border border-rose-700 bg-rose-900/20 p-4 text-rose-200">{error}</p>}
    {!loaded?<p className="text-slate-400">Loading…</p>:!overview?<p className="text-slate-400">{L("Client details are currently unavailable.","بيانات العميل غير متاحة حاليًا.")}</p>:<>
      <section id="client-links" className="scroll-mt-6 rounded-2xl border border-cyan-500/50 bg-slate-900/70 p-5">
        <h2 className="text-xl font-bold">{L("Company links · King only","روابط الشركة والخدمات · للـKing فقط")}</h2>
        <p className="mt-1 text-sm text-slate-400">{L("Only King can see these links. Copy and share selected links; inactive apps remain inaccessible to clients.","الروابط معروضة هون عندك فقط. تنسخ وتشارك ما تختاره؛ العميل ما بيشوف قائمة الروابط. التطبيق المطفّي ما بيظهر له حتى لو معه الرابط.")}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">{clientLinks.map(({label,path,key})=><div key={label} className="rounded-xl border border-slate-800 p-3">
          <div className="flex items-center justify-between gap-2"><strong className="text-sm">{label}</strong><span className={`text-xs ${!linkActive(key)?"text-slate-500":"text-emerald-300"}`}>{!key?L("Essential","أساسي"):linkActive(key)?L("Active","مفعّل"):L("Inactive","غير مفعّل")}</span></div>
          <p className="mt-2 break-all text-xs text-slate-400">{origin}{path}</p>
          <button type="button" onClick={()=>copy(path,label).catch(()=>setError(L("Could not copy link","تعذّر نسخ الرابط")))} className="mt-3 rounded-lg border border-cyan-500/40 px-3 py-2 text-sm text-cyan-300">{copied===label?L("Copied ✓","تم النسخ ✓"):L("Copy link","نسخ الرابط")}</button>
        </div>)}</div>
        {slug&&(!menuPublished||!enabled("app_go"))&&<p className="mt-3 text-sm text-amber-300">{L("Customer ordering requires GO, a branch, products and a published menu.","منيو الزبائن غير جاهز للطلبات؛ لازم GO والفرع والأصناف ونشر المنيو.")}</p>}
      </section>
      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"><h2 className="text-xl font-bold">{L("Applications","التطبيقات الأساسية")}</h2><p className="mt-1 text-sm text-slate-400">{L("Clients see only enabled applications.","كل تطبيق يظهر للعميل عند تفعيله فقط.")}</p><div className="mt-4 divide-y divide-slate-800">{apps.map(app=><div key={app.key} className="flex items-center justify-between gap-4 py-4"><div><h3 className="font-bold">{L(app.name,app.nameAr)}</h3><p className="mt-1 text-sm text-slate-400">{L(app.detail,app.detailAr)}</p></div>{switchButton(app.key)}</div>)}</div></section>
      <section id="client-users" className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"><h2 className="text-xl font-bold">{L("Client users · King only","مستخدمو العميل · للـKing فقط")}</h2><p className="mt-2 text-sm text-slate-400">{L("Add an email to invite a user. Permissions start empty and are assigned in Settings → Users & permissions.","أضف البريد؛ تصله دعوة تسجيل الدخول. الصلاحيات تبدأ فارغة، ويحددها Super Admin العميل في Settings ← المستخدمون والصلاحيات.")}</p><form onSubmit={addUser} className="mt-4 flex flex-wrap gap-2"><input type="email" required value={newEmail} onChange={e=>setNewEmail(e.target.value)} placeholder="user@example.com" className="min-w-60 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3"/><button disabled={addingUser} className="rounded-xl bg-cyan-500 px-4 py-3 font-bold text-slate-950 disabled:opacity-50">{addingUser?L("Adding…","جارٍ الإضافة…"):L("Add new user","إضافة مستخدم")}</button></form><div className="mt-4 divide-y divide-slate-800">{overview.users.map(u=><div key={u.user_id} className="flex flex-wrap items-center justify-between gap-2 py-3"><div className="flex items-center gap-3"><span className={`h-2.5 w-2.5 rounded-full ${u.online?"bg-emerald-400 animate-pulse":"bg-slate-600"}`}/><span className="text-sm">{u.email||u.user_id} <small className="text-slate-400">· {u.role}</small></span><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${u.online?"bg-emerald-500/15 text-emerald-300":"bg-slate-800 text-slate-400"}`}>{u.online?L("Online","أونلاين"):L("Offline","أوفلاين")}</span></div><div className="flex flex-wrap gap-2"><button onClick={()=>copy(`/workspace/${slug||id}`,u.user_id).catch(()=>setError(L("Could not copy link","تعذّر نسخ الرابط")))} className="rounded-lg border border-cyan-500/40 px-3 py-2 text-xs text-cyan-300">{copied===u.user_id?L("Copied ✓","تم النسخ ✓"):L("Copy sign-in link","نسخ رابط الدخول")}</button></div></div>)}</div></section>
      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"><h2 className="text-xl font-bold">{L("AI Agents","وكلاء الذكاء الاصطناعي")}</h2><p className="mt-1 text-sm text-slate-400">{L("Enable Intelligence first. Agents in development cannot be activated.","فعّل Intelligence أولًا. الوكلاء قيد التطوير لا تفتح لهم شاشات غير جاهزة.")}</p><div className="mt-4 divide-y divide-slate-800">{agents.map(agent=><div key={agent.key} className="flex items-center justify-between gap-4 py-4"><div><h3 className="font-bold">{agent.name}</h3><p className="text-sm text-slate-400">{L(agent.detail,agent.detailAr)}</p></div>{switchButton(agent.key,!enabled("app_intelligence")||!agent.ready)}</div>)}</div></section>
      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"><h2 className="text-xl font-bold">{L("Account & subscription","الحساب والاشتراك")}</h2><p className="mt-3 text-slate-300">{L("Plan","الخطة")}: {overview?.subscription?.subscription_plans?.name||L("Not set","لم تحدد")} · {L("Status","الحالة")}: {overview?.subscription?.status||"—"}</p><p className="mt-2 text-sm text-slate-400">{overview?.users.length||0} {L("users · Apps and agents can be enabled by King only.","مستخدمين · تفعيل التطبيقات والوكلاء من لوحة الـKing فقط.")}</p></section>
    </>}
  </main></div></div>;
}
