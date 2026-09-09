"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/app/components/Sidebar";
import DashboardHeader from "@/app/components/DashboardHeader";
import { useLanguage } from "@/app/components/LanguageProvider";

const card = "rounded-2xl border border-slate-800 bg-slate-900 p-5";
const inp = "w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm outline-none focus:border-cyan-400";
const btn = "rounded-xl bg-cyan-400 px-4 py-2.5 font-black text-slate-950 disabled:opacity-50";
const ghost = "rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 font-bold text-slate-200";

export default function CashierMonitorSettingsPage() {
  const { language } = useLanguage();
  const ar = language === "ar";
  const L = (en: string, arabic: string) => ar ? arabic : en;
  const [methods, setMethods] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ name: "", adjustment_percent: 0 });
  const [busy, setBusy] = useState(false);

  async function load() {
    const r = await fetch("/api/commerce-admin", { cache: "no-store" });
    if (!r.ok) return;
    const j = await r.json();
    setMethods(j.payment_methods || []);
  }

  useEffect(() => { load(); }, []);

  async function save() {
    const name = String(form.name || "").trim();
    const pct = Math.max(0, Math.min(100, Number(form.adjustment_percent || 0)));
    if (!name) return alert(L("Payment method name is required", "اسم طريقة الدفع مطلوب"));
    setBusy(true);
    const r = await fetch("/api/commerce-admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "payment_method", data: { ...form, name, adjustment_percent: pct, adjustment_type: "markup", active: true } })
    });
    const j = await r.json();
    setBusy(false);
    if (!r.ok) return alert(j.error || L("Could not save payment method", "تعذر حفظ طريقة الدفع"));
    setForm({ name: "", adjustment_percent: 0 });
    await load();
  }

  function edit(m: any) {
    setForm({ id: m.id, name: m.name, adjustment_percent: Number(m.adjustment_percent || 0) });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return <div className="min-h-screen bg-slate-950 text-white">
    <Sidebar />
    <div className="ml-64 flex min-h-screen flex-col">
      <DashboardHeader />
      <main className="flex-1 px-6 py-7">
        <div className="mx-auto max-w-6xl space-y-6">
          <div>
            <div className="text-xs font-black uppercase tracking-[.2em] text-cyan-400">AVERO SETTINGS</div>
            <h1 className="mt-2 text-3xl font-black">{L("Cashier Monitor", "مراقبة الكاشير")}</h1>
            <p className="mt-2 text-sm text-slate-400">{L("Manage the payment methods that appear when the cashier presses Pay.", "إدارة طرق الدفع التي تظهر عند ضغط الكاشير على دفع.")}</p>
          </div>

          <section className={card}>
            <div className="mb-4">
              <h2 className="text-xl font-black">{form.id ? L("Edit Payment Method", "تعديل طريقة الدفع") : L("Add Payment Method", "إضافة طريقة دفع")}</h2>
              <p className="mt-1 text-sm text-slate-400">{L("Optional price increase changes the product selling prices for this payment method. It is built into the item price and is not shown as a separate surcharge on the customer invoice.", "نسبة زيادة السعر اختيارية، وتغيّر سعر بيع الأصناف لهذه الطريقة. تنعكس داخل سعر الصنف نفسه ولا تظهر للعميل كبند زيادة منفصل في الفاتورة.")}</p>
            </div>

            <div className="grid gap-3 md:grid-cols-[1fr_220px_auto] md:items-end">
              <label className="block">
                <span className="mb-1 block text-xs font-black uppercase text-slate-300">{L("Payment Method Name", "اسم طريقة الدفع")}</span>
                <input className={inp} placeholder={L("Example: Cash, mada, HungerStation", "مثال: كاش، مدى، هنقرستيشن")} value={form.name || ""} onChange={e => setForm({ ...form, name: e.target.value })} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-black uppercase text-slate-300">{L("Price Increase %", "زيادة السعر %")}</span>
                <input className={inp} type="number" min="0" max="100" step="0.01" value={form.adjustment_percent ?? 0} onChange={e => setForm({ ...form, adjustment_percent: Number(e.target.value) })} />
              </label>
              <button className={btn} disabled={busy} onClick={save}>{busy ? L("Saving...", "جارٍ الحفظ...") : form.id ? L("Update", "تحديث") : L("Add Payment Method", "إضافة طريقة الدفع")}</button>
            </div>
            <div className="mt-3 text-xs text-slate-500">{L("Example: a 1.00 SAR item with a 40% method becomes 1.40 SAR when that method is selected. Set 0% for Cash or bank methods with no price change.", "مثال: صنف سعره 1.00 ريال مع طريقة عليها 40% يصبح 1.40 ريال عند اختيارها. ضع 0% للكاش أو البنك إذا ما بدك أي تغيير بالسعر.")}</div>
          </section>

          <section className={card}>
            <div className="mb-3 flex items-center justify-between"><h2 className="text-xl font-black">{L("Active Payment Methods", "طرق الدفع الفعالة")}</h2><span className="text-sm text-slate-500">{methods.length}</span></div>
            {methods.length === 0 ? <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-slate-500">{L("No payment methods yet.", "لا توجد طرق دفع بعد.")}</div> : <div className="space-y-2">
              {methods.map((m: any) => <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <div><b>{m.name}</b><small className="block text-slate-500">{m.code}</small></div>
                <div className="flex items-center gap-3"><span className="rounded-lg bg-slate-800 px-3 py-1 text-sm font-bold">{Number(m.adjustment_percent || 0).toFixed(2)}%</span><button className={ghost} onClick={() => edit(m)}>{L("Edit", "تعديل")}</button></div>
              </div>)}
            </div>}
          </section>
        </div>
      </main>
    </div>
  </div>;
}
