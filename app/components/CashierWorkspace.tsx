"use client";

import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "./LanguageProvider";

const panel = "rounded-2xl border border-slate-800 bg-slate-900";
const btn = "rounded-xl bg-cyan-400 px-4 py-3 font-black text-slate-950 disabled:opacity-40";
const ghost = "rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 font-bold text-slate-300";
const inp = "w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5";

const esc = (value: any) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

export default function CashierWorkspace() {
  const { language } = useLanguage();
  const ar = language === "ar";
  const L = (e: string, a: string) => ar ? a : e;

  const [d, S] = useState<any>({ products: [], categories: [], orders: [], warehouses: [], shifts: [], settings: null });
  const [x, X] = useState<any>({ payment_methods: [], tables: [], best_sellers: [], cashier_name: L("Cashier", "كاشير") });
  const [cart, K] = useState<any[]>([]);
  const [cat, C] = useState("all");
  const [q, Q] = useState("");
  const [service, V] = useState("dine_in");
  const [disc, D] = useState(0);
  const [customDisc, setCustomDisc] = useState("");
  const [pay, P] = useState<any>(null);
  const [table, T] = useState<any>(null);
  const [modal, Z] = useState("");
  const [customer, U] = useState({ name: "", phone: "", email: "", notes: "" });
  const [heldId, H] = useState<string | null>(null);
  const [payForm, setPayForm] = useState<any>({ name: "", adjustment_percent: 0, adjustment_type: "markup" });
  const [tableForm, setTableForm] = useState<any>({ name: "", area: "Main", seats: 2 });

  async function load() {
    const [a, b] = await Promise.all([
      fetch("/api/sales", { cache: "no-store" }),
      fetch("/api/cashier-extras", { cache: "no-store" })
    ]);
    if (a.ok) S(await a.json());
    if (b.ok) X(await b.json());
  }

  useEffect(() => { load(); }, []);

  const currency = d.settings?.currency || "SAR";
  const shift = d.shifts.find((s: any) => s.status === "open");
  const wh = shift?.warehouse_id || d.settings?.default_warehouse_id || d.warehouses[0]?.id;
  const held = d.orders.filter((o: any) => o.status === "held");
  const bestIds = new Set(x.best_sellers.map((z: any) => z.product_id));

  const products = useMemo(() => d.products.filter((p: any) =>
    p.show_on_cashier &&
    (cat === "all" || (cat === "best" && bestIds.has(p.id)) || p.category_id === cat) &&
    (!q || `${p.name} ${p.sku || ""} ${p.barcode || ""}`.toLowerCase().includes(q.toLowerCase()))
  ), [d.products, cat, q, x.best_sellers]);

  const pricesIncludeTax = !!d.settings?.prices_include_tax;
  const rows = cart.map((z: any) => {
    const listed = Number(z.price) * Number(z.quantity || 0);
    const rate = z.tax_enabled ? Number(z.tax_rate || 0) : 0;
    const net = pricesIncludeTax && rate > 0 ? listed / (1 + rate / 100) : listed;
    return { listed, rate, net };
  });
  const subtotal = rows.reduce((a: number, z: any) => a + z.net, 0);
  const discount = subtotal * Math.max(0, Math.min(100, disc)) / 100;
  const ratio = subtotal ? discount / subtotal : 0;
  const tax = rows.reduce((a: number, z: any) => a + (z.rate > 0 ? z.net * (1 - ratio) * z.rate / 100 : 0), 0);
  const base = Math.max(0, subtotal - discount + tax);
  const adj = pay ? base * Number(pay.adjustment_percent || 0) / 100 * (pay.adjustment_type === "discount" ? -1 : 1) : 0;
  const total = Math.max(0, base + adj);

  function add(p: any) {
    K(a => {
      const i = a.findIndex((z: any) => z.id === p.id);
      return i < 0
        ? [...a, { ...p, quantity: 1, notes: "" }]
        : a.map((z: any, n: number) => n === i ? { ...z, quantity: z.quantity + 1 } : z);
    });
  }

  function decrement(productId: string) {
    K(a => a.flatMap((v: any) => {
      if (v.id !== productId) return [v];
      if (Number(v.quantity) <= 1) return [];
      return [{ ...v, quantity: Number(v.quantity) - 1 }];
    }));
  }

  function printReceipt(result: any, items: any[], method: any) {
    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    frame.style.position = "fixed";
    frame.style.right = "0";
    frame.style.bottom = "0";
    frame.style.width = "1px";
    frame.style.height = "1px";
    frame.style.border = "0";
    frame.style.opacity = "0";
    document.body.appendChild(frame);

    const doc = frame.contentDocument || frame.contentWindow?.document;
    if (!doc) { frame.remove(); return; }

    const itemRows = items.map((z: any) => `
      <div class="item">
        <div class="row"><b>${esc(z.name)}</b><b>${(Number(z.price) * Number(z.quantity)).toFixed(2)}</b></div>
        <div class="muted">${Number(z.quantity)} × ${Number(z.price).toFixed(2)} ${esc(currency)}</div>
        ${z.notes ? `<div class="note">${esc(z.notes)}</div>` : ""}
      </div>`).join("");

    doc.open();
    doc.write(`<!doctype html>
      <html dir="${ar ? "rtl" : "ltr"}">
      <head>
        <meta charset="utf-8" />
        <title>${esc(result?.order_no || "Receipt")}</title>
        <style>
          @page { size: 80mm auto; margin: 3mm; }
          * { box-sizing: border-box; }
          body { margin: 0; width: 74mm; font-family: Arial, sans-serif; color: #000; font-size: 12px; }
          h1 { font-size: 17px; margin: 0 0 4px; text-align: center; }
          .center { text-align: center; }
          .muted { color: #444; font-size: 10px; }
          .sep { border-top: 1px dashed #000; margin: 7px 0; }
          .row { display: flex; justify-content: space-between; gap: 8px; }
          .item { padding: 5px 0; border-bottom: 1px dotted #999; }
          .note { margin-top: 3px; padding: 3px 5px; border: 1px solid #aaa; border-radius: 3px; white-space: pre-wrap; }
          .total { font-size: 16px; font-weight: 700; margin-top: 5px; }
        </style>
      </head>
      <body>
        <h1>AVERO</h1>
        <div class="center">${esc(L("Sales Receipt", "إيصال مبيعات"))}</div>
        <div class="sep"></div>
        <div>${esc(result?.order_no || "")}</div>
        <div>${esc(new Date().toLocaleString(ar ? "ar-SA" : "en-SA"))}</div>
        <div>${esc(L("Cashier", "الكاشير"))}: ${esc(x.cashier_name)}</div>
        <div>${esc(L("Service", "الخدمة"))}: ${esc(service)}</div>
        ${table ? `<div>${esc(L("Table", "الطاولة"))}: ${esc(table.name)}</div>` : ""}
        <div class="sep"></div>
        ${itemRows}
        <div class="sep"></div>
        <div class="row"><span>${esc(L("Subtotal", "المجموع الفرعي"))}</span><span>${Number(result?.subtotal ?? subtotal).toFixed(2)}</span></div>
        ${Number(result?.discount ?? discount) > 0 ? `<div class="row"><span>${esc(L("Discount", "الخصم"))}</span><span>-${Number(result?.discount ?? discount).toFixed(2)}</span></div>` : ""}
        <div class="row"><span>${esc(L("Tax", "الضريبة"))}</span><span>${Number(result?.tax ?? tax).toFixed(2)}</span></div>
        <div class="row total"><span>${esc(L("Total", "الإجمالي"))}</span><span>${Number(result?.total ?? total).toFixed(2)} ${esc(currency)}</span></div>
        <div class="sep"></div>
        <div>${esc(L("Payment", "الدفع"))}: ${esc(method?.name || method?.code || "Cash")}</div>
        <div class="center" style="margin-top:10px">${esc(L("Thank you", "شكراً لكم"))}</div>
      </body>
      </html>`);
    doc.close();

    const cleanup = () => { if (frame.isConnected) frame.remove(); };
    if (frame.contentWindow) frame.contentWindow.onafterprint = cleanup;
    setTimeout(() => {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
    }, 250);
    setTimeout(cleanup, 60000);
  }

  async function api(kind: string, data: any) {
    const r = await fetch("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, data })
    });
    const j = await r.json();
    if (!r.ok) { alert(j.error || L("Action failed", "فشلت العملية")); return null; }
    return j;
  }

  async function extra(kind: string, data: any) {
    const r = await fetch("/api/cashier-extras", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, data })
    });
    const j = await r.json();
    if (!r.ok) { alert(j.error || L("Action failed", "فشلت العملية")); return null; }
    return j;
  }

  async function checkout() {
    if (!cart.length) return;
    if (!wh) return alert(L("Select a warehouse first", "اختر مستودعاً أولاً"));
    if (!shift) return alert(L("Open a cashier shift before payment", "افتح وردية الكاشير قبل الدفع"));

    const method = pay || x.payment_methods[0] || { code: "cash", name: "Cash", adjustment_percent: 0, adjustment_type: "markup" };
    const receiptItems = cart.map((z: any) => ({ ...z }));
    const j = await api("checkout", {
      shift_id: shift.id,
      warehouse_id: wh,
      service_type: service,
      discount,
      discount_percent: disc,
      customer,
      held_order_id: heldId,
      lines: cart.map((z: any) => ({ product_id: z.id, quantity: z.quantity, discount: 0, notes: z.notes || "" })),
      payments: [{
        payment_method: method.code || method.name,
        base_amount: base,
        adjustment_percent: Number(method.adjustment_percent || 0),
        adjustment_type: method.adjustment_type || "markup",
        amount: total
      }]
    });

    if (j) {
      await extra("attach_order", { order_id: j.result.order_id, table_id: table?.id || null, table_name: table?.name || null });
      printReceipt(j.result, receiptItems, method);
      K([]);
      D(0);
      U({ name: "", phone: "", email: "", notes: "" });
      H(null);
      T(null);
      P(null);
      load();
    }
  }

  async function hold() {
    if (!cart.length || !wh) return;
    const j = await api("hold", {
      shift_id: shift?.id || null,
      warehouse_id: wh,
      service_type: service,
      discount,
      discount_percent: disc,
      customer,
      lines: cart.map((z: any) => ({ product_id: z.id, quantity: z.quantity, discount: 0, notes: z.notes || "" }))
    });
    if (j) { K([]); D(0); H(null); load(); }
  }

  async function openShift() {
    if (!wh) return alert(L("Create or select a warehouse", "أنشئ أو اختر مستودعاً"));
    await api("open_shift", { warehouse_id: wh, opening_cash: 0 });
    load();
  }

  async function addPayment() {
    if (!String(payForm.name || "").trim()) return alert(L("Payment method name is required", "اسم طريقة الدفع مطلوب"));
    const r = await fetch("/api/commerce-admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "payment_method", data: payForm })
    });
    if (!r.ok) return alert((await r.json()).error);
    setPayForm({ name: "", adjustment_percent: 0, adjustment_type: "markup" });
    load();
  }

  async function addTable() {
    if (!String(tableForm.name || "").trim()) return alert(L("Table name is required", "اسم الطاولة مطلوب"));
    const r = await fetch("/api/commerce-admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "dining_table", data: tableForm })
    });
    if (!r.ok) return alert((await r.json()).error);
    setTableForm({ name: "", area: "Main", seats: 2 });
    load();
  }

  function recall(o: any) {
    const lines = (o.sales_order_lines || []).map((l: any) => {
      const p = d.products.find((z: any) => z.id === l.product_id);
      return p ? { ...p, quantity: Number(l.quantity), notes: l.notes || "" } : null;
    }).filter(Boolean);
    K(lines);
    D(Number(o.discount_percent || 0));
    U({ name: o.customer_name || "", phone: o.customer_phone || "", email: o.customer_email || "", notes: o.customer_notes || "" });
    H(o.id);
    V(o.service_type || "dine_in");
    Z("");
  }

  return <div className="space-y-4">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-3xl font-black">{L("Cashier", "الكاشير")}</h1>
        <p className="text-sm text-slate-400">{L("Cashier", "الكاشير")}: <b className="text-cyan-300">{x.cashier_name}</b> · {L("Shift", "الوردية")} {shift ? L("OPEN", "مفتوحة") : L("CLOSED", "مغلقة")}</p>
      </div>
    </header>

    <div className="flex flex-wrap gap-2">
      {!shift && <button className={btn} onClick={openShift}>{L("Open Shift", "فتح وردية")}</button>}
      <button className={ghost} onClick={() => Z("track")}>{L("Track Invoice", "تتبع الفاتورة")}</button>
      <button className={ghost} onClick={() => Z("tables")}>{L("Dining Map", "خريطة الطاولات")}</button>
      <button className={ghost} onClick={() => Z("payments")}>{L("Payment Methods", "طرق الدفع")}</button>
      <button className={ghost} onClick={() => Z("holds")}>{L("Held Orders", "الطلبات المعلقة")} ({held.length})</button>
    </div>

    <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
      <main className={`${panel} p-4`}>
        <div className="mb-3 flex flex-wrap gap-2">
          <input className={`${inp} min-w-[220px] flex-1`} value={q} onChange={e => Q(e.target.value)} placeholder={L("Search / Barcode / SKU", "بحث / باركود / SKU")} />
          {["dine_in", "takeaway", "delivery"].map(s => <button key={s} className={service === s ? btn : ghost} onClick={() => V(s)}>{s === "dine_in" ? L("Dine In", "محلي") : s === "takeaway" ? L("Takeaway", "سفري") : L("Delivery", "توصيل")}</button>)}
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <button className={cat === "all" ? btn : ghost} onClick={() => C("all")}>{L("All", "الكل")}</button>
          <button className={cat === "best" ? btn : ghost} onClick={() => C("best")}>{L("Best Sellers", "الأكثر مبيعاً")}</button>
          {d.categories.map((c: any) => <button key={c.id} className={cat === c.id ? btn : ghost} onClick={() => C(c.id)}>{c.name}</button>)}
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-4">
          {products.map((p: any) => <button key={p.id} onClick={() => add(p)} className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 text-left rtl:text-right">
            <div className="aspect-[16/10] bg-slate-800">{p.image_url ? <img src={p.image_url} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-slate-600">{L("No image", "بدون صورة")}</div>}</div>
            <div className="p-3"><b>{p.name}</b><small className="block text-slate-500">{p.sale_unit || "piece"}</small><div className="text-cyan-300">{Number(p.price).toFixed(2)} {currency}</div></div>
          </button>)}
        </div>
      </main>

      <aside className={`${panel} flex flex-col`}>
        <div className="border-b border-slate-800 p-5">
          <div className="flex justify-between"><h2 className="text-xl font-black">{L("Current Order", "الطلب الحالي")}</h2><button className="text-rose-400" onClick={() => K([])}>{L("Clear", "مسح")}</button></div>
          {table && <small className="text-cyan-300">{L("Table", "الطاولة")}: {table.name}</small>}
          {heldId && <small className="ml-2 text-amber-300">{L("Recalled held order", "طلب معلق مسترجع")}</small>}
        </div>

        <div className="flex-1 p-4">
          {!cart.length && <div className="py-16 text-center text-slate-600">{L("No items yet", "لا توجد أصناف بعد")}</div>}
          {cart.map((z: any) => <div key={z.id} className="mb-2 rounded-xl border border-slate-800 p-3">
            <div className="flex justify-between"><b>{z.name}</b><span>{(z.price * z.quantity).toFixed(2)}</span></div>
            <div className="mt-2 flex items-center gap-2">
              <button className="h-8 w-8 rounded bg-slate-800" onClick={() => decrement(z.id)}>−</button>
              <b>{z.quantity}</b>
              <button className="h-8 w-8 rounded bg-slate-800" onClick={() => K(a => a.map((v: any) => v.id === z.id ? { ...v, quantity: v.quantity + 1 } : v))}>+</button>
              <button className="ml-auto text-xs font-bold text-rose-400" onClick={() => K(a => a.filter((v: any) => v.id !== z.id))}>{L("Cancel", "إلغاء")}</button>
            </div>
            <textarea className={`${inp} mt-2 min-h-[52px] resize-y`} placeholder={L("Comment", "ملاحظة")} value={z.notes || ""} onChange={e => K(a => a.map((v: any) => v.id === z.id ? { ...v, notes: e.target.value } : v))} />
          </div>)}
        </div>

        <div className="border-t border-slate-800 p-5">
          <div className="text-sm">
            <div className="flex justify-between"><span>{L("Subtotal", "المجموع الفرعي")}</span><b>{subtotal.toFixed(2)}</b></div>
            {disc > 0 && <div className="flex justify-between text-emerald-300"><span>{L("Discount", "الخصم")} {disc}%</span><b>-{discount.toFixed(2)}</b></div>}
            <div className="flex justify-between"><span>{L("Tax", "الضريبة")}</span><b>{tax.toFixed(2)}</b></div>
            {adj !== 0 && <div className="flex justify-between text-amber-300"><span>{pay?.name} {L("adjustment", "تعديل")}</span><b>{adj > 0 ? "+" : ""}{adj.toFixed(2)}</b></div>}
            <div className="mt-2 flex justify-between text-2xl font-black"><span>{L("Total", "الإجمالي")}</span><span>{total.toFixed(2)} {currency}</span></div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <select className={inp} value={pay?.id || ""} onChange={e => P(x.payment_methods.find((m: any) => m.id === e.target.value) || null)}>
              <option value="">{L("Payment Method", "طريقة الدفع")}</option>
              {x.payment_methods.map((m: any) => <option key={m.id} value={m.id}>{m.name}{m.adjustment_percent ? ` (${m.adjustment_type === "discount" ? "-" : "+"}${m.adjustment_percent}%)` : ""}</option>)}
            </select>
            <button className={btn} disabled={!cart.length || !shift} onClick={checkout}>{L("Pay & Print", "دفع وطباعة")}</button>
          </div>

          {!shift && cart.length > 0 && <div className="mt-2 text-center text-xs text-amber-300">{L("Open a shift before taking payment.", "افتح وردية قبل استلام الدفع.")}</div>}
          <div className="mt-2 grid grid-cols-3 gap-2">
            <button className={ghost} disabled={!cart.length} onClick={hold}>{L("Hold", "تعليق")}</button>
            <button className={ghost} onClick={() => { setCustomDisc(String(disc || "")); Z("discount"); }}>{L("Discount", "خصم")}</button>
            <button className={ghost} onClick={() => Z("customer")}>{L("Customer", "العميل")}</button>
          </div>
        </div>
      </aside>
    </div>

    {modal === "discount" && <Modal t={L("Apply Discount", "تطبيق الخصم")} x={() => Z("")}>
      <p className="mb-4 text-sm text-slate-400">{L("Choose a preset or enter a custom percentage. The invoice recalculates immediately.", "اختر نسبة جاهزة أو أدخل نسبة مخصصة، ويتم إعادة حساب الفاتورة مباشرة.")}</p>
      <div className="grid grid-cols-3 gap-2">{[5, 10, 15, 20, 30].map(n => <button key={n} className={disc === n ? btn : ghost} onClick={() => { D(n); Z(""); }}>{n}%</button>)}<button className={ghost} onClick={() => { D(0); Z(""); }}>{L("No Discount", "بدون خصم")}</button></div>
      <div className="mt-4 rounded-2xl border border-slate-800 p-4"><label className="text-xs font-black uppercase text-slate-400">{L("Custom Discount %", "خصم مخصص %")}</label><div className="mt-2 flex gap-2"><input className={inp} type="number" min="0" max="100" step="0.01" placeholder="12.5" value={customDisc} onChange={e => setCustomDisc(e.target.value)} /><button className={btn} onClick={() => { D(Math.max(0, Math.min(100, Number(customDisc || 0)))); Z(""); }}>{L("Apply", "تطبيق")}</button></div></div>
    </Modal>}

    {modal === "customer" && <Modal t={L("Customer Details", "تفاصيل العميل")} x={() => Z("")}><div className="space-y-3"><input className={inp} placeholder={L("Customer name", "اسم العميل")} value={customer.name} onChange={e => U({ ...customer, name: e.target.value })} /><input className={inp} placeholder={L("Phone number", "رقم الهاتف")} value={customer.phone} onChange={e => U({ ...customer, phone: e.target.value })} /><input className={inp} placeholder={L("Email (optional)", "البريد الإلكتروني (اختياري)")} value={customer.email} onChange={e => U({ ...customer, email: e.target.value })} /><textarea className={inp} placeholder={L("Notes (optional)", "ملاحظات (اختياري)")} value={customer.notes} onChange={e => U({ ...customer, notes: e.target.value })} /><button className={btn} onClick={() => Z("")}>{L("Use Customer", "اعتماد العميل")}</button></div></Modal>}

    {modal === "payments" && <Modal t={L("Payment Methods", "طرق الدفع")} x={() => Z("")}><div className="grid gap-2 md:grid-cols-[1fr_120px_150px_auto]"><input className={inp} placeholder={L("Method name", "اسم الطريقة")} value={payForm.name} onChange={e => setPayForm({ ...payForm, name: e.target.value })} /><input className={inp} type="number" min="0" max="100" value={payForm.adjustment_percent} onChange={e => setPayForm({ ...payForm, adjustment_percent: Number(e.target.value) })} /><select className={inp} value={payForm.adjustment_type} onChange={e => setPayForm({ ...payForm, adjustment_type: e.target.value })}><option value="markup">{L("Markup %", "زيادة %")}</option><option value="discount">{L("Discount %", "خصم %")}</option></select><button className={btn} onClick={addPayment}>+ {L("Add", "إضافة")}</button></div><div className="mt-4">{x.payment_methods.map((m: any) => <div key={m.id} className="border-b border-slate-800 py-3"><b>{m.name}</b><small className="ml-3 text-slate-400">{m.adjustment_percent ? `${m.adjustment_type} ${m.adjustment_percent}%` : L("No adjustment", "بدون تعديل")}</small></div>)}</div></Modal>}

    {modal === "tables" && <Modal t={L("Dining Map", "خريطة الطاولات")} x={() => Z("")}><div className="grid gap-2 md:grid-cols-[1fr_1fr_100px_auto]"><input className={inp} placeholder={L("Table name", "اسم الطاولة")} value={tableForm.name} onChange={e => setTableForm({ ...tableForm, name: e.target.value })} /><input className={inp} placeholder={L("Area", "المنطقة")} value={tableForm.area} onChange={e => setTableForm({ ...tableForm, area: e.target.value })} /><input className={inp} type="number" min="1" value={tableForm.seats} onChange={e => setTableForm({ ...tableForm, seats: Number(e.target.value) })} /><button className={btn} onClick={addTable}>+ {L("Table", "طاولة")}</button></div><div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">{x.tables.map((t: any) => <div key={t.id} className={`rounded-2xl border p-4 ${table?.id === t.id ? "border-cyan-400" : "border-slate-700"}`}><b>{t.name}</b><small className="block text-slate-500">{t.area || L("Main", "الرئيسية")} · {t.seats} {L("seats", "مقاعد")}</small><div className="mt-2 flex gap-1"><button className="text-cyan-300" onClick={() => { T(t); Z(""); }}>{L("Select", "اختيار")}</button><button className="ml-auto text-xs" onClick={async () => { await extra("table_status", { table_id: t.id, status: t.status === "closed" ? "open" : "closed" }); load(); }}>{t.status === "closed" ? L("Open", "فتح") : L("Close", "إغلاق")}</button></div></div>)}</div></Modal>}

    {modal === "track" && <Modal t={L("Invoice Tracking", "تتبع الفواتير")} x={() => Z("")}><div className="space-y-2">{d.orders.filter((o: any) => o.status === "completed").slice(0, 50).map((o: any) => <div key={o.id} className="grid grid-cols-[1fr_160px] items-center border-b border-slate-800 py-3"><span><b>{o.order_no}</b><small className="block text-slate-500">{o.cashier_name || L("Cashier", "كاشير")} · {Number(o.total).toFixed(2)} {currency}</small></span><select className={inp} value={o.tracking_status || "new"} onChange={async e => { await extra("tracking", { order_id: o.id, status: e.target.value }); load(); }}><option value="new">{L("New", "جديدة")}</option><option value="preparing">{L("Preparing", "قيد التحضير")}</option><option value="ready">{L("Ready", "جاهزة")}</option><option value="delivered">{L("Delivered", "تم التسليم")}</option><option value="completed">{L("Completed", "مكتملة")}</option><option value="cancelled">{L("Cancelled", "ملغاة")}</option></select></div>)}</div></Modal>}

    {modal === "holds" && <Modal t={L("Held Orders", "الطلبات المعلقة")} x={() => Z("")}><div>{held.map((o: any) => <div key={o.id} className="flex items-center justify-between border-b border-slate-800 py-3"><span><b>{o.order_no}</b><small className="block text-slate-500">{Number(o.total).toFixed(2)} {currency}</small></span><button className={btn} onClick={() => recall(o)}>{L("Recall", "استرجاع")}</button></div>)}</div></Modal>}
  </div>;
}

function Modal({ t, x, children }: any) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"><div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-3xl border border-slate-700 bg-slate-900 p-6"><div className="mb-4 flex justify-between"><h2 className="text-xl font-black">{t}</h2><button onClick={x}>✕</button></div>{children}</div></div>;
}
