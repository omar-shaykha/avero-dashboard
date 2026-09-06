"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/app/components/Sidebar";
import DashboardHeader from "@/app/components/DashboardHeader";
import { useLanguage } from "@/app/components/LanguageProvider";
import { useTheme } from "@/app/components/ThemeProvider";
import { Bell, Check, CircleAlert, Moon, Monitor, Settings2, Sun, Volume2 } from "lucide-react";

type NotificationKey =
  | "new_lead" | "qualified_lead" | "quotation_request" | "negotiation_started"
  | "high_interest" | "new_customer_message" | "won_deal" | "lost_deal"
  | "event_soon" | "ai_handoff" | "automation_error" | "subscription_expiry" | "security_alert";

type NotificationPrefs = Record<NotificationKey, boolean> & { master:boolean; sound:boolean };

const defaults: NotificationPrefs = { master:true,sound:true,new_lead:true,qualified_lead:true,quotation_request:true,negotiation_started:true,high_interest:true,new_customer_message:true,won_deal:true,lost_deal:false,event_soon:true,ai_handoff:true,automation_error:true,subscription_expiry:true,security_alert:true };
const items: { key:NotificationKey; en:string; ar:string; enDesc:string; arDesc:string }[] = [
  {key:"new_lead",en:"New lead received",ar:"وصول عميل محتمل جديد",enDesc:"Alert when a new lead enters AVERO.",arDesc:"تنبيه عند دخول عميل محتمل جديد إلى AVERO."},
  {key:"qualified_lead",en:"Lead becomes qualified",ar:"تحوّل العميل إلى مؤهل",enDesc:"Alert when AI or staff qualifies a lead.",arDesc:"تنبيه عندما يصنّف الذكاء الاصطناعي أو الفريق العميل كمؤهل."},
  {key:"quotation_request",en:"Quotation requested",ar:"طلب عرض سعر",enDesc:"Alert when a customer asks for price or proposal.",arDesc:"تنبيه عندما يطلب العميل سعراً أو عرضاً."},
  {key:"negotiation_started",en:"Negotiation starts",ar:"بدء التفاوض",enDesc:"Alert when the lead enters negotiation.",arDesc:"تنبيه عند انتقال العميل إلى مرحلة التفاوض."},
  {key:"high_interest",en:"High-interest lead",ar:"عميل عالي الاهتمام",enDesc:"Alert when interest level becomes High.",arDesc:"تنبيه عندما يصبح مستوى الاهتمام مرتفعاً."},
  {key:"new_customer_message",en:"New customer message",ar:"رسالة جديدة من العميل",enDesc:"Alert for new WhatsApp/customer replies.",arDesc:"تنبيه عند وصول رد أو رسالة جديدة من العميل."},
  {key:"won_deal",en:"Deal won / booking confirmed",ar:"تم الفوز بالصفقة أو تأكيد الحجز",enDesc:"Alert immediately when a deal is confirmed.",arDesc:"تنبيه مباشر عند تأكيد الطلب أو الحجز."},
  {key:"lost_deal",en:"Deal lost / cancelled",ar:"خسارة أو إلغاء الصفقة",enDesc:"Alert when a lead declines or cancels.",arDesc:"تنبيه عندما يرفض العميل أو يلغي."},
  {key:"event_soon",en:"Upcoming event reminder",ar:"تذكير بموعد مناسبة قريب",enDesc:"Alert for upcoming booked event dates.",arDesc:"تنبيه قبل مواعيد المناسبات والحجوزات القادمة."},
  {key:"ai_handoff",en:"AI needs human assistance",ar:"الذكاء الاصطناعي يحتاج تدخّل بشري",enDesc:"Alert when the agent cannot safely complete a request.",arDesc:"تنبيه عندما لا يستطيع الوكيل إكمال الطلب بأمان."},
  {key:"automation_error",en:"Automation or integration error",ar:"خطأ في الأتمتة أو الربط",enDesc:"Alert when WhatsApp, Make, API or an AI workflow fails.",arDesc:"تنبيه عند فشل واتساب أو Make أو API أو أي تدفق ذكاء اصطناعي."},
  {key:"subscription_expiry",en:"Subscription or feature expiry",ar:"انتهاء اشتراك أو ميزة",enDesc:"Alert before a client feature or subscription expires.",arDesc:"تنبيه قبل انتهاء اشتراك العميل أو إحدى الميزات."},
  {key:"security_alert",en:"Security & account alerts",ar:"تنبيهات الأمان والحساب",enDesc:"Important account, permission and security events.",arDesc:"تنبيهات مهمة للحساب والصلاحيات والأمان."},
];

