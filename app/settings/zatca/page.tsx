"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/app/components/Sidebar";
import DashboardHeader from "@/app/components/DashboardHeader";
import { useLanguage } from "@/app/components/LanguageProvider";

const box = "rounded-3xl border border-slate-800 bg-slate-900/55";
const input = "w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-400";
const btn = "rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-black text-slate-950 disabled:opacity-40";
const ghost = "rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm font-bold text-slate-200 hover:border-cyan-500/50 disabled:opacity-40";

const emptySettings = {
  enabled:false, environment:"sandbox", vat_number:"", legal_name:"", legal_name_ar:"", city:"", district:"", street:"", building_number:"", additional_number:"", postal_code:"", address_line:"", invoice_type:"both", default_vat_rate:15, onboarding_status:"not_started"
};

export default function ZatcaSettingsPage(){
  const { language } = useLanguage();
  const ar = language === "ar";
  const [data,setData] = useState<any>({settings:null,units:[],documents:[],warehouses:[],can_manage:false});
  const [form,setForm] = useState<any>(emptySettings);
  const [device,setDevice] = useState({name:"",serial_number:"",warehouse_id:"",model:""});
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState("");
  const [readiness,setReadiness] = useState<any>(null);

  async function load(){
    const r = await fetch('/api/zatca',{cache:'no-store'});
    const j = await r.json();
    if(r.ok){
      setData(j);
      setForm({...emptySettings,...(j.settings||{})});
    } else setMessage(j.error || 'Failed to load ZATCA settings');
  }
  useEffect(()=>{load()},[]);

  async function action(kind:string,payload:any={}){
    setBusy(true); setMessage('');
    const r = await fetch('/api/zatca',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind,data:payload})});
    const j = await r.json(); setBusy(false);
    if(!r.ok){setMessage(j.error||'Action failed');return null}
    return j;
  }

  async function save(){
    const j=await action('save_settings',form);
    if(j){setMessage(ar?'تم حفظ إعدادات هيئة الزكاة والضريبة':'ZATCA settings saved');load()}
  }
  async function check(){
    const j=await action('readiness_check');
    if(j){setReadiness(j);setMessage(j.ready?(ar?'الإعداد الأساسي جاهز للـ Onboarding':'Base configuration is ready for onboarding'):(ar?'يوجد بيانات ناقصة':'Some required data is missing'));load()}
  }
  async function addDevice(){
    const j=await action('register_egs',device);
    if(j){setDevice({name:"",serial_number:"",warehouse_id:"",model:""});setMessage(ar?'تمت إضافة جهاز الفوترة':'EGS unit added');load()}
  }
  async function removeDevice(id:string){
    const j=await action('delete_egs',{id}); if(j){setMessage(ar?'تم حذف الجهاز':'EGS unit removed');load()}
  }

  const status = form.onboarding_status || 'not_started';
  const statusTone = useMemo(()=> status==='active'?'text-emerald-300 bg-emerald-500/10 border-emerald-500/20':status.includes('ready')||status.includes('passed')?'text-cyan-300 bg-cyan-500/10 border-cyan-500/20':status==='error'?'text-rose-300 bg-rose-500/10 border-rose-500/20':'text-amber-300 bg-amber-500/10 border-amber-500/20',[status]);

  return <div className="min-h-screen bg-slate-950 text-white"><Sidebar/><div className="ml-64 flex min-h-screen flex-col"><DashboardHeader/><main className="flex-1 px-6 py-7"><div className="mx-auto max-w-7xl space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="text-xs font-black uppercase tracking-[.22em] text-cyan-400">ZATCA · FATOORA</div><h1 className="mt-2 text-3xl font-black">{ar?'الربط مع هيئة الزكاة والضريبة والجمارك':'Saudi E-Invoicing Compliance'}</h1><p className="mt-2 max-w-3xl text-sm text-slate-400">{ar?'إعداد المنشأة، أجهزة إصدار الفواتير، وحالة الربط مع فاتورة — لكل شركة داخل AVERO بشكل مستقل.':'Configure seller identity, EGS units and FATOORA onboarding status independently for each AVERO tenant.'}</p></div><div className={`rounded-full border px-4 py-2 text-xs font-black ${statusTone}`}>{status.replaceAll('_',' ').toUpperCase()}</div></div>

    {message&&<div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 px-4 py-3 text-sm font-bold text-cyan-200">{message}</div>}

    <section className={`${box} p-6`}><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black">{ar?'بيانات المنشأة الضريبية':'Taxpayer Profile'}</h2><p className="mt-1 text-sm text-slate-500">{ar?'هذه البيانات ستدخل في الفاتورة الإلكترونية وملف الـ CSR لاحقاً.':'These values will feed the e-invoice and CSR onboarding flow.'}</p></div><label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={!!form.enabled} onChange={e=>setForm({...form,enabled:e.target.checked})}/>{ar?'تفعيل ZATCA لهذه الشركة':'Enable ZATCA for this company'}</label></div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Field label={ar?'البيئة':'Environment'}><select className={input} value={form.environment} onChange={e=>setForm({...form,environment:e.target.value})}><option value="sandbox">Sandbox</option><option value="simulation">Simulation</option><option value="production">Production</option></select></Field>
        <Field label={ar?'الرقم الضريبي VAT':'VAT Registration Number'}><input className={input} maxLength={15} value={form.vat_number||''} onChange={e=>setForm({...form,vat_number:e.target.value.replace(/\D/g,'')})} placeholder="15 digits"/></Field>
        <Field label={ar?'نوع الفواتير':'Invoice Types'}><select className={input} value={form.invoice_type} onChange={e=>setForm({...form,invoice_type:e.target.value})}><option value="both">B2B + B2C</option><option value="standard">Standard B2B</option><option value="simplified">Simplified B2C</option></select></Field>
        <Field label={ar?'الاسم القانوني بالإنجليزية':'Legal Name'}><input className={input} value={form.legal_name||''} onChange={e=>setForm({...form,legal_name:e.target.value})}/></Field>
        <Field label={ar?'الاسم القانوني بالعربية':'الاسم القانوني بالعربية'}><input className={input} dir="rtl" value={form.legal_name_ar||''} onChange={e=>setForm({...form,legal_name_ar:e.target.value})}/></Field>
        <Field label={ar?'نسبة الضريبة الافتراضية':'Default VAT %'}><input className={input} type="number" min="0" max="100" step="0.01" value={form.default_vat_rate} onChange={e=>setForm({...form,default_vat_rate:Number(e.target.value)})}/></Field>
        <Field label={ar?'المدينة':'City'}><input className={input} value={form.city||''} onChange={e=>setForm({...form,city:e.target.value})}/></Field>
        <Field label={ar?'الحي':'District'}><input className={input} value={form.district||''} onChange={e=>setForm({...form,district:e.target.value})}/></Field>
        <Field label={ar?'الشارع':'Street'}><input className={input} value={form.street||''} onChange={e=>setForm({...form,street:e.target.value})}/></Field>
        <Field label={ar?'رقم المبنى':'Building Number'}><input className={input} value={form.building_number||''} onChange={e=>setForm({...form,building_number:e.target.value})}/></Field>
        <Field label={ar?'الرقم الإضافي':'Additional Number'}><input className={input} value={form.additional_number||''} onChange={e=>setForm({...form,additional_number:e.target.value})}/></Field>
        <Field label={ar?'الرمز البريدي':'Postal Code'}><input className={input} value={form.postal_code||''} onChange={e=>setForm({...form,postal_code:e.target.value})}/></Field>
      </div>
      <div className="mt-5 flex flex-wrap gap-2"><button disabled={busy||!data.can_manage} onClick={save} className={btn}>{ar?'حفظ الإعدادات':'Save Settings'}</button><button disabled={busy||!data.can_manage} onClick={check} className={ghost}>{ar?'فحص الجاهزية':'Run Readiness Check'}</button></div>
      {readiness&&<div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm"><b>{readiness.ready?(ar?'جاهز للمرحلة التالية':'Ready for next onboarding step'):(ar?'غير جاهز بعد':'Not ready yet')}</b>{readiness.missing?.length>0&&<p className="mt-2 text-slate-400">Missing: {readiness.missing.join(', ')}</p>}<p className="mt-1 text-slate-500">EGS units: {readiness.egs_units} · VAT: {readiness.vat_valid?'valid':'invalid'}</p></div>}
    </section>

    <section className={`${box} p-6`}><div className="mb-5"><h2 className="text-xl font-black">{ar?'أجهزة إصدار الفواتير EGS':'EGS Units / POS Devices'}</h2><p className="mt-1 text-sm text-slate-500">{ar?'كل جهاز/فرع سيملك تسلسله وحالة Onboarding الخاصة به.':'Each issuing unit has its own serial, branch mapping and onboarding state.'}</p></div>
      <div className="grid gap-3 md:grid-cols-4"><input className={input} placeholder={ar?'اسم الجهاز':'Device name'} value={device.name} onChange={e=>setDevice({...device,name:e.target.value})}/><input className={input} placeholder={ar?'الرقم التسلسلي':'Serial number'} value={device.serial_number} onChange={e=>setDevice({...device,serial_number:e.target.value})}/><select className={input} value={device.warehouse_id} onChange={e=>setDevice({...device,warehouse_id:e.target.value})}><option value="">{ar?'بدون ربط فرع':'No branch mapping'}</option>{data.warehouses.map((w:any)=><option key={w.id} value={w.id}>{w.name}</option>)}</select><button disabled={busy||!data.can_manage||!device.name||!device.serial_number} onClick={addDevice} className={btn}>{ar?'إضافة جهاز':'Add EGS Unit'}</button></div>
      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-800"><div className="grid grid-cols-[1.2fr_1fr_1fr_1fr_auto] bg-slate-950 px-4 py-3 text-xs font-black uppercase text-slate-500"><span>Name</span><span>Serial</span><span>Branch</span><span>Status</span><span></span></div>{data.units.length===0?<div className="p-5 text-sm text-slate-500">{ar?'لا يوجد أجهزة بعد.':'No EGS units yet.'}</div>:data.units.map((u:any)=><div key={u.id} className="grid grid-cols-[1.2fr_1fr_1fr_1fr_auto] items-center border-t border-slate-800 px-4 py-3 text-sm"><b>{u.name}</b><span className="font-mono text-xs text-slate-400">{u.serial_number}</span><span>{data.warehouses.find((w:any)=>w.id===u.warehouse_id)?.name||'—'}</span><span className="text-cyan-300">{u.status}</span><button disabled={busy||!data.can_manage} onClick={()=>removeDevice(u.id)} className="text-xs font-bold text-rose-400">Remove</button></div>)}</div>
    </section>

    <section className={`${box} p-6`}><div className="mb-4"><h2 className="text-xl font-black">{ar?'سجل الفواتير الإلكترونية':'E-Invoice Log'}</h2><p className="mt-1 text-sm text-slate-500">{ar?'سيظهر هنا كل Order بعد توقيعه وإرساله أو تخليصه من ZATCA.':'Every POS order will appear here once signed and reported/cleared.'}</p></div>
      <div className="overflow-hidden rounded-2xl border border-slate-800"><div className="grid grid-cols-[1fr_1fr_1fr_1fr] bg-slate-950 px-4 py-3 text-xs font-black uppercase text-slate-500"><span>Invoice</span><span>Type</span><span>Status</span><span>Issued</span></div>{data.documents.length===0?<div className="p-5 text-sm text-slate-500">{ar?'لا يوجد فواتير ZATCA حتى الآن.':'No ZATCA documents yet.'}</div>:data.documents.map((d:any)=><div key={d.id} className="grid grid-cols-[1fr_1fr_1fr_1fr] border-t border-slate-800 px-4 py-3 text-sm"><b>{d.invoice_number}</b><span>{d.invoice_kind}</span><span className="text-cyan-300">{d.document_status}</span><span className="text-slate-400">{new Date(d.issue_at).toLocaleString()}</span></div>)}</div>
    </section>

    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm leading-6 text-amber-100/80">{ar?'هذه الصفحة هي مرحلة الإعداد والجاهزية. الخطوة التالية التي سنبنيها هي توليد CSR والمفاتيح بشكل آمن، Compliance CSID، ثم Production CSID، وبعدها ربط checkout في POS مع Reporting/Clearance.':'This workspace is the configuration/readiness layer. The next implementation step is secure key + CSR generation, Compliance CSID, Production CSID, then POS checkout reporting/clearance.'}</div>
  </div></main></div></div>
}

function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-400">{label}</span>{children}</label>}
