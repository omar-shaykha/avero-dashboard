"use client";

import { useState } from "react";
import { useLanguage } from "./LanguageProvider";

interface SearchToolbarProps { onSearchChange?:(value:string)=>void; onStatusFilter?:(status:string)=>void; onCityFilter?:(city:string)=>void; onDateRangeChange?:(range:string)=>void; }

export default function SearchToolbar({onSearchChange,onStatusFilter,onCityFilter,onDateRangeChange}:SearchToolbarProps){
  const {t,language}=useLanguage();
  const [searchValue,setSearchValue]=useState("");
  const handleSearchChange=(e:React.ChangeEvent<HTMLInputElement>)=>{const value=e.target.value;setSearchValue(value);onSearchChange?.(value);};
  return <div className="flex flex-wrap items-center gap-4 border-b border-slate-800 bg-slate-900/30 px-6 py-4">
    <div className="min-w-[300px] flex-1"><div className="relative"><svg className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500 ${language==="ar"?"right-3":"left-3"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg><input type="text" placeholder={t("searchLeads")} value={searchValue} onChange={handleSearchChange} className={`w-full rounded-lg border border-slate-700 bg-slate-800 py-2 text-sm text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${language==="ar"?"pr-10 pl-4":"pl-10 pr-4"}`}/></div></div>
    <select onChange={e=>onStatusFilter?.(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"><option value="">{t("allStatuses")}</option><option value="new">{t("new")}</option><option value="qualified">{t("qualified")}</option><option value="quotation">{t("quotation")}</option><option value="negotiation">{t("negotiation")}</option><option value="won">{t("won")}</option><option value="lost">{t("lost")}</option></select>
    <select onChange={e=>onCityFilter?.(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"><option value="">{t("allCities")}</option></select>
    <select onChange={e=>onDateRangeChange?.(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"><option value="30">{t("lastThirtyDays")}</option><option value="7">{t("lastSevenDays")}</option><option value="14">{t("fourteenDays")}</option><option value="90">{t("lastNinetyDays")}</option></select>
    <button className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"><span>+</span>{t("addLead")}</button>
  </div>;
}
