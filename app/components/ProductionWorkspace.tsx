"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "./LanguageProvider";

const box = "rounded-2xl border border-slate-800 bg-slate-900 p-5";
const inp = "w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm";
const btn = "rounded-xl bg-cyan-400 px-4 py-2.5 font-black text-slate-950";

export default function ProductionWorkspace() {
  const { language } = useLanguage();
  const L = (en: string, ar: string) => language === "ar" ? ar : en;
  const [data, setData] = useState<any>({ orders: [], recipes: [], warehouses: [] });
  const [form, setForm] = useState<any>(null);

  async function load() {
    const response = await fetch("/api/production", { cache: "no-store" });
    if (response.ok) setData(await response.json());
  }
  useEffect(() => { void load(); }, []);

  async function act(kind: string, payload: any) {
    const response = await fetch("/api/production", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, data: payload }),
    });
    const result = await response.json();
    if (!response.ok) return alert(result.error);
    setForm(null);
    void load();
  }

  const mainRecipes = (data.recipes || []).filter((recipe: any) => (recipe.recipe_type || "main") === "main");
  const statusLabel = (status: string) => ({
    planned: L("Planned", "مخطط"), in_progress: L("In Progress", "قيد التنفيذ"), completed: L("Completed", "مكتمل"),
  })[status as "planned" | "in_progress" | "completed"] || status;

  return <div className="space-y-5">
    <header className="flex flex-wrap justify-between gap-3">
      <div><h1 className="text-2xl font-black">{L("Production", "الإنتاج")}</h1><p className="text-sm text-slate-400">{L("Production orders · batches · yield · waste · costing · variance", "أوامر الإنتاج · الدفعات · الناتج · الهدر · التكاليف · الفروقات")}</p></div>
      <button className={btn} onClick={() => setForm({ recipe_id: "", warehouse_id: "", planned_qty: 1, planned_date: new Date().toISOString().slice(0, 10), priority: "normal", batch_no: "" })}>{L("+ Production Order", "+ أمر إنتاج")}</button>
    </header>
    <div className="grid gap-3 md:grid-cols-4">
      <Stat title={L("Orders", "الأوامر")} value={data.orders.length}/>
      <Stat title={L("Planned", "المخططة")} value={data.orders.filter((order: any) => order.status === "planned").length}/>
      <Stat title={L("In Progress", "قيد التنفيذ")} value={data.orders.filter((order: any) => order.status === "in_progress").length}/>
      <Stat title={L("Completed", "المكتملة")} value={data.orders.filter((order: any) => order.status === "completed").length}/>
    </div>
    <div className={box}>{data.orders.map((order: any) => <div key={order.id} className="grid items-center gap-2 border-b border-slate-800 py-3 md:grid-cols-[1fr_120px_120px_120px]">
      <span><b>{order.production_no}</b><small className="block text-slate-500">{order.production_recipes?.name} {order.batch_no ? `· ${L("Batch", "الدفعة")} ${order.batch_no}` : ""}</small></span>
      <span>{statusLabel(order.status)}</span><span>{L("Plan", "الكمية المخططة")} {order.planned_qty}</span>
      <span>{order.status === "planned" ? <button className="text-cyan-300" onClick={() => act("start", { order_id: order.id })}>{L("Start", "بدء")}</button>
        : order.status === "in_progress" ? <button className="text-emerald-300" onClick={() => {
          const recipe = mainRecipes.find((item: any) => item.id === order.recipe_id);
          const scale = Number(order.planned_qty) / Number(recipe?.yield_qty || 1);
          setForm({ complete: true, order_id: order.id, actual_qty: order.planned_qty, consumption: (recipe?.production_recipe_lines || []).filter((line: any) => line.item_id).map((line: any) => ({ item_id: line.item_id, planned_qty: Number(line.quantity) * scale, actual_qty: Number(line.quantity) * scale })), waste: [], byproducts: [] });
        }}>{L("Complete", "إكمال")}</button> : <span className="text-slate-500">{L("Done", "تم")}</span>}</span>
    </div>)}</div>
    {form && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"><div className="w-full max-w-2xl rounded-3xl border border-slate-700 bg-slate-900 p-6">
      <div className="mb-4 flex justify-between"><h2 className="text-xl font-black">{form.complete ? L("Complete Production", "إكمال الإنتاج") : L("Production Order", "أمر إنتاج")}</h2><button onClick={() => setForm(null)} aria-label={L("Close", "إغلاق")}>✕</button></div>
      {form.complete ? <><label className="text-sm text-slate-400">{L("Actual output", "الناتج الفعلي")}</label><input className={inp} type="number" value={form.actual_qty} onChange={event => setForm({ ...form, actual_qty: Number(event.target.value) })}/>
        <div className="mt-4 text-sm text-slate-400">{L("Actual consumption uses the recipe plan by default and can be edited in the detailed production flow later.", "يعتمد الاستهلاك الفعلي مبدئيًا على خطة الوصفة ويمكن تعديله لاحقًا من تفاصيل الإنتاج.")}</div>
        <button className={`${btn} mt-5 w-full`} onClick={() => act("complete", form)}>{L("Complete Production", "إكمال الإنتاج")}</button></>
        : <><div className="grid gap-2 md:grid-cols-2">
          <select className={inp} value={form.recipe_id} onChange={event => setForm({ ...form, recipe_id: event.target.value })}><option value="">{L("Main Recipe", "الوصفة الرئيسية")}</option>{mainRecipes.map((recipe: any) => <option key={recipe.id} value={recipe.id}>{recipe.name}</option>)}</select>
          <select className={inp} value={form.warehouse_id} onChange={event => setForm({ ...form, warehouse_id: event.target.value })}><option value="">{L("Warehouse", "المستودع")}</option>{data.warehouses.map((warehouse: any) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}</select>
          <input className={inp} type="number" aria-label={L("Planned quantity", "الكمية المخططة")} value={form.planned_qty} onChange={event => setForm({ ...form, planned_qty: Number(event.target.value) })}/>
          <input className={inp} type="date" aria-label={L("Planned date", "التاريخ المخطط")} value={form.planned_date} onChange={event => setForm({ ...form, planned_date: event.target.value })}/>
          <input className={inp} placeholder={L("Batch no", "رقم الدفعة")} value={form.batch_no} onChange={event => setForm({ ...form, batch_no: event.target.value })}/>
          <select className={inp} aria-label={L("Priority", "الأولوية")} value={form.priority} onChange={event => setForm({ ...form, priority: event.target.value })}><option value="normal">{L("Normal", "عادية")}</option><option value="high">{L("High", "عالية")}</option><option value="urgent">{L("Urgent", "عاجلة")}</option></select>
        </div><button className={`${btn} mt-5 w-full`} onClick={() => act("order", form)}>{L("Create Order", "إنشاء الأمر")}</button></>}
    </div></div>}
  </div>;
}

function Stat({ title, value }: { title: string; value: number }) {
  return <div className={box}>{title}<div className="text-2xl font-black">{value}</div></div>;
}
