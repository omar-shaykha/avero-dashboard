"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import Sidebar from "./Sidebar";
import DashboardHeader from "./DashboardHeader";
import {
  Activity,
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Facebook,
  Image as ImageIcon,
  Library,
  Megaphone,
  Palette,
  Play,
  RefreshCw,
  Rocket,
  Send,
  Sparkles,
  ThumbsUp,
  Upload,
  Wand2,
  type LucideIcon,
} from "lucide-react";

type Platform = "facebook" | "instagram" | "tiktok" | "snapchat";
type Tab = "brand" | "studio" | "queue" | "channels" | "live";
type Connection = { id?: string; platform: Platform; account_name?: string | null; connection_status: string; health_status?: string | null };
type ContentItem = { id: string; campaign_name?: string | null; objective?: string | null; audience?: string | null; budget?: number | null; currency?: string | null; creative_brief?: string | null; channel: string; platforms?: string[]; content_type: string; caption?: string | null; media_url?: string | null; hashtags?: string[]; scheduled_for?: string | null; status: string; approval_notes?: string | null; published_at?: string | null; error_message?: string | null; metrics?: Record<string, unknown>; created_at: string };
type Run = { id: string; action: string; status: string; error_message?: string | null; created_at: string; completed_at?: string | null };
type BrandKit = {
  brand_name: string;
  slogan: string;
  logo_data_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  tone_of_voice: string;
  visual_style: string;
  target_audience: string;
  content_pillars: string[];
  default_platforms: string[];
  daily_time: string;
  timezone: string;
  auto_generate_enabled: boolean;
  approval_required: boolean;
  notes: string;
};

const platformOptions: { id: Platform; label: string; icon: LucideIcon; description: string }[] = [
  { id: "facebook", label: "Facebook", icon: Facebook, description: "Page posts and campaigns" },
  { id: "instagram", label: "Instagram", icon: Sparkles, description: "Posts, reels and stories" },
  { id: "tiktok", label: "TikTok", icon: Play, description: "Short video hooks" },
  { id: "snapchat", label: "Snapchat", icon: Rocket, description: "Quick stories and offers" },
];

const emptyBrandKit: BrandKit = {
  brand_name: "AVERO OS",
  slogan: "The Business Operating System",
  logo_data_url: null,
  primary_color: "#7C3AED",
  secondary_color: "#06B6D4",
  accent_color: "#22C55E",
  tone_of_voice: "Professional, modern, direct, simple and premium SaaS.",
  visual_style: "Dark premium SaaS visuals, clean dashboards, bold typography, glowing operations cards and AI agent elements.",
  target_audience: "Business owners, restaurants, retail stores, operations managers and teams that need POS, CRM, inventory, marketing and AI agents.",
  content_pillars: ["Operations", "Sales", "Inventory", "AI Agents", "Customer Experience"],
  default_platforms: ["facebook", "instagram"],
  daily_time: "09:00",
  timezone: "Asia/Riyadh",
  auto_generate_enabled: true,
  approval_required: true,
  notes: "",
};

const defaultForm = {
  platforms: ["facebook", "instagram"] as Platform[],
  objective: "Generate qualified leads and brand trust for AVERO OS",
  audience: emptyBrandKit.target_audience,
  budget: "",
  currency: "SAR",
  content_type: "post",
  creative_brief: "Create a premium branded post showing that AVERO OS runs the business from one smart platform: POS, CRM, inventory, HR, marketing, support and AI agents.",
};

