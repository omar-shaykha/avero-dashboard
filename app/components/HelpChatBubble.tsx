"use client";
import { useEffect, useRef, useState } from "react";
import { Bot, LoaderCircle, Send, Sparkles, X } from "lucide-react";

type Msg = { id?: string; role: string; message: string; created_at?: string };
const marketingRegex = /بوست|post|ماركت|marketing|فيس|facebook|فايس|انستا|instagram|سناب|snap|تيك|tiktok|ستوري|story|اعلان|إعلان|صورة|نزل|نزّل/i;

export default function HelpChatBubble() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  async function load() {
    const response = await fetch("/api/help-center/chat", { cache: "no-store" });
    if (response.status === 401) return;
    setReady(true);
    if (response.ok) {
      const data = await response.json();
      setMessages(data.messages || []);
    }
  }

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 15000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  async function send() {
    const message = text.trim();
    if (!message || busy) return;
    const isMarketing = marketingRegex.test(message);
    const pending = isMarketing ? "استلمت الأمر. عم شغّل Foxy → Pulse → Script → Canvas..." : "استلمت رسالتك. Rex عم يراجعها...";
    setText("");
    setBusy(true);
    setMessages((current) => [...current, { role: "user", message }, { role: "assistant", message: pending }]);
    const endpoint = isMarketing ? "/api/marketing/chat-command" : "/api/help-center/chat";
    const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message }) });
    const data = await response.json().catch(() => ({}));
    setBusy(false);
    if (response.ok) {
      const answer = data.message || data.reply?.message || "تم التنفيذ.";
      setMessages((current) => [...current.filter((item) => item.message !== pending), { role: "assistant", message: answer }]);
      if (isMarketing) window.dispatchEvent(new CustomEvent("avero-marketing-updated"));
    } else {
      setMessages((current) => [...current.filter((item) => item.message !== pending), { role: "assistant", message: data.error || "ما قدرت نفّذ الأمر. جرّب تكتبه أبسط." }]);
    }
  }

  if (!ready) return null;
  return (
    <div className="fixed bottom-5 right-5 z-[80]">
      <button onClick={() => setOpen(!open)} className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-400 text-slate-950 shadow-2xl shadow-cyan-500/25">
        <Sparkles size={24} />
        <span className="absolute -right-1 -top-1 h-4 w-4 animate-ping rounded-full bg-emerald-400" />
      </button>
      {open && (
        <div className="absolute bottom-16 right-0 flex h-[560px] w-[390px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 text-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-cyan-400/10 p-2 text-cyan-300"><Bot size={18} /></div>
              <div>
                <b>AVERO Command Chat</b>
                <p className="text-xs text-slate-500">اكتب أمر طبيعي: بوست، ستوري، إعلان، أو دعم</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-800"><X size={18} /></button>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {!messages.length && (
              <div className="space-y-2">
                <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4 text-sm text-cyan-100">
                  أنا Command Chat تبع AVERO. أعطيني أمر طبيعي وأنا بحوّله للـdepartment الصح.
                </div>
                <button onClick={() => setText("اعملي بوست اليوم على فيسبوك وانستغرام عن AVERO OS على ذوقك")} className="w-full rounded-xl border border-slate-800 px-3 py-2 text-start text-xs text-slate-300 hover:border-cyan-400">اعملي بوست اليوم على فيسبوك وانستغرام</button>
                <button onClick={() => setText("جهزلي ستوري سناب وانستغرام عن الذكاء الاصطناعي للأعمال")} className="w-full rounded-xl border border-slate-800 px-3 py-2 text-start text-xs text-slate-300 hover:border-cyan-400">جهزلي ستوري سناب وانستغرام</button>
              </div>
            )}
            {messages.map((item, index) => (
              <div key={item.id || index} className={`flex ${item.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[84%] rounded-2xl px-3 py-2 text-sm leading-6 ${item.role === "user" ? "bg-cyan-500 text-slate-950" : "border border-slate-800 bg-slate-900 text-slate-200"}`}>{item.message}</div>
              </div>
            ))}
            {busy && <div className="flex items-center gap-2 text-xs text-cyan-300"><LoaderCircle className="animate-spin" size={14} /> عم نفذ الأمر...</div>}
            <div ref={end} />
          </div>
          <div className="border-t border-slate-800 p-3">
            <div className="flex gap-2">
              <input value={text} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") send(); }} placeholder="اكتب أمر للداشبورد..." className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-sm outline-none focus:border-cyan-400" />
              <button onClick={send} disabled={busy || !text.trim()} className="rounded-xl bg-cyan-400 px-3 text-slate-950 disabled:opacity-50"><Send size={18} /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
