"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { ShoppingBag, MapPin, Clock3, Plus, Minus } from "lucide-react";

type Product = { id: string; name: string; description: string | null; image_url: string | null; price: number; category_id: string | null; tax_enabled: boolean; tax_rate: number; calories?: number|null; allergens?: string[] };
type Menu = { company: string; branch: string; pickup_address: string; prep_minutes: number; currency: string; prices_include_tax: boolean; categories: { id: string; name: string }[]; products: Product[]; appearance?: { logo_url?:string|null;hero_image_url?:string|null;primary_color?:string;accent_color?:string;contact_phone?:string|null;contact_email?:string|null;whatsapp_url?:string|null;map_url?:string|null;help_url?:string|null } };
type Confirmation = { order_no: string; total: number; pickup_address: string; prep_minutes: number };

export default function PickupMenu() {
  const { slug } = useParams<{ slug: string }>();
  const [menu, setMenu] = useState<Menu | null>(null);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [category, setCategory] = useState("all");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [confirmed, setConfirmed] = useState<Confirmation | null>(null);

  useEffect(() => {
    fetch(`/api/go/${encodeURIComponent(slug)}`, { cache: "no-store" }).then(async (res) => {
      if (!res.ok) throw new Error("المنيو غير متاح للطلبات حاليًا.");
      setMenu(await res.json());
    }).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [slug]);

  function quantity(id: string, delta: number) {
    setCart((previous) => {
      const next = { ...previous };
      next[id] = Math.max(0, Math.min(20, (next[id] || 0) + delta));
      if (!next[id]) delete next[id];
      return next;
    });
  }
  const selected = menu?.products.filter((p) => cart[p.id]) || [];
  const total = selected.reduce((sum, p) => {
    const listed = Math.round(Number(p.price) * cart[p.id] * 100) / 100;
    const tax = p.tax_enabled && !menu?.prices_include_tax ? Math.round(listed * Number(p.tax_rate || 0)) / 100 : 0;
    return sum + listed + tax;
  }, 0);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!selected.length || sending) return;
    setError(""); setSending(true);
    try {
      const response = await fetch(`/api/go/${encodeURIComponent(slug)}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, notes, items: selected.map((p) => ({ product_id: p.id, quantity: cart[p.id] })) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "تعذّر إرسال الطلب، حاول مجددًا.");
      setConfirmed(result.order); setCart({});
    } catch (e) { setError(e instanceof Error ? e.message : "تعذّر إرسال الطلب"); }
    finally { setSending(false); }
  }

  return <main dir="rtl" className="min-h-screen bg-[#09111c] text-white" style={{"--go-primary":menu?.appearance?.primary_color||"#06b6d4","--go-accent":menu?.appearance?.accent_color||"#f59e0b"} as React.CSSProperties}>
    <div className="border-b border-amber-400/20 bg-[#0f1c2a] px-5 py-4"><div className="mx-auto flex max-w-6xl items-center justify-between"><span className="flex items-center gap-3 text-xl font-black tracking-wide" style={{color:"var(--go-accent)"}}>{menu?.appearance?.logo_url&&<img src={menu.appearance.logo_url} alt="" className="h-10 w-10 rounded-xl object-cover"/>}{menu?.company || "Online menu"}</span><span className="text-xs text-slate-400">Pickup ordering</span></div></div>
    <div className="mx-auto max-w-6xl px-5 py-8">
      {loading && <p className="py-24 text-center text-slate-300">عم نحمّل المنيو...</p>}
      {!loading && !menu && <div className="mx-auto max-w-lg rounded-3xl border border-slate-700 bg-slate-900 p-10 text-center"><ShoppingBag className="mx-auto mb-5 text-amber-300" size={40}/><h1 className="text-2xl font-bold">المنيو قيد التجهيز</h1><p className="mt-3 text-slate-400">{error || "ارجع قريبًا لتطلب للاستلام."}</p></div>}
      {menu && confirmed ? <div className="mx-auto max-w-xl rounded-3xl border border-emerald-400/40 bg-slate-900 p-8 text-center"><div className="text-5xl">✓</div><h1 className="mt-4 text-3xl font-black">وصل طلبك!</h1><p className="mt-3 text-slate-300">رقم الطلب <strong dir="ltr" className="text-amber-300">{confirmed.order_no}</strong></p><p className="mt-3 text-slate-300">الإجمالي {Number(confirmed.total).toFixed(2)} {menu.currency} · الدفع عند الاستلام</p><p className="mt-4 text-slate-400">الوقت التقريبي للتحضير {confirmed.prep_minutes} دقيقة. رح يتم تحضير الطلب بعد استلامه من الفرع.</p><p className="mt-3 text-slate-300">{confirmed.pickup_address}</p><button className="mt-8 rounded-xl border border-amber-300 px-5 py-3 text-amber-300" onClick={() => { setConfirmed(null); setName(""); setNotes(""); }}>طلب جديد</button></div>
        : menu && <><header className="rounded-3xl border border-slate-700 bg-cover bg-center p-7 md:p-10" style={{backgroundImage:menu.appearance?.hero_image_url?`linear-gradient(rgba(2,6,23,.72),rgba(2,6,23,.9)),url("${menu.appearance.hero_image_url}")`:undefined,borderColor:"var(--go-primary)"}}><p className="text-sm font-bold text-amber-300">منيو الاستلام · Pickup</p><h1 className="mt-3 text-3xl font-black md:text-5xl">اطلب واستلم من {menu.company}</h1><div className="mt-6 flex flex-wrap gap-4 text-sm text-slate-200"><span className="flex items-center gap-2"><MapPin size={17}/>{menu.branch} · {menu.pickup_address}</span><span className="flex items-center gap-2"><Clock3 size={17}/>{menu.prep_minutes} دقيقة تقريبًا</span></div><p className="mt-4 text-sm text-amber-200">الاستلام من الفرع · الدفع عند الاستلام</p></header>
          <div className="mt-8 flex gap-2 overflow-x-auto pb-3"><button className={`whitespace-nowrap rounded-full px-5 py-2 ${category === "all" ? "bg-amber-300 text-slate-950" : "bg-slate-800"}`} onClick={() => setCategory("all")}>الكل</button>{menu.categories.map((c) => <button key={c.id} className={`whitespace-nowrap rounded-full px-5 py-2 ${category === c.id ? "bg-amber-300 text-slate-950" : "bg-slate-800"}`} onClick={() => setCategory(c.id)}>{c.name}</button>)}</div>
          <div className="mt-4 grid items-start gap-8 lg:grid-cols-[1fr_360px]"><section><div className="grid gap-4 sm:grid-cols-2">{menu.products.filter((p) => category === "all" || p.category_id === category).map((p) => <article key={p.id} className="flex flex-col rounded-2xl border border-slate-700 bg-slate-900 p-5"><div className="mb-4 flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-amber-300/10 text-amber-300">{p.image_url?.startsWith("https://haxotqhdpdkbhhrmjrro.supabase.co/") ? <Image src={p.image_url} alt={p.name} width={80} height={80} className="h-full w-full object-cover" /> : <ShoppingBag size={28}/>}</div><h2 className="text-lg font-bold">{p.name}</h2>{p.description && <p className="mt-2 flex-1 text-sm text-slate-400">{p.description}</p>}{p.calories!=null&&<p className="mt-2 text-xs text-slate-500">{Number(p.calories).toFixed(0)} kcal</p>}{p.allergens&&p.allergens.length>0&&<p className="mt-1 text-xs text-amber-200">مسببات الحساسية: {p.allergens.join("، ")}</p>}<div className="mt-5 flex items-center justify-between gap-3"><strong className="text-amber-300">{Number(p.price).toFixed(2)} {menu.currency}</strong><div className="flex items-center gap-3"><button aria-label={`إزالة ${p.name}`} className="rounded-full border border-slate-600 p-2 disabled:opacity-40" disabled={!cart[p.id]} onClick={() => quantity(p.id, -1)}><Minus size={17}/></button><span>{cart[p.id] || 0}</span><button aria-label={`إضافة ${p.name}`} className="rounded-full bg-amber-300 p-2 text-slate-950" onClick={() => quantity(p.id, 1)}><Plus size={17}/></button></div></div></article>)}</div>{!menu.products.length && <p className="rounded-2xl border border-slate-700 p-8 text-slate-300">ما في أصناف متاحة حاليًا.</p>}</section>
            <form onSubmit={submit} className="rounded-2xl border border-slate-700 bg-slate-900 p-5 lg:sticky lg:top-5"><h2 className="text-xl font-black">طلبك</h2>{!selected.length ? <p className="mt-4 text-sm text-slate-400">اختَر صنفًا من المنيو.</p> : <div className="mt-4 space-y-2">{selected.map((p) => <div key={p.id} className="flex justify-between gap-3 text-sm"><span>{p.name} × {cart[p.id]}</span><span>{(Number(p.price) * cart[p.id]).toFixed(2)}</span></div>)}</div>}<div className="mt-5 flex justify-between border-t border-slate-700 pt-4 text-lg font-bold"><span>الإجمالي</span><span>{total.toFixed(2)} {menu.currency}</span></div><p className="mt-1 text-xs text-slate-400">السعر النهائي يؤكده الطلب بعد الإرسال.</p><label className="mt-5 block text-sm">اسمك<input required minLength={2} maxLength={80} value={name} onChange={(e) => setName(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-950 p-3" placeholder="الاسم للاستلام" /></label><label className="mt-4 block text-sm">رقم الهاتف<input required inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-950 p-3" placeholder="05xxxxxxxx" /></label><label className="mt-4 block text-sm">ملاحظات (اختياري)<textarea maxLength={400} value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-950 p-3" rows={2} /></label>{error && <p role="alert" className="mt-4 text-sm text-rose-300">{error}</p>}<button disabled={!selected.length || sending} className="mt-5 w-full rounded-xl px-4 py-4 font-black text-slate-950 disabled:opacity-50" style={{backgroundColor:"var(--go-accent)"}}>{sending ? "عم نرسل طلبك..." : "تأكيد طلب الاستلام"}</button><p className="mt-3 text-center text-xs text-slate-400">الدفع عند الاستلام من {menu.branch}</p></form></div>
        </>}
    {menu&&<footer className="mx-auto mt-10 max-w-6xl border-t border-slate-800 px-5 py-8"><div className="flex flex-wrap gap-3 text-sm">{menu.appearance?.contact_phone&&<a href={`tel:${menu.appearance.contact_phone}`} className="rounded-xl border border-slate-700 px-4 py-2">تواصل معنا</a>}{menu.appearance?.whatsapp_url&&<a href={menu.appearance.whatsapp_url} target="_blank" rel="noreferrer" className="rounded-xl border border-slate-700 px-4 py-2">WhatsApp</a>}{menu.appearance?.map_url&&<a href={menu.appearance.map_url} target="_blank" rel="noreferrer" className="rounded-xl border border-slate-700 px-4 py-2">الموقع</a>}{menu.appearance?.help_url&&<a href={menu.appearance.help_url} target="_blank" rel="noreferrer" className="rounded-xl border border-slate-700 px-4 py-2">Help center</a>}</div></footer>}</div>
  </main>;
}
