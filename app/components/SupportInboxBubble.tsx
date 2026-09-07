"use client";

import { useEffect, useMemo, useState } from "react";
import { Bot, Building2, Headphones, MessageCircle, RefreshCw, Send, UserRound, X } from "lucide-react";

type SessionRow = { id: string; user_id: string; company_id: string; status: string; handling_mode?: "ai" | "human"; created_at: string; updated_at: string; company?: { id: string; name: string } | null; profile?: { first_name?: string | null; last_name?: string | null; full_name?: string | null; nickname?: string | null; username?: string | null } | null; last_message?: { role: string; message: string; created_at: string } | null };
type Detail = { session: SessionRow; messages: { id: string; role: string; message: string; created_at: string }[] };
function name(row?: SessionRow | null) { const p = row?.profile; return [p?.first_name, p?.last_name].filter(Boolean).join(" ") || p?.full_name || p?.nickname || p?.username || "User"; }

export default function SupportInboxBubble({ enabled = false, rtl = false }: { enabled?: boolean; rtl?: boolean }) {
  const [open, setOpen] = useState(false);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [selected, setSelected] = useState("");
  const [detail, setDetail] = useState<Detail | null>(null);
  const [reply, setReply] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  async function loadInbox() {
    if (!enabled) return;
    try { const r = await fetch("/api/admin/help-center", { cache: "no-store" }); const d = await r.json(); if (!r.ok) throw new Error(d.error || "Failed"); const rows = Array.isArray(d) ? d : []; setSessions(rows); if (!selected && rows[0]?.id) setSelected(rows[0].id); } catch (e) { setError(e instanceof Error ? e.message : "Failed"); }
  }
  async function loadDetail(id: string) { if (!id) return; const r = await fetch(`/api/admin/help-center?session_id=${encodeURIComponent(id)}`, { cache: "no-store" }); const d = await r.json(); if (r.ok) setDetail(d); }
  useEffect(() => { if (!enabled) return; loadInbox(); const t = window.setInterval(loadInbox, 15000); return () => window.clearInterval(t); }, [enabled]);
  useEffect(() => { if (selected) loadDetail(selected); }, [selected]);
  const active = useMemo(() => sessions.filter((s) => s.status !== "closed"), [sessions]);
  const unread = active.filter((s) => s.last_message?.role === "user").length;
  async function send() { const text = reply.trim(); if (!text || !selected || working) return; setWorking(true); const r = await fetch("/api/admin/help-center", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ session_id: selected, message: text }) }); setWorking(false); if (r.ok) { setReply(""); await loadDetail(selected); await loadInbox(); } }
  if (!enabled) return null;
  return <div className={`fixed bottom-5 z-[80] ${rtl ? "left-5" : "right-5"}`} dir={rtl ? "rtl" : "ltr"}>
    {open && <div className="mb-4 flex h-[560px] w-[380px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-3xl border border-cyan-400/25 bg-slate-950/95 text-white shadow-[0_22px_80px_rgba(0,0,0,.55)] backdrop-blur-xl">
      <header className="flex items-center justify-between border-b border-slate-800 p-4"><div className="flex items-center gap-3"><div className="rounded-2xl bg-cyan-400/10 p-2 text-cyan-200"><Headphones size={20}/></div><div><p className="font-black">Support Inbox</p><p className="text-xs text-slate-500">{active.length} active · {unread} need reply</p></div></div><button onClick={() => setOpen(false)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-900"><X size={17}/></button></header>
      {error && <div className="border-b border-red-400/20 bg-red-400/10 p-2 text-xs text-red-200">{error}</div>}
      <div className="grid min-h-0 flex-1 grid-cols-[135px_1fr]"><aside className="overflow-y-auto border-r border-slate-800">{active.map((s) => <button key={s.id} onClick={() => setSelected(s.id)} className={`w-full border-b border-slate-800 p-3 text-start ${selected === s.id ? "bg-cyan-400/10" : "hover:bg-slate-900"}`}><div className="flex items-center justify-between gap-1"><span className="truncate text-xs font-bold">{name(s)}</span><span className={`h-2 w-2 rounded-full ${s.last_message?.role === "user" ? "bg-amber-300" : "bg-emerald-300"}`}/></div><p className="mt-1 truncate text-[10px] text-cyan-200">{s.company?.name || "Company"}</p><p className="mt-1 line-clamp-2 text-[10px] text-slate-500">{s.last_message?.message || "No messages"}</p></button>)}{!active.length && <p className="p-3 text-xs text-slate-500">No active chats.</p>}</aside><section className="flex min-w-0 flex-col"><div className="border-b border-slate-800 p-3"><div className="flex items-center gap-2 text-sm font-bold"><UserRound size={15}/>{name(detail?.session || sessions.find((s) => s.id === selected))}</div><div className="mt-1 flex items-center gap-1 text-[10px] text-slate-500"><Building2 size={11}/>{detail?.session.company?.name || sessions.find((s) => s.id === selected)?.company?.name || "—"}</div></div><div className="flex-1 space-y-2 overflow-y-auto p-3">{detail?.messages?.map((m) => <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}><div className={`max-w-[90%] rounded-2xl px-3 py-2 text-xs leading-5 ${m.role === "user" ? "bg-cyan-600" : "border border-slate-800 bg-slate-900 text-slate-300"}`}>{m.message}</div></div>)}{!detail?.messages?.length && <div className="flex h-full items-center justify-center text-center text-xs text-slate-500"><Bot size={18} className="mr-1"/>Select a chat</div>}</div><div className="border-t border-slate-800 p-3"><div className="flex gap-2"><input value={reply} onChange={(e) => setReply(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Reply..." className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs outline-none focus:border-cyan-400"/><button onClick={send} disabled={working || !reply.trim()} className="rounded-xl bg-cyan-400 px-3 text-slate-950 disabled:opacity-50"><Send size={14}/></button></div></div></section></div>
    </div>}
    <button onClick={() => setOpen((v) => !v)} className="relative flex h-16 w-16 items-center justify-center rounded-3xl border border-cyan-300/40 bg-cyan-500 text-slate-950 shadow-[0_0_40px_rgba(34,211,238,.4)] transition hover:scale-105"><MessageCircle size={27}/>{unread > 0 && <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-amber-300 px-1 text-xs font-black text-slate-950">{unread}</span>}<span className="absolute inset-0 -z-10 animate-ping rounded-3xl bg-cyan-400/30"/></button>
    {open && <button onClick={loadInbox} className="absolute -top-10 right-0 flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-300"><RefreshCw size={12}/>Refresh</button>}
  </div>;
}
