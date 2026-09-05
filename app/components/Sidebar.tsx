"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "./LogoutButton";
import AveroBrand from "./AveroBrand";
import { useLanguage } from "./LanguageProvider";
import type { AuthorizationContext } from "@/lib/auth/authorization";
import {
  LayoutDashboard,
  UsersRound,
  ChartNoAxesCombined,
  Sparkles,
  Building2,
  ChevronDown,
  ChevronRight,
  Bot,
} from "lucide-react";

interface SidebarProps { userEmail?: string; userName?: string; access?: AuthorizationContext | null; }

export default function Sidebar({ userEmail, userName, access }: SidebarProps) {
  const pathname = usePathname();
  const { t, language } = useLanguage();
  const [loadedAccess, setLoadedAccess] = useState(access);
  const [crmOpen, setCrmOpen] = useState(pathname?.startsWith("/crm") ?? false);
  const [agentsOpen, setAgentsOpen] = useState(pathname?.startsWith("/ai-") ?? false);

  useEffect(() => {
    if (access !== undefined) return;
    fetch("/api/auth/access").then((r) => r.ok ? r.json() : null).then((d) => d && setLoadedAccess(d)).catch(() => undefined);
  }, [access]);

  useEffect(() => {
    if (pathname?.startsWith("/crm")) setCrmOpen(true);
    if (pathname?.startsWith("/ai-")) setAgentsOpen(true);
  }, [pathname]);

  const currentAccess = access ?? loadedAccess;
  const isSuperAdmin = currentAccess?.profile.role === "super_admin";
  const has = (feature: string, permission: string) => isSuperAdmin || !!(currentAccess?.features.includes(feature) && currentAccess?.permissions.includes(permission));
  const crmVisible = isSuperAdmin || !!(currentAccess?.features.includes("crm") && currentAccess?.permissions.includes("view_crm"));
  const agents = [
    { label: t("salesAgent"), href: "/ai-sales", show: has("ai_sales", "view_ai_sales") },
    { label: t("marketingAgent"), href: "/ai-marketing", show: has("ai_marketing", "view_ai_marketing") },
    { label: t("hrAgent"), href: "/ai-hr", show: has("ai_hr", "view_ai_hr") },
    { label: t("supportAgent"), href: "/ai-support", show: has("ai_support", "view_ai_support") },
  ].filter((agent) => agent.show);
  const analyticsVisible = has("analytics", "view_analytics");
  const clientsVisible = isSuperAdmin || !!currentAccess?.permissions.includes("manage_clients");
  const initials = userName ? userName.split(" ").map((n) => n[0]).join("").toUpperCase() : userEmail?.[0]?.toUpperCase() || "U";
  const rtl = language === "ar";

  return (
    <div className={`fixed top-0 flex h-screen w-64 flex-col border-slate-800/80 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.10),transparent_28%),#020617] ${rtl ? "right-0 border-l" : "left-0 border-r"}`}>
      <div className="border-b border-slate-800/80 px-5 py-5"><AveroBrand /></div>

      <nav className="flex-1 space-y-2 overflow-y-auto p-4">
        <Link href="/" className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all ${pathname === "/" ? "border border-blue-500/25 bg-gradient-to-r from-blue-500/15 to-cyan-400/5 text-blue-300" : "text-slate-300 hover:bg-slate-900/80 hover:text-white"}`}>
          <LayoutDashboard size={18} strokeWidth={1.8}/><span className="text-sm font-medium">{t("dashboard")}</span>
        </Link>

        {agents.length > 0 && <div>
          <button onClick={() => setAgentsOpen((v) => !v)} className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-all ${pathname?.startsWith("/ai-") ? "border border-violet-500/25 bg-gradient-to-r from-violet-500/15 to-blue-400/5 text-violet-300" : "text-slate-300 hover:bg-slate-900/80 hover:text-white"}`}>
            <Bot size={18} strokeWidth={1.8}/><span className="flex-1 text-sm font-medium">{t("aiAgents")}</span>{agentsOpen ? <ChevronDown size={15}/> : <ChevronRight size={15}/>} 
          </button>
          {agentsOpen && <div className={`mt-2 space-y-1 border-slate-800 ${rtl ? "mr-5 border-r pr-3" : "ml-5 border-l pl-3"}`}>{agents.map((agent) => <Sub key={agent.href} href={agent.href} label={agent.label} pathname={pathname} />)}</div>}
        </div>}

        {crmVisible && <div>
          <button onClick={() => setCrmOpen((v) => !v)} className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-all ${pathname?.startsWith("/crm") ? "border border-blue-500/25 bg-gradient-to-r from-blue-500/15 to-cyan-400/5 text-blue-300" : "text-slate-300 hover:bg-slate-900/80 hover:text-white"}`}>
            <UsersRound size={18} strokeWidth={1.8}/><span className="flex-1 text-sm font-medium">{t("crm")}</span>{crmOpen ? <ChevronDown size={15}/> : <ChevronRight size={15}/>} 
          </button>
          {crmOpen && <div className={`mt-2 space-y-1 border-slate-800 ${rtl ? "mr-5 border-r pr-3" : "ml-5 border-l pl-3"}`}>
            <Sub href="/crm" label={t("crmHub")} pathname={pathname} exact />
            <Sub href="/crm/sales" label={t("salesCrm")} pathname={pathname} />
            <Sub href="/crm/marketing" label={t("marketingCrm")} pathname={pathname} />
            <Sub href="/crm/hr" label={t("hrCrm")} pathname={pathname} />
            <Sub href="/crm/support" label={t("supportCrm")} pathname={pathname} />
          </div>}
        </div>}

        {analyticsVisible && <Link href="/analytics" className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all ${pathname?.startsWith("/analytics") ? "border border-blue-500/25 bg-gradient-to-r from-blue-500/15 to-cyan-400/5 text-blue-300" : "text-slate-300 hover:bg-slate-900/80 hover:text-white"}`}><ChartNoAxesCombined size={18} strokeWidth={1.8}/><span className="text-sm font-medium">{t("analytics")}</span></Link>}
        {clientsVisible && <Link href="/clients" className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all ${pathname?.startsWith("/clients") ? "border border-blue-500/25 bg-gradient-to-r from-blue-500/15 to-cyan-400/5 text-blue-300" : "text-slate-300 hover:bg-slate-900/80 hover:text-white"}`}><Building2 size={18} strokeWidth={1.8}/><span className="text-sm font-medium">{t("clients")}</span></Link>}
      </nav>

      <div className="border-t border-slate-800/80 p-4">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/55 p-3 shadow-[0_10px_30px_rgba(0,0,0,0.12)]">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-400/20 bg-gradient-to-br from-blue-500 to-cyan-500 text-sm font-semibold text-white shadow-[0_0_22px_rgba(59,130,246,0.16)]">{initials}</div>
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-white">{userName || userEmail || "User"}</p><p className="mt-0.5 text-[11px] uppercase tracking-[0.13em] text-slate-500">Admin Console</p></div>
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}

function Sub({ href, label, pathname, exact=false }: { href:string; label:string; pathname:string|null; exact?:boolean }) {
  const active = exact ? pathname === href : pathname?.startsWith(href);
  return <Link href={href} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs transition ${active ? "bg-blue-500/10 text-blue-300" : "text-slate-500 hover:bg-slate-900 hover:text-slate-300"}`}><Sparkles size={12}/>{label}</Link>;
}
