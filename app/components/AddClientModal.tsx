"use client";

import { useEffect, useState } from "react";
import { Bot, BriefcaseBusiness, CheckCircle2, Eye, EyeOff, Phone, X } from "lucide-react";
import { useLanguage } from "./LanguageProvider";

type Activity = { key: string; label_en: string; label_ar: string; category: string };

interface AddClientModalProps {
  onClose: () => void;
  onSubmit: (data: { companyName: string; adminEmail: string; temporaryPassword: string; whatsappPhoneNumberId: string; activityKey: string }) => Promise<void>;
}

export default function AddClientModal({ onClose, onSubmit }: AddClientModalProps) {
  const { language } = useLanguage();
  const ar = language === "ar";
  const [companyName, setCompanyName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [whatsappPhoneNumberId, setWhatsappPhoneNumberId] = useState("");
  const [activityKey, setActivityKey] = useState("restaurant_cafe");
  const [activities, setActivities] = useState<Activity[]>([]);
  const [showTemporaryPassword, setShowTemporaryPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/company-activities", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const rows = Array.isArray(data?.activities) ? data.activities : [];
        setActivities(rows);
        if (rows.length) setActivityKey(rows[0].key);
      })
      .catch(() => undefined);
  }, []);

  const selected = activities.find((item) => item.key === activityKey);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!companyName.trim()) return setError(ar ? "اسم الشركة مطلوب" : "Company name is required");
    if (!activityKey) return setError(ar ? "اختَر نشاط الشركة" : "Select company activity");
    if (!adminEmail.trim()) return setError(ar ? "بريد المدير مطلوب" : "Admin email is required");
    if (!/^\S+@\S+\.\S+$/.test(adminEmail.trim())) return setError(ar ? "أدخل بريدًا إلكترونيًا صحيحًا" : "Please enter a valid email address");
    if (!temporaryPassword.trim()) return setError(ar ? "كلمة المرور المؤقتة مطلوبة" : "Temporary password is required");
    if (temporaryPassword.length < 8) return setError(ar ? "يجب أن تكون كلمة المرور 8 أحرف على الأقل" : "Password must be at least 8 characters");
    if (whatsappPhoneNumberId.trim() && !/^\d{6,32}$/.test(whatsappPhoneNumberId.trim())) return setError(ar ? "معرّف رقم واتساب يجب أن يكون أرقام فقط" : "WhatsApp Phone Number ID must contain digits only");

    setLoading(true);
    try {
      await onSubmit({ companyName: companyName.trim(), adminEmail: adminEmail.trim(), temporaryPassword: temporaryPassword.trim(), whatsappPhoneNumberId: whatsappPhoneNumberId.trim(), activityKey });
      setCompanyName(""); setAdminEmail(""); setTemporaryPassword(""); setWhatsappPhoneNumberId("");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : ar ? "فشل إنشاء العميل." : "Failed to create client.");
    } finally {
      setLoading(false);
    }
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
    <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
      <div className="flex items-center justify-between border-b border-slate-800 p-6">
        <div><h2 className="text-xl font-bold text-white">{ar ? "إضافة عميل جديد" : "Add New Client"}</h2><p className="mt-1 text-sm text-slate-500">{ar ? "اختَر نشاط الشركة حتى يتبرمج عقلها تلقائياً." : "Choose the business activity so the company brain is configured automatically."}</p></div>
        <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200"><X size={18} /></button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-5 p-6">
        {error && <div className="rounded-xl border border-red-500/30 bg-red-500/20 p-3 text-sm text-red-400">{error}</div>}
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={ar ? "اسم الشركة *" : "Company Name *"} value={companyName} set={setCompanyName} placeholder={ar ? "مثال: متجر ألفا" : "e.g., Acme Store"} disabled={loading} />
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">{ar ? "نشاط الشركة *" : "Business Activity *"}</label>
            <div className="relative">
              <BriefcaseBusiness size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <select value={activityKey} onChange={(e) => setActivityKey(e.target.value)} disabled={loading} className="w-full rounded-xl border border-slate-700 bg-slate-800 px-10 py-3 text-white outline-none focus:border-blue-500">
                {activities.map((item) => <option key={item.key} value={item.key}>{ar ? item.label_ar : item.label_en}</option>)}
                {!activities.length && <option value="restaurant_cafe">{ar ? "مطعم / كافيه" : "Restaurant / Café"}</option>}
              </select>
            </div>
          </div>
          <Field label={ar ? "بريد المدير *" : "Admin Email *"} value={adminEmail} set={setAdminEmail} placeholder="admin@company.com" disabled={loading} type="email" />
          <Field label={ar ? "كلمة المرور المؤقتة *" : "Temporary Password *"} value={temporaryPassword} set={setTemporaryPassword} placeholder={ar ? "8 أحرف على الأقل" : "Minimum 8 characters"} disabled={loading} type={showTemporaryPassword ? "text" : "password"} showPasswordToggle passwordVisible={showTemporaryPassword} onTogglePassword={() => setShowTemporaryPassword((value) => !value)} />
          <Field label={ar ? "معرّف رقم واتساب" : "WhatsApp Phone Number ID"} value={whatsappPhoneNumberId} set={setWhatsappPhoneNumberId} placeholder="1234567890" disabled={loading} icon={Phone} />
        </div>
        <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4 text-sm leading-6 text-slate-300">
          <b className="text-cyan-100">{ar ? "Brain Auto-Setup" : "Brain Auto-Setup"}</b><br />
          {ar ? "بعد الإنشاء، Leo وFoxy وAero وباقي الوكلاء رح يفهموا أن نشاط الشركة هو: " : "After creation, Leo, Foxy, Aero and the other agents will understand this company activity: "}
          <span className="font-bold text-white">{selected ? (ar ? selected.label_ar : selected.label_en) : activityKey}</span>
        </div>
        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4"><div className="flex items-start gap-3"><div className="rounded-xl bg-blue-500/15 p-2 text-blue-300"><Bot size={20} /></div><p className="text-sm leading-6 text-slate-300">{ar ? "عند إنشاء العميل، يتم إنشاء حساب المدير وتفعيل CRM وAnalytics وكل وكلاء Leo/Foxy/Aero/Gor/Vexa/Rex/Nova/Bruno." : "When the client is created, the admin account is provisioned and CRM, Analytics and all Leo/Foxy/Aero/Gor/Vexa/Rex/Nova/Bruno agents are enabled."}</p></div></div>
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4"><div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 text-emerald-300" size={20} /><p className="text-sm leading-6 text-slate-300">{ar ? "أول دخول للعميل يطلب تغيير كلمة المرور، والعقل يكون جاهز حسب النشاط." : "First login requires a password change, and the company brain is already set by activity."}</p></div></div>
        <div className="flex gap-3 pt-2"><button type="button" onClick={onClose} disabled={loading} className="flex-1 rounded-xl bg-slate-800 px-4 py-3 font-medium text-slate-300 hover:bg-slate-700 disabled:opacity-50">{ar ? "إلغاء" : "Cancel"}</button><button type="submit" disabled={loading} className="flex-1 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{loading ? (ar ? "جارٍ الإنشاء..." : "Creating...") : ar ? "إنشاء وتفعيل" : "Create & Activate"}</button></div>
      </form>
    </div>
  </div>;
}

function Field({ label, value, set, placeholder, disabled, type = "text", icon: Icon, showPasswordToggle = false, passwordVisible = false, onTogglePassword }: { label: string; value: string; set: (value: string) => void; placeholder: string; disabled: boolean; type?: string; icon?: typeof Phone; showPasswordToggle?: boolean; passwordVisible?: boolean; onTogglePassword?: () => void }) {
  return <div><label className="mb-2 block text-sm font-medium text-slate-200">{label}</label><div className="relative">{Icon && <Icon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />}<input type={type} value={value} onChange={(event) => set(event.target.value)} placeholder={placeholder} disabled={disabled} className={`w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-3 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60 ${Icon ? "pl-10" : ""} ${showPasswordToggle ? "pe-12" : ""}`} />{showPasswordToggle && <button type="button" onClick={onTogglePassword} disabled={disabled} className="absolute inset-y-0 end-0 flex w-12 items-center justify-center rounded-e-xl text-slate-400 hover:bg-slate-700 hover:text-white disabled:opacity-50" aria-label={passwordVisible ? "Hide password" : "Show password"}>{passwordVisible ? <EyeOff size={18} /> : <Eye size={18} />}</button>}</div></div>;
}
