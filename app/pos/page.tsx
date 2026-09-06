import { redirect } from "next/navigation";
import Sidebar from "@/app/components/Sidebar";
import DashboardHeader from "@/app/components/DashboardHeader";
import { getAuthorizationContext } from "@/lib/auth/authorization";
import { BadgeDollarSign, Boxes, CreditCard, ReceiptText, ShoppingCart, Store, Utensils, Zap } from "lucide-react";

export const dynamic = "force-dynamic";

const modules = [
  { title: "Sales Terminal", ar: "نقطة البيع", description: "Fast cashier screen for dine-in, takeaway, delivery and retail sales.", icon: ShoppingCart, status: "Foundation" },
  { title: "Products & Menus", ar: "المنتجات والقوائم", description: "Items, categories, modifiers, sizes, add-ons and prices.", icon: Utensils, status: "Next" },
  { title: "Orders", ar: "الطلبات", description: "Open tickets, paid orders, refunds, discounts and order history.", icon: ReceiptText, status: "Next" },
  { title: "Payments", ar: "المدفوعات", description: "Cash, card, online payments, split bills and daily closing.", icon: CreditCard, status: "Planned" },
  { title: "Inventory Sync", ar: "ربط المخزون", description: "Every sale can reduce stock and trigger purchasing or production alerts.", icon: Boxes, status: "Planned" },
  { title: "Live Operations", ar: "تشغيل مباشر", description: "Real-time sales, branches, cashiers, shifts and performance analytics.", icon: Zap, status: "Planned" },
];

export default async function PosPage() {
  const access = await getAuthorizationContext();
  if (!access) redirect("/login");

  const user = access.user;
  const userName = user.email?.split("@")[0];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Sidebar userEmail={user.email} userName={userName} access={access} />
      <div className="ml-64 min-h-screen">
        <DashboardHeader userEmail={user.email} userName={userName} />
        <main className="p-7">
          <div className="mx-auto max-w-7xl space-y-6">
            <section className="overflow-hidden rounded-3xl border border-cyan-500/20 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.12),transparent_34%),#0f172a] p-7 shadow-2xl">
              <div className="grid gap-8 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[.3em] text-cyan-300">AVERO OS · Phase 1</p>
                  <h1 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">POS Foundation</h1>
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
                    The first operating layer for AVERO OS: a smart point-of-sale foundation that will connect sales, products, inventory, recipes, branches and analytics in one business operating system.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <span className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-4 py-2 text-xs font-bold text-cyan-200">POS</span>
                    <span className="rounded-full border border-blue-400/25 bg-blue-400/10 px-4 py-2 text-xs font-bold text-blue-200">Inventory Ready</span>
                    <span className="rounded-full border border-violet-400/25 bg-violet-400/10 px-4 py-2 text-xs font-bold text-violet-200">Multi-Branch</span>
                    <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-4 py-2 text-xs font-bold text-emerald-200">AI Operations</span>
                  </div>
                </div>
                <div className="rounded-3xl border border-slate-700/70 bg-slate-950/70 p-5">
                  <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900 p-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-2xl bg-cyan-400/10 p-3 text-cyan-300"><Store /></div>
                      <div>
                        <p className="font-bold">Today&apos;s Sales</p>
                        <p className="text-xs text-slate-500">Demo operating snapshot</p>
                      </div>
                    </div>
                    <p className="text-2xl font-black text-cyan-200">SAR 0.00</p>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <Mini label="Orders" value="0" />
                    <Mini label="Products" value="Ready" />
                    <Mini label="Cashiers" value="Soon" />
                    <Mini label="Inventory" value="Linked" />
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {modules.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl">
                    <div className="flex items-start justify-between gap-4">
                      <div className="rounded-2xl bg-cyan-400/10 p-3 text-cyan-300"><Icon /></div>
                      <span className="rounded-full border border-slate-700 px-3 py-1 text-[10px] font-bold uppercase tracking-[.18em] text-slate-400">{item.status}</span>
                    </div>
                    <h2 className="mt-5 text-xl font-black">{item.title}</h2>
                    <p className="mt-1 text-sm font-semibold text-cyan-200">{item.ar}</p>
                    <p className="mt-3 text-sm leading-6 text-slate-400">{item.description}</p>
                  </div>
                );
              })}
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-emerald-400/10 p-3 text-emerald-300"><BadgeDollarSign /></div>
                <div>
                  <h2 className="text-xl font-black">Development Order</h2>
                  <p className="text-sm text-slate-500">We will build POS first, then connect products, inventory, recipes and ERP modules.</p>
                </div>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-4">
                <Step number="01" title="Product Catalog" />
                <Step number="02" title="Cart & Order Flow" />
                <Step number="03" title="Payment & Closing" />
                <Step number="04" title="Inventory Deduction" />
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 font-bold text-white">{value}</p></div>;
}

function Step({ number, title }: { number: string; title: string }) {
  return <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4"><p className="text-xs font-black text-cyan-300">{number}</p><p className="mt-2 text-sm font-bold text-white">{title}</p></div>;
}
