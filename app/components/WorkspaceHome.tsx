"use client";

import Link from "next/link";
import { ArrowUpRight, Boxes, BrainCircuit, Building2, CreditCard, LayoutGrid, Settings2, ShieldCheck, ShoppingBag, Users } from "lucide-react";
import { useLanguage } from "./LanguageProvider";
import type { OsApp } from "@/lib/os/catalog";

type Props = { companyName: string; businessType: string; branchCount: number; apps: Record<OsApp, boolean>; canViewSettings: boolean; canViewIntegrations: boolean };

export default function WorkspaceHome({ companyName, businessType, branchCount, apps, canViewSettings, canViewIntegrations }: Props) {
  const { language } = useLanguage();
  const ar = language === "ar";
  const L = (en: string, arabic: string) => ar ? arabic : en;
  const products = [
    { key: "operations" as const, title: "AVERO Operations", description: L("Inventory, purchasing, production and accounting", "المخزون والمشتريات والإنتاج والمحاسبة"), href: "/operations", icon: Boxes },
    { key: "sell" as const, title: "AVERO Sell", description: L("Cashier and product management", "الكاشير وإدارة الأصناف"), href: "/pos?area=cashier", icon: CreditCard },
    { key: "go" as const, title: "AVERO GO", description: L("Pickup menu and customer orders", "منيو الاستلام وطلبات العملاء"), href: "/go", icon: ShoppingBag },
    { key: "intelligence" as const, title: "AVERO Intelligence", description: L("Your subscribed AI agents", "وكلاء الذكاء المشترك بهم"), href: "/ai-agents", icon: BrainCircuit },
  ];
  const visibleProducts = products.filter(({key}) => apps[key]);

  return <main className="mx-auto max-w-7xl space-y-8 px-5 py-8 md:px-8">
    <header className="rounded-3xl border border-cyan-400/15 bg-gradient-to-br from-slate-900 to-slate-950 p-7 md:p-9">
      <p className="text-xs font-bold uppercase tracking-[.24em] text-cyan-300">AVERO OS · {L("Control Center", "مركز التحكم")}</p>
      <h1 className="mt-3 text-3xl font-black md:text-4xl">{companyName}</h1>
      <p className="mt-3 text-slate-400">{L("One Business. One Account. One Operating System.", "شركة واحدة، حساب واحد، ونظام تشغيل واحد.")}</p>
      <div className="mt-6 flex flex-wrap gap-3 text-sm">
        {businessType && <span className="rounded-full border border-slate-700 px-4 py-2">{businessType}</span>}
        <span className="rounded-full border border-slate-700 px-4 py-2">{L("Active branches", "الفروع النشطة")}: {branchCount}</span>
      </div>
    </header>

    {(visibleProducts.length > 0 || apps.admin) && <section aria-labelledby="control-title">
      <h2 id="control-title" className="mb-4 text-xl font-bold">{L("Control Center", "مركز التحكم")}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {canViewSettings && <Link href="/settings" className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 hover:border-cyan-400/40"><Settings2 className="text-cyan-300"/><h3 className="mt-3 font-bold">{L("Company & team", "الشركة والفريق")}</h3><p className="mt-2 text-sm text-slate-400">{L("Company settings and users", "إعدادات الشركة والمستخدمون")}</p></Link>}
        <Link href="/profile" className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 hover:border-cyan-400/40"><Users className="text-cyan-300"/><h3 className="mt-3 font-bold">{L("My account", "حسابي")}</h3><p className="mt-2 text-sm text-slate-400">{L("Your profile and account details", "ملفك وبيانات حسابك")}</p></Link>
        {canViewIntegrations && <Link href="/apps" className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 hover:border-cyan-400/40"><Building2 className="text-cyan-300"/><h3 className="mt-3 font-bold">{L("Integrations", "التكاملات")}</h3><p className="mt-2 text-sm text-slate-400">{L("Connected services for this company", "الخدمات المرتبطة بهذه الشركة")}</p></Link>}
      </div>
    </section>}

    {visibleProducts.length > 0 && <section aria-labelledby="apps-title">
      <div className="mb-4 flex items-center gap-2"><LayoutGrid className="text-cyan-300" size={21}/><h2 id="apps-title" className="text-xl font-bold">{L("Your applications", "تطبيقاتك")}</h2></div>
      <div className="grid gap-4 sm:grid-cols-2">
        {visibleProducts.map(({ key, title, description, href, icon: Icon }) => <Link key={key} href={href} className="rounded-2xl border border-slate-700 bg-slate-900 p-6 transition hover:border-cyan-400/50"><div className="flex items-start justify-between"><Icon size={28} className="text-cyan-300"/><ArrowUpRight size={20} className="text-cyan-300"/></div><h3 className="mt-6 text-xl font-bold">{title}</h3><p className="mt-2 text-sm text-slate-400">{description}</p></Link>)}
      </div>
    </section>}

    {apps.admin && <Link href="/clients" className="flex items-center gap-3 rounded-2xl border border-amber-400/25 bg-amber-400/5 p-5 text-amber-200 hover:bg-amber-400/10"><ShieldCheck size={22}/><span className="font-semibold">AVERO Admin · {L("Platform management", "إدارة المنصة")}</span><ArrowUpRight size={19} className="ml-auto"/></Link>}
  </main>;
}
