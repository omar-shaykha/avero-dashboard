"use client";
import { useMemo, useState } from "react";
import Link from "next/link";

type Field={key:string;label:string;placeholder:string;type?:"text"|"number"|"textarea"};
type Agent={name:string;role:string;emoji:string;fields:Field[]};

const AGENTS:Record<string,Agent>={
 ai_hr:{name:"Aero",role:"AI HR Manager",emoji:"🦅",fields:[
  {key:"department_scope",label:"Departments to manage",placeholder:"Kitchen, Operations, Admin"},
  {key:"work_schedule",label:"Work schedule",placeholder:"Sun–Thu, 08:00–17:00"},
  {key:"attendance_method",label:"Attendance method",placeholder:"Biometric / manual / integration"},
  {key:"hiring_focus",label:"Hiring focus",placeholder:"Roles and hiring priorities",type:"textarea"},
 ]},
 ai_support:{name:"Gor",role:"AI Operations & Support",emoji:"🦍",fields:[
  {key:"support_channels",label:"Support channels",placeholder:"WhatsApp, email, web chat"},
  {key:"service_hours",label:"Service hours",placeholder:"24/7 or business hours"},
  {key:"sla_target",label:"Response SLA",placeholder:"e.g. 15 minutes"},
  {key:"escalation_contact",label:"Escalation contact",placeholder:"Manager name / email / phone"},
 ]},
 ai_inventory:{name:"Vexa",role:"AI Inventory Manager",emoji:"🐺",fields:[
  {key:"inventory_scope",label:"Inventory scope",placeholder:"Main store, branches, categories"},
  {key:"low_stock_rule",label:"Low-stock rule",placeholder:"Minimum stock / reorder point"},
  {key:"reorder_approval",label:"Reorder approval",placeholder:"Auto / manager approval"},
  {key:"count_frequency",label:"Count frequency",placeholder:"Daily / weekly / monthly"},
 ]},
 ai_warehouse:{name:"Bruno",role:"AI Warehouse Manager",emoji:"🐻",fields:[
  {key:"warehouse_scope",label:"Warehouses to manage",placeholder:"Central warehouse, branch stores"},
  {key:"receiving_method",label:"Receiving workflow",placeholder:"PO match, QC, batch/expiry"},
  {key:"count_frequency",label:"Stock count frequency",placeholder:"Weekly / cycle count"},
  {key:"transfer_approval",label:"Transfer approval",placeholder:"Auto / manager approval"},
 ]},
 ai_customer_care:{name:"Rex",role:"AI Customer Care",emoji:"🦖",fields:[
  {key:"customer_channels",label:"Customer channels",placeholder:"WhatsApp, Instagram, email"},
  {key:"working_hours",label:"Working hours",placeholder:"24/7 or selected hours"},
  {key:"response_target",label:"Response target",placeholder:"e.g. under 5 minutes"},
  {key:"escalation_rule",label:"Escalation rule",placeholder:"When and to whom to escalate",type:"textarea"},
 ]},
 ai_analytics:{name:"Nova",role:"AI Analytics Manager",emoji:"🦉",fields:[
  {key:"report_frequency",label:"Report frequency",placeholder:"Daily / weekly / monthly"},
  {key:"kpis",label:"KPIs to monitor",placeholder:"Sales, conversion, food cost, stock variance",type:"textarea"},
  {key:"report_recipients",label:"Report recipients",placeholder:"Owner, GM, department heads"},
  {key:"alert_rules",label:"Critical alert rules",placeholder:"Examples: margin below 20%, stockout risk",type:"textarea"},
 ]},
};

const paymentMethods=[["mada","Mada"],["visa","Visa"],["apple_pay","Apple Pay"],["paypal","PayPal"]];

