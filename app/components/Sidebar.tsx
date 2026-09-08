"use client";

import { useEffect, useState, type ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AveroBrand from "./AveroBrand";
import { useLanguage } from "./LanguageProvider";
import type { AuthorizationContext } from "@/lib/auth/authorization";
import { AppWindow, BarChart3, Bot, Building2, ChevronDown, ChevronRight, CreditCard, Menu, PanelLeftClose, PanelLeftOpen, Settings, Sparkles, Store, UsersRound, X } from "lucide-react";

interface SidebarProps { userEmail?: string; userName?: string; access?: AuthorizationContext | null; }
type NavIcon = ComponentType<{ size?: number; className?: string }>;
type NavItem = { label: string; href: string; show: boolean; icon?: NavIcon };
type PosArea = "cashier"|"inventory"|"suppliers"|"purchasing"|"production"|"recipes"|"subrecipes"|"products"|"customers"|"b2b"|"accounting";

export default function Sidebar({ access }: SidebarProps) {
  const pathname = usePathname();
  const { t, language } = useLanguage();
  const rtl = language === "ar";
  const [loadedAccess, setLoadedAccess] = useState(access);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [agentsOpen, setAgentsOpen] = useState(pathname?.startsWith("/ai-") ?? true);
  const [posOpen,setPosOpen]=useState(pathname?.startsWith("/pos") ?? false);
  const [settingsOpen,setSettingsOpen]=useState(pathname?.startsWith("/settings") ?? false);
  const [currentArea,setCurrentArea]=useState<PosArea>("cashier");

  useEffect(() => { if (access !== undefined) return; fetch("/api/auth/access").then((r) => r.ok ? r.json() : null).then((d) => d && setLoadedAccess(d)).catch(() => undefined); }, [access]);
  useEffect(() => {
    if (pathname?.startsWith("/ai-")) setAgentsOpen(true);
    if (pathname?.startsWith("/pos")) {
      setPosOpen(true);
      const syncArea=()=>{const a=new URLSearchParams(window.location.search).get("area") as PosArea|null;if(a)setCurrentArea(a);else setCurrentArea("cashier")};
      syncArea();
      window.addEventListener("popstate",syncArea);
      setMobileOpen(false);
      return ()=>window.removeEventListener("popstate",syncArea);
    }
    if(pathname?.startsWith("/settings"))setSettingsOpen(true);
    setMobileOpen(false);
  }, [pathname]);
  useEffect(() => { document.documentElement.classList.toggle("sidebar-collapsed", collapsed); return () => document.documentElement.classList.remove("sidebar-collapsed"); }, [collapsed]);

  const currentAccess = access ?? loadedAccess;
  const isKingAdmin = currentAccess?.profile.role === "king_admin";
  const isTenantAdmin = currentAccess?.profile.role === "super_admin" || currentAccess?.profile.role === "admin";
  const aliases: Record<string, string> = { view_crm: "crm.view", view_analytics: "analytics.view", view_ai_sales: "sales.view" };
  const permitted = (permission: string) => isKingAdmin || !!currentAccess?.permissions.includes(aliases[permission] || permission);
  const has = (feature: string, permission: string) => isKingAdmin || !!(currentAccess?.features.includes(feature) && permitted(permission));
  const canModule=(...permissions:string[])=>!currentAccess||isKingAdmin||isTenantAdmin||permissions.some(p=>permitted(p));
  const crmVisible = has("crm", "view_crm");
  const monitoringVisible = isKingAdmin || isTenantAdmin || permitted("analytics.view");
  const clientsVisible = isKingAdmin;
  const appsVisible = isKingAdmin || permitted("apps.view");
  const settingsVisible = isKingAdmin || isTenantAdmin || permitted("settings.view");
  const agents: NavItem[] = [
    { label: "AI Add-ons", href: "/ai-agents", show: true, icon: Sparkles },
    { label: "Leo — Sales", href: "/ai-sales", show: has("ai_sales", "view_ai_sales"), icon: Bot },
  ].filter((item) => item.show);
  const posItems:{key:PosArea;en:string;ar:string;show:boolean}[]=[
    {key:"cashier",en:"Cashier",ar:"الكاشير",show:canModule("sales.view","sales.cashier")},
    {key:"inventory",en:"Inventory",ar:"المخزون",show:canModule("inventory.view")},
    {key:"suppliers",en:"Suppliers",ar:"الموردون",show:canModule("suppliers.view")},
    {key:"purchasing",en:"Purchasing",ar:"المشتريات",show:canModule("purchasing.view")},
    {key:"production",en:"Production",ar:"الإنتاج",show:canModule("production.view")},
    {key:"recipes",en:"Recipes",ar:"الوصفات",show:canModule("production.view")},
    {key:"subrecipes",en:"Sub Recipe",ar:"الوصفات الفرعية",show:canModule("production.view")},
    {key:"products",en:"Products",ar:"المنتجات",show:canModule("sales.view","sales.manage")},
    {key:"customers",en:"Customers",ar:"العملاء",show:canModule("customers.view","customers.manage","sales.view")},
    {key:"b2b",en:"B2B",ar:"المنشآت B2B",show:canModule("b2b.view","b2b.manage")},
    {key:"accounting",en:"Accounting",ar:"المحاسبة",show:canModule("accounting.view","sales.cost.view")},
  ].filter(x=>x.show);
  const arrow = rtl ? <ChevronRight size={15} className="rotate-180" /> : <ChevronRight size={15} />;
  const width = collapsed ? "md:w-20 w-72" : "md:w-64 w-72";
  const mobileTransform = mobileOpen ? "translate-x-0" : rtl ? "translate-x-full md:translate-x-0" : "-translate-x-full md:translate-x-0";
  const subBorder=rtl?"mr-5 border-r pr-3":"ml-5 border-l pl-3";

  return <>
    <button onClick={() => setMobileOpen((value) => !value)} className={`fixed top-3 z-50 rounded-xl border border-cyan-400/30 bg-slate-950/95 p-3 text-cyan-200 shadow-2xl md:hidden ${rtl ? "right-3" : "left-3"}`}>{mobileOpen ? <X size={20} /> : <Menu size={20} />}</button>
    {mobileOpen && <button aria-label="Close menu" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-30 bg-black/55 backdrop-blur-sm md:hidden" />}
    <div className={`fixed top-0 z-40 flex h-screen ${width} ${mobileTransform} flex-col border-slate-800/80 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.10),transparent_28%),#020617] transition-all duration-300 ${rtl ? "right-0 border-l" : "left-0 border-r"}`} dir={rtl ? "rtl" : "ltr"}>
      <div className="border-b border-slate-800/80 px-4 py-4"><div className="flex items-center justify-between gap-2">{collapsed ? <div className="scale-90"><AveroBrand compact /></div> : <AveroBrand />}<button onClick={() => setCollapsed((value) => !value)} className="hidden rounded-xl border border-slate-800 p-2 text-slate-400 hover:bg-slate-900 hover:text-white md:block">{collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}</button></div></div>
      <nav className="flex-1 space-y-2 overflow-y-auto p-3">
        {monitoringVisible && <Main href="/manager-monitoring" label={collapsed ? "" : "Manager Monitoring"} icon={BarChart3} active={pathname?.startsWith("/manager-monitoring") || pathname?.startsWith("/analytics")} />}

        <div>
          <button onClick={()=>{if(collapsed){setCollapsed(false);setPosOpen(true)}else setPosOpen(v=>!v)}} className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 ${pathname?.startsWith("/pos")?"bg-cyan-500/10 text-cyan-300":"text-slate-300 hover:bg-slate-900"}`}><Store size={18}/><span className={`flex-1 text-start text-sm font-medium ${collapsed?"hidden":"block"}`}>POS</span>{!collapsed&&(posOpen?<ChevronDown size={15}/>:arrow)}</button>
          {posOpen&&!collapsed&&<div className={`mt-2 space-y-1 border-slate-800 ${subBorder}`}>
            {posItems.map(item=><Link key={item.key} href={`/pos?area=${item.key}`} onClick={()=>{setCurrentArea(item.key);setMobileOpen(false)}} className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs ${pathname?.startsWith("/pos")&&currentArea===item.key?"bg-cyan-500/10 font-bold text-cyan-300":"text-slate-500 hover:bg-slate-900 hover:text-slate-300"}`}><span>{rtl?item.ar:item.en}</span>{pathname?.startsWith("/pos")&&currentArea===item.key&&<span className="text-[10px]">●</span>}</Link>)}
          </div>}
        </div>

        {appsVisible && <Main href="/apps" label={collapsed ? "" : rtl ? "التطبيقات" : "Apps"} icon={AppWindow} active={pathname?.startsWith("/apps")} />}

        {settingsVisible&&<div>
          <button onClick={()=>{if(collapsed){setCollapsed(false);setSettingsOpen(true)}else setSettingsOpen(v=>!v)}} className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 ${pathname?.startsWith("/settings")?"bg-cyan-500/10 text-cyan-300":"text-slate-300 hover:bg-slate-900"}`}><Settings size={18}/><span className={`flex-1 text-start text-sm font-medium ${collapsed?"hidden":"block"}`}>{rtl?"الإعدادات":"Settings"}</span>{!collapsed&&(settingsOpen?<ChevronDown size={15}/>:arrow)}</button>
          {settingsOpen&&!collapsed&&<div className={`mt-2 space-y-1 border-slate-800 ${subBorder}`}>
            <SubLink href="/settings" label={rtl?"إعدادات الشركة":"Company Settings"} active={pathname==="/settings"}/>
            <SubLink href="/settings/pos" label={rtl?"نقاط البيع والطباعة والفاتورة":"POS, Printing & Invoice"} active={pathname?.startsWith("/settings/pos")}/>
            <SubLink href="/settings/zatca" label={rtl?"هيئة الزكاة والضريبة":"ZATCA"} active={pathname?.startsWith("/settings/zatca")}/>
          </div>}
        </div>}

        <Main href="/subscriptions" label={collapsed ? "" : rtl ? "الاشتراكات" : "Subscriptions"} icon={CreditCard} active={pathname?.startsWith("/subscriptions")} />
        {agents.length > 0 && <div><button onClick={() => setAgentsOpen((value) => !value)} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-slate-300 hover:bg-slate-900"><Bot size={18} /><span className={`flex-1 text-start text-sm font-medium ${collapsed ? "hidden" : "block"}`}>AI Add-ons</span>{!collapsed && (agentsOpen ? <ChevronDown size={15} /> : arrow)}</button>{agentsOpen && !collapsed && <div className={`mt-2 space-y-1 border-slate-800 ${subBorder}`}>{agents.map((item) => <Sub key={item.href} href={item.href} label={item.label} pathname={pathname} icon={item.icon} />)}</div>}</div>}
        {crmVisible && <Main href="/crm" label={collapsed ? "" : "CRM"} icon={UsersRound} active={pathname?.startsWith("/crm")} />}
        {clientsVisible && <Main href="/clients" label={collapsed ? "" : t("clients")} icon={Building2} active={pathname?.startsWith("/clients")} />}
      </nav>
    </div>
  </>;
}
function Main({ href, label, icon: Icon, active }: { href: string; label: string; icon: NavIcon; active?: boolean }) { return <Link href={href} className={`flex items-center gap-3 rounded-xl px-4 py-3 ${active ? "bg-cyan-500/10 text-cyan-300" : "text-slate-300 hover:bg-slate-900"}`}><Icon size={18} /><span className={`text-sm font-medium ${label ? "block" : "hidden"}`}>{label}</span></Link>; }
function SubLink({href,label,active}:{href:string;label:string;active?:boolean}){return <Link href={href} className={`block rounded-lg px-3 py-2 text-xs ${active?"bg-cyan-500/10 font-bold text-cyan-300":"text-slate-500 hover:bg-slate-900 hover:text-slate-300"}`}>{label}</Link>}
function Sub({ href, label, pathname, exact = false, icon: Icon = Sparkles }: { href: string; label: string; pathname: string | null; exact?: boolean; icon?: NavIcon }) { const active = exact ? pathname === href : pathname?.startsWith(href); return <Link href={href} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${active ? "bg-cyan-500/10 text-cyan-300" : "text-slate-500 hover:text-slate-300"}`}><Icon size={12} />{label}</Link>; }