export default function SettingsPage() {
  const { language } = useLanguage(); const ar = language === "ar";
  const { theme, setTheme } = useTheme();
  const [prefs,setPrefs] = useState<NotificationPrefs>(defaults); const [saved,setSaved] = useState(false); const [syncing,setSyncing]=useState(true);

  useEffect(()=>{(async()=>{try{const res=await fetch("/api/settings",{cache:"no-store"});if(!res.ok)return;const data=await res.json();if(data.theme)setTheme(data.theme);setPrefs({...defaults,...(data.notification_prefs||{}),master:data.notification_master??true,sound:data.notification_sound??true});localStorage.setItem("avero-notifications",JSON.stringify({...defaults,...(data.notification_prefs||{}),master:data.notification_master??true,sound:data.notification_sound??true}));}finally{setSyncing(false);}})();},[setTheme]);

  const savePatch=async(body:Record<string,unknown>)=>{await fetch("/api/settings",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});setSaved(true);setTimeout(()=>setSaved(false),1400);};
  const update=(key:keyof NotificationPrefs,value:boolean)=>{setPrefs(prev=>{const next={...prev,[key]:value};localStorage.setItem("avero-notifications",JSON.stringify(next));const notification_prefs=Object.fromEntries(items.map(item=>[item.key,next[item.key]]));savePatch({notification_master:next.master,notification_sound:next.sound,notification_prefs});return next;});};
  const chooseTheme=(value:"dark"|"light"|"system")=>{setTheme(value);savePatch({theme:value});};

  const ThemeCard=({value,icon:Icon,title,desc}:{value:"dark"|"light"|"system";icon:typeof Moon;title:string;desc:string})=><button onClick={()=>chooseTheme(value)} className={`rounded-2xl border p-5 text-start transition ${theme===value?"border-blue-500 bg-blue-500/10":"border-slate-800 bg-slate-900/55 hover:border-slate-700"}`}><div className="flex items-start justify-between"><div className="rounded-xl border border-slate-700 bg-slate-950 p-2.5"><Icon size={20} className="text-blue-400"/></div>{theme===value&&<Check size={18} className="text-emerald-400"/>}</div><h3 className="mt-4 font-semibold text-white">{title}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{desc}</p></button>;

  return <div className="min-h-screen bg-slate-950"><Sidebar/><div className="ml-64 flex min-h-screen flex-col"><DashboardHeader/><main className="flex-1 px-6 py-7 text-white"><div className="mx-auto max-w-6xl space-y-7">
    <div className="flex items-center justify-between gap-4"><div><div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.2em] text-blue-400"><Settings2 size={15}/>{ar?"إعدادات AVERO":"AVERO SETTINGS"}</div><h1 className="text-3xl font-bold">{ar?"الإعدادات":"Settings"}</h1><p className="mt-2 text-sm text-slate-400">{ar?"تحكّم بالمظهر والتنبيهات وطريقة عمل حسابك.":"Control appearance, notifications and account behavior."}</p></div>{(saved||syncing)&&<div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-xs text-emerald-300">{syncing?(ar?"جارٍ المزامنة...":"Syncing..."):(ar?"تم الحفظ في Supabase":"Saved to Supabase")}</div>}</div>
    <section><div className="mb-4"><h2 className="text-xl font-semibold">{ar?"المظهر":"Appearance"}</h2><p className="mt-1 text-sm text-slate-500">{ar?"اختر شكل AVERO المناسب لك.":"Choose how AVERO looks for you."}</p></div><div className="grid gap-4 md:grid-cols-3"><ThemeCard value="dark" icon={Moon} title={ar?"الوضع الداكن":"Dark mode"} desc={ar?"الوضع الأصلي الداكن لـ AVERO.":"AVERO's original dark workspace."}/><ThemeCard value="light" icon={Sun} title={ar?"الوضع الفاتح":"Light mode"} desc={ar?"واجهة بيضاء وواضحة للاستخدام النهاري.":"A bright workspace for daytime use."}/><ThemeCard value="system" icon={Monitor} title={ar?"حسب النظام":"System"} desc={ar?"يتبع إعداد الجهاز تلقائياً.":"Automatically follows your device setting."}/></div></section>
    <section className="rounded-3xl border border-slate-800 bg-slate-900/55 p-6"><div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5"><div className="flex items-start gap-3"><div className="rounded-xl bg-violet-500/10 p-2.5 text-violet-300"><Bell size={21}/></div><div><h2 className="text-xl font-semibold">{ar?"التنبيهات":"Notifications"}</h2><p className="mt-1 text-sm text-slate-500">{ar?"اختر الأحداث التي تريد من AVERO أن ينبهك عليها.":"Choose exactly which events AVERO should notify you about."}</p></div></div><Toggle checked={prefs.master} onChange={v=>update("master",v)} label={ar?"تشغيل كل التنبيهات":"All notifications"}/></div>
      <div className={`mt-5 space-y-3 ${!prefs.master?"opacity-45 pointer-events-none":""}`}>{items.map(item=><div key={item.key} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950/40 p-4"><div><h3 className="text-sm font-medium text-slate-200">{ar?item.ar:item.en}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{ar?item.arDesc:item.enDesc}</p></div><Toggle checked={prefs[item.key]} onChange={v=>update(item.key,v)}/></div>)}</div>
      <div className="mt-5 flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/40 p-4"><div className="flex items-start gap-3"><Volume2 size={18} className="mt-0.5 text-blue-400"/><div><h3 className="text-sm font-medium text-slate-200">{ar?"صوت التنبيهات":"Notification sound"}</h3><p className="mt-1 text-xs text-slate-500">{ar?"تشغيل صوت عند وصول تنبيه جديد.":"Play a sound when a new alert arrives."}</p></div></div><Toggle checked={prefs.sound} onChange={v=>update("sound",v)}/></div>
      <div className="mt-5 flex gap-3 rounded-2xl border border-emerald-500/15 bg-emerald-500/5 p-4 text-xs leading-5 text-emerald-200/80"><CircleAlert size={17} className="mt-0.5 shrink-0"/><p>{ar?"هذه الإعدادات أصبحت مرتبطة بحساب العميل في Supabase وتبقى محفوظة بين الأجهزة بعد تشغيل ترقية قاعدة البيانات.":"These preferences are now connected to the client's Supabase account and persist across devices once the database upgrade is applied."}</p></div>
    </section>
  </div></main></div></div>;
}
function Toggle({checked,onChange,label}:{checked:boolean;onChange:(v:boolean)=>void;label?:string}){return <button type="button" onClick={()=>onChange(!checked)} className="flex items-center gap-3"><span className="text-xs text-slate-400">{label}</span><span className={`relative h-7 w-12 rounded-full transition ${checked?"bg-emerald-500":"bg-slate-700"}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${checked?"left-6":"left-1"}`}/></span></button>}
