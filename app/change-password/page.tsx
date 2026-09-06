"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AveroBrand from "@/app/components/AveroBrand";
import { useLanguage } from "@/app/components/LanguageProvider";
import { CheckCircle2, Eye, EyeOff, KeyRound } from "lucide-react";

export default function ChangePasswordPage() {
  const { language } = useLanguage();
  const ar = language === "ar";
  const router = useRouter();
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError(ar ? "كلمة المرور لازم تكون 8 أحرف على الأقل" : "Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      setError(ar ? "كلمتا المرور غير متطابقتين" : "Passwords do not match");
      return;
    }
    setSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(ar ? "تعذر تغيير كلمة المرور" : "Could not change password");
      setSaving(false);
      return;
    }
    const r = await fetch("/api/auth/password-changed", { method: "POST" });
    if (!r.ok) {
      setError(ar ? "تم تغيير كلمة المرور لكن تعذر إكمال التفعيل. حاول مرة ثانية." : "Password changed, but setup could not be completed. Please try again.");
      setSaving(false);
      return;
    }
    setDone(true);
    setTimeout(() => {
      router.replace("/");
      router.refresh();
    }, 900);
  };

  const visibilityButton = (shown: boolean, setShown: (value: boolean) => void, label: string) => (
    <button
      type="button"
      onClick={() => setShown(!shown)}
      disabled={saving}
      aria-label={label}
      className="absolute inset-y-0 end-0 flex w-12 items-center justify-center rounded-e-xl text-slate-400 transition hover:bg-slate-800/80 hover:text-white disabled:opacity-50"
    >
      {shown ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  );

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020617] p-6 text-white">
      <div className="pointer-events-none absolute left-[-10%] top-[-20%] h-[520px] w-[520px] rounded-full bg-blue-600/10 blur-3xl" />
      <div className="relative flex min-h-[calc(100vh-3rem)] items-center justify-center">
        <div className="w-full max-w-md">
          <div className="mb-10 flex justify-center"><AveroBrand /></div>
          <div className="rounded-3xl border border-slate-800/80 bg-slate-950/75 p-8 shadow-2xl">
            <div className="mb-7 flex items-start gap-4">
              <div className="rounded-2xl bg-blue-500/10 p-3 text-blue-400"><KeyRound size={24} /></div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[.2em] text-blue-400">{ar ? "حماية الحساب" : "Account Security"}</p>
                <h1 className="mt-2 text-2xl font-bold">{ar ? "غيّر كلمة المرور" : "Change your password"}</h1>
                <p className="mt-2 text-sm leading-6 text-slate-400">{ar ? "هيدي أول مرة عم تفوت. حط كلمة مرور خاصة فيك قبل ما تكمل على AVERO." : "This is your first login. Create your own private password before continuing to AVERO."}</p>
              </div>
            </div>
            {done ? (
              <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-300"><CheckCircle2 size={20} />{ar ? "تم تغيير كلمة المرور بنجاح" : "Password changed successfully"}</div>
            ) : (
              <form onSubmit={submit} className="space-y-5">
                <div>
                  <label className="text-sm text-slate-300">{ar ? "كلمة المرور الجديدة" : "New password"}</label>
                  <div className="relative mt-2">
                    <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 pe-12 outline-none focus:border-blue-500" />
                    {visibilityButton(showPassword, setShowPassword, ar ? "إظهار أو إخفاء كلمة المرور الجديدة" : "Show or hide new password")}
                  </div>
                </div>
                <div>
                  <label className="text-sm text-slate-300">{ar ? "تأكيد كلمة المرور" : "Confirm password"}</label>
                  <div className="relative mt-2">
                    <input type={showConfirm ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)} required className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 pe-12 outline-none focus:border-blue-500" />
                    {visibilityButton(showConfirm, setShowConfirm, ar ? "إظهار أو إخفاء تأكيد كلمة المرور" : "Show or hide confirm password")}
                  </div>
                </div>
                {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}
                <button disabled={saving} className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold transition hover:bg-blue-500 disabled:opacity-50">{saving ? (ar ? "جارٍ الحفظ..." : "Saving...") : (ar ? "حفظ كلمة المرور والمتابعة" : "Save password & continue")}</button>
              </form>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
