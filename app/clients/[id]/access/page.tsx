"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Sidebar from "@/app/components/Sidebar";
import DashboardHeader from "@/app/components/DashboardHeader";
import { useLanguage } from "@/app/components/LanguageProvider";

type Feature = { id:string; key:string; enabled:boolean; expires_at:string|null };
type Overview = { company:{name:string}; users:{user_id:string;email?:string;role:string;online?:boolean}[]; subscription:{status:string;subscription_plans?:{name:string}}|null };
const apps = [
  {key:"app_sell",name:"POS",nameAr:"POS",detail:"Cashier / POS · Manager monitoring · Branches · Reservations / Orders · Customers / CRM · Kitchen / KDS · Reports",detailAr:"الكاشير / POS · مراقبة المدير · الفروع · الحجوزات والطلبات · العملاء / CRM · المطبخ / KDS · التقارير"},
  {key:"app_accounting",name:"Accounting",nameAr:"المحاسبة",detail:"Sales & revenue · Expenses · Invoices · AR/AP · Cash & bank · Ledger · P&L · VAT · Financial reports",detailAr:"المبيعات والإيرادات · المصروفات · الفواتير · الذمم · النقد والبنوك · الأستاذ العام · الأرباح والخسائر · الضريبة · التقارير المالية"},
  {key:"app_stock",name:"Stock Management",nameAr:"إدارة المخزون",detail:"Item master · Receiving · Issue · Transfer · Adjustment · Count · Warehouses · Reorder · Batch & expiry · Waste · Valuation",detailAr:"دليل الأصناف · الاستلام · الصرف · التحويل · التسوية · الجرد · المستودعات · إعادة الطلب · التشغيلة والصلاحية · الهدر · التقييم"},
  {key:"app_hr",name:"HR & Employees",nameAr:"الموارد البشرية والموظفون",detail:"Employees · Attendance · Shifts · Leave · Payroll · Contracts · Performance · Recruitment · HR reports",detailAr:"الموظفون · الحضور · الورديات · الإجازات · الرواتب · العقود · الأداء · التوظيف · تقارير الموارد البشرية"},
  {key:"app_loyalty",name:"Loyalty & Promotions",nameAr:"الولاء والعروض",detail:"Points · Rewards · Membership · Wallet · Coupons · Discounts · Gift cards · Cashback · Referrals · Promotion reports",detailAr:"النقاط · المكافآت · العضويات · المحفظة · الكوبونات · الخصومات · بطاقات الهدايا · الاسترداد النقدي · الإحالات · تقارير العروض"},
  {key:"app_go",name:"Online Ordering",nameAr:"الطلب أونلاين",detail:"Online store · Digital menu · Cart · Checkout · Pickup · Delivery · Payments · Order tracking · Notifications",detailAr:"المتجر الإلكتروني · المنيو الرقمي · السلة · الدفع · الاستلام · التوصيل · المدفوعات · تتبع الطلب · الإشعارات"},
  {key:"app_intelligence",name:"AI & Automation",nameAr:"الذكاء الاصطناعي والأتمتة",detail:"AI agents · Sales · Marketing · Support · WhatsApp · Social media · Replies · Workflows · Reports · Insights",detailAr:"وكلاء AI · المبيعات · التسويق · الدعم · واتساب · السوشال ميديا · الردود · سير العمل · التقارير · التحليلات"},
  {key:"app_zatca",name:"ZATCA Fatoora",nameAr:"فاتورة ZATCA",detail:"E-Invoicing · Tax invoices · QR · XML · UUID · Validation · Clearance · Reporting · Archive",detailAr:"الفوترة الإلكترونية · الفواتير الضريبية · QR · XML · UUID · التحقق · التخليص · الإبلاغ · الأرشفة"},
] as const;
const agents = [
  {key:"ai_sales",name:"ZAYN",detail:"Sales Director",detailAr:"مدير المبيعات",ready:true},
  {key:"ai_marketing",name:"NAYA",detail:"Marketing Director",detailAr:"مديرة التسويق",ready:true},
  {key:"ai_customer_care",name:"ELI",detail:"Community Manager",detailAr:"مدير المجتمع",ready:true},
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
  const [applyingPreset,setApplyingPreset]=useState(false);
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
  async function applyPreset(preset:string,label:string){
    if(!window.confirm(L(`Apply ${label}? This replaces the current business-app selection for this client.`,`تطبيق ${label}؟ سيتم استبدال اختيار تطبيقات الأعمال الحالي لهذا العميل.`)))return;
    setApplyingPreset(true);setError("");
    try{const response=await fetch(`/api/clients/${id}/features/preset`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({preset})});const body=await response.json();if(!response.ok)throw new Error(body.error||L("Could not apply preset","تعذّر تطبيق الباقة"));await load();}
    catch(e){setError(e instanceof Error?e.message:L("Could not apply preset","تعذّر تطبيق الباقة"))}finally{setApplyingPreset(false)}
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
  const clientLinks=[{label:L("Client sign in","تسجيل دخول العميل"),path:"/login",key:null}];
  const linkActive=(_key:string|null)=>true;
  const switchButton=(key:string,locked=false)=><button type="button" role="switch" aria-label={`Toggle ${key}`} aria-checked={enabled(key)} disabled={saving!==null||locked} onClick={()=>toggle(key)} className={`rounded-full px-4 py-2 text-sm font-bold disabled:opacity-40 ${enabled(key)?"bg-emerald-500/20 text-emerald-300":"bg-slate-800 text-slate-400"}`}>{saving===key?"…":enabled(key)?"ON":"OFF"}</button>;
  return <div className="min-h-screen bg-slate-950 text-white"><Sidebar/><div className="min-h-screen lg:ml-64"><DashboardHeader/><main className="mx-auto max-w-5xl space-y-6 p-5 md:p-8">
    <header><a href="/clients" className="text-sm text-cyan-300 hover:underline">← {L("All clients","كل العملاء")}</a><p className="mt-3 text-xs font-bold uppercase tracking-widest text-cyan-300">AVERO ADMIN · Client</p><h1 className="mt-2 text-3xl font-black">{overview?.company.name||"Client"}</h1>{overview?.users.filter(u=>u.role==="super_admin").map(u=><p key={u.user_id} className="mt-1 text-sm text-cyan-300">Super Admin · {u.email}</p>)}<p className="mt-2 text-slate-400">{L("Enable the subscribed apps, then select AI agents individually.","فعّل التطبيقات التي اشترك بها العميل، ثم اختَر وكلاء AI واحدًا واحدًا.")}</p><a href="#client-links" className="mt-4 inline-flex rounded-xl bg-cyan-600 px-5 py-3 font-bold text-white">{L("Client sign-in link ↓","رابط تسجيل دخول العميل ↓")}</a></header>
    {error&&<p role="alert" className="rounded-xl border border-rose-700 bg-rose-900/20 p-4 text-rose-200">{error}</p>}
    {!loaded?<p className="text-slate-400">Loading…</p>:!overview?<p className="text-slate-400">{L("Client details are currently unavailable.","بيانات العميل غير متاحة حاليًا.")}</p>:<>
      <section id="client-links" className="scroll-mt-6 rounded-2xl border border-cyan-500/50 bg-slate-900/70 p-5">
        <h2 className="text-xl font-bold">{L("Client login · King only","تسجيل دخول العميل · للـKing فقط")}</h2>
        <p className="mt-1 text-sm text-slate-400">{L("Use one main login URL for every client. Access after sign-in is controlled by subscriptions and permissions.","استخدم رابط تسجيل دخول واحد لكل العملاء. التطبيقات التي تظهر بعد الدخول يحددها الاشتراك والصلاحيات.")}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">{clientLinks.map(({label,path,key})=><div key={label} className="rounded-xl border border-slate-800 p-3">
          <div className="flex items-center justify-between gap-2"><strong className="text-sm">{label}</strong><span className={`text-xs ${!linkActive(key)?"text-slate-500":"text-emerald-300"}`}>{!key?L("Essential","أساسي"):linkActive(key)?L("Active","مفعّل"):L("Inactive","غير مفعّل")}</span></div>
          <p className="mt-2 break-all text-xs text-slate-400">{origin}{path}</p>
          <button type="button" onClick={()=>copy(path,label).catch(()=>setError(L("Could not copy link","تعذّر نسخ الرابط")))} className="mt-3 rounded-lg border border-cyan-500/40 px-3 py-2 text-sm text-cyan-300">{copied===label?L("Copied ✓","تم النسخ ✓"):L("Copy link","نسخ الرابط")}</button>
        </div>)}</div>
        
      </section>
      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-xl font-bold">{L("Business Applications","تطبيقات الأعمال")}</h2><p className="mt-1 text-sm text-slate-400">{L("Turn on only what the customer subscribed to. Everything else stays hidden.","فعّل فقط التطبيقات التي اشترك بها العميل. كل ما هو غير مفعّل يبقى مخفيًا عنه.")}</p></div><div className="flex flex-wrap gap-2">{[["pos_only","POS Only","POS فقط"],["pos_stock","POS + Stock","POS + مخزون"],["erp","ERP","ERP"],["full","Full Suite","الباقة الكاملة"]].map(([key,en,ar])=><button key={key} type="button" disabled={applyingPreset||saving!==null} onClick={()=>applyPreset(key,L(en,ar))} className="rounded-xl border border-cyan-400/40 bg-cyan-400/10 px-3 py-2 text-xs font-bold text-cyan-200 disabled:opacity-40">{L(en,ar)}</button>)}</div></div><div className="mt-4 divide-y divide-slate-800">{apps.map(app=><div key={app.key} className="flex items-center justify-between gap-4 py-4"><div><h3 className="font-bold">{L(app.name,app.nameAr)}</h3><p className="mt-1 text-sm text-slate-400">{L(app.detail,app.detailAr)}</p></div>{switchButton(app.key)}</div>)}</div></section>
      <section id="client-users" className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"><h2 className="text-xl font-bold">{L("Client users · King only","مستخدمو العميل · للـKing فقط")}</h2><p className="mt-2 text-sm text-slate-400">{L("Add an email to invite a user. Permissions start empty and are assigned in Settings → Users & permissions.","أضف البريد؛ تصله دعوة تسجيل الدخول. الصلاحيات تبدأ فارغة، ويحددها Super Admin العميل في Settings ← المستخدمون والصلاحيات.")}</p><form onSubmit={addUser} className="mt-4 flex flex-wrap gap-2"><input type="email" required value={newEmail} onChange={e=>setNewEmail(e.target.value)} placeholder="user@example.com" className="min-w-60 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3"/><button disabled={addingUser} className="rounded-xl bg-cyan-500 px-4 py-3 font-bold text-slate-950 disabled:opacity-50">{addingUser?L("Adding…","جارٍ الإضافة…"):L("Add new user","إضافة مستخدم")}</button></form><div className="mt-4 divide-y divide-slate-800">{overview.users.map(u=><div key={u.user_id} className="flex flex-wrap items-center justify-between gap-2 py-3"><div className="flex items-center gap-3"><span className={`h-2.5 w-2.5 rounded-full ${u.online?"bg-emerald-400 animate-pulse":"bg-slate-600"}`}/><span className="text-sm">{u.email||u.user_id} <small className="text-slate-400">· {u.role}</small></span><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${u.online?"bg-emerald-500/15 text-emerald-300":"bg-slate-800 text-slate-400"}`}>{u.online?L("Online","أونلاين"):L("Offline","أوفلاين")}</span></div><div className="flex flex-wrap gap-2"><button onClick={()=>copy(`/login`,u.user_id).catch(()=>setError(L("Could not copy link","تعذّر نسخ الرابط")))} className="rounded-lg border border-cyan-500/40 px-3 py-2 text-xs text-cyan-300">{copied===u.user_id?L("Copied ✓","تم النسخ ✓"):L("Copy sign-in link","نسخ رابط الدخول")}</button></div></div>)}</div></section>
      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"><h2 className="text-xl font-bold">{L("AI Agents","وكلاء الذكاء الاصطناعي")}</h2><p className="mt-1 text-sm text-slate-400">{L("Enable Intelligence first. Agents in development cannot be activated.","فعّل Intelligence أولًا. الوكلاء قيد التطوير لا تفتح لهم شاشات غير جاهزة.")}</p><div className="mt-4 divide-y divide-slate-800">{agents.map(agent=><div key={agent.key} className="flex items-center justify-between gap-4 py-4"><div><h3 className="font-bold">{agent.name}</h3><p className="text-sm text-slate-400">{L(agent.detail,agent.detailAr)}</p></div>{switchButton(agent.key,!enabled("app_intelligence")||!agent.ready)}</div>)}</div></section>
      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"><h2 className="text-xl font-bold">{L("Account & subscription","الحساب والاشتراك")}</h2><p className="mt-3 text-slate-300">{L("Plan","الخطة")}: {overview?.subscription?.subscription_plans?.name||L("Not set","لم تحدد")} · {L("Status","الحالة")}: {overview?.subscription?.status||"—"}</p><p className="mt-2 text-sm text-slate-400">{overview?.users.length||0} {L("users · Apps and agents can be enabled by King only.","مستخدمين · تفعيل التطبيقات والوكلاء من لوحة الـKing فقط.")}</p></section>
    </>}
  </main></div></div>;
}
