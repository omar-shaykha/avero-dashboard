"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Eye, EyeOff, Facebook, Instagram, Loader2, ShieldCheck } from "lucide-react";

type Connection = {
  platform: string;
  account_name?: string | null;
  external_account_id?: string | null;
  direct_publishing_enabled?: boolean;
  source?: string | null;
  health_status?: string | null;
};

export default function MarketingPublisherConnect() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [pageId, setPageId] = useState("");
  const [igId, setIgId] = useState("");
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/marketing/social-connections", { cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return;
    const rows = json.connections || [];
    setConnections(rows);
    const fb = rows.find((x: Connection) => x.platform === "facebook");
    const ig = rows.find((x: Connection) => x.platform === "instagram");
    if (fb?.external_account_id) setPageId(String(fb.external_account_id));
    if (ig?.external_account_id) setIgId(String(ig.external_account_id));
  }

  useEffect(() => { load(); }, []);

  async function connectPlatform(platform: "facebook" | "instagram", externalId: string) {
    const res = await fetch("/api/marketing/social-connections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform, external_account_id: externalId, access_token: token }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || `${platform} connection failed`);
    return json.connection;
  }

  async function connectMeta() {
    setError(""); setMessage("");
    if (!pageId.trim()) { setError("Facebook Page ID is required."); return; }
    if (!token.trim()) { setError("Meta Page Access Token is required."); return; }
    setSaving(true);
    try {
      await connectPlatform("facebook", pageId.trim());
      if (igId.trim()) await connectPlatform("instagram", igId.trim());
      setToken("");
      setMessage(igId.trim() ? "Facebook + Instagram Direct Publishing connected." : "Facebook Direct Publishing connected. Add the Instagram Account ID later if needed.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connection failed.");
    } finally {
      setSaving(false);
    }
  }

  const fb = connections.find(x => x.platform === "facebook");
  const ig = connections.find(x => x.platform === "instagram");

  return <div className="mx-auto max-w-4xl space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-xs font-black uppercase tracking-[.24em] text-violet-300">FOXY DIRECT PUBLISHER</p>
        <h1 className="mt-2 text-3xl font-black text-white">Connect Facebook & Instagram</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">AVERO verifies the Meta token first, then stores it encrypted in Supabase Vault. The token is never returned to the browser after saving.</p>
      </div>
      <Link href="/ai-marketing" className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-800">← Back to Foxy</Link>
    </div>

    <div className="grid gap-4 md:grid-cols-2">
      <StatusCard icon={<Facebook size={22}/>} title="Facebook" connection={fb}/>
      <StatusCard icon={<Instagram size={22}/>} title="Instagram" connection={ig}/>
    </div>

    <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
      <div className="flex items-center gap-3"><ShieldCheck className="text-emerald-400"/><div><h2 className="font-bold text-white">Meta Direct Publishing</h2><p className="text-xs text-slate-400">Use a Page Access Token with publishing permissions.</p></div></div>
      <div className="mt-6 grid gap-4">
        <Field label="Facebook Page ID" value={pageId} onChange={setPageId} placeholder="1345056728687428"/>
        <Field label="Instagram Business Account ID (optional)" value={igId} onChange={setIgId} placeholder="17841442751901559"/>
        <label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">Meta Page Access Token</span><div className="flex rounded-xl border border-slate-700 bg-slate-950 focus-within:border-violet-400"><input type={showToken ? "text" : "password"} value={token} onChange={e=>setToken(e.target.value)} autoComplete="off" placeholder="Paste token here" className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm text-white outline-none"/><button type="button" onClick={()=>setShowToken(v=>!v)} className="px-4 text-slate-400">{showToken?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></label>
      </div>
      {message && <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{message}</div>}
      {error && <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>}
      <button disabled={saving} onClick={connectMeta} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-black text-white hover:bg-violet-500 disabled:opacity-60">{saving?<Loader2 className="animate-spin" size={17}/>:<ShieldCheck size={17}/>} {saving?"Verifying & Connecting...":"Verify & Connect Direct Publishing"}</button>
    </section>

    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100"><b>Important:</b> TikTok and Snapchat rows that say connected from the old integration are not direct-publishing connections yet. Foxy will only claim direct publishing where the secure AVERO connection is enabled.</div>
  </div>;
}

function Field({label,value,onChange,placeholder}:{label:string;value:string;onChange:(v:string)=>void;placeholder?:string}){
  return <label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">{label}</span><input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-violet-400"/></label>;
}

function StatusCard({icon,title,connection}:{icon:React.ReactNode;title:string;connection?:Connection}){
  const ready=!!connection?.direct_publishing_enabled;
  return <div className={`rounded-2xl border p-5 ${ready?"border-emerald-500/30 bg-emerald-500/10":"border-slate-800 bg-slate-900/60"}`}><div className="flex items-center justify-between"><div className="flex items-center gap-3 text-white">{icon}<b>{title}</b></div>{ready?<CheckCircle2 className="text-emerald-400" size={20}/>:<span className="rounded-full bg-slate-800 px-2 py-1 text-[10px] font-bold text-slate-400">NOT DIRECT</span>}</div><p className="mt-3 text-sm text-slate-300">{connection?.account_name || "No direct publisher credential"}</p><p className="mt-1 text-xs text-slate-500">{ready?"AVERO Direct Publishing ready":connection?.source?`Existing source: ${connection.source}`:"Not connected"}</p></div>;
}
