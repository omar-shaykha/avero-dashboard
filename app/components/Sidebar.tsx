"use client";

import { useEffect, useState, type ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "./LogoutButton";
import AveroBrand from "./AveroBrand";
import { useLanguage } from "./LanguageProvider";
import type { AuthorizationContext } from "@/lib/auth/authorization";
import { AppWindow, BarChart3, Bot, Building2, ChevronDown, ChevronRight, CreditCard, Menu, PanelLeftClose, PanelLeftOpen, Settings, Sparkles, Store, UserRound, UsersRound, X } from "lucide-react";

interface SidebarProps { userEmail?: string; userName?: string; access?: AuthorizationContext | null; }
type NavIcon = ComponentType<{ size?: number; className?: string }>;
type NavItem = { label: string; href: string; show: boolean; icon?: NavIcon };

export default function Sidebar({ userEmail, userName, access }: SidebarProps) {
  const pathname = usePathname();
  const { t, language } = useLanguage();
  const rtl = language === "ar";
  const [loadedAccess, setLoadedAccess] = useState(access);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [agentsOpen, setAgentsOpen] = useState(pathname?.startsWith("/ai-") ?? true);

  useEffect(() => { if (access !== undefined) return; fetch("/api/auth/access").then((r) => r.ok ? r.json() : null).then((d) => d && setLoadedAccess(d)).catch(() => undefined); }, [access]);
  useEffect(() => { if (pathname?.startsWith("/ai-")) setAgentsOpen(true); setMobileOpen(false); }, [pathname]);
  useEffect(() => { document.documentElement.classList.toggle("sidebar-collapsed", collapsed); return () => document.documentElement.classList.remove("sidebar-collapsed"); }, [collapsed]);

  const currentAccess = access ?? loadedAccess;
  const isKingAdmin = currentAccess?.profile.role === "king_admin";
  const isTenantAdmin = currentAccess?.profile.role === "super_admin" || currentAccess?.profile.role === "admin";
  const aliases: Record<string, string> = { view_crm: "crm.view", view_analytics: "analytics.view", view_ai_sales: "sales.view" };
  const permitted = (permission: string) => isKingAdmin || !!currentAccess?.permissions.includes(aliases[permission] || permission);
  const has = (feature: string, permission: string) => isKingAdmin || !!(currentAccess?.features.includes(feature) && permitted(permission));
  const crmVisible = has("crm", "view_crm");
  const monitoringVisible = isKingAdmin || isTenantAdmin || permitted("analytics.view");
  const clientsVisible = isKingAdmin;
  const appsVisible = isKingAdmin || permitted("apps.view");
  const settingsVisible = isKingAdmin || permitted("settings.view");
  const agents: NavItem[] = [
    { label: "AI Add-ons", href: "/ai-agents", show: true, icon: Sparkles },
    { label: "Leo — Sales", href: "/ai-sales", show: has("ai_sales", "view_ai_sales"), icon: Bot },
  ].filter((item) => item.show);
  const initials = userName ? userName.split(" ").map((name) => name[0]).join("").toUpperCase() : userEmail?.[0]?.toUpperCase() || "U";
  const arrow = rtl ? <ChevronRight size={15} className="rotate-180" /> : <ChevronRight size={15} />;
  const width = collapsed ? "md:w-20 w-72" : "md:w-64 w-72";
  const mobileTransform = mobileOpen ? "translate-x-0" : rtl ? "translate-x-full md:translate-x-0" : "-translate-x-full md:translate-x-0";

  return <>
    <button onClick={() => setMobileOpen((value) => !value)} className={`fixed top-3 z-50 rounded-xl border border-cyan-400/30 bg-slate-950/95 p-3 text-cyan-200 shadow-2xl md:hidden ${rtl ? "right-3" : "left-3"}`}>{mobileOpen ? <X size={20} /> : <Menu size={20} />}</button>
    {mobileOpen && <button aria-label="Close menu" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-30 bg-black/55 backdrop-blur-sm md:hidden" />}
    <div className={`fixed top-0 z-40 flex h-screen ${width} ${mobileTransform} flex-col border-slate-800/80 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.10),transparent_28%),#020617] transition-all duration-300 ${rtl ? "right-0 border-l" : "left-0 border-r"}`} dir={rtl ? "rtl" : "ltr"}>
      <div className="border-b border-slate-800/80 px-4 py-4"><div className="flex items-center justify-between gap-2">{collapsed ? <div className="scale-90"><AveroBrand compact /></div> : <AveroBrand />}<button onClick={() => setCollapsed((value) => !value)} className="hidden rounded-xl border border-slate-800 p-2 text-slate-400 hover:bg-slate-900 hover:text-white md:block">{collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}</button></div></div>
      <nav className="flex-1 space-y-2 overflow-y-auto p-3">
        {monitoringVisible && <Main href="/manager-monitoring" label={collapsed ? "" : "Manager Monitoring"} icon={BarChart3} active={pathname?.startsWith("/manager-monitoring") || pathname?.startsWith("/analytics")} />}
        <Main href="/profile" label={collapsed ? "" : rtl ? "الملف الشخصي" : "Profile"} icon={UserRound} active={pathname?.startsWith("/profile")} />
        <Main href="/pos" label={collapsed ? "" : "POS"} icon={Store} active={pathname?.startsWith("/pos")} />
        {appsVisible && <Main href="/apps" label={collapsed ? "" : rtl ? "التطبيقات" : "Apps"} icon={AppWindow} active={pathname?.startsWith("/apps")} />}
        {settingsVisible && <Main href="/settings" label={collapsed ? "" : rtl ? "الإعدادات" : "Settings"} icon={Settings} active={pathname?.startsWith("/settings") && !pathname?.startsWith("/settings/meta-whatsapp") && !pathname?.startsWith("/settings/zatca")} />}
        <Main href="/subscriptions" label={collapsed ? "" : rtl ? "الاشتراكات" : "Subscriptions"} icon={CreditCard} active={pathname?.startsWith("/subscriptions")} />
        {agents.length > 0 && <div><button onClick={() => setAgentsOpen((value) => !value)} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-slate-300 hover:bg-slate-900"><Bot size={18} /><span className={`flex-1 text-start text-sm font-medium ${collapsed ? "hidden md:hidden" : "block"}`}>AI Add-ons</span>{!collapsed && (agentsOpen ? <ChevronDown size={15} /> : arrow)}</button>{agentsOpen && !collapsed && <div className={`mt-2 space-y-1 border-slate-800 ${rtl ? "mr-5 border-r pr-3" : "ml-5 border-l pl-3"}`}>{agents.map((item) => <Sub key={item.href} href={item.href} label={item.label} pathname={pathname} icon={item.icon} />)}</div>}</div>}
        {crmVisible && <Main href="/crm" label={collapsed ? "" : "CRM"} icon={UsersRound} active={pathname?.startsWith("/crm")} />}
        {clientsVisible && <Main href="/clients" label={collapsed ? "" : t("clients")} icon={Building2} active={pathname?.startsWith("/clients")} />}
      </nav>
      <div className="border-t border-slate-800 p-3"><div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/55 p-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 text-sm font-semibold">{initials}</div>{!collapsed && <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{userName || userEmail || "User"}</p><p className="text-[11px] uppercase tracking-[.13em] text-slate-500">{isKingAdmin ? "King Admin" : currentAccess?.profile.role?.replaceAll("_", " ") || "User"}</p></div>}<LogoutButton /></div></div>
    </div>
  </>;
}
function Main({ href, label, icon: Icon, active }: { href: string; label: string; icon: NavIcon; active?: boolean }) { return <Link href={href} className={`flex items-center gap-3 rounded-xl px-4 py-3 ${active ? "bg-cyan-500/10 text-cyan-300" : "text-slate-300 hover:bg-slate-900"}`}><Icon size={18} /><span className={`text-sm font-medium ${label ? "block" : "hidden"}`}>{label}</span></Link>; }
function Sub({ href, label, pathname, exact = false, icon: Icon = Sparkles }: { href: string; label: string; pathname: string | null; exact?: boolean; icon?: NavIcon }) { const active = exact ? pathname === href : pathname?.startsWith(href); return <Link href={href} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${active ? "bg-cyan-500/10 text-cyan-300" : "text-slate-500 hover:text-slate-300"}`}><Icon size={12} />{label}</Link>; }
