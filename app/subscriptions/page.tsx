"use client";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import Sidebar from "@/app/components/Sidebar";
import DashboardHeader from "@/app/components/DashboardHeader";

const agents:Record<string,{name:string;role:string;emoji:string;feature:string[]}> = {
 ai_hr:{name:"Aero",role:"AI HR Manager",emoji:"🦅",feature:["Recruitment pipeline","Attendance & leave","Employee records","HR follow-ups"]},
 ai_support:{name:"Gor",role:"AI Operations & Support",emoji:"🦍",feature:["Support cases","Operations follow-up","Escalations","Service KPIs"]},
 ai_inventory:{name:"Vexa",role:"AI Inventory Manager",emoji:"🐺",feature:["Inventory monitoring","Low-stock alerts","Usage analysis","Reorder follow-up"]},
 ai_warehouse:{name:"Bruno",role:"AI Warehouse Manager",emoji:"🐻",feature:["Receiving","Transfers","Counts","Warehouse alerts"]},
 ai_customer_care:{name:"Rex",role:"AI Customer Care",emoji:"🦖",feature:["Customer cases","Follow-ups","Conversation tracking","Satisfaction workflow"]},
 ai_analytics:{name:"Nova",role:"AI Analytics Manager",emoji:"🦉",feature:["Cross-department KPIs","Performance analysis","Alerts","Management reports"]},
};

export default function SubscriptionsPage(){
 const search=useSearchParams();const key=search.get("agent")||"";const agent=agents[key];
 const [busy,setBusy]=useState(false),[message,setMessage]=useState("");
 async function activate(){
  if(!key)return;setBusy(true);setMessage("");
  const r=await fetch("/api/agents/hire",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({agent_key:key})});
  const j=await r.json().catch(()=>({}));
  if(r.ok){setMessage("AI employee activated successfully. Return to CRM Office.");}
  else if(r.status===402){setMessage("Payment is required first. This employee will activate only after the paid subscription entitlement becomes active.");}
  else setMessage(j.error||"Could not activate AI employee.");
  setBusy(false);
 }
 return <div className="min-h-screen bg-slate-950 text-white"><Sidebar/><div className="ml-64 min-h-screen"><DashboardHeader/><main className="p-6"><div className="mx-auto max-w-5xl">
  <div className="flex items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.28em] text-cyan-300">AI EMPLOYEE HIRING</p><h1 className="mt-2 text-4xl font-black">Subscriptions & Activation</h1><p className="mt-2 text-sm text-slate-400">Payment and entitlement come first. AVERO will not activate a new AI employee before the paid feature is active.</p></div><Link href="/crm" className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-black text-cyan-300">← CRM Office</Link></div>
  {agent?<section className="mt-7 grid gap-5 lg:grid-cols-[.8fr_1.2fr]"><div className="rounded-3xl border border-cyan-400/20 bg-slate-900 p-6"><div className="grid h-20 w-20 place-items-center rounded-2xl bg-slate-950 text-5xl">{agent.emoji}</div><h2 className="mt-4 text-3xl font-black">{agent.name}</h2><p className="text-slate-400">{agent.role}</p><span className="mt-4 inline-flex rounded-full bg-amber-400/10 px-3 py-1 text-xs font-black text-amber-300">WAITING FOR PAYMENT</span></div>
   <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6"><h3 className="text-xl font-black">What gets activated</h3><div className="mt-4 grid gap-2 sm:grid-cols-2">{agent.feature.map(x=><div key={x} className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-sm text-slate-300">✓ {x}</div>)}</div><div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950 p-4"><p className="text-xs font-black uppercase text-slate-500">Activation flow</p><p className="mt-2 text-sm leading-6 text-slate-300">1. Choose/pay for the agent feature through the company subscription. 2. Payment provider confirms the entitlement. 3. AVERO checks the active subscription item. 4. The agent is enabled and its CRM desk appears automatically.</p></div><button disabled={busy} onClick={activate} className="mt-5 w-full rounded-xl bg-cyan-400 py-3 font-black text-slate-950 disabled:opacity-50">{busy?"Checking entitlement...":"Check payment & activate employee"}</button>{message&&<p className="mt-3 rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-slate-300">{message}</p>}<p className="mt-4 text-xs leading-5 text-slate-500">No employee can be activated by this button unless an active paid subscription item exists for this exact AI feature.</p></div>
  </section>:<section className="mt-7 rounded-3xl border border-slate-800 bg-slate-900/70 p-8 text-center"><h2 className="text-2xl font-black">Choose an AI employee from the CRM Office</h2><p className="mt-3 text-sm text-slate-400">Use the + sign on an empty desk to start the hiring flow.</p><Link href="/crm" className="mt-5 inline-flex rounded-xl bg-cyan-400 px-5 py-3 font-black text-slate-950">Open CRM Office</Link></section>}
 </div></main></div></div>
}
