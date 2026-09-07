"use client";

import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import DashboardHeader from "./DashboardHeader";
import { CheckCircle2, Download, LoaderCircle, MessageSquare, RefreshCw, Sparkles } from "lucide-react";

type Item = {
  id: string;
  campaign_name?: string;
  caption?: string;
  hashtags?: string[];
  platforms?: string[];
  status?: string;
  approval_notes?: string;
  error_message?: string;
  created_at?: string;
  metrics?: { worker_name?: string; visual_idea?: string; video_idea?: string; story_idea?: string };
};

const steps = [
  { name: "Foxy", role: "Marketing Boss", text: "استلم الأمر" },
  { name: "Pulse", role: "Ideas", text: "يطلع الفكرة" },
  { name: "Script", role: "Copy", text: "يكتب النص" },
  { name: "Canvas", role: "Creative", text: "يجهز فكرة الصورة" },
  { name: "Boost", role: "Publisher", text: "ينتظر الموافقة" },
];

export default function MarketingCommandCenter() {
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [pulse, setPulse] = useState(0);
  const latest = items[0];

  async function load() {
    const response = await fetch("/api/marketing/content", { cache: "no-store" });
    if (response.ok) {
      const data = await response.json();
      setItems(data.items || []);
    }
  }

  useEffect(() => {
    load();
    const onUpdate = () => load();
    window.addEventListener("avero-marketing-updated", onUpdate);
    const timer = window.setInterval(() => {
      setPulse((current) => (current + 1) % steps.length);
      load();
    }, 4500);
    return () => {
      window.removeEventListener("avero-marketing-updated", onUpdate);
      window.clearInterval(timer);
    };
  }, []);

  async function publish(id: string) {
    setBusy(true);
    setMsg("Boost عم يجهّز طلب النشر...");
    const response = await fetch(`/api/marketing/content/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "publish" }),
    });
    const data = await response.json().catch(() => ({}));
    setBusy(false);
    setMsg(response.ok ? data.message || "تم إرسال طلب النشر." : data.error || "النشر الحقيقي غير مربوط بعد.");
    await load();
  }

  const active = busy ? 4 : pulse;
  const caption = latest?.caption || "افتح AVERO Command Chat تحت واكتب: اعملي بوست اليوم على فيسبوك وانستغرام عن AVERO OS.";
  const status = latest?.status || "ready";

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Sidebar />
      <div className="ml-64 min-h-screen">
        <DashboardHeader />
        <main className="p-4 md:p-7">
          <div className="mx-auto max-w-6xl space-y-5">
            <section className="rounded-[2rem] border border-cyan-400/20 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,.15),transparent_35%),#020617] p-6 md:p-8">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[.28em] text-cyan-300">AVERO OS · Foxy Marketing</p>
                  <h1 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">Command Chat يعمل، Foxy تنفّذ</h1>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
                    هاي الصفحة بس بتفرجيك مسار الشغل. الأوامر كلها من الشات تحت: بوست، ستوري، حملة، أو نشر.
                  </p>
                </div>
                <div className="rounded-2xl border border-cyan-400/25 bg-cyan-400/10 px-4 py-3 text-sm font-bold text-cyan-100">
                  Status: {status}
                </div>
              </div>

              <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-950/80 p-5">
                <div className="relative grid gap-3 md:grid-cols-5">
                  <div className="absolute left-[10%] right-[10%] top-[44px] hidden h-px bg-gradient-to-r from-cyan-500/30 via-cyan-300 to-cyan-500/30 md:block" />
                  {steps.map((step, index) => {
                    const done = latest && index < 4;
                    const current = index === active || (busy && index === 4);
                    return (
                      <div key={step.name} className="relative">
                        <div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border text-xl font-black transition ${current ? "border-cyan-300 bg-cyan-400/15 shadow-[0_0_45px_rgba(34,211,238,.28)]" : done ? "border-emerald-300/40 bg-emerald-400/10" : "border-slate-800 bg-slate-900"}`}>
                          {done ? <CheckCircle2 className="text-emerald-300" /> : current ? <LoaderCircle className="animate-spin text-cyan-300" /> : step.name.slice(0, 1)}
                        </div>
                        <div className={`mt-3 rounded-2xl border p-3 text-center ${current ? "border-cyan-400/40 bg-cyan-400/10" : "border-slate-800 bg-slate-900/60"}`}>
                          <b className="block text-white">{step.name}</b>
                          <span className="text-[11px] uppercase tracking-[.16em] text-cyan-300">{step.role}</span>
                          <p className="mt-1 text-xs text-slate-400">{current ? step.text : done ? "Done" : "Waiting"}</p>
                        </div>
                        {current && <span className="absolute right-6 top-0 h-3 w-3 animate-ping rounded-full bg-cyan-300" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[.2em] text-cyan-300">Approval Card</p>
                  <h2 className="mt-1 text-2xl font-black">{latest?.campaign_name || "ما في بوست جاهز بعد"}</h2>
                </div>
                <button onClick={load} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:border-cyan-400">
                  <RefreshCw size={15} /> Refresh
                </button>
              </div>

              <div className="mt-5 rounded-3xl border border-slate-700 bg-slate-950/70 p-5">
                <p className="whitespace-pre-line text-sm leading-7 text-slate-200">{caption}</p>
                {latest?.hashtags?.length ? <p className="mt-3 text-xs text-cyan-300">{latest.hashtags.map((tag) => `#${tag}`).join(" ")}</p> : null}
                {latest?.approval_notes ? <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-3 text-xs leading-6 text-slate-400">{latest.approval_notes}</div> : null}
                {latest?.error_message ? <div className="mt-3 rounded-xl bg-rose-500/10 p-3 text-sm text-rose-300">{latest.error_message}</div> : null}
                <button disabled={!latest || busy} onClick={() => latest && publish(latest.id)} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-5 py-4 font-black text-slate-950 transition hover:bg-cyan-300 disabled:opacity-50">
                  <Download size={18} /> {busy ? "Boost working..." : "Publish Now"}
                </button>
                {msg && <div className="mt-3 rounded-xl border border-cyan-400/20 bg-cyan-400/10 p-3 text-sm text-cyan-100">{msg}</div>}
              </div>
            </section>

            <section className="rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-5 text-sm leading-7 text-cyan-100">
              <MessageSquare className="mb-2" /> افتح الشات الأزرق تحت واكتب الأمر الطبيعي. مثال: <b>اعملي بوست اليوم على فيسبوك وانستغرام عن AVERO OS على ذوقك</b>.
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
