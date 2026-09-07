"use client";

import { useEffect, useMemo, useState } from "react";

type Run={id:string;status?:string;action?:string;created_at?:string;completed_at?:string};
type Conversation={id:string;customer_id:string;direction:"inbound"|"outbound";created_at:string};
type AgentData={runs?:Run[]};

type State="working"|"idle"|"offline";

export default function CrmAgentFloor(){
  const [leo,setLeo]=useState<State>("idle");
  const [foxy,setFoxy]=useState<State>("idle");
  const [leoNote,setLeoNote]=useState("Waiting for a customer");
  const [foxyNote,setFoxyNote]=useState("No marketing task right now");

  async function load(){
    try{
      const [salesRes,marketingRes]=await Promise.all([
        fetch("/api/ai-departments/sales/conversations",{cache:"no-store"}),
        fetch("/api/ai-departments/marketing",{cache:"no-store"}),
      ]);
      if(salesRes.ok){
        const s=await salesRes.json();
        const msgs=(s.conversations||[]) as Conversation[];
        const byCustomer=new Map<string,Conversation[]>();
        for(const m of msgs){const a=byCustomer.get(m.customer_id)||[];a.push(m);byCustomer.set(m.customer_id,a)}
        let waiting=false;
        for(const arr of byCustomer.values()){
          const sorted=arr.slice().sort((a,b)=>+new Date(b.created_at)-+new Date(a.created_at));
          if(sorted[0]?.direction==="inbound"){waiting=true;break}
        }
        if(waiting){setLeo("working");setLeoNote("Handling a live WhatsApp customer")}else{setLeo("idle");setLeoNote("Waiting for a customer")}
      }else if(salesRes.status===403){setLeo("offline");setLeoNote("No access")}

      if(marketingRes.ok){
        const m=(await marketingRes.json()) as AgentData;
        const runs=m.runs||[];
        const running=runs.find(r=>["running","pending"].includes(String(r.status||"").toLowerCase()));
        const recent=runs.find(r=>Date.now()-new Date(r.created_at||0).getTime()<15000);
        if(running||recent){setFoxy("working");setFoxyNote(running?"Working on a marketing task":"Just finished a marketing task")}else{setFoxy("idle");setFoxyNote("No marketing task right now")}
      }else if(marketingRes.status===403){setFoxy("offline");setFoxyNote("No access")}
    }catch{}
  }

  useEffect(()=>{load();const t=window.setInterval(load,2500);return()=>window.clearInterval(t)},[]);
  const agents=useMemo(()=>[
    {name:"Leo",role:"Sales",emoji:"🦁",state:leo,note:leoNote},
    {name:"Foxy",role:"Marketing",emoji:"🦊",state:foxy,note:foxyNote},
  ],[leo,foxy,leoNote,foxyNote]);

  return <section className="mx-6 mt-3 rounded-2xl border border-slate-800 bg-slate-950/55 p-3">
    <div className="mb-2 flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.22em] text-cyan-400">Live AI Floor</p><p className="text-xs text-slate-500">Real activity from AVERO agents</p></div><span className="text-[10px] text-slate-600">updates live</span></div>
    <div className="grid gap-2 md:grid-cols-2">{agents.map(a=><Agent key={a.name} {...a}/>)}</div>
  </section>;
}

function Agent({name,role,emoji,state,note}:{name:string;role:string;emoji:string;state:State;note:string}){
 const working=state==="working",offline=state==="offline";
 return <div className="relative flex min-h-[92px] items-center gap-3 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3">
   <style jsx>{`@keyframes workBob{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-5px) rotate(2deg)}}@keyframes ballPlay{0%{transform:translateX(0) translateY(0)}50%{transform:translateX(12px) translateY(-7px)}100%{transform:translateX(0) translateY(0)}}`}</style>
   <div className="relative grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-slate-950 text-3xl" style={{animation:working?"workBob .8s ease-in-out infinite":"none"}}>{emoji}{!working&&!offline&&<span className="absolute -bottom-1 -right-1 text-sm" style={{animation:"ballPlay 2.2s ease-in-out infinite"}}>⚽</span>}</div>
   <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="font-black text-white">{name}</p><span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">{role}</span></div><p className="mt-1 truncate text-xs text-slate-400">{note}</p><div className="mt-2 flex items-center gap-2 text-[10px]"><span className={`h-2 w-2 rounded-full ${working?"bg-emerald-400 animate-pulse":offline?"bg-slate-600":"bg-amber-400"}`}/><span className={working?"text-emerald-300":offline?"text-slate-600":"text-amber-300"}>{working?"WORKING LIVE":offline?"OFFLINE":"IDLE"}</span></div></div>
 </div>
}
