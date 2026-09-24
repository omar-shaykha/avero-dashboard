"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Sidebar from "@/app/components/Sidebar";
import DashboardHeader from "@/app/components/DashboardHeader";
import { useLanguage } from "@/app/components/LanguageProvider";
import { AppWindow, ArrowRight, Landmark, MessageCircle, PlugZap } from "lucide-react";

export default function AppsPage(){
 const {language}=useLanguage();const ar=language==="ar";const [zatca,setZatca]=useState<any>(null);
 useEffect(()=>{fetch('/api/zatca',{cache:'no-store'}).then(async r=>r.ok?setZatca(await r.json()):null).catch(()=>undefined)},[]);
 const zatcaStatus=zatca?.settings?.onboarding_status||'not_started';
 return <div className="min-h-screen bg-slate-950 text-white"><Sidebar/><div className="ml-64 flex min-h-screen flex-col"><DashboardHeader/><main className="flex-1 px-6 py-7"><div className="mx-auto max-w-7xl space-y-6">
  <div><div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.22em] text-cyan-400"><AppWindow size={15}/> AVERO APPS</div><h1 className="mt-2 text-3xl font-black">{ar?'التطبيقات والربط':'Apps & Integrations'}</h1><p className="mt-2 max-w-3xl text-sm text-slate-400">{ar?'اربط الخدمات الخارجية التي تستخدمها شركتك من مكان واحد. كل تطبيق مرتبط بالشركة الحالية فقط.':'Connect external services used by your company from one place. Every app belongs only to the current tenant.'}</p></div>
  <div className="grid gap-5 lg:grid-cols-2">
   <AppCard href="/apps/zatca" icon={Landmark} title={ar?'هيئة الزكاة والضريبة والجمارك':'ZATCA · FATOORA'} description={ar?'ربط الفوترة الإلكترونية، EGS، OTP، CSID، وبعدها Reporting وClearance.':'Saudi e-invoicing onboarding, EGS, OTP, CSID, reporting and clearance.'} status={zatcaStatus==='active'?(ar?'متصل':'Connected'):zatcaStatus.replaceAll('_',' ')} ar={ar}/>
   <AppCard href="/apps/whatsapp" icon={MessageCircle} title="Meta WhatsApp" description={ar?'إدارة ربط WhatsApp Business المستخدم داخل AVERO.':'Manage the WhatsApp Business connection used by AVERO.'} status={ar?'متاح':'Available'} ar={ar}/>
  </div>
  <div className="rounded-2xl border border-slate-800 bg-slate-900/45 p-4 text-sm text-slate-500"><PlugZap className="mr-2 inline text-cyan-400" size={16}/>{ar?'لن نضيف تطبيقاً هنا إلا إذا كان له تكامل حقيقي ووظيفة واضحة داخل AVERO.':'Apps only appear here when they have a real integration and a clear job inside AVERO.'}</div>
 </div></main></div></div>
}
function AppCard({href,icon:Icon,title,description,status,ar}:{href:string;icon:any;title:string;description:string;status:string;ar:boolean}){return <Link href={href} className="group rounded-3xl border border-slate-800 bg-slate-900/55 p-6 transition hover:border-cyan-500/35 hover:bg-slate-900"><div className="flex items-start justify-between gap-4"><div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-3 text-cyan-300"><Icon size={24}/></div><span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-[10px] font-black uppercase tracking-[.14em] text-slate-400">{status}</span></div><h2 className="mt-5 text-xl font-black">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{description}</p><div className="mt-5 flex items-center gap-2 text-sm font-black text-cyan-300">{ar?'فتح التطبيق':'Open App'}<ArrowRight size={16} className="transition group-hover:translate-x-1"/></div></Link>}
