"use client";

import { useCallback, useEffect, useState } from "react";

type Feature = { id: string; key: string; enabled: boolean; expires_at: string | null };
type LinkItem = { label: string; path: string; app: string | null };

export default function KingClientLinks({ companyId, companyName }: { companyId: string; companyName: string }) {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [slug, setSlug] = useState("");
  const [menuPublished, setMenuPublished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [copied, setCopied] = useState("");
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    const [f, l] = await Promise.all([
      fetch(`/api/clients/${companyId}/features`, { cache: "no-store" }),
      fetch(`/api/clients/${companyId}/links`, { cache: "no-store" }),
    ]);
    if (!f.ok || !l.ok) throw new Error("تعذّر تحميل الروابط. افتح الصفحة بحساب King Admin.");
    const [featureData, linkData] = await Promise.all([f.json(), l.json()]);
    setFeatures(featureData.features || []);
    setSlug(linkData.slug || `store-${companyId.slice(0, 8)}`);
    setMenuPublished(Boolean(linkData.menu_enabled));
  }, [companyId]);

  useEffect(() => {
    let current = true;
    Promise.all([
      fetch(`/api/clients/${companyId}/features`, { cache: "no-store" }),
      fetch(`/api/clients/${companyId}/links`, { cache: "no-store" }),
    ]).then(async ([f, l]) => {
      if (!f.ok || !l.ok) throw new Error("تعذّر تحميل الروابط. افتح الصفحة بحساب King Admin.");
      const [featureData, linkData] = await Promise.all([f.json(), l.json()]);
      if (current) {
        setFeatures(featureData.features || []);
        setSlug(linkData.slug || `store-${companyId.slice(0, 8)}`);
        setMenuPublished(Boolean(linkData.menu_enabled));
      }
    }).catch((reason) => { if (current) setError(reason.message); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [companyId]);

  const enabled = (key: string) => features.some(f => f.key === key && f.enabled && (!f.expires_at || new Date(f.expires_at).getTime() > Date.now()));
  const appLabels: Record<string, string> = { app_sell: "SELL / POS", app_operations: "Operations / ERP", app_go: "GO / المنيو", app_intelligence: "Intelligence / AI", ai_sales: "LEO", ai_marketing: "FOXY" };

  async function toggle(key: string) {
    const feature = features.find(f => f.key === key);
    if (!feature) { setError("التطبيق غير متاح بإعدادات هذه الشركة."); return; }
    setError(""); setSaving(key);
    try {
      const response = await fetch(`/api/clients/${companyId}/features`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feature_id: feature.id, enabled: !enabled(key), expires_at: null }),
      });
      if (!response.ok) throw new Error("تعذّر حفظ التفعيل");
      await reload();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "تعذّر الحفظ"); }
    finally { setSaving(""); }
  }

  async function copy(link: string, label: string) {
    try { await navigator.clipboard.writeText(link); setCopied(label); window.setTimeout(() => setCopied(""), 2200); }
    catch { setError("تعذّر النسخ. حدد الرابط وانسخه يدويًا."); }
  }

  const links: LinkItem[] = [
    { label: "رابط لوحة الشركة", path: `/workspace/${slug || companyId}`, app: null },
    { label: "رابط المنيو للزبائن والـQR", path: `/go/${slug}`, app: "app_go" },
    { label: "رابط الكاشير POS", path: "/pos?area=cashier", app: "app_sell" },
    { label: "إضافة الأصناف", path: "/pos?area=add-items", app: "app_sell" },
    { label: "المشتريات POS", path: "/pos?area=purchasing", app: "app_sell" },
    { label: "رابط ERP", path: "/operations", app: "app_operations" },
    { label: "المخزون", path: "/operations?area=inventory", app: "app_operations" },
    { label: "المشتريات ERP", path: "/operations?area=purchasing", app: "app_operations" },
    { label: "الإنتاج", path: "/operations?area=production", app: "app_operations" },
    { label: "المحاسبة", path: "/operations?area=accounting", app: "app_operations" },
    { label: "إدارة منيو GO", path: "/go", app: "app_go" },
    { label: "رابط AI Agents", path: "/ai-agents", app: "app_intelligence" },
    { label: "رابط LEO", path: "/ai-sales", app: "ai_sales" },
    { label: "رابط FOXY", path: "/ai-marketing", app: "ai_marketing" },
    { label: "رابط تسجيل الدخول", path: "/login", app: null },
  ];

  return <section className="rounded-2xl border border-cyan-500/40 bg-slate-900 p-4 text-white sm:p-6" aria-label={`روابط ${companyName}`}>
    <h3 className="text-xl font-bold">روابط {companyName} · للـKing فقط</h3>
    <p className="mt-1 text-sm text-slate-400">فعّل التطبيق الذي اشترك فيه العميل، ثم انسخ الرابط وأرسله له أو حوّله إلى QR. ما في روابط أو تطبيقات غير مفعّلة بشاشة العميل.</p>
    {loading ? <p className="mt-4 text-slate-400">جارٍ تحميل الروابط…</p> : <>
      {error && <p role="alert" className="mt-3 rounded-lg bg-rose-950/70 p-3 text-rose-200">{error}</p>}
      <div className="mt-4 flex flex-wrap gap-2">{Object.entries(appLabels).map(([key, label]) => <button key={key} type="button" onClick={() => toggle(key)} disabled={Boolean(saving) || (key.startsWith("ai_") && !enabled("app_intelligence"))} aria-pressed={enabled(key)} className={`rounded-xl px-3 py-2 text-sm font-bold disabled:opacity-50 ${enabled(key) ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-300"}`}>{label} · {saving === key ? "…" : enabled(key) ? "ON" : "OFF"}</button>)}</div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">{links.map(item => {
        const link = `${typeof window === "undefined" ? "" : window.location.origin}${item.path}`;
        const active = !item.app || (enabled(item.app) && (item.app !== "app_go" || enabled("app_sell")) && (!item.app.startsWith("ai_") || enabled("app_intelligence")) && (item.app !== "app_intelligence" || enabled("ai_sales") || enabled("ai_marketing")));
        return <div key={item.label} className="rounded-xl border border-slate-700 bg-slate-950 p-3">
          <div className="flex items-start justify-between gap-2"><strong className="text-sm">{item.label}</strong><span className={`shrink-0 text-xs ${active ? "text-emerald-300" : "text-amber-300"}`}>{active ? "جاهز" : "غير مفعّل"}</span></div>
          <p className="mt-2 break-all select-all text-xs text-slate-300">{link}</p>
          <button type="button" onClick={() => copy(link, item.label)} className="mt-3 rounded-lg border border-cyan-500/40 px-3 py-2 text-xs font-bold text-cyan-300">{copied === item.label ? "تم النسخ ✓" : "نسخ الرابط"}</button>
        </div>;
      })}</div>
      {(!menuPublished || !enabled("app_go")) && <p className="mt-4 text-sm text-amber-300">رابط المنيو للـQR موجود للنسخ، لكن الطلبات لا تفتح قبل تفعيل GO وتجهيز المنيو ونشره.</p>}
    </>}
  </section>;
}
