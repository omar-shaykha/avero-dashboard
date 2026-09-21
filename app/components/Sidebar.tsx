"use client";

import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AveroBrand from "./AveroBrand";
import { useLanguage } from "./LanguageProvider";
import type { AuthorizationContext } from "@/lib/auth/authorization";
import { AppWindow, BarChart3, Bot, Building2, ChevronDown, ChevronRight, CreditCard, GripVertical, Menu, Megaphone, PanelLeftClose, PanelLeftOpen, Settings, Store, UsersRound, X } from "lucide-react";

interface SidebarProps { userEmail?: string; userName?: string; access?: AuthorizationContext | null; }
type NavIcon = ComponentType<{ size?: number; className?: string }>;
type NavItem = { label: string; href: string; show: boolean; icon?: NavIcon };
type PosArea = "cashier" | "add-items";
type NavSectionKey = "monitoring" | "pos" | "apps" | "settings" | "subscriptions" | "agents" | "crm" | "clients";

const DEFAULT_ORDER: NavSectionKey[] = ["monitoring","pos","apps","settings","subscriptions","agents","crm","clients"];

function normalizeOrder(value: unknown): NavSectionKey[] {
  const input = Array.isArray(value) ? value.map(String) : [];
  const valid = input.filter((key, index) => DEFAULT_ORDER.includes(key as NavSectionKey) && input.indexOf(key) === index) as NavSectionKey[];
  return [...valid, ...DEFAULT_ORDER.filter((key) => !valid.includes(key))];
}

