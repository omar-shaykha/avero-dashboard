"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

const box="rounded-2xl border border-slate-800 bg-slate-900";
const input="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm outline-none focus:border-cyan-400";
const names:Record<string,string>={ai_sales:"Leo",ai_marketing:"Foxy",ai_hr:"Aero",ai_support:"Gor",ai_inventory:"Vexa",ai_warehouse:"Bruno",ai_customer_care:"Rex",ai_analytics:"Nova"};

export default function AgentCrmDashboard({agentKey}:{agentKey?:string}){
 const [agents,setAgents]=useState<any[]>([]);
 const [loading,setLoading]=useState(true);
 const [open,setOpen]=useState(false);
 const [form,setForm]=useState({agent_key:agentKey||"ai_sales",title:"",record_type:"task",priority:"medium",due_at:"",summary:"",value:0});

 async function load(){
  setLoading(true);
  const url="/api/agent-crm"+(agentKey?"?agent="+encodeURIComponent(agentKey):"");
  const r=await fetch(url,{cache:"no-store"});
  if(r.ok){const j=await r.json();setAgents(Array.isArray(j.agents)?j.agents:[])}
  setLoading(false);
 }
 useEffect(()=>{load().catch(()=>setLoading(false))},[agentKey]);

 async function createItem(){
  if(!form.title.trim())return;
  const r=await fetch("/api/agent-crm",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"create",...form,agent_key:agentKey||form.agent_key,due_at:form.due_at||null})});
  if(r.ok){setOpen(false);setForm({...form,title:"",summary:"",due_at:"",value:0});await load()}
 }
 async function markDone(id:string){
  await fetch("/api/agent-crm",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"update",id,status:"done"})});
  await load();
 }

 let totalRuns=0,totalFailed=0,totalOpen=0,totalValue=0;
 for(const a of agents){totalRuns+=Number(a.kpis?.runs||0);totalFailed+=Number(a.kpis?.failed||0);totalOpen+=Number(a.kpis?.open_items||0);totalValue+=Number(a.kpis?.value||0)}

 if(loading)return <div className="p-10 text-center text-slate-500">Loading AI CRM...</div>;

 return <div className="space-y-6">
  <header className="flex flex-wrap items-end justify-between gap-3">
   <div><p className="text-xs font-black uppercase tracking-[.28em] text-cyan-300">{agentKey?(names[agentKey]||agentKey)+" CRM":"AVERO AI CRM"}</p><h1 className="mt-2 text-3xl font-black">{agentKey?"Agent Performance & Work Queue":"All Agents Command Center"}</h1><p className="mt-2 text-sm text-slate-400">KPIs, activity, tasks and operational analytics in one place.</p></div>
   <div className="flex gap-2"><button onClick={()=>load()} className="rounded-xl border border-slate-700 px-4 py-3 text-sm font-bold">Refresh</button><button onClick={()=>setOpen(true)} className="rounded-xl bg-cyan-400 px-4 py-3 text-sm font-black text-slate-950">+ New CRM Item</button></div>
  </header>

  {!agentKey&&<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><K label="Agent Runs" value={totalRuns}/><K label="Failed Runs" value={totalFailed}/><K label="Open Work" value={totalOpen}/><K label="Tracked Value" value={totalValue.toLocaleString()}/></div>}

  <div className={agentKey?"grid gap-5":"grid gap-5 xl:grid-cols-2"}>
   {agents.map((a:any)=><section key={a.key} className={box}>
    <div className="flex items-start justify-between border-b border-slate-800 p-5"><div><h2 className="text-2xl font-black">{a.name}</h2><p className="text-sm text-slate-400">{a.department} · {a.enabled?"Enabled":"Off"}</p></div>{!agentKey&&<Link href={"/crm/agents/"+a.key} className="text-sm font-bold text-cyan-300">Open CRM →</Link>}</div>
    <div className="grid grid-cols-2 gap-px bg-slate-800 md:grid-cols-4">
     {Object.keys(a.kpis||{}).slice(0,8).map((k:string)=><div key={k} className="bg-slate-900 p-4"><p className="text-[10px] uppercase text-slate-500">{k.replaceAll("_"," ")}</p><p className="mt-1 text-xl font-black">{typeof a.kpis[k]==="number"?Number(a.kpis[k]).toLocaleString():String(a.kpis[k]??"—")}</p></div>)}
    </div>
    <div className="grid gap-4 p-5 lg:grid-cols-2">
     <div><h3 className="mb-3 text-sm font-black uppercase text-slate-400">Work Queue</h3>{!a.items?.length?<p className="rounded-xl border border-dashed border-slate-800 p-5 text-sm text-slate-500">No CRM items.</p>:a.items.slice(0,8).map((i:any)=><div key={i.id} className="mb-2 rounded-xl border border-slate-800 bg-slate-950 p-3"><div className="flex justify-between gap-2"><b className="text-sm">{i.title}</b><span className="text-[10px] font-black text-slate-500">{i.priority}</span></div><p className="mt-1 text-xs text-slate-500">{i.record_type+" · "+i.status}</p>{!["done","cancelled"].includes(i.status)&&<button onClick={()=>markDone(i.id)} className="mt-2 text-xs font-bold text-emerald-300">✓ Mark done</button>}</div>)}</div>
     <div><h3 className="mb-3 text-sm font-black uppercase text-slate-400">Recent Activity</h3>{!a.recent_runs?.length?<p className="rounded-xl border border-dashed border-slate-800 p-5 text-sm text-slate-500">No agent runs yet.</p>:a.recent_runs.slice(0,8).map((r:any)=><div key={r.id} className="mb-2 flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-3"><span><b className="block text-xs">{r.action}</b><small className="text-slate-500">{new Date(r.created_at).toLocaleString()}</small></span><span className={String(r.status).startsWith("completed")?"text-emerald-300":"text-rose-300"}>{r.status}</span></div>)}</div>
    </div>
   </section>)}
  </div>

  {open&&<div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4"><div className="w-full max-w-xl rounded-3xl border border-slate-700 bg-slate-900 p-6"><div className="flex justify-between"><h2 className="text-xl font-black">New Agent CRM Item</h2><button onClick={()=>setOpen(false)}>✕</button></div><div className="mt-5 space-y-3">{!agentKey&&<select className={input} value={form.agent_key} onChange={e=>setForm({...form,agent_key:e.target.value})}>{Object.keys(names).map(k=><option key={k} value={k}>{names[k]}</option>)}</select>}<input className={input} placeholder="Title" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/><div className="grid grid-cols-2 gap-3"><select className={input} value={form.record_type} onChange={e=>setForm({...form,record_type:e.target.value})}><option value="task">Task</option><option value="opportunity">Opportunity</option><option value="alert">Alert</option><option value="follow_up">Follow-up</option><option value="case">Case</option></select><select className={input} value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select></div><input type="datetime-local" className={input} value={form.due_at} onChange={e=>setForm({...form,due_at:e.target.value})}/><input type="number" className={input} value={form.value} onChange={e=>setForm({...form,value:Number(e.target.value)})}/><textarea className={input} placeholder="Summary / notes" value={form.summary} onChange={e=>setForm({...form,summary:e.target.value})}/><button onClick={createItem} className="w-full rounded-xl bg-cyan-400 py-3 font-black text-slate-950">Create</button></div></div></div>}
 </div>
}
function K({label,value}:{label:string,value:string|number}){return <div className={box+" p-5"}><p className="text-xs font-black uppercase text-cyan-300">{label}</p><p className="mt-3 text-3xl font-black">{value}</p></div>}
