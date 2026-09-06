"use client";

import { useState } from "react";
import { Bot, CheckCircle2, Eye, EyeOff, Phone, X } from "lucide-react";
import { useLanguage } from "./LanguageProvider";

interface AddClientModalProps {
  onClose: () => void;
  onSubmit: (data: { companyName: string; adminEmail: string; temporaryPassword: string; whatsappPhoneNumberId: string }) => Promise<void>;
}

export default function AddClientModal({ onClose, onSubmit }: AddClientModalProps) {
  const { language } = useLanguage();
  const ar = language === "ar";
  const [companyName, setCompanyName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [whatsappPhoneNumberId, setWhatsappPhoneNumberId] = useState("");
  const [showTemporaryPassword, setShowTemporaryPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (!companyName.trim()) return setError(ar ? "اسم الشركة مطلوب" : "Company name is required");
    if (!adminEmail.trim()) return setError(ar ? "بريد المدير مطلوب" : "Admin email is required");
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(adminEmail.trim())) return setError(ar ? "أدخل بريدًا إلكترونيًا صحيحًا" : "Please enter a valid email address");
    if (!temporaryPassword.trim()) return setError(ar ? "كلمة المرور المؤقتة مطلوبة" : "Temporary password is required");
    if (temporaryPassword.length < 8) return setError(ar ? "يجب أن تكون كلمة المرور 8 أحرف على الأقل" : "Password must be at least 8 characters");
    if (whatsappPhoneNumberId.trim() && !/^\d{6,32}$/.test(whatsappPhoneNumberId.trim())) {
      return setError(ar ? "معرّف رقم واتساب يجب أن يكون أرقام فقط" : "WhatsApp Phone Number ID must contain digits only");
    }

    setLoading(true);
    try {
      await onSubmit({
        companyName: companyName.trim(),
        adminEmail: adminEmail.trim(),
        temporaryPassword: temporaryPassword.trim(),
        whatsappPhoneNumberId: whatsappPhoneNumberId.trim(),
      });
      setCompanyName("");
      setAdminEmail("");
      setTemporaryPassword("");
      setWhatsappPhoneNumberId("");
    } catch {
      setError(ar ? "فشل إنشاء العميل. تأكد من الإيميل والباسورد ومعرّف واتساب." : "Failed to create client. Check email, password and WhatsApp ID.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 p-6">
          <div>
            <h2 className="text-xl font-bold text-white">{ar ? "إضافة عميل جديد" : "Add New Client"}</h2>
            <p className="mt-1 text-sm text-slate-500">{ar ? "كل عميل يحصل على عقل وذاكرة و8 وكلاء مستقلين." : "Each client gets its own brain, memory, and 8 independent agents."}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {error && <div className="rounded-xl border border-red-500/30 bg-red-500/20 p-3 text-sm text-red-400">{error}</div>}

          <div className="grid gap-4 md:grid-cols-2">
            <Field label={ar ? "اسم الشركة *" : "Company Name *"} value={companyName} set={setCompanyName} placeholder={ar ? "مثال: متجر ألفا" : "e.g., Acme Store"} disabled={loading} />
            <Field label={ar ? "بريد المدير *" : "Admin Email *"} value={adminEmail} set={setAdminEmail} placeholder="admin@company.com" disabled={loading} type="email" />
            <Field
              label={ar ? "كلمة المرور المؤقتة *" : "Temporary Password *"}
              value={temporaryPassword}
              set={setTemporaryPassword}
              placeholder={ar ? "8 أحرف على الأقل" : "Minimum 8 characters"}
              disabled={loading}
              type={showTemporaryPassword ? "text" : "password"}
              showPasswordToggle
              passwordVisible={showTemporaryPassword}
              onTogglePassword={() => setShowTemporaryPassword((value) => !value)}
            />
            <Field label={ar ? "معرّف رقم واتساب" : "WhatsApp Phone Number ID"} value={whatsappPhoneNumberId} set={setWhatsappPhoneNumberId} placeholder="1234567890" disabled={loading} icon={Phone} />
          </div>

          <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-blue-500/15 p-2 text-blue-300"><Bot size={20} /></div>
              <div>
                <p className="font-semibold text-blue-100">{ar ? "تفعيل وكلاء AVERO OS تلقائي" : "Automatic AVERO OS agents activation"}</p>
                <p className="mt-1 text-sm leading-6 text-slate-300">
                  {ar
                    ? "عند إنشاء العميل، يتم إنشاء حساب المدير وتفعيل CRM وAnalytics وكل وكلاء Leo/Foxy/Aero/Gor/Vexa/Rex/Nova/Bruno."
                    : "When the client is created, the admin account is provisioned and CRM, Analytics and all Leo/Foxy/Aero/Gor/Vexa/Rex/Nova/Bruno agents are enabled."}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 text-emerald-300" size={20} />
              <p className="text-sm leading-6 text-slate-300">
                {ar
                  ? "بعد الإنشاء، أعطِ العميل نفس الإيميل وكلمة المرور المؤقتة. أول دخول رح يطلب منه يغيّر كلمة المرور."
                  : "After creation, give the client the exact email and temporary password. The first login will ask them to change the password."}
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={loading} className="flex-1 rounded-xl bg-slate-800 px-4 py-3 font-medium text-slate-300 hover:bg-slate-700 disabled:opacity-50">
              {ar ? "إلغاء" : "Cancel"}
            </button>
            <button type="submit" disabled={loading} className="flex-1 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
              {loading ? (ar ? "جارٍ الإنشاء..." : "Creating...") : ar ? "إنشاء وتفعيل" : "Create & Activate"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  set,
  placeholder,
  disabled,
  type = "text",
  icon: Icon,
  showPasswordToggle = false,
  passwordVisible = false,
  onTogglePassword,
}: {
  label: string;
  value: string;
  set: (value: string) => void;
  placeholder: string;
  disabled: boolean;
  type?: string;
  icon?: typeof Phone;
  showPasswordToggle?: boolean;
  passwordVisible?: boolean;
  onTogglePassword?: () => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-200">{label}</label>
      <div className="relative">
        {Icon && <Icon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />}
        <input
          type={type}
          value={value}
          onChange={(event) => set(event.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-3 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60 ${Icon ? "pl-10" : ""} ${showPasswordToggle ? "pe-12" : ""}`}
        />
        {showPasswordToggle && (
          <button
            type="button"
            onClick={onTogglePassword}
            disabled={disabled}
            className="absolute inset-y-0 end-0 flex w-12 items-center justify-center rounded-e-xl text-slate-400 transition hover:bg-slate-700 hover:text-white disabled:opacity-50"
            aria-label={passwordVisible ? "Hide password" : "Show password"}
          >
            {passwordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
    </div>
  );
}
