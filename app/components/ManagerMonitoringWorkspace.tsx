"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, BarChart3, Boxes, Factory, Package, ReceiptText, RefreshCw, ShoppingBag, WalletCards, Warehouse } from "lucide-react";
import { useLanguage } from "./LanguageProvider";

type RangeKey = "today" | "7d" | "30d" | "90d";
type Snapshot = {
  sales: Record<string, number>;
  inventory: Record<string, number>;
  production: Record<string, number>;
  best_sellers: Array<Record<string, any>>;
  payment_methods: Array<Record<string, any>>;
  sales_trend: Array<Record<string, any>>;
  low_stock: Array<Record<string, any>>;
  top_production: Array<Record<string, any>>;
};
type Payload = {
  current: Snapshot;
  previous: Snapshot;
  warehouses: Array<{ id: string; name: string; code?: string | null }>;
  currency: string;
  company_name: string;
  generated_at: string;
};

const ranges: { key: RangeKey; en: string; ar: string }[] = [
  { key: "today", en: "Today", ar: "اليوم" },
  { key: "7d", en: "7 days", ar: "7 أيام" },
  { key: "30d", en: "30 days", ar: "30 يوم" },
  { key: "90d", en: "90 days", ar: "90 يوم" },
];

function localRange(key: RangeKey) {
  const to = new Date();
  const from = new Date(to);
  from.setHours(0, 0, 0, 0);
  if (key === "7d") from.setDate(from.getDate() - 6);
  if (key === "30d") from.setDate(from.getDate() - 29);
  if (key === "90d") from.setDate(from.getDate() - 89);
  return { from, to };
}

