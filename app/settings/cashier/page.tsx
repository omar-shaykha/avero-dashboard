"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/app/components/Sidebar";
import DashboardHeader from "@/app/components/DashboardHeader";
import { useLanguage } from "@/app/components/LanguageProvider";

const card="rounded-2xl border border-slate-800 bg-slate-900 p-5";
const inp="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm outline-none focus:border-cyan-400";
const btn="rounded-xl bg-cyan-400 px-4 py-2.5 font-black text-slate-950 disabled:opacity-50";
const ghost="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 font-bold text-slate-200";

export default function CashierMonitorSettingsPage(){
  const {language}=useLanguage(),ar=language==="ar",L=(e:string,a:string)=>ar?a:e;
  const [methods,setMethods]=useState<any[]>([]);
  const [cfg,setCfg]=useState<any>({categories:[],products:[],sections:[],best_seller_mode:"auto"});
  const [form,setForm]=useState<any>({name:"",adjustment_percent:0});
  const [busy,setBusy]=useState(false),[q,setQ]=useState("");

  async function load(){
    const [a,b]=await Promise.all([fetch("/api/commerce-admin",{cache:"no-store"}),fetch("/api/cashier-config",{cache:"no-store"})]);
    if(a.ok){const j=await a.json();setMethods(j.payment_methods||[]);}
    if(b.ok)setCfg(await b.json());
  }
  useEffect(()=>{load();},[]);

  async function post(kind:string,data:any){
    const r=await fetch("/api/cashier-config",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({kind,data})});
    const j=await r.json();if(!r.ok){alert(j.error||L("Action failed","فشلت العملية"));return null;}await load();return j;
  }

  async function savePayment(){
    const name=String(form.name||"").trim(),pct=Math.max(0,Math.min(100,Number(form.adjustment_percent||0)));
    if(!name)return alert(L("Payment method name is required","اسم طريقة الدفع مطلوب"));
    setBusy(true);
    const r=await fetch("/api/commerce-admin",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({kind:"payment_method",data:{...form,name,adjustment_percent:pct,adjustment_type:"markup",active:true}})});
    const j=await r.json();setBusy(false);if(!r.ok)return alert(j.error||L("Could not save payment method","تعذر حفظ طريقة الدفع"));
    setForm({name:"",adjustment_percent:0});await load();
  }
  function editPayment(m:any){setForm({id:m.id,name:m.name,adjustment_percent:Number(m.adjustment_percent||0)});window.scrollTo({top:0,behavior:"smooth"});}

  const cashierProducts=useMemo(()=>cfg.products.filter((p:any)=>!["raw_material","sub_recipe"].includes(p.product_type)&&(!q||`${p.name} ${p.sku||""}`.toLowerCase().includes(q.toLowerCase()))),[cfg.products,q]);

  return <div className="min-h-screen bg-slate-950 text-white">
    <Sidebar/>
    <div className="ml-64 flex min-h-screen flex-col"><DashboardHeader/><main className="flex-1 px-6 py-7"><div className="mx-auto max-w-6xl space-y-6">
      <div><div className="text-xs font-black uppercase tracking-[.2em] text-cyan-400">AVERO SETTINGS</div><h1 className="mt-2 text-3xl font-black">{L("Cashier Monitor","مراقبة الكاشير")}</h1><p className="mt-2 text-sm text-slate-400">{L("Control payment methods, category buttons, cashier items and Best Sellers from one place.","تحكم بطرق الدفع وتصنيفات شاشة الكاشير والأصناف وBest Sellers من مكان واحد.")}</p></div>

      <section className={card}>
        <div className="mb-4"><h2 className="text-xl font-black">{form.id?L("Edit Payment Method","تعديل طريقة الدفع"):L("Add Payment Method","إضافة طريقة دفع")}</h2><p className="mt-1 text-sm text-slate-400">{L("Optional price increase is built into the item selling price for that payment method and is not shown as a separate surcharge.","زيادة السعر اختيارية وتدخل داخل سعر الصنف لهذه الطريقة ولا تظهر كبند زيادة منفصل.")}</p></div>
        <div className="grid gap-3 md:grid-cols-[1fr_220px_auto] md:items-end"><label><span className="mb-1 block text-xs font-black uppercase text-slate-300">{L("Payment Method Name","اسم طريقة الدفع")}</span><input className={inp} placeholder={L("Cash, mada, HungerStation...","كاش، مدى، هنقرستيشن...")} value={form.name||""} onChange={e=>setForm({...form,name:e.target.value})}/></label><label><span className="mb-1 block text-xs font-black uppercase text-slate-300">{L("Price Increase %","زيادة السعر %")}</span><input className={inp} type="number" min="0" max="100" step="0.01" value={form.adjustment_percent??0} onChange={e=>setForm({...form,adjustment_percent:Number(e.target.value)})}/></label><button className={btn} disabled={busy} onClick={savePayment}>{busy?L("Saving...","جارٍ الحفظ..."):form.id?L("Update","تحديث"):L("Add Payment Method","إضافة طريقة الدفع")}</button></div>
        <div className="mt-4 space-y-2">{methods.map((m:any)=><div key={m.id} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-3"><span><b>{m.name}</b><small className="block text-slate-500">{Number(m.adjustment_percent||0).toFixed(2)}%</small></span><button className={ghost} onClick={()=>editPayment(m)}>{L("Edit","تعديل")}</button></div>)}</div>
      </section>

      <section className={card}>
        <div className="mb-4"><h2 className="text-xl font-black">{L("Cashier Categories","تصنيفات الكاشير")}</h2><p className="mt-1 text-sm text-slate-400">{L("Choose which category buttons appear across the top of the Cashier screen.","حدد أي تصنيفات تظهر كأزرار أعلى شاشة الكاشير.")}</p></div>
        <div className="grid gap-2 md:grid-cols-2">{cfg.categories.map((c:any)=><label key={c.id} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-4"><span><b>{c.name}</b><small className="block text-slate-500">{c.code}</small></span><input className="h-5 w-5" type="checkbox" checked={c.show_on_cashier!==false} onChange={e=>post("category_visibility",{id:c.id,show_on_cashier:e.target.checked})}/></label>)}</div>
      </section>

      <section className={card}>
        <div className="mb-4"><h2 className="text-xl font-black">{L("Cashier Items","أصناف الكاشير")}</h2><p className="mt-1 text-sm text-slate-400">{L("Choose which sellable items appear on Cashier. Raw Materials and Sub-Recipes are kept out automatically.","حدد الأصناف القابلة للبيع التي تظهر بالكاشير. المواد الخام والوصفات الفرعية تبقى مخفية تلقائياً.")}</p></div>
        <input className={`${inp} mb-4`} placeholder={L("Search items","بحث عن الأصناف")} value={q} onChange={e=>setQ(e.target.value)}/>
        <div className="grid gap-2 md:grid-cols-2">{cashierProducts.map((p:any)=><label key={p.id} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-4"><span><b>{p.name}</b><small className="block text-slate-500">{p.sku||"—"}</small></span><input className="h-5 w-5" type="checkbox" checked={p.show_on_cashier!==false} onChange={e=>post("product_cashier_visibility",{id:p.id,show_on_cashier:e.target.checked})}/></label>)}</div>
      </section>

      <section className={card}>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-black">{L("Best Sellers","الأكثر مبيعاً")}</h2><p className="mt-1 text-sm text-slate-400">{L("Automatic uses completed sales. Manual lets you choose the products yourself.","Automatic يعتمد على المبيعات المكتملة. Manual يخليك تختار المنتجات بنفسك.")}</p></div><div className="flex gap-2"><button className={cfg.best_seller_mode==="auto"?btn:ghost} onClick={()=>post("best_seller_mode",{mode:"auto"})}>{L("Automatic","تلقائي")}</button><button className={cfg.best_seller_mode==="manual"?btn:ghost} onClick={()=>post("best_seller_mode",{mode:"manual"})}>{L("Manual","يدوي")}</button></div></div>
        {cfg.best_seller_mode==="auto"?<div className="rounded-xl border border-dashed border-slate-700 p-6 text-center text-slate-400">{L("AVERO will rank Best Sellers automatically from completed sales quantities.","AVERO يرتب Best Sellers تلقائياً حسب كميات المبيعات المكتملة.")}</div>:<div className="grid gap-2 md:grid-cols-2">{cashierProducts.map((p:any)=><label key={p.id} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-4"><span><b>{p.name}</b><small className="block text-slate-500">{p.sku||"—"}</small></span><input className="h-5 w-5" type="checkbox" checked={p.best_seller_manual===true} onChange={e=>post("best_seller_toggle",{id:p.id,enabled:e.target.checked})}/></label>)}</div>}
      </section>

      <section className={card}><h2 className="text-xl font-black">{L("Sections","الأقسام")}</h2><p className="mt-1 text-sm text-slate-400">{L("Sections are created in Add Items and attached to each product. They are the foundation for kitchen/production printer routing.","الأقسام تُنشأ من Add Items وتُربط بكل صنف، وهي أساس توجيه طابعات المطبخ/الإنتاج لاحقاً.")}</p><div className="mt-4 flex flex-wrap gap-2">{cfg.sections.map((s:any)=><span key={s.id} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm">{s.name}</span>)}</div></section>
    </div></main></div>
  </div>;
}
