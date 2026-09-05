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
  type LucideIcon,
} from "lucide-react";

interface SidebarProps {
  userEmail?: string;
  userName?: string;
  access?: AuthorizationContext | null;
}

export default function Sidebar({ userEmail, userName, access }: SidebarProps) {
  const pathname = usePathname();
  const [loadedAccess, setLoadedAccess] = useState(access);
  useEffect(() => {
    if (access !== undefined) return;
    fetch("/api/auth/access")
      .then((response) => response.ok ? response.json() : null)
      .then((data) => data && setLoadedAccess(data))
      .catch(() => undefined);
  }, [access]);
  const currentAccess = access ?? loadedAccess;

  const navItems: {
    label: string;
    icon: LucideIcon;
    href: string;
    feature?: string;
    permission?: string;
  }[] = [
    { label: "Dashboard", icon: LayoutDashboard, href: "/" },
    { label: "AI Sales", icon: Sparkles, href: "/ai-sales", feature: "ai_sales", permission: "view_ai_sales" },
    { label: "CRM", icon: UsersRound, href: "/crm", feature: "crm", permission: "view_crm" },
    { label: "Analytics", icon: ChartNoAxesCombined, href: "/analytics", feature: "analytics", permission: "view_analytics" },
    { label: "AI Marketing", icon: Megaphone, href: "/ai-marketing", feature: "ai_marketing", permission: "view_ai_marketing" },
    { label: "AI HR", icon: BriefcaseBusiness, href: "/ai-hr", feature: "ai_hr", permission: "view_ai_hr" },
    { label: "AI Support", icon: MessagesSquare, href: "/ai-support", feature: "ai_support", permission: "view_ai_support" },
    { label: "Clients", icon: Building2, href: "/clients", permission: "manage_clients" },
  ];
  const visibleNavItems = navItems.filter((item) =>
    !item.feature && !item.permission ||
    currentAccess?.profile.role === "super_admin" ||
    (item.feature && currentAccess?.features.includes(item.feature) &&
      item.permission && currentAccess?.permissions.includes(item.permission))
  );

  const isActive = (href: string) => {
    if (href === "/" && pathname === "/") return true;
    if (href !== "/" && pathname?.startsWith(href)) return true;
    return false;
  };

  const initials = userName
    ? userName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : userEmail?.[0]?.toUpperCase() || "U";

  return (
    <div className="fixed left-0 top-0 h-screen w-64 bg-slate-950 border-r border-slate-800 flex flex-col">
      {/* Logo Section */}
      <div className="p-6 border-b border-slate-800">
        <div className="text-2xl font-bold tracking-tight">
          <span className="text-white">AVERO</span>
        </div>
        <p className="text-xs text-slate-400 mt-1">AI Sales Dashboard</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {visibleNavItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                active
                  ? "bg-blue-600/20 text-blue-400 border border-blue-600/30"
                  : "text-slate-300 hover:bg-slate-800/50"
              }`}
            >
              <Icon size={18} strokeWidth={1.8} />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="border-t border-slate-800 p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold text-sm">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {userName || userEmail || "User"}
            </p>
            <p className="text-xs text-slate-400">Admin</p>
          </div>
        </div>
        <LogoutButton />
      </div>
    </div>
  );
}