function num(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function pctChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export default function ManagerMonitoringWorkspace() {
  const { language } = useLanguage();
  const ar = language === "ar";
  const [range, setRange] = useState<RangeKey>("30d");
  const [warehouse, setWarehouse] = useState("all");
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let active = true;
    const { from, to } = localRange(range);
    const params = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() });
    if (warehouse !== "all") params.set("warehouse", warehouse);
    setLoading(true);
    setError("");
    fetch(`/api/manager-monitoring?${params.toString()}`, { cache: "no-store" })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || "Could not load dashboard");
        return json as Payload;
      })
      .then((json) => active && setData(json))
      .catch((err) => active && setError(err.message || "Could not load dashboard"))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [range, warehouse, refreshToken]);

  const money = (value: unknown) => {
    const amount = num(value);
    try {
      return new Intl.NumberFormat(ar ? "ar-SA" : "en-US", { style: "currency", currency: data?.currency || "SAR", maximumFractionDigits: 2 }).format(amount);
    } catch {
      return `${new Intl.NumberFormat(ar ? "ar-SA" : "en-US", { maximumFractionDigits: 2 }).format(amount)} ${data?.currency || ""}`.trim();
    }
  };
  const number = (value: unknown, digits = 0) => new Intl.NumberFormat(ar ? "ar-SA" : "en-US", { maximumFractionDigits: digits }).format(num(value));

  const alerts = useMemo(() => {
    if (!data) return [] as { level: "critical" | "warning" | "info"; title: string; text: string }[];
    const s = data.current.sales || {};
    const i = data.current.inventory || {};
    const p = data.current.production || {};
    const out: { level: "critical" | "warning" | "info"; title: string; text: string }[] = [];
    if (num(i.out_of_stock) > 0) out.push({ level: "critical", title: ar ? "أصناف نافدة" : "Out-of-stock items", text: ar ? `${number(i.out_of_stock)} أصناف تحتاج معالجة فورية.` : `${number(i.out_of_stock)} items require immediate action.` });
    if (num(i.low_stock) > 0) out.push({ level: "warning", title: ar ? "مخزون منخفض" : "Low stock", text: ar ? `${number(i.low_stock)} أصناف وصلت أو نزلت تحت نقطة إعادة الطلب.` : `${number(i.low_stock)} items are at or below their reorder level.` });
    if (num(s.gross_revenue) > 0 && num(s.gross_margin_percent) < 20) out.push({ level: "warning", title: ar ? "هامش الربح منخفض" : "Low gross margin", text: ar ? `هامش الربح ${number(s.gross_margin_percent, 1)}%. راجع التكلفة والتسعير والخصومات.` : `Gross margin is ${number(s.gross_margin_percent, 1)}%. Review cost, pricing and discounts.` });
    if (num(s.gross_revenue) > 0 && num(s.refunds) / num(s.gross_revenue) > 0.05) out.push({ level: "warning", title: ar ? "المرتجعات مرتفعة" : "Refunds are elevated", text: ar ? `المرتجعات تجاوزت 5% من المبيعات في الفترة المحددة.` : `Refunds exceeded 5% of gross sales in the selected period.` });
    if (num(p.in_progress) > 0 || num(p.planned) > 0) out.push({ level: "info", title: ar ? "إنتاج مفتوح" : "Open production", text: ar ? `${number(p.in_progress)} قيد التنفيذ و ${number(p.planned)} مخطط.` : `${number(p.in_progress)} in progress and ${number(p.planned)} planned.` });
    if (out.length === 0) out.push({ level: "info", title: ar ? "لا توجد تنبيهات حرجة" : "No critical alerts", text: ar ? "المؤشرات الحالية لا تظهر مشكلة إدارية عاجلة." : "Current indicators show no urgent management exception." });
    return out.slice(0, 5);
  }, [data, ar]);

  if (error && !data) return <div className="flex min-h-[65vh] items-center justify-center p-6"><div className="max-w-md rounded-3xl border border-rose-500/20 bg-rose-500/5 p-6 text-center"><AlertTriangle className="mx-auto text-rose-300"/><h2 className="mt-3 text-lg font-black text-white">{ar ? "تعذر تحميل لوحة المراقبة" : "Could not load monitoring"}</h2><p className="mt-2 text-sm text-slate-400">{error}</p><button onClick={()=>setRefreshToken(v=>v+1)} className="mt-4 rounded-xl bg-cyan-400 px-4 py-2 text-sm font-black text-slate-950">{ar ? "إعادة المحاولة" : "Retry"}</button></div></div>;

  const current = data?.current;
  const previous = data?.previous;
  const s = current?.sales || {};
  const ps = previous?.sales || {};
  const i = current?.inventory || {};
  const p = current?.production || {};
  const pp = previous?.production || {};
  const trend = current?.sales_trend || [];
  const maxTrend = Math.max(1, ...trend.map(row => num(row.revenue)));
  const topPayment = current?.payment_methods?.[0];

  return <main className="flex-1 px-4 py-5 text-white sm:px-6 sm:py-7" dir={ar ? "rtl" : "ltr"}>
    <div className="mx-auto max-w-[1600px] space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.2em] text-cyan-400"><Activity size={15}/>{ar ? "مراقبة الإدارة" : "MANAGEMENT CONTROL"}</div>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">Manager Monitoring</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">{ar ? "لوحة واحدة لمتابعة المبيعات، الربحية، المخزون، الإنتاج والاستثناءات التشغيلية بشكل مباشر." : "One operating view for sales, profitability, inventory, production and management exceptions."}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={warehouse} onChange={e=>setWarehouse(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-cyan-400">
            <option value="all">{ar ? "كل الفروع / المخازن" : "All branches / warehouses"}</option>
            {(data?.warehouses || []).map(w=><option key={w.id} value={w.id}>{w.name}{w.code ? ` · ${w.code}` : ""}</option>)}
          </select>
          <div className="flex rounded-xl border border-slate-800 bg-slate-950 p-1">
            {ranges.map(item=><button key={item.key} onClick={()=>setRange(item.key)} className={`rounded-lg px-3 py-2 text-xs font-black transition ${range===item.key?"bg-cyan-400 text-slate-950":"text-slate-500 hover:text-white"}`}>{ar?item.ar:item.en}</button>)}
          </div>
          <button onClick={()=>setRefreshToken(v=>v+1)} disabled={loading} className="rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-slate-300 hover:border-cyan-500/40 hover:text-cyan-300 disabled:opacity-50"><RefreshCw size={18} className={loading?"animate-spin":""}/></button>
        </div>
      </div>

      {loading && <div className="h-1 overflow-hidden rounded-full bg-slate-900"><div className="h-full w-1/3 animate-pulse rounded-full bg-cyan-400"/></div>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <Kpi title={ar?"صافي المبيعات":"Net Sales"} value={money(s.net_revenue)} icon={ReceiptText} trend={pctChange(num(s.net_revenue),num(ps.net_revenue))} ar={ar}/>
        <Kpi title={ar?"الربح الإجمالي":"Gross Profit"} value={money(s.gross_profit)} icon={BarChart3} trend={pctChange(num(s.gross_profit),num(ps.gross_profit))} sub={`${number(s.gross_margin_percent,1)}% ${ar?"هامش":"margin"}`} ar={ar}/>
        <Kpi title={ar?"عدد الفواتير":"Orders"} value={number(s.orders)} icon={ShoppingBag} trend={pctChange(num(s.orders),num(ps.orders))} ar={ar}/>
        <Kpi title={ar?"متوسط الفاتورة":"Average Ticket"} value={money(s.avg_ticket)} icon={WalletCards} trend={pctChange(num(s.avg_ticket),num(ps.avg_ticket))} ar={ar}/>
        <Kpi title={ar?"قيمة المخزون":"Stock Value"} value={money(i.stock_value)} icon={Warehouse} sub={`${number(i.total_items)} ${ar?"صنف نشط":"active items"}`} ar={ar}/>
        <Kpi title={ar?"إنجاز الإنتاج":"Production Completion"} value={`${number(p.completion_rate,1)}%`} icon={Factory} trend={pctChange(num(p.completion_rate),num(pp.completion_rate))} sub={`${number(p.completed)}/${number(p.total_orders)} ${ar?"أوامر":"orders"}`} ar={ar}/>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.45fr_.55fr]">
        <section className="rounded-3xl border border-slate-800 bg-slate-900/55 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-black">{ar?"اتجاه المبيعات":"Sales Performance"}</h2><p className="mt-1 text-xs text-slate-500">{ar?"صافي المتابعة للفترة المحددة مع عدد الفواتير اليومية.":"Daily gross sales movement and order activity for the selected period."}</p></div><div className="text-end"><div className="text-xs text-slate-500">{ar?"الضريبة":"Tax"}</div><div className="font-black text-slate-200">{money(s.tax)}</div></div></div>
          {trend.length ? <div className="mt-6 flex h-56 items-end gap-1 overflow-x-auto border-b border-slate-800 pb-1">{trend.map((row,idx)=>{const h=Math.max(4,(num(row.revenue)/maxTrend)*100);return <div key={`${row.bucket_date}-${idx}`} className="group flex min-w-[24px] flex-1 flex-col items-center justify-end gap-2"><div className="pointer-events-none absolute hidden rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-[10px] shadow-xl group-hover:block">{money(row.revenue)} · {number(row.orders)} {ar?"فاتورة":"orders"}</div><div className="w-full max-w-9 rounded-t-md bg-gradient-to-t from-blue-600 to-cyan-300 opacity-80 transition group-hover:opacity-100" style={{height:`${h}%`}}/><span className="hidden text-[9px] text-slate-600 sm:block">{new Date(`${row.bucket_date}T00:00:00`).toLocaleDateString(ar?"ar-SA":"en-US",{day:"2-digit",month:"short"})}</span></div>})}</div> : <Empty text={ar?"لا توجد مبيعات في هذه الفترة بعد.":"No sales recorded in this period yet."}/>} 
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/55 p-5 sm:p-6">
          <div className="flex items-center justify-between"><div><h2 className="text-xl font-black">{ar?"تنبيهات الإدارة":"Management Alerts"}</h2><p className="mt-1 text-xs text-slate-500">{ar?"استثناءات تحتاج انتباه المدير.":"Exceptions that deserve management attention."}</p></div><AlertTriangle className="text-amber-300" size={22}/></div>
          <div className="mt-5 space-y-3">{alerts.map((a,idx)=><div key={idx} className={`rounded-2xl border p-4 ${a.level==="critical"?"border-rose-500/20 bg-rose-500/5":a.level==="warning"?"border-amber-500/20 bg-amber-500/5":"border-cyan-500/15 bg-cyan-500/5"}`}><div className="text-sm font-black text-slate-100">{a.title}</div><p className="mt-1 text-xs leading-5 text-slate-500">{a.text}</p></div>)}</div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <RankTable title={ar?"أفضل 10 أصناف مبيعاً":"Top 10 Best Sellers"} subtitle={ar?"مرتبة حسب قيمة المبيعات.":"Ranked by sales value."} icon={ShoppingBag} rows={(current?.best_sellers||[]).map((row:any)=>({name:row.product_name,primary:money(row.revenue),secondary:`${number(row.quantity,2)} ${ar?"كمية":"qty"}`,tertiary:`${ar?"ربح":"GP"}: ${money(row.gross_profit)}`}))} ar={ar}/>
        <section className="rounded-3xl border border-slate-800 bg-slate-900/55 p-5 sm:p-6">
          <div className="flex items-center gap-3"><div className="rounded-xl bg-violet-500/10 p-2.5 text-violet-300"><WalletCards size={20}/></div><div><h2 className="text-xl font-black">{ar?"أفضل 10 طرق دفع":"Top 10 Payment Methods"}</h2><p className="mt-1 text-xs text-slate-500">{topPayment ? `${ar?"الأكثر استخداماً":"Top method"}: ${String(topPayment.payment_method).toUpperCase()}` : (ar?"توزيع التحصيل حسب طريقة الدفع.":"Collected sales by payment method.")}</p></div></div>
          {(current?.payment_methods||[]).length ? <div className="mt-5 space-y-3">{current!.payment_methods.map((row:any,idx:number)=><div key={`${row.payment_method}-${idx}`}><div className="flex items-center justify-between gap-3 text-sm"><div className="flex min-w-0 items-center gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-xs font-black text-slate-500">{idx+1}</span><span className="truncate font-bold text-slate-200">{String(row.payment_method).replaceAll("_"," ").toUpperCase()}</span></div><div className="text-end"><div className="font-black">{money(row.amount)}</div><div className="text-[10px] text-slate-500">{number(row.transactions)} {ar?"عملية":"tx"} · {number(row.share_percent,1)}%</div></div></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-950"><div className="h-full rounded-full bg-violet-400" style={{width:`${Math.min(100,num(row.share_percent))}%`}}/></div></div>)}</div> : <Empty text={ar?"لا توجد عمليات دفع في الفترة المحددة.":"No payments recorded in this period."}/>} 
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-3xl border border-slate-800 bg-slate-900/55 p-5 sm:p-6">
          <div className="flex items-center gap-3"><div className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-300"><Boxes size={20}/></div><div><h2 className="text-xl font-black">{ar?"صحة المخزون":"Inventory Health"}</h2><p className="mt-1 text-xs text-slate-500">{ar?"المتاح، المحجوز، القادم ونقاط إعادة الطلب.":"Availability, reservations, incoming stock and reorder exceptions."}</p></div></div>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4"><Mini label={ar?"منخفض":"Low Stock"} value={number(i.low_stock)}/><Mini label={ar?"نافد":"Out of Stock"} value={number(i.out_of_stock)} danger={num(i.out_of_stock)>0}/><Mini label={ar?"محجوز":"Reserved"} value={number(i.reserved_qty,2)}/><Mini label={ar?"قادم":"Incoming"} value={number(i.incoming_qty,2)}/></div>
          {(current?.low_stock||[]).length ? <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[620px] text-sm"><thead className="text-[10px] uppercase tracking-wider text-slate-600"><tr><th className="pb-3 text-start">{ar?"الصنف":"Item"}</th><th className="pb-3 text-end">{ar?"المتاح":"Available"}</th><th className="pb-3 text-end">{ar?"إعادة الطلب":"Reorder"}</th><th className="pb-3 text-end">{ar?"القادم":"Incoming"}</th></tr></thead><tbody className="divide-y divide-slate-800">{current!.low_stock.map((row:any)=><tr key={row.item_id}><td className="py-3"><div className="font-bold text-slate-200">{row.name}</div><div className="text-[10px] text-slate-600">{row.sku||row.category||"—"}</div></td><td className={`py-3 text-end font-black ${num(row.available_qty)<=0?"text-rose-300":"text-amber-300"}`}>{number(row.available_qty,2)}</td><td className="py-3 text-end text-slate-400">{number(row.threshold,2)}</td><td className="py-3 text-end text-slate-400">{number(row.qty_incoming,2)}</td></tr>)}</tbody></table></div> : <Empty text={ar?"لا توجد أصناف منخفضة أو نافدة حالياً.":"No low-stock or out-of-stock items right now."}/>} 
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/55 p-5 sm:p-6">
          <div className="flex items-center gap-3"><div className="rounded-xl bg-orange-500/10 p-2.5 text-orange-300"><Factory size={20}/></div><div><h2 className="text-xl font-black">{ar?"صحة الإنتاج":"Production Health"}</h2><p className="mt-1 text-xs text-slate-500">{ar?"الأوامر، الإنجاز، الكمية الفعلية والهدر.":"Orders, completion, actual output and waste."}</p></div></div>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4"><Mini label={ar?"مكتمل":"Completed"} value={number(p.completed)}/><Mini label={ar?"قيد التنفيذ":"In Progress"} value={number(p.in_progress)}/><Mini label={ar?"نسبة الإنتاج":"Yield"} value={`${number(p.yield_percent,1)}%`}/><Mini label={ar?"تكلفة الهدر":"Waste Cost"} value={money(p.waste_cost)} danger={num(p.waste_cost)>0}/></div>
          {(current?.top_production||[]).length ? <div className="mt-5 space-y-2">{current!.top_production.map((row:any,idx:number)=><div key={`${row.recipe_id}-${idx}`} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/45 p-3"><div className="flex min-w-0 items-center gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-xs font-black text-slate-500">{idx+1}</span><div className="min-w-0"><div className="truncate text-sm font-bold text-slate-200">{row.recipe_name}</div><div className="text-[10px] text-slate-600">{number(row.orders)} {ar?"أوامر":"orders"}</div></div></div><div className="text-end"><div className="font-black text-orange-200">{number(row.actual_qty,2)}</div><div className="text-[10px] text-slate-600">{ar?"مخطط":"planned"} {number(row.planned_qty,2)}</div></div></div>)}</div> : <Empty text={ar?"لا توجد أوامر إنتاج في الفترة المحددة.":"No production orders in this period."}/>} 
        </section>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/40 px-4 py-3 text-xs text-slate-600"><span>{data?.company_name || "AVERO"} · {ar?"آخر تحديث":"Last updated"} {data?.generated_at ? new Date(data.generated_at).toLocaleTimeString(ar?"ar-SA":"en-US",{hour:"2-digit",minute:"2-digit"}) : "—"}</span><span>{ar?"المؤشرات تحسب من معاملات POS والمخزون والإنتاج الفعلية.":"KPIs are calculated from actual POS, inventory and production transactions."}</span></div>
    </div>
  </main>;
}

function Kpi({title,value,icon:Icon,trend,sub,ar}:{title:string;value:string;icon:any;trend?:number|null;sub?:string;ar:boolean}){
  return <div className="rounded-2xl border border-slate-800 bg-slate-900/55 p-4"><div className="flex items-start justify-between gap-3"><div className="rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-cyan-300"><Icon size={18}/></div>{trend!==undefined&&<Trend value={trend} ar={ar}/>}</div><div className="mt-4 text-xs font-bold text-slate-500">{title}</div><div className="mt-1 truncate text-2xl font-black tracking-tight text-white">{value}</div>{sub&&<div className="mt-1 text-[10px] text-slate-600">{sub}</div>}</div>
}
function Trend({value,ar}:{value:number|null;ar:boolean}){if(value===null)return <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2 py-1 text-[10px] font-black text-cyan-300">{ar?"جديد":"NEW"}</span>;const up=value>=0;return <span className={`flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-black ${up?"bg-emerald-500/10 text-emerald-300":"bg-rose-500/10 text-rose-300"}`}>{up?<ArrowUpRight size={12}/>:<ArrowDownRight size={12}/>} {Math.abs(value).toFixed(1)}%</span>}
function Mini({label,value,danger=false}:{label:string;value:string;danger?:boolean}){return <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-3"><div className="text-[10px] font-bold uppercase tracking-wider text-slate-600">{label}</div><div className={`mt-1 text-lg font-black ${danger?"text-rose-300":"text-slate-200"}`}>{value}</div></div>}
function Empty({text}:{text:string}){return <div className="mt-5 flex min-h-32 items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/30 p-5 text-center text-sm text-slate-600"><Package size={18} className="me-2"/>{text}</div>}
function RankTable({title,subtitle,icon:Icon,rows,ar}:{title:string;subtitle:string;icon:any;rows:Array<{name:string;primary:string;secondary:string;tertiary:string}>;ar:boolean}){return <section className="rounded-3xl border border-slate-800 bg-slate-900/55 p-5 sm:p-6"><div className="flex items-center gap-3"><div className="rounded-xl bg-blue-500/10 p-2.5 text-blue-300"><Icon size={20}/></div><div><h2 className="text-xl font-black">{title}</h2><p className="mt-1 text-xs text-slate-500">{subtitle}</p></div></div>{rows.length?<div className="mt-5 space-y-2">{rows.map((row,idx)=><div key={`${row.name}-${idx}`} className="grid grid-cols-[36px_1fr_auto] items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/45 p-3"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-xs font-black text-slate-500">{idx+1}</span><div className="min-w-0"><div className="truncate text-sm font-bold text-slate-200">{row.name}</div><div className="mt-0.5 text-[10px] text-slate-600">{row.secondary} · {row.tertiary}</div></div><div className="whitespace-nowrap text-sm font-black text-blue-200">{row.primary}</div></div>)}</div>:<Empty text={ar?"لا توجد أصناف مباعة في الفترة المحددة.":"No sold items in this period."}/>}</section>}
