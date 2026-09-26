"use client";
import { useEffect } from "react";

export default function PresenceHeartbeat(){
  useEffect(()=>{
    let stopped=false;
    const ping=()=>{if(!stopped&&!document.hidden)fetch("/api/presence",{method:"POST",cache:"no-store"}).catch(()=>undefined)};
    ping();
    const timer=window.setInterval(ping,30000);
    const onVisibility=()=>{if(!document.hidden)ping()};
    document.addEventListener("visibilitychange",onVisibility);
    window.addEventListener("focus",ping);
    return()=>{stopped=true;window.clearInterval(timer);document.removeEventListener("visibilitychange",onVisibility);window.removeEventListener("focus",ping)};
  },[]);
  return null;
}
