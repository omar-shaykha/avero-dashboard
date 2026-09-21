"use client";
import { useState } from "react";

export default function AgentHireButton({agentKey}:{agentKey:string}){
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");

 async function activate(){
  setBusy(true);setMessage("");
  try{
   const r=await fetch("/api/agents/hire",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({agent_key:agentKey})});
   const j=await r.json().catch(()=>({}));
   if(r.ok)setMessage("AI employee activated successfully. Return to CRM Office.");
   else if(r.status===402)setMessage("Payment is required first. This employee will activate only after the paid subscription entitlement becomes active.");
   else setMessage(j.error||"Could not activate AI employee.");
  }catch{
   setMessage("Could not check the subscription right now.");
  }finally{
   setBusy(false);
  }
 }

 return <div className="mt-5"><button disabled={busy} onClick={activate} className="w-full rounded-xl bg-cyan-400 py-3 font-black text-slate-950 disabled:opacity-50">{busy?"Checking entitlement...":"Check payment & activate employee"}</button>{message&&<p className="mt-3 rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-slate-300">{message}</p>}</div>;
}
