"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Store = { slug: string; pickup_branch_id: string | null; pickup_address: string; prep_minutes: number; enabled: boolean };
type Product = { id: string; name: string; price: number; active: boolean; show_on_go: boolean; category_id: string | null };
type GoOrder = { id: string; order_no: string; customer_name: string; customer_phone: string; customer_notes: string | null; total: number; status: string; tracking_status: string; created_at: string; sales_order_lines: { product_name: string; quantity: number }[] };
type Data = { company: { name: string }; store: Store | null; branches: { id: string; name: string }[]; products: Product[]; orders: GoOrder[]; can_manage: boolean; selected_company_id: string; available_companies: { id: string; name: string }[] };

const input = "w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white outline-none focus:border-cyan-400";
const button = "rounded-xl bg-cyan-400 px-5 py-3 font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50";

export default function GoMerchantWorkspace() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [branchName, setBranchName] = useState("");
  const [address, setAddress] = useState("");
  const [branchId, setBranchId] = useState("");
  const [minutes, setMinutes] = useState(30);
  const [companyId, setCompanyId] = useState("");
  const load = useCallback(async () => {
    const response = await fetch(`/api/go/manage${companyId ? `?company=${encodeURIComponent(companyId)}` : ""}`, { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "تعذّر تحميل GO");
    setData(result);
    setAddress(result.store?.pickup_address || "");
    setBranchId(result.store?.pickup_branch_id || result.branches?.[0]?.id || "");
    setMinutes(result.store?.prep_minutes || 30);
  }, [companyId]);
  useEffect(() => { load().catch((e) => setError(e.message)); }, [load]);

  async function change(payload: Record<string, unknown>) {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/go/manage${companyId ? `?company=${encodeURIComponent(companyId)}` : ""}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "فشل الحفظ");
      await load();
      setBranchName("");
    } catch (e) { setError(e instanceof Error ? e.message : "فشل الحفظ"); }
    finally { setBusy(false); }
  }

  if (!data) return <div className="mt-8 rounded-2xl border border-slate-800 p-6 text-slate-300">{error || "عم نحمّل إعدادات المنيو..."}</div>;
  const published = data.products.filter((p) => p.active && p.show_on_go).length;
  const missing = [
    !published && "انشر صنفًا واحدًا على الأقل تحت هذه الشركة",
    !data.store?.pickup_branch_id && "اختر فرع الاستلام",
    !data.store?.pickup_address && "أدخل عنوان الاستلام الحقيقي",
    !data.store?.enabled && "احفظ وافتح المنيو للطلبات",
  ].filter(Boolean);
  return <div className="mt-8 space-y-7" dir="rtl">
    {error && <p role="alert" className="rounded-xl border border-rose-600/50 bg-rose-500/10 p-4 text-rose-200">{error}</p>}
    {data.available_companies.length > 0 && <label className="block max-w-lg text-sm text-slate-300">شركة المنيو (King)<select className={`${input} mt-2`} value={data.selected_company_id} onChange={(event) => { setCompanyId(event.target.value); setData(null); }}><option value={data.selected_company_id}>{data.company.name}</option>{data.available_companies.filter((company) => company.id !== data.selected_company_id).map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label>}
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><h2 className="text-xl font-bold">منيو {data.company.name}</h2><p className="mt-2 text-sm text-slate-400">{data.store?.enabled ? "المنيو مفتوح للطلبات" : "المنيو غير منشور بعد"} · {published} صنف منشور</p></div>
      </div>
      <p className="mt-4 text-sm text-slate-400">تظهر الطلبات في هذه الصفحة وفي «الطلبات المعلّقة» بالكاشير. الدفع عند الاستلام؛ لا يتم خصم المخزون إلا عند إتمام البيع.</p>
      {missing.length > 0 && <div className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100"><strong>قبل ظهور الأصناف في رابط QR لهذه الشركة:</strong><ul className="mt-2 list-inside list-disc space-y-1">{missing.map((reason) => <li key={String(reason)}>{reason}</li>)}</ul></div>}
      {data.store?.enabled && data.store.slug && <Link className="mt-4 inline-block rounded-xl border border-cyan-400 px-4 py-2 font-bold text-cyan-300" href={`/go/${encodeURIComponent(data.store.slug)}`} target="_blank" rel="noopener noreferrer">افتح المنيو الإلكتروني ↗</Link>}
    </section>

    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="text-xl font-bold">١ · فرع الاستلام</h2>
      {data.branches.length === 0 ? <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm text-slate-300">اسم الفرع<input className={`${input} mt-2`} value={branchName} onChange={(e) => setBranchName(e.target.value)} placeholder="مثلاً: فرع الرياض" /></label>
        <label className="text-sm text-slate-300">عنوان الاستلام الفعلي<input className={`${input} mt-2`} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="المدينة، الحي، الشارع والموقع" /></label>
        <button className={button} disabled={busy || branchName.trim().length < 2 || address.trim().length < 8} onClick={() => change({ kind: "branch", name: branchName, address })}>إضافة الفرع</button>
      </div> : <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm text-slate-300">الفرع<select className={`${input} mt-2`} value={branchId} onChange={(e) => setBranchId(e.target.value)}>{data.branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
        <label className="text-sm text-slate-300">عنوان الاستلام<input className={`${input} mt-2`} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="المدينة، الحي، الشارع" /></label>
        <label className="text-sm text-slate-300">الوقت التقريبي بالدقائق<input type="number" min="5" max="240" className={`${input} mt-2`} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} /></label>
      </div>}
    </section>

    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4"><h2 className="text-xl font-bold">٢ · الأصناف والأسعار</h2>{data.available_companies.length === 0 && <Link href="/pos?area=add-items" className="rounded-xl border border-slate-600 px-4 py-2 text-sm text-cyan-300">إضافة الأصناف وتعديل الأسعار ↗</Link>}</div>
      {data.products.length === 0 ? <p className="mt-4 text-slate-400">ما في أصناف بعد. أضفها من «Add Items» ثم انشرها هون.</p>
        : <div className="mt-4 divide-y divide-slate-800">{data.products.map((p) => <div key={p.id} className="flex items-center justify-between gap-4 py-3"><div><strong>{p.name}</strong><p className="text-sm text-slate-400">{Number(p.price).toFixed(2)} SAR {p.active ? "" : "· غير نشط"}</p></div><button type="button" disabled={busy || !data.can_manage || !p.active} onClick={() => change({ kind: "product", id: p.id, published: !p.show_on_go })} className={`rounded-xl border px-4 py-2 text-sm disabled:opacity-50 ${p.show_on_go ? "border-cyan-400 text-cyan-300" : "border-slate-600 text-slate-300"}`}>{p.show_on_go ? "منشور ✓" : "انشر في GO"}</button></div>)}</div>}
    </section>

    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="text-xl font-bold">٣ · استقبال الطلبات</h2>
      <p className="mt-2 text-sm text-slate-400">يلزم فرع بعنوان صحيح وصنف منشور واحد على الأقل قبل فتح استقبال الطلبات.</p>
      <button className={`${button} mt-4`} disabled={busy || !data.can_manage || !branchId || address.trim().length < 8 || !published} onClick={() => change({ kind: "store", branch_id: branchId, address, prep_minutes: minutes, enabled: !data.store?.enabled })}>{data.store?.enabled ? "إيقاف استقبال الطلبات" : "حفظ وفتح المنيو للطلبات"}</button>
      <div className="mt-7 space-y-3"><div className="flex items-center justify-between"><h3 className="font-bold">طلبات الاستلام الأخيرة</h3><button className="text-sm text-cyan-300" onClick={() => load().catch((e) => setError(e.message))}>تحديث الطلبات ↻</button></div>
        {!data.orders.length && <p className="text-slate-400">ما في طلبات بعد.</p>}
        {data.orders.map((o) => <div key={o.id} className="rounded-xl border border-slate-700 p-4"><div className="flex flex-wrap justify-between gap-2"><strong>{o.order_no} · {o.customer_name}</strong><span className="text-cyan-300">{Number(o.total).toFixed(2)} SAR</span></div><p className="mt-1 text-sm text-slate-300">{o.customer_phone} · {o.status === "cancelled" ? "ملغي" : o.status === "fulfilled" ? "تم الدفع والتسليم" : o.tracking_status === "ready" ? "جاهز" : o.tracking_status === "preparing" ? "قيد التحضير" : "جديد"}</p><p className="mt-2 text-sm text-slate-400">{o.sales_order_lines?.map((l) => `${l.product_name} × ${l.quantity}`).join("، ")}</p>{o.customer_notes && <p className="mt-1 text-sm text-slate-400">ملاحظة: {o.customer_notes}</p>}{o.status === "held" && data.can_manage && <div className="mt-3 flex gap-2">{(["preparing", "ready", "cancelled"] as const).map((status) => <button key={status} disabled={busy} className="rounded-lg border border-slate-600 px-3 py-1 text-xs" onClick={() => change({ kind: "order", id: o.id, status })}>{status === "preparing" ? "قيد التحضير" : status === "ready" ? "جاهز" : "إلغاء"}</button>)}</div>}</div>)}
      </div>
    </section>
  </div>;
}
