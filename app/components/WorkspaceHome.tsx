"use client";

import Link from "next/link";
import { ArrowUpRight, BrainCircuit, CreditCard, Factory, Gift, Landmark, Settings2, ShieldCheck, ShoppingCart, Users, Warehouse, Activity, Layers3, BadgeCheck } from "lucide-react";
import { useLanguage } from "./LanguageProvider";
import type { OperationsArea, OsApp } from "@/lib/os/catalog";

type Props = { companyName: string; businessType: string; branchCount: number; apps: Record<OsApp, boolean>; operationsAreas: OperationsArea[]; canViewSettings: boolean; canViewIntegrations: boolean };

export default function WorkspaceHome({ companyName, businessType, branchCount, apps, operationsAreas, canViewSettings }: Props) {
  const { language } = useLanguage();
  const ar = language === "ar";
  const L = (en: string, arabic: string) => ar ? arabic : en;
  const products = [
    { key: "sell" as const, title: "AVERO Sell", description: L("Cashier and product management", "الكاشير وإدارة الأصناف"), href: "/pos?area=cashier", icon: CreditCard },
     { key: "intelligence" as const, title: "AVERO Intelligence", description: L("AI workforce and department agents", "فريق الذكاء الاصطناعي ووكلاء الأقسام"), href: "/ai-agents", icon: BrainCircuit },
    { key: "hr" as const, title: L("HR & Employees", "الموارد البشرية والموظفون"), description: L("Enabled subscription", "اشتراك مفعّل"), href: "/hr", icon: Users },
    { key: "loyalty" as const, title: L("Loyalty & Promotions", "الولاء والعروض"), description: L("Enabled subscription", "اشتراك مفعّل"), href: "/loyalty", icon: Gift },
    { key: "zatca" as const, title: "ZATCA Fatoora", description: L("Enabled subscription", "اشتراك مفعّل"), href: "/apps/zatca", icon: BadgeCheck },
  ];
  const visibleProducts = [
    ...(["inventory", "purchasing", "production", "accounting"] as const).filter(area => operationsAreas.includes(area)).map(area => ({
      key: area,
      title: ({ inventory: L("Inventory","المخزون"), purchasing: L("Purchasing","المشتريات"), production: L("Production","الإنتاج"), accounting: L("Accounting","المحاسبة") })[area],
      description: L("Company operations", "عمليات الشركة"),
      href: `/operations?area=${area}`,
      icon: ({ inventory: Warehouse, purchasing: ShoppingCart, production: Factory, accounting: Landmark })[area],
    })),
    ...products.filter(({key})=>apps[key]),
  ];
  const enabledApps = visibleProducts.length;

  return <main className="mx-auto max-w-[1500px] space-y-7 px-4 py-6 md:px-8 md:py-8">
    <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/65 p-6 md:p-8">
      <div className="absolute -right-20 -top-28 h-72 w-72 rounded-full bg-cyan-400/[.055] blur-3xl"/>
      <div className="relative flex flex-col gap-7 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/15 bg-cyan-400/[.055] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[.18em] text-cyan-200"><span className="h-1.5 w-1.5 rounded-full bg-cyan-300"/> AVERO OS · {L("Control Center","مركز التحكم")}</div>
          <h1 className="mt-5 text-3xl font-semibold tracking-[-.04em] md:text-5xl">{companyName}</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">{L("One Business. One Account. One Operating System.","شركة واحدة، حساب واحد، ونظام تشغيل واحد.")}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {businessType && <span className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-1.5 text-xs text-slate-400">{businessType}</span>}
            <span className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-1.5 text-xs text-slate-400">{branchCount} {L("active branches","فروع نشطة")}</span>
          </div>
        </div>
        <div className="grid min-w-full grid-cols-2 gap-3 sm:min-w-[420px]">
          <MiniStat icon={<Layers3 size={15}/>} label={L("Enabled modules","الوحدات المفعلة")} value={String(enabledApps)}/>
          <MiniStat icon={<Activity size={15}/>} label={L("System status","حالة النظام")} value={L("Operational","يعمل")}/>
        </div>
      </div>
    </section>

    <section>
      <div className="mb-4"><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-slate-500">{L("Workspace","مساحة العمل")}</p><h2 className="mt-1 text-xl font-semibold tracking-tight">{L("Business applications","تطبيقات الأعمال")}</h2></div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visibleProducts.map(({key,title,description,href,icon:Icon})=><Link key={key} href={href} className="group rounded-2xl border border-slate-800 bg-slate-900/55 p-5 transition hover:-translate-y-0.5 hover:border-cyan-400/25 hover:bg-slate-900/80">
          <div className="flex items-start justify-between"><div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/10 bg-cyan-400/[.055] text-cyan-200"><Icon size={19}/></div><ArrowUpRight size={16} className="text-slate-600 transition group-hover:text-cyan-200"/></div>
          <h3 className="mt-5 text-base font-semibold">{title}</h3><p className="mt-1.5 text-xs leading-5 text-slate-500">{description}</p>
        </Link>)}
      </div>
    </section>

    {canViewSettings && <section>
      <div className="mb-4"><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-slate-500">{L("Administration","الإدارة")}</p><h2 className="mt-1 text-xl font-semibold tracking-tight">{L("Company controls","إدارة الشركة")}</h2></div>
      <div className="grid gap-4 md:grid-cols-3">
        {canViewSettings && <AdminCard href="/settings" icon={<Settings2 size={18}/>} title={L("Company & team","الشركة والفريق")} description={L("Settings, users and access","الإعدادات والمستخدمون والصلاحيات")}/>}
        <AdminCard href="/profile" icon={<Users size={18}/>} title={L("My account","حسابي")} description={L("Profile and account details","الملف الشخصي وبيانات الحساب")}/>
      </div>
    </section>}

    {apps.admin && <Link href="/clients" className="group flex items-center gap-4 rounded-2xl border border-amber-400/15 bg-amber-400/[.035] p-4 text-amber-100 transition hover:border-amber-300/25"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/[.07]"><ShieldCheck size={19}/></div><div><p className="text-sm font-semibold">AVERO Admin</p><p className="text-xs text-amber-200/55">{L("Platform management","إدارة المنصة")}</p></div><ArrowUpRight size={16} className="ml-auto text-amber-200/50 transition group-hover:text-amber-100"/></Link>}
  </main>;
}

function MiniStat({icon,label,value}:{icon:React.ReactNode;label:string;value:string}) { return <div className="rounded-2xl border border-slate-800 bg-slate-950/35 p-4"><div className="flex items-center gap-2 text-slate-500">{icon}<span className="text-[11px]">{label}</span></div><p className="mt-3 text-lg font-semibold tracking-tight text-slate-100">{value}</p></div>; }
function AdminCard({href,icon,title,description}:{href:string;icon:React.ReactNode;title:string;description:string}) { return <Link href={href} className="group flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/45 p-4 transition hover:border-cyan-400/20"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-800 bg-slate-950/45 text-slate-400 group-hover:text-cyan-200">{icon}</div><div className="min-w-0"><p className="text-sm font-semibold">{title}</p><p className="mt-0.5 truncate text-[11px] text-slate-500">{description}</p></div><ArrowUpRight size={14} className="ml-auto shrink-0 text-slate-600"/></Link>; }
