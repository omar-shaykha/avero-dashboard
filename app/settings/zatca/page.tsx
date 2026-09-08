"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/app/components/Sidebar";
import DashboardHeader from "@/app/components/DashboardHeader";
import { useLanguage } from "@/app/components/LanguageProvider";

const box = "rounded-3xl border border-slate-800 bg-slate-900/55";
const input = "w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-400";
const btn = "rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40";
const ghost = "rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm font-bold text-slate-200 hover:border-cyan-500/50 disabled:cursor-not-allowed disabled:opacity-40";

const emptySettings:any = {
  enabled:false,
  environment:"sandbox",
  vat_number:"",
  legal_name:"",
  legal_name_ar:"",
  city:"",
  district:"",
  street:"",
  building_number:"",
  additional_number:"",
  postal_code:"",
  address_line:"",
  industry:"",
  invoice_type:"both",
  default_vat_rate:15,
  onboarding_status:"not_started",
};

export default function ZatcaSettingsPage(){
  const { language } = useLanguage();
  const ar = language === "ar";
  const [data,setData] = useState<any>({settings:null,units:[],documents:[],warehouses:[],can_manage:false});
  const [form,setForm] = useState<any>(emptySettings);
  const [device,setDevice] = useState({name:"",serial_number:"",warehouse_id:"",model:"1.0"});
  const [otp,setOtp] = useState<Record<string,string>>({});
  const [busy,setBusy] = useState<string>("");
  const [message,setMessage] = useState("");
  const [error,setError] = useState(false);
  const [readiness,setReadiness] = useState<any>(null);

  async function load(){
    const r = await fetch('/api/zatca',{cache:'no-store'});
    const j = await r.json();
    if(r.ok){
      setData(j);
      setForm({...emptySettings,...(j.settings||{})});
    } else {
      setError(true);
      setMessage(j.error || 'Failed to load ZATCA settings');
    }
  }
  useEffect(()=>{load()},[]);

  async function action(kind:string,payload:any={}){
    setBusy(kind + (payload?.id ? `:${payload.id}` : ''));
    setMessage(''); setError(false);
    try{
      const r = await fetch('/api/zatca',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({kind,data:payload}),
      });
      const j = await r.json();
      if(!r.ok){ setError(true); setMessage(j.error||'Action failed'); return null; }
      return j;
    } finally { setBusy(''); }
  }

  async function save(){
    const j=await action('save_settings',form);
    if(j){setMessage(ar?'تم حفظ إعدادات ZATCA':'ZATCA settings saved');await load()}
  }
  async function check(){
    const j=await action('readiness_check');
    if(j){
      setReadiness(j);
      setMessage(j.ready?(ar?'البيانات الأساسية جاهزة للربط':'Base configuration is ready for onboarding'):(ar?'يوجد بيانات ناقصة':'Some required data is missing'));
      await load();
    }
  }
  async function addDevice(){
    const j=await action('register_egs',device);
    if(j){
      setDevice({name:"",serial_number:"",warehouse_id:"",model:"1.0"});
      setMessage(ar?'تمت إضافة جهاز إصدار الفواتير':'EGS unit added');
      await load();
    }
  }
  async function generateCsr(id:string){
    const j=await action('generate_csr',{id});
    if(j){
      setMessage(ar?'تم إنشاء CSR وحفظ المفتاح المشفّر للبيئة التجريبية':'CSR generated and the simulation key was stored securely');
      await load();
    }
  }
  async function getCompliance(id:string){
    const code=(otp[id]||'').replace(/\D/g,'');
    const j=await action('request_compliance_csid',{id,otp:code});
    if(j){
      setOtp({...otp,[id]:''});
      setMessage(ar?'تم إصدار Compliance CSID من FATOORA وحفظ بياناته بشكل مشفّر':'Compliance CSID issued by FATOORA and stored securely');
      await load();
    }
  }
  async function removeDevice(id:string){
    const j=await action('delete_egs',{id});
    if(j){setMessage(ar?'تم حذف الجهاز':'EGS unit removed');await load()}
  }

  const status = form.onboarding_status || 'not_started';
  const statusTone = useMemo(()=> status==='active'
    ?'text-emerald-300 bg-emerald-500/10 border-emerald-500/20'
    :status.includes('ready')||status.includes('passed')
      ?'text-cyan-300 bg-cyan-500/10 border-cyan-500/20'
      :status==='error'
        ?'text-rose-300 bg-rose-500/10 border-rose-500/20'
        :'text-amber-300 bg-amber-500/10 border-amber-500/20',[status]);

  const isProd = form.environment === 'production';

  return <div className="min-h-screen bg-slate-950 text-white">
    <Sidebar/>
    <div className="ml-64 flex min-h-screen flex-col">
      <DashboardHeader/>
      <main className="flex-1 px-6 py-7">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs font-black uppercase tracking-[.22em] text-cyan-400">ZATCA · FATOORA</div>
              <h1 className="mt-2 text-3xl font-black">{ar?'الربط مع هيئة الزكاة والضريبة والجمارك':'Saudi E-Invoicing Compliance'}</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-400">{ar?'ربط كل شركة وجهاز إصدار فواتير بشكل مستقل مع منصة فاتورة.':'Connect each AVERO tenant and issuing device independently with FATOORA.'}</p>
            </div>
            <div className={`rounded-full border px-4 py-2 text-xs font-black ${statusTone}`}>{status.replaceAll('_',' ').toUpperCase()}</div>
          </div>

          {message&&<div className={`rounded-2xl border px-4 py-3 text-sm font-bold ${error?'border-rose-500/20 bg-rose-500/5 text-rose-200':'border-cyan-500/20 bg-cyan-500/5 text-cyan-200'}`}>{message}</div>}

          <section className={`${box} p-6`}>
            <div className="mb-5">
              <h2 className="text-xl font-black">{ar?'خطوات الربط':'Connect to ZATCA'}</h2>
              <p className="mt-1 text-sm text-slate-500">{ar?'AVERO ينفذ الخطوات التقنية، وأنت تدخل OTP من منصة فاتورة فقط.':'AVERO handles the technical onboarding; you only provide the OTP from FATOORA.'}</p>
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              <Step n="1" title={ar?'بيانات الضريبة':'Tax profile'} done={!!form.vat_number&&!!form.legal_name}/>
              <Step n="2" title={ar?'جهاز EGS + CSR':'EGS + CSR'} done={data.units.some((u:any)=>u.has_csr)}/>
              <Step n="3" title={ar?'OTP + Compliance':'OTP + Compliance'} done={data.units.some((u:any)=>u.has_compliance_csid)}/>
              <Step n="4" title={ar?'Production + POS':'Production + POS'} done={data.units.some((u:any)=>u.has_production_csid)}/>
            </div>
          </section>

          <section className={`${box} p-6`}>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">{ar?'بيانات المنشأة الضريبية':'Taxpayer Profile'}</h2>
                <p className="mt-1 text-sm text-slate-500">{ar?'تُستخدم في الفاتورة الإلكترونية وCSR.':'Used in the e-invoice and CSR.'}</p>
              </div>
              <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={!!form.enabled} onChange={e=>setForm({...form,enabled:e.target.checked})}/>{ar?'تفعيل ZATCA لهذه الشركة':'Enable ZATCA for this company'}</label>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Field label={ar?'البيئة':'Environment'}><select className={input} value={form.environment} onChange={e=>setForm({...form,environment:e.target.value})}><option value="sandbox">Sandbox</option><option value="simulation">Simulation</option><option value="production">Production</option></select></Field>
              <Field label={ar?'الرقم الضريبي VAT':'VAT Registration Number'}><input className={input} maxLength={15} value={form.vat_number||''} onChange={e=>setForm({...form,vat_number:e.target.value.replace(/\D/g,'')})} placeholder="3xxxxxxxxxxxxx3"/></Field>
              <Field label={ar?'نوع الفواتير':'Invoice Types'}><select className={input} value={form.invoice_type} onChange={e=>setForm({...form,invoice_type:e.target.value})}><option value="both">B2B + B2C</option><option value="standard">Standard B2B</option><option value="simplified">Simplified B2C</option></select></Field>
              <Field label={ar?'الاسم القانوني بالإنجليزية':'Legal Name'}><input className={input} value={form.legal_name||''} onChange={e=>setForm({...form,legal_name:e.target.value})}/></Field>
              <Field label={ar?'الاسم القانوني بالعربية':'Arabic Legal Name'}><input className={input} dir="rtl" value={form.legal_name_ar||''} onChange={e=>setForm({...form,legal_name_ar:e.target.value})}/></Field>
              <Field label={ar?'النشاط / القطاع':'Business Category / Industry'}><input className={input} value={form.industry||''} onChange={e=>setForm({...form,industry:e.target.value})} placeholder={ar?'مثال: مطاعم، تجزئة، خدمات':'e.g. Restaurants, Retail, Services'}/></Field>
              <Field label={ar?'نسبة الضريبة الافتراضية':'Default VAT %'}><input className={input} type="number" min="0" max="100" step="0.01" value={form.default_vat_rate} onChange={e=>setForm({...form,default_vat_rate:Number(e.target.value)})}/></Field>
              <Field label={ar?'المدينة':'City'}><input className={input} value={form.city||''} onChange={e=>setForm({...form,city:e.target.value})}/></Field>
              <Field label={ar?'الحي':'District'}><input className={input} value={form.district||''} onChange={e=>setForm({...form,district:e.target.value})}/></Field>
              <Field label={ar?'الشارع':'Street'}><input className={input} value={form.street||''} onChange={e=>setForm({...form,street:e.target.value})}/></Field>
              <Field label={ar?'رقم المبنى':'Building Number'}><input className={input} value={form.building_number||''} onChange={e=>setForm({...form,building_number:e.target.value})}/></Field>
              <Field label={ar?'الرقم الإضافي':'Additional Number'}><input className={input} value={form.additional_number||''} onChange={e=>setForm({...form,additional_number:e.target.value})}/></Field>
              <Field label={ar?'الرمز البريدي':'Postal Code'}><input className={input} value={form.postal_code||''} onChange={e=>setForm({...form,postal_code:e.target.value})}/></Field>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button disabled={!!busy||!data.can_manage} onClick={save} className={btn}>{ar?'حفظ الإعدادات':'Save Settings'}</button>
              <button disabled={!!busy||!data.can_manage} onClick={check} className={ghost}>{ar?'فحص الجاهزية':'Run Readiness Check'}</button>
            </div>
            {readiness&&<div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm"><b>{readiness.ready?(ar?'جاهز للـOnboarding':'Ready for onboarding'):(ar?'غير جاهز بعد':'Not ready yet')}</b>{readiness.missing?.length>0&&<p className="mt-2 text-slate-400">Missing: {readiness.missing.join(', ')}</p>}<p className="mt-1 text-slate-500">EGS units: {readiness.egs_units} · VAT: {readiness.vat_valid?'valid':'invalid'}</p></div>}
          </section>

          {isProd&&<div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4 text-sm leading-6 text-amber-100/90"><b>{ar?'ملاحظة Production: ':'Production note: '}</b>{ar?'AVERO لن يولّد مفتاح Production داخل قاعدة البيانات. ZATCA تشترط أن يكون المفتاح غير قابل للتصدير من Security Module، لذلك سيتم ربط HSM/KMS قبل تفعيل التوقيع الحقيقي.':'AVERO will not generate a production signing key inside the database. ZATCA requires a non-exportable key in a security module, so an HSM/KMS provider must be connected before live signing.'}</div>}

          <section className={`${box} p-6`}>
            <div className="mb-5">
              <h2 className="text-xl font-black">{ar?'أجهزة إصدار الفواتير EGS':'EGS Units / POS Devices'}</h2>
              <p className="mt-1 text-sm text-slate-500">{ar?'أضف جهاز أو فرع، أنشئ CSR، ثم أدخل OTP من فاتورة.':'Add a device or branch, generate the CSR, then enter the OTP from FATOORA.'}</p>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <input className={input} placeholder={ar?'اسم الجهاز':'Device name'} value={device.name} onChange={e=>setDevice({...device,name:e.target.value})}/>
              <input className={input} placeholder={ar?'الرقم التسلسلي':'Serial number'} value={device.serial_number} onChange={e=>setDevice({...device,serial_number:e.target.value})}/>
              <input className={input} placeholder={ar?'الإصدار / الموديل':'Model / version'} value={device.model} onChange={e=>setDevice({...device,model:e.target.value})}/>
              <select className={input} value={device.warehouse_id} onChange={e=>setDevice({...device,warehouse_id:e.target.value})}><option value="">{ar?'بدون ربط فرع':'No branch mapping'}</option>{data.warehouses.map((w:any)=><option key={w.id} value={w.id}>{w.name}</option>)}</select>
              <button disabled={!!busy||!data.can_manage||!device.name||!device.serial_number} onClick={addDevice} className={btn}>{ar?'إضافة جهاز':'Add EGS Unit'}</button>
            </div>

            <div className="mt-5 space-y-3">
              {data.units.length===0?<div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 text-sm text-slate-500">{ar?'لا يوجد أجهزة بعد.':'No EGS units yet.'}</div>:data.units.map((u:any)=>{
                const unitBusy = busy.endsWith(`:${u.id}`);
                const warehouse=data.warehouses.find((w:any)=>w.id===u.warehouse_id)?.name||'—';
                return <div key={u.id} className="rounded-2xl border border-slate-800 bg-slate-950/75 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2"><b className="text-base">{u.name}</b><span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2 py-1 text-[10px] font-black uppercase text-cyan-300">{u.status}</span></div>
                      <p className="mt-1 font-mono text-xs text-slate-500">{u.serial_number} · {warehouse} · {u.model||'1.0'}</p>
                    </div>
                    {!['compliance_ready','production_ready','active'].includes(u.status)&&<button disabled={!!busy||!data.can_manage} onClick={()=>removeDevice(u.id)} className="text-xs font-bold text-rose-400">{ar?'حذف':'Remove'}</button>}
                  </div>

                  <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1.5fr]">
                    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                      <div className="text-xs font-black uppercase tracking-wide text-slate-500">1 · CSR</div>
                      <p className="mt-2 text-sm text-slate-300">{u.has_csr?(ar?'CSR جاهز لهذا الجهاز.':'CSR is ready for this unit.'):(ar?'أنشئ مفتاح وCSR للبيئة التجريبية.':'Generate a simulation key and PKCS#10 CSR.')}</p>
                      <button disabled={!!busy||!data.can_manage||isProd} onClick={()=>generateCsr(u.id)} className={`${ghost} mt-3`}>{unitBusy&&busy.startsWith('generate_csr')?(ar?'جاري الإنشاء...':'Generating...'):u.has_csr?(ar?'إعادة إنشاء CSR':'Regenerate CSR'):(ar?'إنشاء CSR':'Generate CSR')}</button>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                      <div className="text-xs font-black uppercase tracking-wide text-slate-500">2 · OTP → Compliance CSID</div>
                      {u.has_compliance_csid?<div className="mt-2"><div className="text-sm font-bold text-emerald-300">✓ {ar?'Compliance CSID صادر ومحفوظ':'Compliance CSID issued and stored'}</div><p className="mt-1 text-xs text-slate-500">Request ID: {u.compliance_request_id||'—'}</p></div>:<><p className="mt-2 text-sm text-slate-300">{ar?'استخرج OTP من منصة FATOORA وأدخله هنا.':'Generate an OTP in FATOORA and enter it here.'}</p><div className="mt-3 flex flex-wrap gap-2"><input className={`${input} max-w-[180px] font-mono tracking-[.25em]`} maxLength={6} inputMode="numeric" placeholder="000000" value={otp[u.id]||''} onChange={e=>setOtp({...otp,[u.id]:e.target.value.replace(/\D/g,'').slice(0,6)})}/><button disabled={!!busy||!data.can_manage||!u.has_csr||(otp[u.id]||'').length!==6} onClick={()=>getCompliance(u.id)} className={btn}>{unitBusy&&busy.startsWith('request_compliance_csid')?(ar?'جاري الاتصال...':'Connecting...'):(ar?'طلب Compliance CSID':'Request Compliance CSID')}</button></div></>}
                    </div>
                  </div>
                  {u.last_error&&<div className="mt-3 rounded-xl border border-rose-500/15 bg-rose-500/5 p-3 text-xs text-rose-200">{u.last_error}</div>}
                </div>
              })}
            </div>
          </section>

          <section className={`${box} p-6`}>
            <div className="mb-4"><h2 className="text-xl font-black">{ar?'سجل الفواتير الإلكترونية':'E-Invoice Log'}</h2><p className="mt-1 text-sm text-slate-500">{ar?'سيظهر هنا كل Order بعد التوقيع والإرسال أو التخليص.':'Every POS order will appear here after signing and reporting/clearance.'}</p></div>
            <div className="overflow-hidden rounded-2xl border border-slate-800">
              <div className="grid grid-cols-[1fr_1fr_1fr_1fr] bg-slate-950 px-4 py-3 text-xs font-black uppercase text-slate-500"><span>Invoice</span><span>Type</span><span>Status</span><span>Issued</span></div>
              {data.documents.length===0?<div className="p-5 text-sm text-slate-500">{ar?'لا يوجد فواتير ZATCA حتى الآن.':'No ZATCA documents yet.'}</div>:data.documents.map((d:any)=><div key={d.id} className="grid grid-cols-[1fr_1fr_1fr_1fr] border-t border-slate-800 px-4 py-3 text-sm"><b>{d.invoice_number}</b><span>{d.invoice_kind}</span><span className="text-cyan-300">{d.document_status}</span><span className="text-slate-400">{new Date(d.issue_at).toLocaleString()}</span></div>)}
            </div>
          </section>

          <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4 text-sm leading-6 text-cyan-100/80">{ar?'صار الـCSR وOTP وCompliance CSID جزءاً فعلياً من AVERO. المرحلة التالية: توليد فواتير compliance XML وتوقيعها، اجتياز اختبارات ZATCA، طلب Production CSID، ثم Reporting/Clearance مباشرة من Checkout.':'CSR, OTP and Compliance CSID are now part of the real AVERO onboarding flow. Next: compliance XML generation/signing, ZATCA compliance checks, Production CSID, then POS Reporting/Clearance.'}</div>
        </div>
      </main>
    </div>
  </div>
}

function Field({label,children}:any){
  return <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-400">{label}</span>{children}</label>
}
function Step({n,title,done}:any){
  return <div className={`rounded-2xl border p-4 ${done?'border-emerald-500/20 bg-emerald-500/5':'border-slate-800 bg-slate-950'}`}><div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-black ${done?'bg-emerald-400 text-slate-950':'bg-slate-800 text-slate-300'}`}>{done?'✓':n}</div><div className="mt-3 text-sm font-black">{title}</div></div>
}
