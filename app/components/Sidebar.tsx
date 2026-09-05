"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "./LogoutButton";
import type { AuthorizationContext } from "@/lib/auth/authorization";
import {
  LayoutDashboard,
  Sparkles,
  UsersRound,
  ChartNoAxesCombined,
  Megaphone,
  BriefcaseBusiness,
  MessagesSquare,
  Building2,
  ChevronDown,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";

interface SidebarProps { userEmail?: string; userName?: string; access?: AuthorizationContext | null; }

export default function Sidebar({ userEmail, userName, access }: SidebarProps) {
  const pathname = usePathname();
  const [loadedAccess, setLoadedAccess] = useState(access);
  const [crmOpen, setCrmOpen] = useState(pathname?.startsWith("/crm") ?? false);

  useEffect(() => {
    if (access !== undefined) return;
    fetch("/api/auth/access").then((r) => r.ok ? r.json() : null).then((d) => d && setLoadedAccess(d)).catch(() => undefined);
  }, [access]);

  useEffect(() => { if (pathname?.startsWith("/crm")) setCrmOpen(true); }, [pathname]);
  const currentAccess = access ?? loadedAccess;

  const navItems: { label: string; icon: LucideIcon; href: string; feature?: string; permission?: string }[] = [
    { label: "Dashboard", icon: LayoutDashboard, href: "/" },
    { label: "AI Sales", icon: Sparkles, href: "/ai-sales", feature: "ai_sales", permission: "view_ai_sales" },
    { label: "Analytics", icon: ChartNoAxesCombined, href: "/analytics", feature: "analytics", permission: "view_analytics" },
    { label: "AI Marketing", icon: Megaphone, href: "/ai-marketing", feature: "ai_marketing", permission: "view_ai_marketing" },
    { label: "AI HR", icon: BriefcaseBusiness, href: "/ai-hr", feature: "ai_hr", permission: "view_ai_hr" },
    { label: "AI Support", icon: MessagesSquare, href: "/ai-support", feature: "ai_support", permission: "view_ai_support" },
    { label: "Clients", icon: Building2, href: "/clients", permission: "manage_clients" },
  ];

  const canSee = (item: { feature?: string; permission?: string }) => !item.feature && !item.permission || currentAccess?.profile.role === "super_admin" || (item.feature && currentAccess?.features.includes(item.feature) && item.permission && currentAccess?.permissions.includes(item.permission));
  const crmVisible = currentAccess?.profile.role === "super_admin" || (currentAccess?.features.includes("crm") && currentAccess?.permissions.includes("view_crm"));
  const isActive = (href: string) => href === "/" ? pathname === "/" : pathname?.startsWith(href);

  const initials = userName ? userName.split(" ").map((n) => n[0]).join("").toUpperCase() : userEmail?.[0]?.toUpperCase() || "U";

  return (
    <div className="fixed left-0 top-0 flex h-screen w-64 flex-col border-r border-slate-800 bg-slate-950">
      <div className="border-b border-slate-800 p-6">
        <div className="text-2xl font-bold tracking-tight text-white">AVERO</div>
        <p className="mt-1 text-xs text-slate-400">AI Operations Platform</p>
      </div>

      <nav className="flex-1 space-y-2 overflow-y-auto p-4">
        {navItems.slice(0, 2).filter(canSee).map((item) => <NavItem key={item.href} item={item} active={!!isActive(item.href)} />)}

        {crmVisible && (
          <div>
            <button onClick={() => setCrmOpen((v) => !v)} className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors ${pathname?.startsWith("/crm") ? "border border-blue-600/30 bg-blue-600/20 text-blue-400" : "text-slate-300 hover:bg-slate-800/50"}`}>
              <UsersRound size={18} strokeWidth={1.8} /><span className="flex-1 text-sm font-medium">CRM</span>{crmOpen ? <ChevronDown size={15}/> : <ChevronRight size={15}/>} 
            </button>
            {crmOpen && (
              <div className="ml-5 mt-2 space-y-1 border-l border-slate-800 pl-3">
                <Sub href="/crm" label="CRM Hub" pathname={pathname} exact />
                <Sub href="/crm/sales" label="AI Sales CRM" pathname={pathname} />
                <Sub href="/crm/marketing" label="AI Marketing CRM" pathname={pathname} />
                <Sub href="/crm/hr" label="AI HR CRM" pathname={pathname} />
                <Sub href="/crm/support" label="AI Support CRM" pathname={pathname} />
              </div>
            )}
          </div>
        )}

        {navItems.slice(2).filter(canSee).map((item) => <NavItem key={item.href} item={item} active={!!isActive(item.href)} />)}
      </nav>

      <div className="space-y-3 border-t border-slate-800 p-4">
        <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-sm font-semibold text-white">{initials}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-white">{userName || userEmail || "User"}</p><p className="text-xs text-slate-400">Admin</p></div></div>
        <LogoutButton />
      </div>
    </div>
  );
}

function NavItem({ item, active }: { item: { label: string; icon: LucideIcon; href: string }; active: boolean }) { const Icon=item.icon; return <Link href={item.href} className={`flex items-center gap-3 rounded-lg px-4 py-3 transition-colors ${active ? "border border-blue-600/30 bg-blue-600/20 text-blue-400" : "text-slate-300 hover:bg-slate-800/50"}`}><Icon size={18} strokeWidth={1.8}/><span className="text-sm font-medium">{item.label}</span></Link> }
function Sub({ href, label, pathname, exact=false }: { href:string; label:string; pathname:string|null; exact?:boolean }) { const active=exact ? pathname===href : pathname?.startsWith(href); return <Link href={href} className={`block rounded-md px-3 py-2 text-xs transition ${active ? "bg-slate-800 text-blue-300" : "text-slate-500 hover:bg-slate-900 hover:text-slate-300"}`}>{label}</Link> }
