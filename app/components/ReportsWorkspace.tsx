"use client";

import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "./LanguageProvider";

const labels: Record<string, [string, string]> = {
  sales: ["Sales", "المبيعات"], items: ["Items", "الأصناف"], customers: ["Customers", "الزبائن"],
  production: ["Production", "الإنتاج"], waste: ["Waste", "الهدر"], counts: ["Stock Counts", "الجرد"],
  stock: ["Stock Snapshot", "حالة المخزون"], purchasing: ["Purchasing", "المشتريات"], movements: ["Stock Movements", "حركة المخزون"],
};
const input = "rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white";
const action = "rounded-xl border border-slate-600 px-4 py-2 font-bold text-slate-200 disabled:opacity-40";
const escapeHtml = (value: unknown) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const localDay = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const display = (value: unknown) => value === null || value === undefined ? "" : typeof value === "object" ? JSON.stringify(value) : String(value);

export default function ReportsWorkspace({ allowed }: { allowed: string[] }) {
  const { language } = useLanguage();
  const ar = language === "ar";
  const L = (en: string, arabic: string) => ar ? arabic : en;
  const [type, setType] = useState(allowed[0]);
  const [from, setFrom] = useState(() => { const date = new Date(); date.setDate(date.getDate() - 29); return localDay(date); });
  const [to, setTo] = useState(() => localDay(new Date()));
  const [data, setData] = useState<{ rows: Record<string, unknown>[]; truncated: boolean; generated_at: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(""); setData(null);
    const query = new URLSearchParams({ type, from, to });
    fetch(`/api/reports?${query}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => { const body = await response.json(); if (!response.ok) throw new Error(body.error || "Report failed"); return body; })
      .then(setData).catch((cause) => { if (cause.name !== "AbortError") setError(cause.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [type, from, to]);
  const rows = data?.rows || [];
  const columns = useMemo(() => [...new Set(rows.flatMap((row) => Object.keys(row)))], [rows]);
  const exportable = Boolean(data && !data.truncated);
  const title = ar ? labels[type]?.[1] : labels[type]?.[0];

  function download(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = name; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  function excel() {
    const quote = (value: unknown) => { let text = display(value); if (typeof value === "string" && /^[=+@-]/.test(text)) text = `'${text}`; return `"${text.replaceAll('"', '""')}"`; };
    const csv = `\uFEFF${columns.map(quote).join(",")}\r\n${rows.map((row) => columns.map((key) => quote(row[key])).join(",")).join("\r\n")}`;
    download(new Blob([csv], { type: "text/csv;charset=utf-8" }), `AVERO-${type}-${from}-${to}.csv`);
  }
  function pdf() {
    const popup = window.open("", "_blank");
    if (!popup) { setError(L("Allow popups to print the report", "اسمح بالنوافذ المنبثقة لطباعة التقرير")); return; }
    popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>body{font:11px Arial,sans-serif;margin:20mm;color:#111}table{border-collapse:collapse;width:100%}th,td{border:1px solid #aaa;padding:5px;word-break:break-word}thead{display:table-header-group}@page{size:A4 landscape}</style></head><body><h1>AVERO · ${escapeHtml(title)}</h1><p>${escapeHtml(from)} — ${escapeHtml(to)} · ${escapeHtml(String(rows.length))} ${escapeHtml(L("rows", "سطر"))}</p><table><thead><tr>${columns.map((key) => `<th>${escapeHtml(key)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${columns.map((key) => `<td>${escapeHtml(display(row[key]))}</td>`).join("")}</tr>`).join("")}</tbody></table><script>window.onload=()=>window.print()<\/script></body></html>`);
    popup.document.close();
  }
  function svgSource() {
    const dated = new Map<string, number>();
    for (const row of rows) {
      const raw = row.created_at || row.date || row.movement_date || row.planned_date || row.order_date || row.count_date || row.updated_at;
      if (!raw) continue;
      const day = String(raw).slice(0, 10);
      const amount = type === "sales" ? Number(row.total || 0) : type === "items" ? Number(row.sales || 0) : 1;
      dated.set(day, (dated.get(day) || 0) + amount);
    }
    const points = [...dated].sort(([a], [b]) => a.localeCompare(b)).slice(-24);
    const max = Math.max(1, ...points.map(([, value]) => value));
    const bars = points.map(([day, value], index) => { const x = 70 + index * 38; const height = Math.round(value / max * 230); return `<rect x="${x}" y="${300 - height}" width="25" height="${height}" fill="#06b6d4"/><text x="${x}" y="320" font-size="9" transform="rotate(45 ${x} 320)" fill="#cbd5e1">${day}</text>`; }).join("");
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="420" viewBox="0 0 1100 420"><rect width="1100" height="420" fill="#0f172a"/><text x="40" y="45" fill="white" font-size="24" font-family="Arial">AVERO · ${escapeHtml(title)}</text><text x="40" y="70" fill="#94a3b8" font-size="13">${from} — ${to} · ${rows.length} records</text>${bars}<text x="70" y="392" fill="#94a3b8" font-size="12">${points.length ? "Daily activity" : "No dated records in this report"}</text></svg>`;
  }
  return <div className="space-y-6" dir={ar ? "rtl" : "ltr"}>
    <header><h1 className="text-3xl font-black">{L("Reports", "التقارير")}</h1><p className="mt-2 text-slate-400">{L("Sales, operations and stock data from your company only.", "المبيعات والعمليات والمخزون الخاصة بشركتك فقط.")}</p></header>
    <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <label className="grid gap-1 text-sm">{L("Report", "نوع التقرير")}<select className={input} value={type} onChange={(event) => setType(event.target.value)}>{allowed.map((key) => <option key={key} value={key}>{ar ? labels[key]?.[1] : labels[key]?.[0]}</option>)}</select></label>
      {type !== "stock" && <><label className="grid gap-1 text-sm">{L("From", "من")}<input className={input} type="date" value={from} onChange={(event) => setFrom(event.target.value)}/></label><label className="grid gap-1 text-sm">{L("To", "إلى")}<input className={input} type="date" value={to} onChange={(event) => setTo(event.target.value)}/></label></>}
      <button className={action} disabled={!exportable} onClick={excel}>{L("Excel (CSV)", "Excel (CSV)")}</button>
      <button className={action} disabled={!exportable} onClick={pdf}>{L("Print / Save PDF", "طباعة / حفظ PDF")}</button>
      <button className={action} disabled={!exportable} onClick={() => download(new Blob([svgSource()], { type: "image/svg+xml" }), `AVERO-${type}-${from}-${to}.svg`)}>SVG</button>
    </div>
    {error && <p role="alert" className="rounded-xl border border-rose-600 p-4 text-rose-300">{error}</p>}
    {data?.truncated && <p role="alert" className="rounded-xl border border-amber-500 p-4 text-amber-200">{L("More than 5,000 records. Narrow the dates to export a complete report.", "النتائج أكثر من ٥٬٠٠٠ سطر. ضيّق نطاق التاريخ لتنزيل تقرير كامل.")}</p>}
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><div className="mb-4 flex justify-between"><h2 className="text-xl font-bold">{title}</h2><span className="text-slate-400">{loading ? L("Loading…", "جارٍ التحميل…") : `${rows.length} ${L("rows", "سطر")}`}</span></div>
      {!loading && !rows.length && <p className="py-8 text-center text-slate-400">{L("No records for this period", "ما في سجلات ضمن هالفترة")}</p>}
      {!!rows.length && <div className="overflow-auto"><table className="min-w-full text-sm"><thead><tr>{columns.map((key) => <th key={key} className="whitespace-nowrap border-b border-slate-700 p-3 text-start text-slate-400">{key.replaceAll("_", " ")}</th>)}</tr></thead><tbody>{rows.slice(0, 100).map((row, index) => <tr key={index} className="border-b border-slate-800">{columns.map((key) => <td key={key} className="max-w-64 whitespace-nowrap p-3">{display(row[key])}</td>)}</tr>)}</tbody></table>{rows.length > 100 && <p className="p-3 text-sm text-slate-400">{L("Showing 100 rows on screen. Exports include all loaded rows.", "معروض ١٠٠ سطر على الشاشة؛ ملف التنزيل يشمل كل النتائج المحمّلة.")}</p>}</div>}
    </section>
  </div>;
}