export default function Sidebar({ access }: SidebarProps) {
  const pathname = usePathname();
  const { t, language } = useLanguage();
  const rtl = language === "ar";
  const [loadedAccess, setLoadedAccess] = useState(access);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [agentsOpen, setAgentsOpen] = useState(pathname?.startsWith("/ai-") ?? true);
  const [posOpen, setPosOpen] = useState(pathname?.startsWith("/pos") ?? false);
  const [settingsOpen, setSettingsOpen] = useState(pathname?.startsWith("/settings") ?? false);
  const [currentArea, setCurrentArea] = useState<PosArea>("cashier");
  const [navOrder, setNavOrder] = useState<NavSectionKey[]>(DEFAULT_ORDER);
  const [dragging, setDragging] = useState<NavSectionKey | null>(null);
  const [orderLoaded, setOrderLoaded] = useState(false);
  const [orderState, setOrderState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    if (access !== undefined) return;
    fetch("/api/auth/access")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d && setLoadedAccess(d))
      .catch(() => undefined);
  }, [access]);

  useEffect(() => {
    if (pathname?.startsWith("/ai-")) setAgentsOpen(true);
    const syncRoute = () => {
      if (pathname?.startsWith("/pos")) {
        const q = new URLSearchParams(window.location.search);
        const raw = q.get("area") || "cashier";
        const area: PosArea = raw === "add-items" || raw === "products" ? "add-items" : "cashier";
        setPosOpen(true);
        setCurrentArea(area);
      }
      if (pathname?.startsWith("/settings")) setSettingsOpen(true);
    };
    syncRoute();
    window.addEventListener("popstate", syncRoute);
    setMobileOpen(false);
    return () => window.removeEventListener("popstate", syncRoute);
  }, [pathname]);

  useEffect(() => {
    document.documentElement.classList.toggle("sidebar-collapsed", collapsed);
    return () => document.documentElement.classList.remove("sidebar-collapsed");
  }, [collapsed]);

  const currentAccess = access ?? loadedAccess;
  const isKingAdmin = currentAccess?.profile.role === "king_admin";
  const isTenantAdmin = currentAccess?.profile.role === "super_admin" || currentAccess?.profile.role === "admin";

  useEffect(() => {
    if (!isKingAdmin || orderLoaded) return;
    setOrderLoaded(true);
    fetch("/api/navigation-order", { cache: "no-store" })
      .then(async (r) => r.ok ? r.json() : null)
      .then((d) => d?.order && setNavOrder(normalizeOrder(d.order)))
      .catch(() => undefined);
  }, [isKingAdmin, orderLoaded]);

  const aliases: Record<string, string> = {
    view_crm: "crm.view",
    view_analytics: "analytics.view",
    view_ai_sales: "sales.view",
    view_ai_marketing: "marketing.view",
  };
  const permitted = (permission: string) => isKingAdmin || !!currentAccess?.permissions.includes(aliases[permission] || permission);
  const has = (feature: string, permission: string) => isKingAdmin || !!(currentAccess?.features.includes(feature) && permitted(permission));
  const canModule = (...permissions: string[]) => !currentAccess || isKingAdmin || isTenantAdmin || permissions.some((p) => permitted(p));
  const crmVisible = has("crm", "view_crm");
  const monitoringVisible = isKingAdmin || isTenantAdmin || permitted("analytics.view");
  const clientsVisible = isKingAdmin;
  const appsVisible = isKingAdmin || permitted("apps.view");
  const settingsVisible = isKingAdmin || isTenantAdmin || permitted("settings.view");
  const agents: NavItem[] = [
    { label: "Leo — Sales", href: "/ai-sales", show: has("ai_sales", "view_ai_sales"), icon: Bot },
    { label: "Foxy — Marketing", href: "/ai-marketing", show: has("ai_marketing", "view_ai_marketing"), icon: Megaphone },
  ].filter((item) => item.show);

  const arrow = rtl ? <ChevronRight size={15} className="rotate-180" /> : <ChevronRight size={15} />;
  const width = collapsed ? "md:w-20 w-72" : "md:w-64 w-72";
  const mobileTransform = mobileOpen ? "translate-x-0" : rtl ? "translate-x-full md:translate-x-0" : "-translate-x-full md:translate-x-0";
  const subBorder = rtl ? "mr-5 border-r pr-3" : "ml-5 border-l pl-3";
  const L = (en: string, ar: string) => rtl ? ar : en;
  const selectRoute = (area: PosArea) => { setCurrentArea(area); setMobileOpen(false); };

  async function persistOrder(order: NavSectionKey[]) {
    if (!isKingAdmin) return;
    setOrderState("saving");
    try {
      const r = await fetch("/api/navigation-order", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order }),
      });
      if (!r.ok) throw new Error("save failed");
      setOrderState("saved");
      window.setTimeout(() => setOrderState("idle"), 1400);
    } catch {
      setOrderState("error");
    }
  }

  function dropOn(target: NavSectionKey) {
    if (!isKingAdmin || !dragging || dragging === target) {
      setDragging(null);
      return;
    }
    const next = navOrder.filter((key) => key !== dragging);
    const index = next.indexOf(target);
    next.splice(index < 0 ? next.length : index, 0, dragging);
    setNavOrder(next);
    setDragging(null);
    void persistOrder(next);
  }

  const sections: Record<NavSectionKey, ReactNode> = {
    monitoring: monitoringVisible ? <Main href="/manager-monitoring" label={collapsed ? "" : "Manager Monitoring"} icon={BarChart3} active={pathname?.startsWith("/manager-monitoring") || pathname?.startsWith("/analytics")} /> : null,
    pos: canModule("sales.view", "sales.cashier", "sales.manage") ? <div>
      <button onClick={() => { if (collapsed) { setCollapsed(false); setPosOpen(true); } else setPosOpen((v) => !v); }} className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 ${pathname?.startsWith("/pos") ? "bg-cyan-500/10 text-cyan-300" : "text-slate-300 hover:bg-slate-900"}`}>
        <Store size={18} />
        <span className={`flex-1 text-start text-sm font-medium ${collapsed ? "hidden" : "block"}`}>POS</span>
        {!collapsed && (posOpen ? <ChevronDown size={15} /> : arrow)}
      </button>
      {posOpen && !collapsed && <div className={`mt-2 space-y-1 border-slate-800 ${subBorder}`}>
        {canModule("sales.view", "sales.cashier") && <ModuleLink href="/pos?area=cashier" label={L("Cashier", "الكاشير")} active={pathname?.startsWith("/pos") && currentArea === "cashier"} onClick={() => selectRoute("cashier")} />}
        {canModule("sales.view", "sales.manage") && <ModuleLink href="/pos?area=add-items" label={L("Add Items", "إضافة الأصناف")} active={pathname?.startsWith("/pos") && currentArea === "add-items"} onClick={() => selectRoute("add-items")} />}
      </div>}
    </div> : null,
    apps: appsVisible ? <Main href="/apps" label={collapsed ? "" : rtl ? "التطبيقات" : "Apps"} icon={AppWindow} active={pathname?.startsWith("/apps")} /> : null,
    settings: settingsVisible ? <div>
      <button onClick={() => { if (collapsed) { setCollapsed(false); setSettingsOpen(true); } else setSettingsOpen((v) => !v); }} className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 ${pathname?.startsWith("/settings") ? "bg-cyan-500/10 text-cyan-300" : "text-slate-300 hover:bg-slate-900"}`}>
        <Settings size={18} />
        <span className={`flex-1 text-start text-sm font-medium ${collapsed ? "hidden" : "block"}`}>{rtl ? "الإعدادات" : "Settings"}</span>
        {!collapsed && (settingsOpen ? <ChevronDown size={15} /> : arrow)}
      </button>
      {settingsOpen && !collapsed && <div className={`mt-2 space-y-1 border-slate-800 ${subBorder}`}>
        <SubLink href="/settings" label={rtl ? "إعدادات الشركة" : "Company Settings"} active={pathname === "/settings"} />
        <SubLink href="/settings/cashier" label={rtl ? "إعدادات الكاشير" : "Cashier Settings"} active={pathname?.startsWith("/settings/cashier")} />
        <SubLink href="/settings/pos" label={rtl ? "نقاط البيع والطباعة والفاتورة" : "POS, Printing & Invoice"} active={pathname?.startsWith("/settings/pos")} />
        <SubLink href="/settings/zatca" label={rtl ? "هيئة الزكاة والضريبة" : "ZATCA"} active={pathname?.startsWith("/settings/zatca")} />
      </div>}
    </div> : null,
    subscriptions: <Main href="/subscriptions" label={collapsed ? "" : rtl ? "الاشتراكات" : "Subscriptions"} icon={CreditCard} active={pathname?.startsWith("/subscriptions")} />,
    agents: agents.length ? <div>
      <button onClick={() => { if (collapsed) { setCollapsed(false); setAgentsOpen(true); } else setAgentsOpen((value) => !value); }} className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 ${pathname?.startsWith("/ai-") ? "bg-cyan-500/10 text-cyan-300" : "text-slate-300 hover:bg-slate-900"}`}>
        <Bot size={18} />
        <span className={`flex-1 text-start text-sm font-medium ${collapsed ? "hidden" : "block"}`}>{L("AI AGENT", "AI AGENT")}</span>
        {!collapsed && (agentsOpen ? <ChevronDown size={15} /> : arrow)}
      </button>
      {agentsOpen && !collapsed && <div className={`mt-2 space-y-1 border-slate-800 ${subBorder}`}>
        {agents.map((item) => <Sub key={item.href} href={item.href} label={item.label} pathname={pathname} icon={item.icon} />)}
      </div>}
    </div> : null,
    crm: crmVisible ? <Main href="/crm" label={collapsed ? "" : "CRM"} icon={UsersRound} active={pathname?.startsWith("/crm")} /> : null,
    clients: clientsVisible ? <Main href="/clients" label={collapsed ? "" : t("clients")} icon={Building2} active={pathname?.startsWith("/clients")} /> : null,
  };

  return <>
    <button onClick={() => setMobileOpen((value) => !value)} className={`fixed top-3 z-50 rounded-xl border border-cyan-400/30 bg-slate-950/95 p-3 text-cyan-200 shadow-2xl md:hidden ${rtl ? "right-3" : "left-3"}`}>{mobileOpen ? <X size={20} /> : <Menu size={20} />}</button>
    {mobileOpen && <button aria-label="Close menu" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-30 bg-black/55 backdrop-blur-sm md:hidden" />}

    <div className={`fixed top-0 z-40 flex h-screen ${width} ${mobileTransform} flex-col border-slate-800/80 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.10),transparent_28%),#020617] transition-all duration-300 ${rtl ? "right-0 border-l" : "left-0 border-r"}`} dir={rtl ? "rtl" : "ltr"}>
      <div className="border-b border-slate-800/80 px-4 py-4">
        <div className="flex items-center justify-between gap-2">
          {collapsed ? <div className="scale-90"><AveroBrand compact /></div> : <AveroBrand />}
          <button onClick={() => setCollapsed((value) => !value)} className="hidden rounded-xl border border-slate-800 p-2 text-slate-400 hover:bg-slate-900 hover:text-white md:block">{collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}</button>
        </div>
        {isKingAdmin && !collapsed && <div className="mt-3 flex items-center justify-between rounded-lg border border-amber-400/15 bg-amber-400/5 px-3 py-2 text-[10px] font-bold uppercase tracking-[.12em] text-amber-300"><span>KING layout · drag sections</span><span>{orderState === "saving" ? "Saving…" : orderState === "saved" ? "Saved" : orderState === "error" ? "Save failed" : ""}</span></div>}
      </div>

      <nav className="flex-1 space-y-2 overflow-y-auto p-3">
        {navOrder.map((key) => {
          const content = sections[key];
          if (!content) return null;
          return <div
            key={key}
            draggable={Boolean(isKingAdmin && !collapsed)}
            onDragStart={() => setDragging(key)}
            onDragEnd={() => setDragging(null)}
            onDragOver={(event) => { if (isKingAdmin) event.preventDefault(); }}
            onDrop={(event) => { event.preventDefault(); dropOn(key); }}
            className={`group relative rounded-xl transition ${dragging === key ? "opacity-45" : ""}`}
          >
            {isKingAdmin && !collapsed && <div className={`absolute top-1/2 z-10 -translate-y-1/2 cursor-grab text-slate-700 opacity-0 transition group-hover:opacity-100 active:cursor-grabbing ${rtl ? "left-1" : "right-1"}`} title="Drag to reorder"><GripVertical size={14}/></div>}
            {content}
          </div>;
        })}
      </nav>
    </div>
  </>;
}

