"use client";

import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AveroBrand from "./AveroBrand";
import { useLanguage } from "./LanguageProvider";
import type { AuthorizationContext } from "@/lib/auth/authorization";
import { AppWindow, BarChart3, Bot, Boxes, Building2, GripVertical, LayoutGrid, Menu, PackagePlus, PanelLeftClose, PanelLeftOpen, ScanLine, Settings, ShoppingBag, ShoppingCart, Store, UsersRound, X } from "lucide-react";

interface SidebarProps { userEmail?: string; userName?: string; access?: AuthorizationContext | null; }
type NavIcon = ComponentType<{ size?: number; className?: string }>;
type PosArea = "cashier" | "add-items" | "purchasing";
type NavSectionKey = "monitoring" | "pos" | "cashier" | "add_items" | "purchasing" | "apps" | "settings" | "go" | "agents" | "crm" | "clients";

const DEFAULT_ORDER: NavSectionKey[] = ["monitoring","pos","cashier","add_items","purchasing","agents","crm","clients","apps","settings","go"];

function normalizeOrder(value: unknown): NavSectionKey[] {
  const input = Array.isArray(value) ? value.map(String) : [];
  const valid = input.filter((key, index) => DEFAULT_ORDER.includes(key as NavSectionKey) && input.indexOf(key) === index) as NavSectionKey[];
  if (valid.includes("pos")) {
    let afterPos = valid.indexOf("pos") + 1;
    for (const key of ["cashier", "add_items", "purchasing"] as const) {
      if (!valid.includes(key)) valid.splice(afterPos++, 0, key);
    }
  }
  return [...valid, ...DEFAULT_ORDER.filter((key) => !valid.includes(key))];
}

export default function Sidebar({ access }: SidebarProps) {
  const pathname = usePathname();
  const { t, language } = useLanguage();
  const rtl = language === "ar";
  const [loadedAccess, setLoadedAccess] = useState(access);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
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
    const syncRoute = () => {
      if (pathname?.startsWith("/pos")) {
        const q = new URLSearchParams(window.location.search);
        const raw = q.get("area") || "cashier";
        const area: PosArea = raw === "add-items" || raw === "products" ? "add-items" : raw === "purchasing" ? "purchasing" : "cashier";
        setCurrentArea(area);
      }
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
  const app = (key:string) => isKingAdmin || !!currentAccess?.features.includes(key);
  const has = (feature: string, permission: string) => isKingAdmin || !!(app("app_intelligence") && currentAccess?.features.includes(feature) && permitted(permission));
  const canModule = (...permissions: string[]) => isKingAdmin || isTenantAdmin || permissions.some((p) => permitted(p));
  const crmVisible = app("app_sell") && (isKingAdmin || !!(currentAccess?.features.includes("crm") && permitted("view_crm")));
  const monitoringVisible = app("app_manager") && canModule("analytics.view");
  const clientsVisible = isKingAdmin;
  const appsVisible = app("app_sell") && canModule("settings.view", "settings.manage");
  const settingsVisible = isKingAdmin || (currentAccess?.features.some(key => ["app_sell", "app_operations", "app_manager", "app_intelligence"].includes(key)) && canModule("settings.view", "settings.manage"));
  const agentsVisible = has("ai_sales", "view_ai_sales") || has("ai_marketing", "marketing.manage");
  const width = collapsed ? "md:w-20 w-72" : "md:w-64 w-72";
  const mobileTransform = mobileOpen ? "translate-x-0" : rtl ? "translate-x-full md:translate-x-0" : "-translate-x-full md:translate-x-0";
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
    monitoring: monitoringVisible ? <Main href="/manager-monitoring" label={collapsed ? "" : L("Manager", "المدير")} icon={BarChart3} active={pathname?.startsWith("/manager-monitoring") || pathname?.startsWith("/analytics")} /> : null,
    pos: app("app_sell") && canModule("sales.view", "sales.cashier", "sales.manage") ? <Main href="/pos" label={collapsed ? "" : "POS"} icon={Store} onClick={() => selectRoute("cashier")} /> : null,
    cashier: app("app_sell") && canModule("sales.view", "sales.cashier") ? <Main href="/pos?area=cashier" label={collapsed ? "" : L("Cashier", "الكاشير")} icon={ScanLine} active={pathname === "/pos" && currentArea === "cashier"} onClick={() => selectRoute("cashier")} /> : null,
    add_items: app("app_sell") && canModule("sales.view", "sales.manage") ? <Main href="/pos?area=add-items" label={collapsed ? "" : L("Add Items", "إضافة الأصناف")} icon={PackagePlus} active={pathname === "/pos" && currentArea === "add-items"} onClick={() => selectRoute("add-items")} /> : null,
    purchasing: app("app_sell") && canModule("purchasing.view", "purchasing.manage") ? <Main href="/pos?area=purchasing" label={collapsed ? "" : L("Purchasing", "المشتريات")} icon={ShoppingCart} active={pathname === "/pos" && currentArea === "purchasing"} onClick={() => selectRoute("purchasing")} /> : null,
    apps: appsVisible ? <Main href="/apps" label={collapsed ? "" : rtl ? "التطبيقات" : "Apps"} icon={AppWindow} active={pathname?.startsWith("/apps")} /> : null,
    settings: settingsVisible ? <Main href="/settings" label={collapsed ? "" : L("Settings", "الإعدادات")} icon={Settings} active={pathname?.startsWith("/settings")} /> : null,
    go: app("app_go") && app("app_sell") && canModule("sales.view", "sales.cashier", "sales.manage") ? <Main href="/go" label={collapsed ? "" : "AVERO GO"} icon={ShoppingBag} active={pathname === "/go" || Boolean(pathname?.startsWith("/go/"))} /> : null,
    agents: agentsVisible ? <Main href="/ai-agents" label={collapsed ? "" : "AI Agent"} icon={Bot} active={pathname?.startsWith("/ai-")} /> : null,
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
        {isKingAdmin && <Main href="/workspace" label={collapsed ? "" : L("Control Center", "مركز التحكم")} icon={LayoutGrid} active={pathname === "/workspace"}/>}
        {app("app_operations") && canModule("inventory.view", "inventory.manage", "purchasing.view", "purchasing.manage", "production.view", "production.manage", "sales.cost.view", "inventory.cost.view") && <Main href="/operations" label={collapsed ? "" : L("Operations", "العمليات")} icon={Boxes} active={pathname?.startsWith("/operations")}/>}
        {(isKingAdmin ? navOrder : ["monitoring", "pos", "cashier", "add_items", "purchasing", "agents", "crm", "apps", "settings", "go"] as NavSectionKey[]).map((key) => {
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

function Main({ href, label, icon: Icon, active, onClick }: { href: string; label: string; icon: NavIcon; active?: boolean; onClick?: () => void }) {
  return <Link href={href} onClick={onClick} className={`flex items-center gap-3 rounded-xl px-4 py-3 ${active ? "bg-cyan-500/10 text-cyan-300" : "text-slate-300 hover:bg-slate-900"}`}><Icon size={18} /><span className={`text-sm font-medium ${label ? "block" : "hidden"}`}>{label}</span></Link>;
}
