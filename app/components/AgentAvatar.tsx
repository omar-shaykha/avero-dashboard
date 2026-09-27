"use client";
export default function AgentAvatar({agent,size=64}:{agent:"zayn"|"naya"|"eli";size?:number}){
 const female=agent==="naya", headset=agent==="eli";
 return <div aria-label={agent.toUpperCase()+" AI employee"} className="relative overflow-hidden rounded-2xl border border-cyan-400/25 bg-[radial-gradient(circle_at_50%_18%,rgba(34,211,238,.22),transparent_42%),#020617] shadow-[0_0_24px_rgba(34,211,238,.10)]" style={{width:size,height:size}}>
  <svg viewBox="0 0 96 96" className="h-full w-full" role="img">
   <path d="M23 91c2-20 12-29 25-29s23 9 25 29" fill="#111827" stroke="#67e8f9" strokeWidth="2"/>
   <path d="M38 63l10 14 10-14 5 28H33z" fill="#e5e7eb"/><path d="M45 75h6l3 16H42z" fill="#22d3ee"/>
   <rect x="30" y="18" width="36" height="43" rx="17" fill="#cbd5e1" stroke="#67e8f9" strokeWidth="2"/>
   <path d={female?"M29 39c0-19 8-27 20-27 13 0 21 10 19 30-5-2-8-8-10-15-7 7-16 10-29 12z":"M31 31c2-14 10-20 18-20 11 0 18 8 18 23-9-2-17-6-23-12-3 5-7 8-13 9z"} fill="#0f172a"/>
   <circle cx="41" cy="41" r="2.5" fill="#0f172a"/><circle cx="56" cy="41" r="2.5" fill="#0f172a"/>
   <path d="M43 51c4 3 8 3 12 0" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round"/>
   <path d="M48 22v-6" stroke="#22d3ee" strokeWidth="2"/><circle cx="48" cy="13" r="3" fill="#22d3ee"/>
   {headset&&<><path d="M29 39c-4 0-5 4-5 8s2 7 6 7M67 39c4 0 5 4 5 8s-2 7-6 7" fill="none" stroke="#22d3ee" strokeWidth="3"/><path d="M70 53c-3 5-6 6-10 6" fill="none" stroke="#22d3ee" strokeWidth="2"/><circle cx="59" cy="59" r="2" fill="#22d3ee"/></>}
  </svg>
  <span className="absolute bottom-1 right-1 h-2.5 w-2.5 animate-pulse rounded-full border border-slate-950 bg-emerald-400"/>
 </div>
}