function Main({ href, label, icon: Icon, active }: { href: string; label: string; icon: NavIcon; active?: boolean }) {
  return <Link href={href} className={`flex items-center gap-3 rounded-xl px-4 py-3 ${active ? "bg-cyan-500/10 text-cyan-300" : "text-slate-300 hover:bg-slate-900"}`}><Icon size={18} /><span className={`text-sm font-medium ${label ? "block" : "hidden"}`}>{label}</span></Link>;
}

function ModuleLink({ href, label, active, onClick }: { href: string; label: string; active?: boolean; onClick?: () => void }) {
  return <Link href={href} onClick={onClick} className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs ${active ? "bg-cyan-500/10 font-bold text-cyan-300" : "text-slate-500 hover:bg-slate-900 hover:text-slate-300"}`}><span>{label}</span>{active && <span className="text-[9px]">●</span>}</Link>;
}

function SubLink({ href, label, active }: { href: string; label: string; active?: boolean }) {
  return <Link href={href} className={`block rounded-lg px-3 py-2 text-xs ${active ? "bg-cyan-500/10 font-bold text-cyan-300" : "text-slate-500 hover:bg-slate-900 hover:text-slate-300"}`}>{label}</Link>;
}

function Sub({ href, label, pathname, exact = false, icon: Icon = Bot }: { href: string; label: string; pathname: string | null; exact?: boolean; icon?: NavIcon }) {
  const active = exact ? pathname === href : pathname?.startsWith(href);
  return <Link href={href} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${active ? "bg-cyan-500/10 text-cyan-300" : "text-slate-500 hover:text-slate-300"}`}><Icon size={12} />{label}</Link>;
}
