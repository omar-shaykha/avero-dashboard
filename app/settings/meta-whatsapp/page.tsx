"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Copy, KeyRound, Loader2, MessageCircle, ShieldCheck } from "lucide-react";

export default function MetaWhatsAppSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<any>(null);
  const [token, setToken] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/integrations/whatsapp/credentials", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setStatus(data);
      setPhoneNumberId(data.phone_number_id || "");
    } else {
      setMessage(data.error || "Could not load Meta status");
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function connect() {
    setSaving(true);
    setMessage("");
    const res = await fetch("/api/integrations/whatsapp/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access_token: token, phone_number_id: phoneNumberId }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setMessage("Meta WhatsApp connected directly to AVERO / Vercel.");
      setToken("");
      await load();
    } else {
      setMessage(data.error || "Meta connection failed");
    }
    setSaving(false);
  }

  function copy(value: string) {
    navigator.clipboard.writeText(value).catch(() => {});
  }

  return (
    <main className="min-h-screen bg-[#020817] px-4 py-8 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-cyan-400">AVERO DIRECT CONNECT</p>
          <h1 className="mt-2 text-3xl font-black">Meta WhatsApp → Vercel</h1>
          <p className="mt-2 text-sm text-slate-400">Leo runs directly on AVERO. No Make scenario is used in this connection.</p>
        </div>

        <section className="rounded-3xl border border-cyan-400/20 bg-slate-950/70 p-6 shadow-2xl shadow-cyan-950/20">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-3"><MessageCircle className="h-6 w-6 text-cyan-300" /></div>
              <div>
                <h2 className="font-bold">Connection status</h2>
                <p className="text-xs text-slate-500">Production Vercel webhook</p>
              </div>
            </div>
            {loading ? <Loader2 className="h-5 w-5 animate-spin text-cyan-300" /> : status?.connected ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-300"><CheckCircle2 className="h-4 w-4" /> Connected</span>
            ) : (
              <span className="rounded-full bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-300">Token required</span>
            )}
          </div>

          {status && (
            <div className="space-y-3 text-sm">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <div className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">Callback URL</div>
                <div className="flex items-center gap-2"><code className="min-w-0 flex-1 break-all text-cyan-200">{status.webhook_url}</code><button onClick={() => copy(status.webhook_url)} className="rounded-lg p-2 hover:bg-slate-800"><Copy className="h-4 w-4" /></button></div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <div className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">Verify token</div>
                <div className="flex items-center gap-2"><code className="min-w-0 flex-1 break-all text-cyan-200">{status.verify_token}</code><button onClick={() => copy(status.verify_token)} className="rounded-lg p-2 hover:bg-slate-800"><Copy className="h-4 w-4" /></button></div>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-950/70 p-6">
          <div className="mb-5 flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-cyan-300" />
            <div><h2 className="font-bold">Secure Meta credentials</h2><p className="text-xs text-slate-500">Saved encrypted in Supabase Vault. The token is never displayed again.</p></div>
          </div>
          <div className="space-y-4">
            <label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">WhatsApp Phone Number ID</span><input value={phoneNumberId} onChange={(e) => setPhoneNumberId(e.target.value)} placeholder="1201704893036247" className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 outline-none focus:border-cyan-400/60" /></label>
            <label className="block"><span className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500"><KeyRound className="h-4 w-4" /> Permanent / system-user access token</span><textarea value={token} onChange={(e) => setToken(e.target.value)} rows={4} placeholder="Paste the Meta access token here once" className="w-full resize-none rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 font-mono text-xs outline-none focus:border-cyan-400/60" /></label>
            <button onClick={connect} disabled={saving || !token.trim() || !phoneNumberId.trim()} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-5 py-3.5 font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40">{saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />} Connect Meta to AVERO</button>
            {message && <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3 text-sm text-slate-300">{message}</div>}
          </div>
        </section>
      </div>
    </main>
  );
}
