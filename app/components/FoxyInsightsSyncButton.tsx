"use client";
import { useState } from "react";

export default function FoxyInsightsSyncButton(){
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 async function run(){
  setBusy(true);setMessage("");
  try{
   const r=await fetch("/api/marketing/social-insights/sync",{method:"POST"});
   const j=await r.json().catch(()=>({}));
   if(r.ok){
    setMessage("Synced "+Number(j.synced||0)+" posts"+(j.failed?(" · "+j.failed+" failed"):"")+".");
    window.location.reload();
   }else if(r.status===409){
    setMessage("Connect Meta Direct first to unlock views and reach.");
   }else setMessage(j.error||"Sync failed.");
  }catch{setMessage("Sync failed.");}
  finally{setBusy(false);}
 }
 return <div className="flex flex-wrap items-center gap-2"><button onClick={run} disabled={busy} className="rounded-xl bg-fuchsia-500 px-4 py-3 text-sm font-black text-white disabled:opacity-50">{busy?"Syncing...":"Sync Insights Now"}</button>{message&&<span className="text-xs text-amber-200">{message}</span>}</div>;
}