export default function AgentHireWizard({agentKey}:{agentKey:string}){
 const agent=AGENTS[agentKey];
 const [step,setStep]=useState(1);
 const [settings,setSettings]=useState<Record<string,string>>({});
 const [cycle,setCycle]=useState<"monthly"|"yearly">("monthly");
 const [method,setMethod]=useState("mada");
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 const complete=useMemo(()=>agent?.fields.every(f=>String(settings[f.key]||"").trim()),[agent,settings]);

 if(!agent)return <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center"><h2 className="text-xl font-black">AI employee not found</h2><Link href="/crm" className="mt-4 inline-flex rounded-xl bg-cyan-400 px-4 py-2 font-black text-slate-950">Back to CRM Office</Link></div>;

 async function saveConfig(){
  if(!complete)return setMessage("Complete all required employee settings first.");
  setBusy(true);setMessage("");
  const r=await fetch("/api/agents/onboarding",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"save_configuration",agent_key:agentKey,settings})});
  const j=await r.json().catch(()=>({}));
  setBusy(false);
  if(!r.ok)return setMessage(j.error||"Could not save employee setup.");
  setStep(2);
 }

 async function preparePayment(){
  setBusy(true);setMessage("");
  const r=await fetch("/api/agents/onboarding",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"prepare_payment",agent_key:agentKey,billing_cycle:cycle,payment_method:method})});
  const j=await r.json().catch(()=>({}));
  setBusy(false);
  if(!r.ok)return setMessage(j.error||"Could not prepare payment.");
  setStep(3);
  setMessage(j.message||"Payment prepared.");
 }

 return <div className="grid gap-5 lg:grid-cols-[.72fr_1.28fr]">
  <aside className="rounded-3xl border border-cyan-400/20 bg-slate-900 p-6">
   <div className="grid h-20 w-20 place-items-center rounded-2xl border border-slate-800 bg-slate-950 text-5xl">{agent.emoji}</div>
   <h2 className="mt-4 text-3xl font-black">{agent.name}</h2><p className="text-slate-400">{agent.role}</p>
   <div className="mt-6 space-y-2">{[["1","Employee Setup"],["2","Subscription"],["3","Payment & Activation"]].map(([n,label])=><div key={n} className={"flex items-center gap-3 rounded-xl border px-3 py-3 "+(step===Number(n)?"border-cyan-400/40 bg-cyan-400/10 text-cyan-200":"border-slate-800 bg-slate-950 text-slate-500")}><span className="grid h-7 w-7 place-items-center rounded-full border border-current text-xs font-black">{n}</span><span className="text-sm font-bold">{label}</span></div>)}</div>
   <p className="mt-6 text-xs leading-5 text-slate-500">Every AI employee has its own required setup. The employee stays disabled until payment is verified and the entitlement becomes active.</p>
  </aside>

  <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
   {step===1&&<div><p className="text-xs font-black uppercase tracking-widest text-cyan-300">STEP 1</p><h3 className="mt-2 text-2xl font-black">Configure {agent.name}</h3><p className="mt-1 text-sm text-slate-400">These are required before this AI employee can be hired.</p><div className="mt-6 grid gap-4 md:grid-cols-2">{agent.fields.map(f=><label key={f.key} className={f.type==="textarea"?"md:col-span-2":""}><span className="mb-2 block text-xs font-bold text-slate-400">{f.label} *</span>{f.type==="textarea"?<textarea rows={4} value={settings[f.key]||""} onChange={e=>setSettings({...settings,[f.key]:e.target.value})} placeholder={f.placeholder} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm outline-none focus:border-cyan-400"/>:<input value={settings[f.key]||""} onChange={e=>setSettings({...settings,[f.key]:e.target.value})} placeholder={f.placeholder} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm outline-none focus:border-cyan-400"/>}</label>)}</div><button disabled={!complete||busy} onClick={saveConfig} className="mt-6 w-full rounded-xl bg-cyan-400 py-3 font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40">{busy?"Saving...":"Continue to subscription →"}</button></div>}

   {step===2&&<div><p className="text-xs font-black uppercase tracking-widest text-cyan-300">STEP 2</p><h3 className="mt-2 text-2xl font-black">Choose subscription</h3><p className="mt-1 text-sm text-slate-400">Choose how this AI employee will be billed.</p><div className="mt-6 grid gap-4 md:grid-cols-2">{[["monthly","Monthly","Pay every month"],["yearly","Yearly","Pay once per year"]].map(([key,title,sub])=><button key={key} onClick={()=>setCycle(key as "monthly"|"yearly")} className={"rounded-2xl border p-5 text-left transition "+(cycle===key?"border-cyan-400 bg-cyan-400/10":"border-slate-700 bg-slate-950 hover:border-slate-500")}><div className="flex items-center justify-between"><div><h4 className="text-xl font-black">{title}</h4><p className="mt-1 text-sm text-slate-500">{sub}</p></div><span className={"h-5 w-5 rounded-full border-4 "+(cycle===key?"border-cyan-300 bg-cyan-300":"border-slate-700")}/></div><p className="mt-5 text-xs text-amber-300">Price will come from the configured agent price before payment.</p></button>)}</div><div className="mt-6 flex gap-3"><button onClick={()=>setStep(1)} className="rounded-xl border border-slate-700 px-5 py-3 font-bold">← Back</button><button onClick={()=>setStep(3)} className="flex-1 rounded-xl bg-cyan-400 py-3 font-black text-slate-950">Continue to payment →</button></div></div>}

   {step===3&&<div><p className="text-xs font-black uppercase tracking-widest text-cyan-300">STEP 3</p><h3 className="mt-2 text-2xl font-black">Payment & activation</h3><p className="mt-1 text-sm text-slate-400">{agent.name} will activate only after successful payment verification.</p><div className="mt-6 grid grid-cols-2 gap-3">{paymentMethods.map(([key,label])=><button key={key} onClick={()=>setMethod(key)} className={"rounded-xl border px-4 py-4 text-sm font-black "+(method===key?"border-cyan-400 bg-cyan-400/10 text-cyan-200":"border-slate-700 bg-slate-950 text-slate-400")}>{label}</button>)}</div><div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm"><div className="flex justify-between"><span className="text-slate-500">Employee</span><b>{agent.name}</b></div><div className="mt-2 flex justify-between"><span className="text-slate-500">Billing</span><b className="capitalize">{cycle}</b></div><div className="mt-2 flex justify-between"><span className="text-slate-500">Activation</span><b className="text-emerald-300">After verified payment</b></div></div><div className="mt-6 flex gap-3"><button onClick={()=>setStep(2)} className="rounded-xl border border-slate-700 px-5 py-3 font-bold">← Back</button><button disabled={busy} onClick={preparePayment} className="flex-1 rounded-xl bg-cyan-400 py-3 font-black text-slate-950 disabled:opacity-40">{busy?"Preparing...":"Proceed to secure payment"}</button></div></div>}

   {message&&<div className="mt-5 rounded-xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100">{message}</div>}
  </section>
 </div>;
}
