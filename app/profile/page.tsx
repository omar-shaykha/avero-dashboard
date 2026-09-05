"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Sidebar from "@/app/components/Sidebar";
import DashboardHeader from "@/app/components/DashboardHeader";
import { Camera, Save, UserRound } from "lucide-react";
import { useLanguage } from "@/app/components/LanguageProvider";

type ProfileForm = {
  full_name: string;
  username: string;
  nickname: string;
  age: string;
  talents: string;
  job_title: string;
  bio: string;
  avatar_url: string;
};

const empty: ProfileForm = { full_name: "", username: "", nickname: "", age: "", talents: "", job_title: "", bio: "", avatar_url: "" };

export default function ProfilePage() {
  const supabase = createClient();
  const { language } = useLanguage();
  const ar = language === "ar";
  const [email, setEmail] = useState("");
  const [form, setForm] = useState<ProfileForm>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      if (!user) return;
      const m = user.user_metadata || {};
      setEmail(user.email || "");
      setForm({
        full_name: m.full_name || "",
        username: m.username || "",
        nickname: m.nickname || "",
        age: m.age ? String(m.age) : "",
        talents: m.talents || "",
        job_title: m.job_title || "",
        bio: m.bio || "",
        avatar_url: m.avatar_url || "",
      });
      setLoading(false);
    });
  }, [supabase]);

  const change = (key: keyof ProfileForm, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const uploadAvatar = async (file?: File) => {
    if (!file) return;
    const body = new FormData();
    body.append("file", file);
    const res = await fetch("/api/profile/avatar", { method: "POST", body });
    const data = await res.json();
    if (!res.ok) { setMessage(data.error || "Upload failed"); return; }
    change("avatar_url", data.url);
    await supabase.auth.updateUser({ data: { ...form, avatar_url: data.url } });
    setMessage(ar ? "تم تحديث الصورة" : "Photo updated");
  };

  const save = async () => {
    setSaving(true); setMessage("");
    const { error } = await supabase.auth.updateUser({ data: { ...form, age: form.age ? Number(form.age) : null } });
    setSaving(false);
    setMessage(error ? error.message : (ar ? "تم حفظ الملف الشخصي" : "Profile saved"));
  };

  if (loading) return <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center">Loading...</div>;
  const initials = (form.full_name || form.username || email || "U").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-slate-950">
      <Sidebar userEmail={email} userName={form.full_name || form.username} />
      <div className="ml-64 flex min-h-screen flex-col">
        <DashboardHeader userEmail={email} userName={form.full_name || form.username} />
        <main className="flex-1 px-6 py-7 text-white">
          <div className="mx-auto max-w-5xl">
            <div className="mb-6"><h1 className="text-3xl font-bold">{ar ? "الملف الشخصي" : "Profile"}</h1><p className="mt-1 text-slate-400">{ar ? "إدارة هويتك داخل AVERO" : "Manage your identity inside AVERO"}</p></div>
            <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
              <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-center">
                <div className="mx-auto flex h-28 w-28 items-center justify-center overflow-hidden rounded-3xl border border-blue-400/20 bg-gradient-to-br from-blue-600 to-cyan-500 text-3xl font-bold">
                  {form.avatar_url ? <img src={form.avatar_url} alt="Avatar" className="h-full w-full object-cover" /> : initials}
                </div>
                <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm hover:bg-slate-700"><Camera size={16}/>{ar ? "تغيير الصورة" : "Change photo"}<input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => uploadAvatar(e.target.files?.[0])}/></label>
                <p className="mt-4 text-sm font-semibold">{form.full_name || form.username || email}</p><p className="text-xs text-slate-500">{email}</p>
              </section>
              <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label={ar ? "الاسم الكامل" : "Full name"} value={form.full_name} onChange={(v)=>change("full_name",v)} />
                  <Field label={ar ? "اسم المستخدم" : "Username"} value={form.username} onChange={(v)=>change("username",v)} />
                  <Field label={ar ? "الاسم المختصر" : "Nickname"} value={form.nickname} onChange={(v)=>change("nickname",v)} />
                  <Field label={ar ? "العمر" : "Age"} value={form.age} onChange={(v)=>change("age",v)} type="number" />
                  <Field label={ar ? "المسمى الوظيفي" : "Job title"} value={form.job_title} onChange={(v)=>change("job_title",v)} />
                  <Field label={ar ? "المواهب" : "Talents"} value={form.talents} onChange={(v)=>change("talents",v)} />
                </div>
                <label className="mt-4 block text-sm text-slate-300">{ar ? "نبذة" : "Bio"}<textarea value={form.bio} onChange={(e)=>change("bio",e.target.value)} rows={5} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500" /></label>
                <div className="mt-5 flex items-center justify-between"><span className="text-sm text-emerald-400">{message}</span><button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 font-medium hover:bg-blue-500 disabled:opacity-50"><Save size={16}/>{saving ? (ar ? "جاري الحفظ..." : "Saving...") : (ar ? "حفظ" : "Save profile")}</button></div>
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type="text" }: { label:string; value:string; onChange:(value:string)=>void; type?:string }) {
  return <label className="block text-sm text-slate-300">{label}<input type={type} value={value} onChange={(e)=>onChange(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500" /></label>;
}
