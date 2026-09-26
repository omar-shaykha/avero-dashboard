"use client";

import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "./LanguageProvider";

const panel = "rounded-2xl border border-slate-800 bg-slate-900";
const btn = "rounded-xl bg-cyan-400 px-4 py-3 font-black text-slate-950 disabled:opacity-40";
const ghost = "rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 font-bold text-slate-300 disabled:opacity-40";
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

  const [d, S] = useState<any>({ products: [], categories: [], orders: [], warehouses: [], shifts: [], refunds: [], settings: null });
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
  const [tableForm, setTableForm] = useState<any>({ name: "", area: "Main", seats: 2 });
  const [paying, setPaying] = useState(false);
  const [openingCash, setOpeningCash] = useState("");
  const [closingCash, setClosingCash] = useState("");
  const [split, setSplit] = useState<any[]>([]);
  const [cashMove, setCashMove] = useState<any>({ movement_type:"cash_in", amount:"", reason:"" });
  const [refundTarget,setRefundTarget]=useState<any>(null);
  const [refundQty,setRefundQty]=useState<Record<string,string>>({});
  const [refundReason,setRefundReason]=useState("");
  const [lastShiftReport, setLastShiftReport] = useState<any>(null);\n  const [voidTarget,setVoidTarget]=useState<any>(null);\n  const [voidReason,setVoidReason]=useState("");


  async function load() {
    const [a, b] = await Promise.all([
      fetch("/api/cashier-data", { cache: "no-store" }),
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

  function unitPrice(item: any, method?: any) {
    const pct = Math.max(0, Number(method?.adjustment_percent || 0));
    return Math.round((Number(item.price || 0) * (1 + pct / 100)) * 100) / 100;
  }

  function totals(method?: any) {
    const rows = cart.map((z: any) => {
      const unit = unitPrice(z, method);
      const listed = unit * Number(z.quantity || 0);
      const rate = z.tax_enabled ? Number(z.tax_rate || 0) : 0;
      const net = pricesIncludeTax && rate > 0 ? listed / (1 + rate / 100) : listed;
      return { unit, listed, rate, net };
    });
    const subtotal = rows.reduce((a: number, z: any) => a + z.net, 0);
    const discount = subtotal * Math.max(0, Math.min(100, disc)) / 100;
    const ratio = subtotal ? discount / subtotal : 0;
    const tax = rows.reduce((a: number, z: any) => a + (z.rate > 0 ? z.net * (1 - ratio) * z.rate / 100 : 0), 0);
    const total = Math.max(0, subtotal - discount + tax);
    return { rows, subtotal, discount, tax, total };
  }

  const current = totals();

  function add(p: any) {
    K(a => {
      const i = a.findIndex((z: any) => z.id === p.id);
      return i < 0 ? [...a, { ...p, quantity: 1, notes: "" }] : a.map((z: any, n: number) => n === i ? { ...z, quantity: z.quantity + 1 } : z);
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
    Object.assign(frame.style, { position: "fixed", right: "0", bottom: "0", width: "1px", height: "1px", border: "0", opacity: "0" });
    document.body.appendChild(frame);
    const doc = frame.contentDocument || frame.contentWindow?.document;
    if (!doc) { frame.remove(); return; }
    const t=x.invoice_template||{}, paper=t.paper_size||"roll80";
    const page=paper==="a4"?"A4":paper==="roll58"?"58mm auto":"80mm auto";
    const width=paper==="a4"?"190mm":paper==="roll58"?"52mm":"74mm";
    const show=(key:string)=>t[key]!==false;
    const itemRows = items.map((z:any)=>{const u=Number(z.receipt_price??z.price??0);return `<div class="item"><div class="row"><b>${esc(z.name)}</b><b>${(u*Number(z.quantity)).toFixed(2)}</b></div><div class="muted">${Number(z.quantity)} × ${u.toFixed(2)} ${esc(currency)}</div>${show("show_item_notes")&&z.notes?`<div class="note">${esc(z.notes)}</div>`:""}</div>`;}).join("");
    const customerName=customer?.name||result?.customer_name||"";
    doc.open();
    doc.write(`<!doctype html><html dir="${ar?"rtl":"ltr"}"><head><meta charset="utf-8"/><title>${esc(result?.order_no||"Receipt")}</title><style>@page{size:${page};margin:${paper==="a4"?"12mm":"3mm"}}*{box-sizing:border-box}body{margin:0;width:${width};font-family:Arial,sans-serif;color:#000;font-size:${paper==="a4"?"14px":"12px"}}h1{font-size:${paper==="a4"?"22px":"17px"};margin:0 0 4px;text-align:center}.center{text-align:center}.muted{color:#444;font-size:10px}.sep{border-top:1px dashed #000;margin:7px 0}.row{display:flex;justify-content:space-between;gap:8px}.item{padding:5px 0;border-bottom:1px dotted #999}.note{margin-top:3px;padding:3px 5px;border:1px solid #aaa;border-radius:3px;white-space:pre-wrap}.total{font-size:16px;font-weight:700;margin-top:5px}.accent{border-top:3px solid ${esc(t.accent||"#000")};padding-top:6px}</style></head><body><div class="accent"><h1>${esc(t.business_name||x.company?.name||"Business")}</h1>${t.logo_url?`<div class="center"><img src="${esc(t.logo_url)}" style="max-width:42mm;max-height:18mm;object-fit:contain"/></div>`:""}${t.header_text?`<div class="center">${esc(t.header_text)}</div>`:""}<div class="center">${esc(L("Tax Invoice / Sales Receipt","فاتورة ضريبية / إيصال مبيعات"))}</div>${show("show_cr")&&t.commercial_registration?`<div class="center muted">${esc(L("CR","السجل التجاري"))}: ${esc(t.commercial_registration)}</div>`:""}${show("show_vat")&&show("show_tax_number")&&t.vat_number?`<div class="center muted">${esc(L("VAT No.","الرقم الضريبي"))}: ${esc(t.vat_number)}</div>`:""}${show("show_address")&&t.address?`<div class="center muted">${esc(t.address)}</div>`:""}${show("show_phone")&&t.phone?`<div class="center muted">${esc(t.phone)}</div>`:""}<div class="sep"></div><div>${esc(result?.order_no||"")}</div><div>${esc(new Date().toLocaleString(ar?"ar-SA":"en-SA"))}</div>${show("show_cashier")?`<div>${esc(L("Cashier","الكاشير"))}: ${esc(x.cashier_name)}</div>`:""}${show("show_customer")&&customerName?`<div>${esc(L("Customer","العميل"))}: ${esc(customerName)}</div>`:""}<div>${esc(L("Service","الخدمة"))}: ${esc(service)}</div>${table?`<div>${esc(L("Table","الطاولة"))}: ${esc(table.name)}</div>`:""}<div class="sep"></div>${itemRows}<div class="sep"></div><div class="row"><span>${esc(L("Subtotal","المجموع الفرعي"))}</span><span>${Number(result?.subtotal||0).toFixed(2)}</span></div>${Number(result?.discount||0)>0?`<div class="row"><span>${esc(L("Discount","الخصم"))}</span><span>-${Number(result?.discount||0).toFixed(2)}</span></div>`:""}<div class="row"><span>${esc(L("Tax","الضريبة"))}</span><span>${Number(result?.tax||0).toFixed(2)}</span></div><div class="row total"><span>${esc(L("Total","الإجمالي"))}</span><span>${Number(result?.total||0).toFixed(2)} ${esc(currency)}</span></div><div class="sep"></div><div>${esc(L("Payment","الدفع"))}: ${esc(method?.name||method?.code||"Cash")}</div>${t.footer_text?`<div class="center" style="margin-top:10px">${esc(t.footer_text)}</div>`:`<div class="center" style="margin-top:10px">${esc(L("Thank you","شكراً لكم"))}</div>`}</div></body></html>`);
    doc.close();
    const cleanup=()=>{if(frame.isConnected)frame.remove();}; if(frame.contentWindow)frame.contentWindow.onafterprint=cleanup; setTimeout(()=>{frame.contentWindow?.focus();frame.contentWindow?.print();},250);setTimeout(cleanup,60000);
  }

  function printShiftReport(report:any){
    const frame=document.createElement("iframe");frame.setAttribute("aria-hidden","true");Object.assign(frame.style,{position:"fixed",right:"0",bottom:"0",width:"1px",height:"1px",border:"0",opacity:"0"});document.body.appendChild(frame);
    const doc=frame.contentDocument||frame.contentWindow?.document;if(!doc){frame.remove();return;}
    const t=x.invoice_template||{},paper=t.paper_size||"roll80",page=paper==="a4"?"A4":paper==="roll58"?"58mm auto":"80mm auto",width=paper==="a4"?"190mm":paper==="roll58"?"52mm":"74mm";
    const row=(label:string,value:string)=>`<div class="row"><span>${esc(label)}</span><b>${esc(value)}</b></div>`;const money=(value:number)=>`${Number(value||0).toFixed(2)} ${esc(currency)}`;const methods=Object.entries(report.payments||{}).map(([method,amount])=>row(method,money(Number(amount)))).join("");
    doc.open();doc.write(`<!doctype html><html dir="${ar?"rtl":"ltr"}"><head><meta charset="utf-8"><title>${esc(L("Shift closing report","تقرير إقفال الوردية"))}</title><style>@page{size:${page};margin:${paper==="a4"?"12mm":"3mm"}}body{font:${paper==="a4"?"14px":"12px"} Arial,sans-serif;color:#000;width:${width};margin:0}h1,h2{text-align:center;margin:5px 0}.row{display:flex;justify-content:space-between;gap:8px;padding:4px 0}.sep{border-top:1px dashed #333;margin:9px 0}.muted{text-align:center;font-size:10px}.accent{border-top:3px solid ${esc(t.accent||"#000")};padding-top:6px}</style></head><body><div class="accent"><h1>${esc(t.business_name||x.company?.name||"Business")}</h1>${t.logo_url?`<div class="muted"><img src="${esc(t.logo_url)}" style="max-width:38mm;max-height:15mm;object-fit:contain"/></div>`:""}<h2>${esc(L("Shift closing report","تقرير إقفال الوردية"))}</h2><div class="muted">${esc(new Date(report.closed_at).toLocaleString(ar?"ar-SA":"en-SA"))}</div><div class="sep"></div>${row(L("Cashier","الكاشير"),report.cashier||x.cashier_name)}${row(L("Orders","الطلبات"),String(report.orders))}${row(L("Gross sales","إجمالي المبيعات"),money(report.gross_sales))}${row(L("Discount","الخصم"),money(report.discount))}${row(L("Tax","الضريبة"),money(report.tax))}${row(L("Refunds","المرتجعات"),money(report.refunds))}<div class="sep"></div>${methods}<div class="sep"></div>${row(L("Opening cash","نقد البداية"),money(report.opening_cash))}${row(L("Expected cash","النقد المتوقع"),money(report.expected_cash))}${row(L("Counted cash","النقد المعدود"),money(report.closing_cash))}${row(L("Variance","الفرق"),money(report.variance))}<div class="sep"></div><div class="muted">${esc(report.shift_id)}</div></div></body></html>`);doc.close();
    const cleanup=()=>{if(frame.isConnected)frame.remove();};if(frame.contentWindow)frame.contentWindow.onafterprint=cleanup;setTimeout(()=>{frame.contentWindow?.focus();frame.contentWindow?.print();},250);setTimeout(cleanup,60000);
  }

  async function api(kind: string, data: any) {
    const r = await fetch("/api/sales", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, data }) });
    const j = await r.json();
    if (!r.ok) { alert(j.error || L("Action failed", "فشلت العملية")); return null; }
    return j;
  }

  async function extra(kind: string, data: any) {
    const r = await fetch("/api/cashier-extras", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, data }) });
    const j = await r.json();
    if (!r.ok) { alert(j.error || L("Action failed", "فشلت العملية")); return null; }
    return j;
  }

  async function ensureShift() {
    if (shift) return shift;
    const j = await api("open_shift", { opening_cash: 0 });
    return j?.record || null;
  }

  async function checkout(method: any) {
    if (!cart.length || paying) return;
    if (!method) return alert(L("Choose a payment method", "اختر طريقة دفع"));
    setPaying(true);
    try {
      const activeShift = await ensureShift();
      if (!activeShift) return;
      const calc = totals(method);
      const receiptItems = cart.map((z: any) => ({ ...z, receipt_price: unitPrice(z, method) }));
      const j = await api("checkout", {
        shift_id: activeShift.id,
        service_type: service,
        discount: calc.discount,
        discount_percent: disc,
        customer,
        held_order_id: heldId,
        lines: cart.map((z: any) => ({ product_id: z.id, quantity: z.quantity, discount: 0, notes: z.notes || "" })),
        checkout_key: crypto.randomUUID(),
        payments: [{ payment_method: method.code || method.name, base_amount: calc.total, amount: calc.total }]
      });
      if (j) {
        await extra("attach_order", { order_id: j.result.order_id, table_id: table?.id || null, table_name: table?.name || null });
        Z("");
        printReceipt(j.result, receiptItems, method);
        K([]); D(0); U({ name: "", phone: "", email: "", notes: "" }); H(null); T(null); P(null);
        await load();
      }
    } finally {
      setPaying(false);
    }
  }

  async function checkoutSplit(){ if(!cart.length||paying)return; const paid=split.reduce((a:number,p:any)=>a+Number(p.amount||0),0); if(Math.abs(paid-current.total)>0.01)return alert(L("Split payment total must equal invoice total","مجموع الدفعات يجب أن يساوي إجمالي الفاتورة")); setPaying(true); try{const activeShift=await ensureShift();if(!activeShift)return;const j=await api("checkout",{shift_id:activeShift.id,service_type:service,discount:current.discount,discount_percent:disc,customer,held_order_id:heldId,lines:cart.map((z:any)=>({product_id:z.id,quantity:z.quantity,discount:0,notes:z.notes||""})),checkout_key:crypto.randomUUID(),payments:split});if(j){await extra("attach_order",{order_id:j.result.order_id,table_id:table?.id||null,table_name:table?.name||null});printReceipt(j.result,cart,{name:split.map((p:any)=>p.payment_method).join(" + ")});K([]);D(0);setSplit([]);Z("");await load();}}finally{setPaying(false);} }

  async function cashMovement(){ if(!shift)return; const amount=Number(cashMove.amount); if(!Number.isFinite(amount)||amount<=0||!String(cashMove.reason).trim())return alert(L("Enter amount and reason","أدخل المبلغ والسبب")); const j=await api("cash_movement",{shift_id:shift.id,movement_type:cashMove.movement_type,amount,reason:cashMove.reason}); if(j){setCashMove({movement_type:"cash_in",amount:"",reason:""});Z("");} }

  async function hold() {
    if (!cart.length) return;
    const j = await api("hold", {
      shift_id: shift?.id || null,
      service_type: service,
      discount: current.discount,
      discount_percent: disc,
      customer,
      lines: cart.map((z: any) => ({ product_id: z.id, quantity: z.quantity, discount: 0, notes: z.notes || "" }))
    });
    if (j) { K([]); D(0); H(null); load(); }
  }

  async function openShift() {
    const amount = Number(openingCash || 0); if (!Number.isFinite(amount) || amount < 0) return alert(L("Invalid opening cash", "رصيد البداية غير صالح"));
    await api("open_shift", { warehouse_id: wh || null, opening_cash: amount }); setOpeningCash("");
    load();
  }

  async function closeShift() {
    if (!shift) return;
    const closing = Number(closingCash); if (!Number.isFinite(closing) || closing < 0) return alert(L("Enter counted cash before closing", "أدخل النقد المعدود قبل الإغلاق"));
    const j = await api("close_shift", { shift_id: shift.id, closing_cash: closing });
    if (j) {
      if (j.report) { setLastShiftReport(j.report); printShiftReport(j.report); }
      setClosingCash(""); await load();
    }
  }

  async function voidOrder(){if(!voidTarget||!voidReason.trim())return alert(L("Void reason is required","سبب الإلغاء مطلوب"));const j=await api("void",{order_id:voidTarget.id,reason:voidReason.trim()});if(j){setVoidTarget(null);setVoidReason("");Z("");alert(L("Order voided","تم إلغاء الطلب"));await load();}}

  async function partialRefund(){if(!refundTarget)return;const lines=(refundTarget.sales_order_lines||[]).map((l:any)=>({order_line_id:l.id,quantity:Number(refundQty[l.id]||0)})).filter((l:any)=>l.quantity>0);if(!lines.length)return alert(L("Select at least one item","اختر صنفاً واحداً على الأقل"));const j=await api("partial_refund",{order_id:refundTarget.id,lines,reason:refundReason});if(j){alert(L("Refund completed: ","تم الاسترجاع: ")+(j.result?.refund_no||""));setRefundTarget(null);setRefundQty({});setRefundReason("");Z("track");await load();}}

  async function refundOrder(order: any) {
    if (!order || order.status !== "completed") return;
    const reason = window.prompt(L("Refund reason", "سبب الاسترجاع"), "");
    if (reason === null) return;
    if (!window.confirm(L("Refund the full invoice and restore stock?", "استرجاع كامل الفاتورة وإعادة المخزون؟"))) return;
    const j = await api("refund", { order_id: order.id, reason });
    if (j) {
      alert(L("Refund completed: ", "تم الاسترجاع: ") + (j.result?.refund_no || ""));
      await load();
    }
  }

  async function addTable() {
    if (!String(tableForm.name || "").trim()) return alert(L("Table name is required", "اسم الطاولة مطلوب"));
    const r = await fetch("/api/commerce-admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "dining_table", data: tableForm }) });
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
    <header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl font-black">{L("Cashier", "الكاشير")}</h1><p className="text-sm text-slate-400">{L("Cashier", "الكاشير")}: <b className="text-cyan-300">{x.cashier_name}</b> · {L("Shift", "الوردية")} {shift ? L("OPEN", "مفتوحة") : L("CLOSED", "مغلقة")}</p></div></header>

    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => shift ? closeShift() : openShift()}
        className={"relative flex h-9 w-[118px] items-center rounded-full border px-1 transition " + (shift ? "border-emerald-500/50 bg-emerald-500/15" : "border-slate-600 bg-slate-950")}
        aria-label={shift ? L("Close shift", "إغلاق الوردية") : L("Open shift", "فتح الوردية")}
      >
        <span className={"absolute h-7 w-7 rounded-full transition-all " + (shift ? (ar ? "right-[86px] bg-emerald-400" : "left-[86px] bg-emerald-400") : (ar ? "right-1 bg-slate-500" : "left-1 bg-slate-500"))} />
        <span className={"w-full px-2 text-xs font-black " + (shift ? (ar ? "text-right" : "text-left") : (ar ? "text-left" : "text-right"))}>
          {shift ? L("OPEN", "مفتوح") : L("CLOSED", "مغلق")}
        </span>
      </button>
      {lastShiftReport && <button className={ghost} onClick={() => printShiftReport(lastShiftReport)}>{L("Print closing report", "طباعة تقرير الإقفال")}</button>}{!shift?<input className={`${inp} w-40`} type="number" min="0" step="0.01" value={openingCash} onChange={e=>setOpeningCash(e.target.value)} placeholder={L("Opening cash","نقد البداية")} />:<input className={`${inp} w-40`} type="number" min="0" step="0.01" value={closingCash} onChange={e=>setClosingCash(e.target.value)} placeholder={L("Counted cash","النقد المعدود")} />}
      <a className={ghost} href="/pos?area=kds">{L("Kitchen","المطبخ")}</a><button className={ghost} onClick={() => Z("track")}>{L("Track Invoice", "تتبع الفاتورة")}</button>{shift&&<button className={ghost} onClick={()=>Z("cashmove")}>{L("Cash In / Out","إدخال / إخراج نقدي")}</button>}
      <button className={ghost} onClick={() => Z("tables")}>{L("Dining Map", "خريطة الطاولات")}</button>
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
            <div className="aspect-[16/10] bg-slate-800">{p.image_url ? <img src={p.image_url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-slate-600">{L("No image", "بدون صورة")}</div>}</div>
            <div className="p-3"><b>{p.name}</b><small className="block text-slate-500">{p.sale_unit || "piece"}</small><div className="text-cyan-300">{Number(p.price).toFixed(2)} {currency}</div></div>
          </button>)}
        </div>
      </main>

      <aside className={`${panel} flex flex-col`}>
        <div className="border-b border-slate-800 p-5"><div className="flex justify-between"><h2 className="text-xl font-black">{L("Current Order", "الطلب الحالي")}</h2><button className="text-rose-400" onClick={() => K([])}>{L("Clear", "مسح")}</button></div>{table && <small className="text-cyan-300">{L("Table", "الطاولة")}: {table.name}</small>}{heldId && <small className="ml-2 text-amber-300">{L("Recalled held order", "طلب معلق مسترجع")}</small>}</div>

        <div className="flex-1 p-4">
          {!cart.length && <div className="py-16 text-center text-slate-600">{L("No items yet", "لا توجد أصناف بعد")}</div>}
          {cart.map((z: any) => <div key={z.id} className="mb-2 rounded-xl border border-slate-800 p-3">
            <div className="flex justify-between"><b>{z.name}</b><span>{(Number(z.price) * Number(z.quantity)).toFixed(2)}</span></div>
            <div className="mt-2 flex items-center gap-2"><button className="h-8 w-8 rounded bg-slate-800" onClick={() => decrement(z.id)}>−</button><b>{z.quantity}</b><button className="h-8 w-8 rounded bg-slate-800" onClick={() => K(a => a.map((v: any) => v.id === z.id ? { ...v, quantity: v.quantity + 1 } : v))}>+</button><button className="ml-auto text-xs font-bold text-rose-400" onClick={() => K(a => a.filter((v: any) => v.id !== z.id))}>{L("Cancel", "إلغاء")}</button></div>
            <textarea className={`${inp} mt-2 min-h-[52px] resize-y`} placeholder={L("Comment", "ملاحظة")} value={z.notes || ""} onChange={e => K(a => a.map((v: any) => v.id === z.id ? { ...v, notes: e.target.value } : v))} />
          </div>)}
        </div>

        <div className="border-t border-slate-800 p-5">
          <div className="text-sm"><div className="flex justify-between"><span>{L("Subtotal", "المجموع الفرعي")}</span><b>{current.subtotal.toFixed(2)}</b></div>{disc > 0 && <div className="flex justify-between text-emerald-300"><span>{L("Discount", "الخصم")} {disc}%</span><b>-{current.discount.toFixed(2)}</b></div>}<div className="flex justify-between"><span>{L("Tax", "الضريبة")}</span><b>{current.tax.toFixed(2)}</b></div><div className="mt-2 flex justify-between text-2xl font-black"><span>{L("Total", "الإجمالي")}</span><span>{current.total.toFixed(2)} {currency}</span></div></div>
          <button className={`${btn} mt-3 w-full`} disabled={!cart.length || !wh} onClick={() => { P(null); Z("payment"); }}>{L("Pay", "دفع")}</button>
          <div className="mt-2 grid grid-cols-3 gap-2"><button className={ghost} disabled={!cart.length} onClick={hold}>{L("Hold", "تعليق")}</button><button className={ghost} onClick={() => { setCustomDisc(String(disc || "")); Z("discount"); }}>{L("Discount", "خصم")}</button><button className={ghost} onClick={() => Z("customer")}>{L("Customer", "العميل")}</button></div>
        </div>
      </aside>
    </div>

    {modal === "payment" && <Modal t={L("Choose Payment Method", "اختر طريقة الدفع")} x={() => { P(null); Z(""); }}>
      {x.payment_methods.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-700 p-8 text-center text-slate-400">{L("No payment methods found. Add them from Settings → Cashier Monitor.", "لا توجد طرق دفع. أضفها من الإعدادات ← مراقبة الكاشير.")}</div> : <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">{x.payment_methods.map((m: any) => <button key={m.id} className={`rounded-2xl border p-4 text-left rtl:text-right ${pay?.id === m.id ? "border-cyan-400 bg-cyan-400/10" : "border-slate-700 bg-slate-950"}`} onClick={() => P(m)}><b className="text-lg">{m.name}</b><div className="mt-2 text-xl font-black text-cyan-300">{totals(m).total.toFixed(2)} {currency}</div></button>)}</div>}
      <button className={`${ghost} mt-4 w-full`} onClick={()=>{setSplit([]);Z("split")}}>{L("Split payment","دفع متعدد")}</button>{pay && <div className="mt-5 rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-4"><div className="mb-3 flex items-center justify-between"><b>{pay.name}</b><b className="text-xl text-cyan-300">{totals(pay).total.toFixed(2)} {currency}</b></div><div className="space-y-2 border-y border-slate-800 py-3">{cart.map((z: any) => <div key={z.id} className="flex items-center justify-between gap-3 text-sm"><span>{z.name} × {z.quantity}</span><span>{unitPrice(z, pay).toFixed(2)} {currency}</span></div>)}</div><button className={`${btn} mt-4 w-full`} disabled={paying} onClick={() => checkout(pay)}>{paying ? L("Processing...", "جارٍ الدفع...") : L("Pay & Print", "دفع وطباعة")}</button></div>}
    </Modal>}

    {modal === "split" && <Modal t={L("Split Payment","دفع متعدد")} x={()=>Z("")}><div className="space-y-3">{x.payment_methods.map((m:any)=>{const row=split.find((p:any)=>p.payment_method===m.code);return <div key={m.id} className="grid grid-cols-[1fr_160px] items-center gap-3 rounded-xl border border-slate-800 p-3"><b>{m.name}</b><input className={inp} type="number" min="0" step="0.01" value={row?.amount||""} onChange={e=>setSplit((a:any[])=>{const rest=a.filter(p=>p.payment_method!==m.code),v=Number(e.target.value||0);return v>0?[...rest,{payment_method:m.code,base_amount:v,amount:v}]:rest})}/></div>})}<div className="flex justify-between font-black"><span>{L("Invoice total","إجمالي الفاتورة")}</span><span>{current.total.toFixed(2)} {currency}</span></div><div className="flex justify-between"><span>{L("Entered","المدخل")}</span><b>{split.reduce((a:number,p:any)=>a+Number(p.amount||0),0).toFixed(2)} {currency}</b></div><button className={`${btn} w-full`} disabled={paying||Math.abs(split.reduce((a:number,p:any)=>a+Number(p.amount||0),0)-current.total)>0.01} onClick={()=>checkoutSplit()}>{L("Complete & Print","إتمام وطباعة")}</button></div></Modal>}
    {modal === "cashmove" && <Modal t={L("Cash In / Out","إدخال / إخراج نقدي")} x={()=>Z("")}><div className="space-y-3"><select className={inp} value={cashMove.movement_type} onChange={e=>setCashMove({...cashMove,movement_type:e.target.value})}><option value="cash_in">{L("Cash In","إدخال نقدي")}</option><option value="cash_out">{L("Cash Out","إخراج نقدي")}</option></select><input className={inp} type="number" min="0" step="0.01" value={cashMove.amount} onChange={e=>setCashMove({...cashMove,amount:e.target.value})} placeholder={L("Amount","المبلغ")}/><input className={inp} value={cashMove.reason} onChange={e=>setCashMove({...cashMove,reason:e.target.value})} placeholder={L("Reason","السبب")}/><button className={`${btn} w-full`} onClick={cashMovement}>{L("Save movement","حفظ الحركة")}</button></div></Modal>}

    {modal === "discount" && <Modal t={L("Apply Discount", "تطبيق الخصم")} x={() => Z("")}><p className="mb-4 text-sm text-slate-400">{L("Choose a preset or enter a custom percentage. The invoice recalculates immediately.", "اختر نسبة جاهزة أو أدخل نسبة مخصصة، ويتم إعادة حساب الفاتورة مباشرة.")}</p><div className="grid grid-cols-3 gap-2">{[5,10,15,20,30].map(n => <button key={n} className={disc === n ? btn : ghost} onClick={() => { D(n); Z(""); }}>{n}%</button>)}<button className={ghost} onClick={() => { D(0); Z(""); }}>{L("No Discount", "بدون خصم")}</button></div><div className="mt-4 rounded-2xl border border-slate-800 p-4"><label className="text-xs font-black uppercase text-slate-400">{L("Custom Discount %", "خصم مخصص %")}</label><div className="mt-2 flex gap-2"><input className={inp} type="number" min="0" max="100" step="0.01" placeholder="12.5" value={customDisc} onChange={e => setCustomDisc(e.target.value)} /><button className={btn} onClick={() => { D(Math.max(0, Math.min(100, Number(customDisc || 0)))); Z(""); }}>{L("Apply", "تطبيق")}</button></div></div></Modal>}

    {modal === "customer" && <Modal t={L("Customer Details", "تفاصيل العميل")} x={() => Z("")}><div className="space-y-3"><input className={inp} placeholder={L("Customer name", "اسم العميل")} value={customer.name} onChange={e => U({ ...customer, name: e.target.value })} /><input className={inp} placeholder={L("Phone number", "رقم الهاتف")} value={customer.phone} onChange={e => U({ ...customer, phone: e.target.value })} /><input className={inp} placeholder={L("Email (optional)", "البريد الإلكتروني (اختياري)")} value={customer.email} onChange={e => U({ ...customer, email: e.target.value })} /><textarea className={inp} placeholder={L("Notes (optional)", "ملاحظات (اختياري)")} value={customer.notes} onChange={e => U({ ...customer, notes: e.target.value })} /><button className={btn} onClick={() => Z("")}>{L("Use Customer", "اعتماد العميل")}</button></div></Modal>}

    {modal === "tables" && <Modal t={L("Dining Map", "خريطة الطاولات")} x={() => Z("")}><div className="grid gap-2 md:grid-cols-[1fr_1fr_100px_auto]"><input className={inp} placeholder={L("Table name", "اسم الطاولة")} value={tableForm.name} onChange={e => setTableForm({ ...tableForm, name: e.target.value })} /><input className={inp} placeholder={L("Area", "المنطقة")} value={tableForm.area} onChange={e => setTableForm({ ...tableForm, area: e.target.value })} /><input className={inp} type="number" min="1" value={tableForm.seats} onChange={e => setTableForm({ ...tableForm, seats: Number(e.target.value) })} /><button className={btn} onClick={addTable}>+ {L("Table", "طاولة")}</button></div><div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">{x.tables.map((t: any) => <div key={t.id} className={`rounded-2xl border p-4 ${table?.id === t.id ? "border-cyan-400" : "border-slate-700"}`}><b>{t.name}</b><small className="block text-slate-500">{t.area || L("Main", "الرئيسية")} · {t.seats} {L("seats", "مقاعد")}</small><div className="mt-2 flex gap-1"><button className="text-cyan-300" onClick={() => { T(t); Z(""); }}>{L("Select", "اختيار")}</button><button className="ml-auto text-xs" onClick={async () => { await extra("table_status", { table_id: t.id, status: t.status === "closed" ? "open" : "closed" }); load(); }}>{t.status === "closed" ? L("Open", "فتح") : L("Close", "إغلاق")}</button></div></div>)}</div></Modal>}

    {modal === "track" && <Modal t={L("Invoice Tracking", "تتبع الفواتير")} x={() => Z("")}><div className="space-y-2">{d.orders.filter((o: any) => ["completed","partially_refunded","refunded"].includes(o.status)).slice(0, 50).map((o: any) => <div key={o.id} className="grid gap-2 border-b border-slate-800 py-3 md:grid-cols-[1fr_160px_auto] md:items-center"><span><b>{o.order_no}</b><small className="block text-slate-500">{o.cashier_name || L("Cashier", "كاشير")} · {Number(o.total).toFixed(2)} {currency} · {o.status}</small></span><select disabled={o.status==="refunded"} className={inp} value={o.tracking_status || "new"} onChange={async e => { await extra("tracking", { order_id: o.id, status: e.target.value }); load(); }}><option value="new">{L("New", "جديدة")}</option><option value="preparing">{L("Preparing", "قيد التحضير")}</option><option value="ready">{L("Ready", "جاهزة")}</option><option value="delivered">{L("Delivered", "تم التسليم")}</option><option value="completed">{L("Completed", "مكتملة")}</option><option value="cancelled">{L("Cancelled", "ملغاة")}</option></select>{["completed","partially_refunded"].includes(o.status)?<div className="flex gap-2"><button className="rounded-xl border border-amber-700 px-3 py-2 text-xs font-black text-amber-300" onClick={()=>{setRefundTarget(o);setRefundQty({});setRefundReason("");Z("partialrefund")}}>{L("Partial Refund","استرجاع جزئي")}</button>{o.status==="completed"&&<button className="rounded-xl border border-rose-700 px-3 py-2 text-xs font-black text-rose-300" onClick={()=>refundOrder(o)}>{L("Full Refund", "استرجاع كامل")}</button>}</div>:<span className="text-xs font-black text-amber-300">{L("REFUNDED", "مُسترجعة")}</span>}</div>)}</div></Modal>}

    {modal === "partialrefund" && refundTarget && <Modal t={L("Partial Refund","استرجاع جزئي")} x={()=>{setRefundTarget(null);Z("track")}}><div className="space-y-3"><div className="text-sm text-slate-400">{refundTarget.order_no}</div>{(refundTarget.sales_order_lines||[]).map((l:any)=>{const refunded=(d.refunds||[]).filter((r:any)=>r.order_id===refundTarget.id).flatMap((r:any)=>r.sales_refund_lines||[]).filter((z:any)=>z.order_line_id===l.id).reduce((a:number,z:any)=>a+Number(z.quantity||0),0);const remaining=Math.max(0,Number(l.quantity)-refunded);return <div key={l.id} className="grid grid-cols-[1fr_120px] items-center gap-3 rounded-xl border border-slate-800 p-3"><span><b>{l.product_name}</b><small className="block text-slate-500">{L("Sold","المباع")}: {Number(l.quantity)} · {L("Refunded","المسترجع")}: {refunded} · {L("Remaining","المتبقي")}: {remaining}</small></span><input className={inp} type="number" min="0" max={remaining} step="1" disabled={remaining<=0} value={refundQty[l.id]||""} onChange={e=>setRefundQty({...refundQty,[l.id]:e.target.value})} placeholder={L("Qty","الكمية")}/></div>})}<textarea className={inp} value={refundReason} onChange={e=>setRefundReason(e.target.value)} placeholder={L("Refund reason","سبب الاسترجاع")}/><button className={`${btn} w-full`} onClick={partialRefund}>{L("Confirm Partial Refund","تأكيد الاسترجاع الجزئي")}</button></div></Modal>}

    {modal === "holds" && <Modal t={L("Held Orders", "الطلبات المعلقة")} x={() => Z("")}><div>{held.map((o: any) => <div key={o.id} className="flex items-center justify-between border-b border-slate-800 py-3"><span><b>{o.order_no}</b>{o.channel === "go" && <span className="ml-2 rounded bg-amber-400/15 px-2 py-1 text-xs text-amber-300">GO · {L("Pickup", "استلام")}</span>}<small className="block text-slate-500">{o.customer_name && `${o.customer_name} · `}{Number(o.total).toFixed(2)} {currency}</small></span><div className="flex gap-2"><button className={btn} onClick={() => recall(o)}>{L("Recall", "استرجاع")}</button><button className="rounded-xl border border-rose-700 px-3 py-2 text-xs font-black text-rose-300" onClick={()=>{setVoidTarget(o);setVoidReason("");Z("void")}}>{L("Void","إلغاء")}</button></div></div>)}</div></Modal>}
  {modal === "void" && voidTarget && <Modal t={L("Void Order","إلغاء الطلب")} x={()=>{setVoidTarget(null);setVoidReason("");Z("")}}><div className="space-y-4"><div className="rounded-2xl border border-rose-900/60 bg-rose-950/30 p-4"><div className="font-black">{voidTarget.order_no}</div><div className="text-sm text-slate-400">{Number(voidTarget.total||0).toFixed(2)} {currency}</div></div><label className="block text-sm font-bold">{L("Reason","السبب")}</label><textarea className={inp} rows={4} value={voidReason} onChange={e=>setVoidReason(e.target.value)} placeholder={L("Required: explain why this order is being voided","مطلوب: اكتب سبب إلغاء الطلب")} /><p className="text-xs text-slate-400">{L("Permission-controlled and recorded in the audit log.","مرتبطة بالصلاحيات ومسجلة في سجل التدقيق.")}</p><div className="flex justify-end gap-2"><button className={ghost} onClick={()=>{setVoidTarget(null);setVoidReason("");Z("")}}>{L("Cancel","رجوع")}</button><button className="rounded-xl bg-rose-500 px-4 py-3 font-black text-white disabled:opacity-40" disabled={!voidReason.trim()} onClick={voidOrder}>{L("Confirm Void","تأكيد الإلغاء")}</button></div></div></Modal>}\n  </div>;
}

function Modal({ t, x, children }: any) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"><div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-3xl border border-slate-700 bg-slate-900 p-6"><div className="mb-4 flex justify-between"><h2 className="text-xl font-black">{t}</h2><button onClick={x}>✕</button></div>{children}</div></div>;
}