export default function MarketingDepartmentWorkspace() {
  const [tab, setTab] = useState<Tab>("brand");
  const [connections, setConnections] = useState<Connection[]>([]);
  const [items, setItems] = useState<ContentItem[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [brandKit, setBrandKit] = useState<BrandKit>(emptyBrandKit);
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(true);
  const [savingBrand, setSavingBrand] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState("");

  const connectedCount = connections.filter((connection) => connection.connection_status === "connected").length;
  const pendingApprovals = items.filter((item) => ["approval_required", "draft", "idea", "approved"].includes(item.status)).length;
  const scheduled = items.filter((item) => item.status === "scheduled").length;
  const hasLogo = Boolean(brandKit.logo_data_url);
  const latestCaption = useMemo(() => items[0]?.caption || "No content generated yet. Upload the logo, save the Brand Kit, then generate your first branded post.", [items]);

  async function load() {
    setLoading(true);
    const [brandRes, connectionsRes, queueRes, runsRes] = await Promise.all([
      fetch("/api/marketing/brand-kit", { cache: "no-store" }),
      fetch("/api/marketing/social-connections", { cache: "no-store" }),
      fetch("/api/marketing/content", { cache: "no-store" }),
      fetch("/api/ai-departments/marketing/runs", { cache: "no-store" }),
    ]);
    if (brandRes.ok) {
      const payload = await brandRes.json();
      const next = { ...emptyBrandKit, ...(payload.brand_kit || {}) } as BrandKit;
      setBrandKit(next);
      setForm((current) => ({
        ...current,
        platforms: ((next.default_platforms || ["facebook", "instagram"]).filter((p) => ["facebook", "instagram", "tiktok", "snapchat"].includes(p)) as Platform[]) || current.platforms,
        audience: next.target_audience || current.audience,
      }));
    }
    if (connectionsRes.ok) setConnections((await connectionsRes.json()).connections || []);
    if (queueRes.ok) setItems((await queueRes.json()).items || []);
    if (runsRes.ok) setRuns((await runsRes.json()).runs || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function togglePlatform(platform: Platform) {
    setForm((current) => {
      const exists = current.platforms.includes(platform);
      const platforms = exists ? current.platforms.filter((item) => item !== platform) : [...current.platforms, platform];
      return { ...current, platforms };
    });
  }

  function toggleDefaultPlatform(platform: Platform) {
    setBrandKit((current) => {
      const exists = current.default_platforms.includes(platform);
      const next = exists ? current.default_platforms.filter((item) => item !== platform) : [...current.default_platforms, platform];
      return { ...current, default_platforms: next };
    });
  }

  function updateBrand<K extends keyof BrandKit>(key: K, value: BrandKit[K]) {
    setBrandKit((current) => ({ ...current, [key]: value }));
  }

  function handleLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage("Please upload a PNG, JPG or WebP logo.");
      return;
    }
    if (file.size > 1_000_000) {
      setMessage("Logo is too large. Compress it under 1MB before uploading.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => updateBrand("logo_data_url", String(reader.result || ""));
    reader.readAsDataURL(file);
  }

  async function saveBrandKit() {
    setSavingBrand(true);
    setMessage("");
    const response = await fetch("/api/marketing/brand-kit", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(brandKit),
    });
    setSavingBrand(false);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(payload.error || "Brand Kit save failed");
      return;
    }
    setBrandKit({ ...emptyBrandKit, ...(payload.brand_kit || {}) });
    setMessage("Brand Kit saved. Foxy will now use the logo, colors and style in every generated draft.");
  }

  async function generateCampaign(quickDaily = false) {
    setGenerating(true);
    setMessage("");
    const payload = quickDaily ? {
      platforms: brandKit.default_platforms?.length ? brandKit.default_platforms : ["facebook", "instagram"],
      objective: "Daily AVERO OS content for awareness, leads and trust",
      audience: brandKit.target_audience,
      budget: "",
      currency: "SAR",
      content_type: "post",
      creative_brief: `Create today's branded content for ${brandKit.brand_name || "AVERO OS"}. Use the uploaded logo if available, the brand colors, and the visual style. Include post caption, design direction, story idea, reel idea and carousel idea.`,
    } : form;

    const response = await fetch("/api/marketing/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setGenerating(false);
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(result.error || "Generation failed");
      return;
    }
    setMessage(result.warning ? "Foxy created a fallback draft because the AI provider had an issue. Review it in the queue." : "Foxy generated branded content and moved it to approval queue.");
    setTab("queue");
    await load();
  }

  async function updateItem(id: string, action: string, scheduled_for?: string) {
    setMessage("");
    const response = await fetch(`/api/marketing/content/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, scheduled_for }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(payload.error || "Action failed");
      return;
    }
    setMessage(action === "publish" ? "Post sent to publishing flow. If Make webhook is configured, it will publish in the background." : "Content updated.");
    await load();
  }

  return <div className="min-h-screen bg-slate-950 text-white"><Sidebar /><div className="ml-64 min-h-screen"><DashboardHeader /><main className="p-7"><div className="mx-auto max-w-7xl space-y-6">
    <section className="overflow-hidden rounded-3xl border border-violet-500/20 bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,.18),transparent_38%),#020617] p-6 shadow-2xl">
      <div className="grid gap-6 xl:grid-cols-[1fr_.9fr]"><div><p className="text-xs font-bold uppercase tracking-[.28em] text-violet-300">AVERO OS AI Marketing Department</p><div className="mt-4 flex flex-wrap items-center gap-4"><div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-violet-400/30 bg-violet-400/10 text-5xl">🦊</div><div><h1 className="text-4xl font-black tracking-tight">Foxy Marketing Agent</h1><p className="mt-1 text-sm font-semibold uppercase tracking-[.18em] text-violet-300">Brand Kit → Daily Drafts → Approval → Publish</p></div></div><p className="mt-5 max-w-3xl text-sm leading-7 text-slate-300">Upload your logo once, save the brand style, then generate daily posts, captions, story ideas, carousel ideas and publishing-ready drafts from inside the dashboard.</p></div><div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1"><Stat label="Brand Logo" value={hasLogo ? "Uploaded" : "Missing"} icon={ImageIcon} /><Stat label="Channels" value={`${connectedCount}/4 connected`} icon={Megaphone} /><Stat label="Approvals" value={`${pendingApprovals}`} icon={ThumbsUp} /></div></div>
    </section>

    <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-2">
      <TabButton active={tab === "brand"} onClick={() => setTab("brand")} text="Brand Kit" icon={Palette} />
      <TabButton active={tab === "studio"} onClick={() => setTab("studio")} text="Content Studio" icon={Wand2} />
      <TabButton active={tab === "queue"} onClick={() => setTab("queue")} text="Approval Queue" icon={Library} />
      <TabButton active={tab === "channels"} onClick={() => setTab("channels")} text="Channels" icon={Megaphone} />
      <TabButton active={tab === "live"} onClick={() => setTab("live")} text="Runs" icon={Activity} />
      <button onClick={load} className="ml-auto inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"><RefreshCw size={15} />Refresh</button>
    </div>

    {message && <div className="rounded-2xl border border-violet-500/30 bg-violet-500/10 px-4 py-3 text-sm text-violet-100">{message}</div>}
    {loading && <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 text-slate-400">Loading Foxy...</div>}

    {!loading && tab === "brand" && <section className="grid gap-6 xl:grid-cols-[.85fr_1.15fr]">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6"><div className="flex items-center gap-3"><div className="rounded-2xl bg-violet-500/10 p-3 text-violet-300"><Upload /></div><div><h2 className="text-xl font-bold">Logo & Brand Identity</h2><p className="text-sm text-slate-500">Foxy uses this in every post, cover and visual direction.</p></div></div><div className="mt-6 rounded-3xl border border-dashed border-slate-700 bg-slate-950/70 p-5 text-center">{brandKit.logo_data_url ? <img src={brandKit.logo_data_url} alt="Brand logo" className="mx-auto max-h-36 max-w-full rounded-2xl object-contain" /> : <div className="py-10"><ImageIcon className="mx-auto text-slate-600" size={42} /><p className="mt-3 text-sm text-slate-500">Upload the AVERO logo here</p></div>}<label className="mt-5 inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-bold hover:bg-violet-500"><Upload size={16} />Upload Logo<input type="file" accept="image/*" onChange={handleLogo} className="hidden" /></label>{brandKit.logo_data_url && <button onClick={() => updateBrand("logo_data_url", null)} className="ml-2 rounded-2xl border border-slate-700 px-5 py-3 text-sm text-slate-300 hover:bg-slate-800">Remove</button>}</div><div className="mt-5 grid grid-cols-3 gap-3"><ColorField label="Primary" value={brandKit.primary_color} onChange={(value) => updateBrand("primary_color", value)} /><ColorField label="Secondary" value={brandKit.secondary_color} onChange={(value) => updateBrand("secondary_color", value)} /><ColorField label="Accent" value={brandKit.accent_color} onChange={(value) => updateBrand("accent_color", value)} /></div></div>
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6"><h2 className="text-xl font-bold">Brand Brain</h2><p className="mt-1 text-sm text-slate-500">Write it once. Foxy reuses it every day.</p><div className="mt-6 grid gap-4 md:grid-cols-2"><Field label="Brand name" value={brandKit.brand_name} onChange={(value) => updateBrand("brand_name", value)} /><Field label="Slogan" value={brandKit.slogan} onChange={(value) => updateBrand("slogan", value)} /><Field label="Daily time" value={brandKit.daily_time} onChange={(value) => updateBrand("daily_time", value)} /><Field label="Timezone" value={brandKit.timezone} onChange={(value) => updateBrand("timezone", value)} /><Area label="Target audience" value={brandKit.target_audience} onChange={(value) => updateBrand("target_audience", value)} /><Area label="Tone of voice" value={brandKit.tone_of_voice} onChange={(value) => updateBrand("tone_of_voice", value)} /><Area label="Visual style" value={brandKit.visual_style} onChange={(value) => updateBrand("visual_style", value)} /><Area label="Notes" value={brandKit.notes || ""} onChange={(value) => updateBrand("notes", value)} /></div><div className="mt-5"><p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Default platforms</p><div className="grid gap-2 sm:grid-cols-4">{platformOptions.map((platform) => <SmallToggle key={platform.id} active={brandKit.default_platforms.includes(platform.id)} label={platform.label} onClick={() => toggleDefaultPlatform(platform.id)} />)}</div></div><div className="mt-5 grid gap-2 sm:grid-cols-2"><Switch label="Daily auto-generate" active={brandKit.auto_generate_enabled} onClick={() => updateBrand("auto_generate_enabled", !brandKit.auto_generate_enabled)} /><Switch label="Approval required" active={brandKit.approval_required} onClick={() => updateBrand("approval_required", !brandKit.approval_required)} /></div><button onClick={saveBrandKit} disabled={savingBrand} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-bold hover:bg-violet-500 disabled:opacity-60"><CheckCircle2 size={17} />{savingBrand ? "Saving..." : "Save Brand Kit"}</button></div>
    </section>}

    {!loading && tab === "studio" && <section className="grid gap-6 xl:grid-cols-[.9fr_1.1fr]"><div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6"><div className="flex items-center gap-3"><div className="rounded-2xl bg-violet-500/10 p-3 text-violet-300"><Wand2 /></div><div><h2 className="text-xl font-bold">Easy Content Studio</h2><p className="text-sm text-slate-500">Write what you want. Foxy creates the caption + visual direction + story + reel idea.</p></div></div><div className="mt-6 grid gap-3 sm:grid-cols-2">{platformOptions.map((platform) => { const selected = form.platforms.includes(platform.id); const Icon = platform.icon; return <button key={platform.id} onClick={() => togglePlatform(platform.id)} className={`rounded-2xl border p-4 text-left transition ${selected ? "border-violet-400 bg-violet-500/10" : "border-slate-800 bg-slate-950 hover:border-slate-600"}`}><div className="flex items-center justify-between"><Icon className="text-violet-300" size={22} />{selected && <CheckCircle2 className="text-emerald-300" size={18} />}</div><p className="mt-3 font-bold">{platform.label}</p><p className="mt-1 text-xs text-slate-500">{platform.description}</p></button>; })}</div><div className="mt-5 space-y-4"><Field label="Objective" value={form.objective} onChange={(value) => setForm({ ...form, objective: value })} /><Field label="Audience" value={form.audience} onChange={(value) => setForm({ ...form, audience: value })} /><div className="grid grid-cols-2 gap-3"><Field label="Budget" value={form.budget} onChange={(value) => setForm({ ...form, budget: value })} /><Field label="Currency" value={form.currency} onChange={(value) => setForm({ ...form, currency: value })} /></div><label className="block"><span className="text-xs font-bold uppercase tracking-wide text-slate-500">Content type</span><select value={form.content_type} onChange={(event) => setForm({ ...form, content_type: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm outline-none focus:border-violet-500"><option value="post">Post</option><option value="carousel">Carousel</option><option value="story">Story</option><option value="cover">Cover</option><option value="reel">Reel / TikTok</option><option value="ad">Ad Creative</option></select></label><Area label="What should Foxy create?" value={form.creative_brief} onChange={(value) => setForm({ ...form, creative_brief: value })} /></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><button onClick={() => generateCampaign(false)} disabled={generating} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-bold hover:bg-violet-500 disabled:opacity-60"><Sparkles size={17} />{generating ? "Generating..." : "Generate Content"}</button><button onClick={() => generateCampaign(true)} disabled={generating} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-5 py-3 text-sm font-bold text-cyan-200 hover:bg-cyan-500/15 disabled:opacity-60"><CalendarClock size={17} />Daily Draft Now</button></div></div><div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6"><div className="flex items-center gap-3"><div className="rounded-2xl bg-slate-800 p-3 text-violet-300"><ImageIcon /></div><div><h2 className="text-xl font-bold">Latest Output</h2><p className="text-sm text-slate-500">The newest caption or fallback draft.</p></div></div><div className="mt-5 min-h-[330px] whitespace-pre-wrap rounded-2xl border border-slate-800 bg-slate-950 p-5 text-sm leading-7 text-slate-200">{latestCaption}</div></div></section>}

    {!loading && tab === "queue" && <section className="grid gap-4">{items.length === 0 ? <Empty text="No marketing content yet. Generate your first post from Content Studio." /> : items.map((item) => <QueueCard key={item.id} item={item} onAction={updateItem} />)}</section>}
    {!loading && tab === "channels" && <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{connections.length === 0 ? <Empty text="No connected channels yet." /> : connections.map((connection) => <ConnectionCard key={connection.platform} connection={connection} />)}</section>}
    {!loading && tab === "live" && <section className="grid gap-4">{runs.length === 0 ? <Empty text="No marketing AI runs yet." /> : runs.map((run) => <RunCard key={run.id} run={run} />)}</section>}
  </div></main></div></div>;
}

function TabButton({ active, onClick, text, icon: Icon }: { active: boolean; onClick: () => void; text: string; icon: LucideIcon }) { return <button onClick={onClick} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold ${active ? "bg-violet-600 text-white" : "text-slate-400 hover:bg-slate-800"}`}><Icon size={15} />{text}</button>; }
function Stat({ label, value, icon: Icon }: { label: string; value: string; icon: LucideIcon }) { return <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"><Icon className="text-violet-300" size={20} /><p className="mt-3 text-xs text-slate-500">{label}</p><p className="text-lg font-black">{value}</p></div>; }
function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="block"><span className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span><input value={value || ""} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm outline-none focus:border-violet-500" /></label>; }
function Area({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="block"><span className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span><textarea value={value || ""} onChange={(event) => onChange(event.target.value)} rows={5} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm leading-6 outline-none focus:border-violet-500" /></label>; }
function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="block rounded-2xl border border-slate-800 bg-slate-950 p-3"><span className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span><div className="mt-2 flex items-center gap-2"><input type="color" value={value || "#7C3AED"} onChange={(event) => onChange(event.target.value)} className="h-10 w-12 rounded-lg border border-slate-800 bg-transparent" /><input value={value || ""} onChange={(event) => onChange(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-800 bg-slate-900 px-2 py-2 text-xs" /></div></label>; }
function SmallToggle({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) { return <button type="button" onClick={onClick} className={`rounded-xl px-3 py-2 text-xs font-bold ${active ? "bg-violet-500/20 text-violet-200" : "bg-slate-800 text-slate-500"}`}>{label}</button>; }
function Switch({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) { return <button type="button" onClick={onClick} className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950 p-4 text-left"><span className="text-sm font-semibold text-slate-200">{label}</span><span className={`relative h-7 w-12 rounded-full transition ${active ? "bg-emerald-500" : "bg-slate-700"}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${active ? "left-6" : "left-1"}`} /></span></button>; }
function Empty({ text }: { text: string }) { return <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8 text-center text-slate-500">{text}</div>; }

function QueueCard({ item, onAction }: { item: ContentItem; onAction: (id: string, action: string, scheduled_for?: string) => void }) {
  const [date, setDate] = useState(item.scheduled_for ? item.scheduled_for.slice(0, 16) : "");
  const warning = String(item.metrics?.provider_warning || item.error_message || "");
  const visualPrompt = String(item.metrics?.visual_prompt || item.metrics?.visual_idea || "");
  return <article className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5"><div className="grid gap-5 xl:grid-cols-[1fr_320px]"><div><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-3 py-1 text-xs font-bold ${item.status === "approval_required" ? "bg-amber-500/15 text-amber-300" : item.status === "approved" ? "bg-emerald-500/15 text-emerald-300" : item.status === "publishing" ? "bg-blue-500/15 text-blue-300" : "bg-slate-800 text-slate-300"}`}>{item.status}</span>{(item.platforms || [item.channel]).map((platform) => <span key={platform} className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">{platform}</span>)}</div><h3 className="mt-3 text-lg font-black">{item.campaign_name || item.objective || "Untitled campaign"}</h3><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">{item.caption || "No caption"}</p>{item.hashtags?.length ? <p className="mt-3 text-sm text-violet-300">{item.hashtags.map((tag) => `#${tag.replace(/^#/, "")}`).join(" ")}</p> : null}{item.approval_notes ? <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950 p-4"><p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Creative Notes</p><p className="whitespace-pre-wrap text-xs leading-6 text-slate-300">{item.approval_notes}</p></div> : null}{visualPrompt ? <div className="mt-3 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4"><p className="mb-2 text-xs font-bold uppercase tracking-wide text-cyan-300">Design Prompt</p><p className="text-xs leading-6 text-cyan-100">{visualPrompt}</p></div> : null}{warning ? <div className="mt-3 flex gap-2 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs leading-5 text-amber-200"><AlertTriangle size={16} className="mt-0.5 shrink-0" />{warning}</div> : null}</div><div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950 p-4"><label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Schedule</label><input type="datetime-local" value={date} onChange={(event) => setDate(event.target.value)} className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm" /><div className="grid grid-cols-2 gap-2"><button onClick={() => onAction(item.id, "approve")} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold hover:bg-emerald-500"><CheckCircle2 className="mr-1 inline" size={14} />Approve</button><button onClick={() => onAction(item.id, "schedule", date)} className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold hover:bg-blue-500"><CalendarClock className="mr-1 inline" size={14} />Schedule</button><button onClick={() => onAction(item.id, "publish")} className="rounded-xl bg-violet-600 px-3 py-2 text-xs font-bold hover:bg-violet-500"><Send className="mr-1 inline" size={14} />Publish</button><button onClick={() => onAction(item.id, "reject")} className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300 hover:bg-red-500/15">Reject</button></div><p className="text-[11px] leading-5 text-slate-500">Publishing needs the Make publish webhook configured. Approval and scheduling are already handled in the dashboard.</p></div></div></article>;
}

function ConnectionCard({ connection }: { connection: Connection }) { const option = platformOptions.find((platform) => platform.id === connection.platform); const Icon = option?.icon || Megaphone; const connected = connection.connection_status === "connected"; return <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5"><div className="flex items-center justify-between"><Icon className="text-violet-300" size={24} /><span className={`rounded-full px-3 py-1 text-xs font-bold ${connected ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>{connection.connection_status}</span></div><h3 className="mt-4 text-lg font-black">{option?.label || connection.platform}</h3><p className="mt-1 text-sm text-slate-400">{connection.account_name || "No account selected"}</p><p className="mt-3 text-xs text-slate-500">{connection.health_status || "—"}</p></div>; }
function RunCard({ run }: { run: Run }) { return <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-bold text-white">{run.action}</h3><p className="mt-1 text-xs text-slate-500">{new Date(run.created_at).toLocaleString()}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${run.status === "failed" ? "bg-red-500/15 text-red-300" : run.status === "completed" || run.status === "approval_required" ? "bg-emerald-500/15 text-emerald-300" : "bg-slate-800 text-slate-300"}`}>{run.status}</span></div>{run.error_message && <p className="mt-3 text-xs text-amber-300">{run.error_message}</p>}</div>; }
