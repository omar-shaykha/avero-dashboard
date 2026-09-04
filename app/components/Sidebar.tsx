"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "./LogoutButton";

interface SidebarProps {
  userEmail?: string;
  userName?: string;
}

export default function Sidebar({ userEmail, userName }: SidebarProps) {
  const pathname = usePathname();

  const navItems = [
    { label: "Dashboard", icon: "📊", href: "/" },
    { label: "Leads", icon: "👥", href: "/leads" },
    { label: "Pipeline", icon: "📈", href: "/pipeline" },
    { label: "Analytics", icon: "📉", href: "/analytics" },
    { label: "AI Assistant", icon: "✨", href: "/assistant" },
    { label: "Settings", icon: "⚙️", href: "/settings" },
  ];

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
        {navItems.map((item) => {
          const active = isActive(item.href);
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
              <span className="text-lg">{item.icon}</span>
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
