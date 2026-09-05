"use client";

import { useLanguage } from "./LanguageProvider";
import { UsersRound, BadgeCheck, FileText, Handshake, Trophy, CircleX, type LucideIcon } from "lucide-react";

interface StatsCardsProps { totalLeads:number; qualifiedCount:number; quotationsCount:number; negotiationsCount:number; wonCount:number; lostCount:number; }
const ICONS:Record<string,LucideIcon>={total:UsersRound,qualified:BadgeCheck,quotation:FileText,negotiation:Handshake,won:Trophy,lost:CircleX};
const COLORS:Record<string,{bg:string;border:string;icon:string}>={total:{bg:"bg-blue-900/20",border:"border-blue-800",icon:"text-blue-400"},qualified:{bg:"bg-green-900/20",border:"border-green-800",icon:"text-green-400"},quotation:{bg:"bg-amber-900/20",border:"border-amber-800",icon:"text-amber-400"},negotiation:{bg:"bg-purple-900/20",border:"border-purple-800",icon:"text-purple-400"},won:{bg:"bg-emerald-900/20",border:"border-emerald-800",icon:"text-emerald-400"},lost:{bg:"bg-red-900/20",border:"border-red-800",icon:"text-red-400"}};

export default function StatsCards({totalLeads,qualifiedCount,quotationsCount,negotiationsCount,wonCount,lostCount}:StatsCardsProps){
  const {t}=useLanguage();
  const percent=(count:number)=>totalLeads>0?`${Math.round((count/totalLeads)*100)}%`:"0%";
  const stats=[{label:t("totalLeads"),count:totalLeads,colorKey:"total",metric:"100%"},{label:t("qualified"),count:qualifiedCount,colorKey:"qualified",metric:percent(qualifiedCount)},{label:t("quotations"),count:quotationsCount,colorKey:"quotation",metric:percent(quotationsCount)},{label:t("negotiations"),count:negotiationsCount,colorKey:"negotiation",metric:percent(negotiationsCount)},{label:t("won"),count:wonCount,colorKey:"won",metric:percent(wonCount)},{label:t("lost"),count:lostCount,colorKey:"lost",metric:percent(lostCount)}];
  return <div className="grid grid-cols-1 gap-4 px-6 py-4 md:grid-cols-2 lg:grid-cols-6">{stats.map(stat=>{const colorConfig=COLORS[stat.colorKey];const Icon=ICONS[stat.colorKey];return <div key={stat.label} className={`${colorConfig.bg} border ${colorConfig.border} rounded-lg p-4`}><div className="flex items-start justify-between"><div><p className="mb-1 text-xs text-slate-400">{stat.label}</p><p className="text-2xl font-bold text-white">{stat.count}</p><p className="mt-1 text-xs text-slate-400">{stat.metric}</p></div><div className={colorConfig.icon}><Icon size={22} strokeWidth={1.8}/></div></div></div>})}</div>;
}
