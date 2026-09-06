"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AveroBrand from "@/app/components/AveroBrand";
import { useLanguage } from "@/app/components/LanguageProvider";

export default function LoginPage() {
  const { language } = useLanguage(); const ar = language === "ar";
  const router = useRouter(); const supabase = createClient();
  const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [isLoading,setIsLoading]=useState(false); const [error,setError]=useState<string|null>(null);
  const handleSubmit=async(e:React.FormEvent<HTMLFormElement>)=>{e.preventDefault();setError(null);setIsLoading(true);try{const {error:signInError}=await supabase.auth.signInWithPassword({email:email.trim(),password});if(signInError){setError(ar?"بيانات الدخول غير صحيحة أو تعذر تسجيل الدخول":signInError.message||"Failed to sign in");setIsLoading(false);return;}router.push("/");router.refresh();}catch(err){console.error("Sign in error:",err);setError(ar?"حدث خطأ غير متوقع":"An unexpected error occurred");setIsLoading(false);}};
  return <main className="relative min-h-screen overflow-hidden bg-[#020617] p-6 text-white">
    <div className="pointer-events-none absolute left-[-10%] top-[-20%] h-[520px] w-[520px] rounded-full bg-blue-600/10 blur-3xl"/><div className="pointer-events-none absolute bottom-[-25%] right-[-10%] h-[520px] w-[520px] rounded-full bg-violet-600/10 blur-3xl"/>
    <div className="relative flex min-h-[calc(100vh-3rem)] items-center justify-center"><div className="w-full max-w-md"><div className="mb-10 flex justify-center"><AveroBrand/></div><div className="rounded-3xl border border-slate-800/80 bg-slate-950/70 p-8 shadow-[0_24px_90px_rgba(0,0,0,0.42)] backdrop-blur-xl">
      <div className="mb-7"><p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-400">{ar?"مساحة عمل آمنة":"Secure Workspace"}</p><h1 className="mt-2 text-2xl font-bold">{ar?"مرحبًا بعودتك":"Welcome back"}</h1><p className="mt-2 text-sm text-slate-400">{ar?"سجّل الدخول إلى مساحة عمليات AVERO AI الخاصة بك.":"Sign in to your AVERO AI operations workspace."}</p></div>
      <form onSubmit={handleSubmit} className="space-y-5"><div><label htmlFor="email" className="block text-sm font-medium text-slate-300">{ar?"البريد الإلكتروني":"Email"}</label><input id="email" type="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} disabled={isLoading} required className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-white outline-none transition focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/10 disabled:opacity-50"/></div><div><label htmlFor="password" className="block text-sm font-medium text-slate-300">{ar?"كلمة المرور":"Password"}</label><input id="password" type="password" placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} disabled={isLoading} required className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-white outline-none transition focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/10 disabled:opacity-50"/></div>{error&&<div className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</div>}<button type="submit" disabled={isLoading||!email||!password} className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-3 font-semibold text-white shadow-[0_10px_30px_rgba(37,99,235,0.22)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50">{isLoading?(ar?"جارٍ تسجيل الدخول...":"Signing in..."):(ar?"تسجيل الدخول إلى AVERO":"Sign in to AVERO")}</button></form>
    </div><p className="mt-7 text-center text-[11px] uppercase tracking-[0.16em] text-slate-600">{ar?"منصة AVERO للعمليات الذكية":"AVERO Intelligent Operations Platform"}</p></div></div>
  </main>;
}
