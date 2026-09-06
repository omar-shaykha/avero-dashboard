"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/app/components/Sidebar";
import DashboardHeader from "@/app/components/DashboardHeader";
import { Save, LockKeyhole } from "lucide-react";
import { useLanguage } from "@/app/components/LanguageProvider";

type ProfileForm = { full_name:string; username:string; nickname:string; age:string; talents:string; job_title:string; bio:string; avatar_url:string; };
const empty:ProfileForm={full_name:"",username:"",nickname:"",age:"",talents:"",job_title:"",bio:"",avatar_url:""};
const toForm=(data:any):ProfileForm=>({full_name:data.full_name||"",username:data.username||"",nickname:data.nickname||"",age:data.age==null?"":String(data.age),talents:data.talents||"",job_title:data.job_title||"",bio:data.bio||"",avatar_url:data.avatar_url||""});

export default function ProfilePage() {
  const { language } = useLanguage(); const ar = language === "ar";
  const [email,setEmail]=useState(""); const [form,setForm]=useState<ProfileForm>(empty); const [loading,setLoading]=useState(true); const [saving,setSaving]=useState(false); const [message,setMessage]=useState("");

  useEffect(()=>{(async()=>{try{const res=await fetch("/api/profile",{cache:"no-store"});if(!res.ok)return;const data=await res.json();setEmail(data.email||"");setForm(toForm(data));}finally{setLoading(false);}})();},[]);

  const save=async()=>{setSaving(true);setMessage("");try{const res=await fetch("/api/profile",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({nickname:form.nickname})});const data=await res.json().catch(()=>({}));if(!res.ok)throw new Error(data.error||"Failed to save nickname");if(data.profile)setForm(toForm(data.profile));window.dispatchEvent(new CustomEvent("avero-profile-updated",{detail:data.profile}));setMessage(ar?"تم حفظ الاسم المختصر":"Nickname saved");}catch(e){setMessage(ar?"تعذر حفظ الاسم المختصر":e instanceof Error?e.message:"Failed to save nickname");}finally{setSaving(false);}};

  if(loading)return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">{ar?"جارٍ تحميل الملف الشخصي...":"Loading profile..."}</div>;
  const display=form.nickname||form.full_name||form.username||email;
  const initials=display.slice(0,2).toUpperCase();
  return <div className="min-h-screen bg-slate-950"><Sidebar userEmail={email} userName={display}/><div className="ml-64 flex min-h-screen flex-col"><DashboardHeader userEmail={email} userName={display}/><main className="flex-1 px-6 py-7 text-white"><div className="mx-auto max-w-5xl">
    <div className="mb-6"><h1 className="text-3xl font-bold">{ar?"الملف الشخصي":"Profile"}</h1><p className="mt-1 text-slate-400">{ar?"الاسم المختصر قابل للتعديل، وباقي بيانات الحساب تديرها AVERO":"Nickname is editable; the rest of the account identity is managed by AVERO"}</p></div>
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]"><section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-center"><div className="mx-auto flex h-28 w-28 items-center justify-center overflow-hidden rounded-3xl border border-blue-400/20 bg-gradient-to-br from-blue-600 to-cyan-500 text-3xl font-bold">{form.avatar_url?<img src={form.avatar_url} alt="" className="h-full w-full object-cover"/>:initials}</div><p className="mt-4 text-sm font-semibold">{display}</p>{form.username&&<p className="mt-1 text-xs text-blue-300">@{form.username}</p>}<p className="text-xs text-slate-500">{email}</p>{form.job_title&&<p className="mt-3 text-xs text-blue-300">{form.job_title}</p>}</section>
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6"><div className="grid gap-4 md:grid-cols-2"><LockedField label={ar?"الاسم الكامل":"Full name"} value={form.full_name}/><LockedField label={ar?"اسم المستخدم":"Username"} value={form.username}/><label className="block text-sm font-medium text-blue-200">{ar?"الاسم المختصر — قابل للتعديل":"Nickname — editable"}<input value={form.nickname} onChange={e=>setForm(prev=>({...prev,nickname:e.target.value}))} className="mt-2 w-full rounded-xl border border-blue-500/50 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10"/></label><LockedField label={ar?"العمر":"Age"} value={form.age}/><LockedField label={ar?"المسمى الوظيفي":"Job title"} value={form.job_title}/><LockedField label={ar?"المواهب والمهارات":"Talents & skills"} value={form.talents}/></div><label className="mt-4 block text-sm text-slate-500">{ar?"نبذة شخصية":"Bio"}<textarea value={form.bio} readOnly rows={5} className="mt-2 w-full cursor-not-allowed rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-slate-500 outline-none"/></label><div className="mt-5 flex items-center justify-between gap-4"><span className="text-sm text-emerald-400">{message}</span><button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 font-medium hover:bg-blue-500 disabled:opacity-50"><Save size={16}/>{saving?(ar?"جارٍ الحفظ...":"Saving..."):(ar?"حفظ الاسم المختصر":"Save nickname")}</button></div></section></div>
  </div></main></div></div>;
}
function LockedField({label,value}:{label:string;value:string}){return <label className="block text-sm text-slate-500">{label}<div className="relative mt-2"><input value={value} readOnly className="w-full cursor-not-allowed rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 pr-10 text-slate-500 outline-none"/><LockKeyhole size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600"/></div></label>}
