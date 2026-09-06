"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useLanguage } from "./LanguageProvider";

interface AddClientModalProps { onClose:()=>void; onSubmit:(data:{companyName:string;adminEmail:string;temporaryPassword:string;whatsappPhoneNumberId:string;})=>Promise<void>; }

export default function AddClientModal({ onClose, onSubmit }: AddClientModalProps) {
  const { language } = useLanguage(); const ar = language === "ar";
  const [companyName,setCompanyName]=useState(""); const [adminEmail,setAdminEmail]=useState(""); const [temporaryPassword,setTemporaryPassword]=useState(""); const [whatsappPhoneNumberId,setWhatsappPhoneNumberId]=useState(""); const [loading,setLoading]=useState(false); const [error,setError]=useState("");
  const handleSubmit=async(e:React.FormEvent)=>{e.preventDefault();setError(""); if(!companyName.trim()) return setError(ar?"اسم الشركة مطلوب":"Company name is required"); if(!adminEmail.trim()) return setError(ar?"بريد المدير مطلوب":"Admin email is required"); const emailRegex=/^[^\s@]+@[^\s@]+\.[^\s@]+$/; if(!emailRegex.test(adminEmail.trim())) return setError(ar?"أدخل بريدًا إلكترونيًا صحيحًا":"Please enter a valid email address"); if(!temporaryPassword.trim()) return setError(ar?"كلمة المرور المؤقتة مطلوبة":"Temporary password is required"); if(temporaryPassword.length<8) return setError(ar?"يجب أن تكون كلمة المرور 8 أحرف على الأقل":"Password must be at least 8 characters"); setLoading(true); try{await onSubmit({companyName:companyName.trim(),adminEmail:adminEmail.trim(),temporaryPassword:temporaryPassword.trim(),whatsappPhoneNumberId:whatsappPhoneNumberId.trim()});setCompanyName("");setAdminEmail("");setTemporaryPassword("");setWhatsappPhoneNumberId("");}catch{setError(ar?"فشل إنشاء العميل":"Failed to create client");}finally{setLoading(false)}};
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="w-full max-w-md rounded-lg border border-slate-800 bg-slate-900 shadow-xl">
    <div className="flex items-center justify-between border-b border-slate-800 p-6"><h2 className="text-xl font-bold text-white">{ar?"إضافة عميل":"Add Client"}</h2><button onClick={onClose} className="text-slate-400 transition-colors hover:text-slate-200"><X size={18}/></button></div>
    <form onSubmit={handleSubmit} className="space-y-4 p-6">{error&&<div className="rounded border border-red-500/30 bg-red-500/20 p-3 text-sm text-red-400">{error}</div>}
      <Field label={ar?"اسم الشركة *":"Company Name *"} value={companyName} set={setCompanyName} placeholder={ar?"مثال: شركة ألفا":"e.g., Acme Corp"} disabled={loading}/>
      <Field label={ar?"بريد المدير *":"Admin Email *"} value={adminEmail} set={setAdminEmail} placeholder="admin@company.com" disabled={loading} type="email"/>
      <div><Field label={ar?"كلمة المرور المؤقتة *":"Temporary Password *"} value={temporaryPassword} set={setTemporaryPassword} placeholder={ar?"8 أحرف على الأقل":"Minimum 8 characters"} disabled={loading} type="password"/><p className="mt-1 text-xs text-slate-400">{ar?"شارك كلمة المرور مع المدير بطريقة آمنة":"Share this password securely with the admin"}</p></div>
      <Field label={ar?"معرّف رقم واتساب":"WhatsApp Phone Number ID"} value={whatsappPhoneNumberId} set={setWhatsappPhoneNumberId} placeholder="1234567890" disabled={loading}/>
      <div className="flex gap-3 pt-4"><button type="button" onClick={onClose} disabled={loading} className="flex-1 rounded bg-slate-800 px-4 py-2 font-medium text-slate-300 hover:bg-slate-700 disabled:opacity-50">{ar?"إلغاء":"Cancel"}</button><button type="submit" disabled={loading} className="flex-1 rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50">{loading?(ar?"جارٍ الإنشاء...":"Creating..."):(ar?"إنشاء العميل":"Create Client")}</button></div>
    </form>
  </div></div>;
}
function Field({label,value,set,placeholder,disabled,type="text"}:{label:string;value:string;set:(v:string)=>void;placeholder:string;disabled:boolean;type?:string}){return <div><label className="mb-2 block text-sm font-medium text-slate-200">{label}</label><input type={type} value={value} onChange={e=>set(e.target.value)} placeholder={placeholder} disabled={disabled} className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"/></div>}
