"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "./Sidebar";
import DashboardHeader from "./DashboardHeader";
import { CheckCircle2, Clock3, Image as ImageIcon, Loader2, Send, Sparkles } from "lucide-react";

type Item = {
  id: string;
  campaign_name?: string | null;
  caption?: string | null;
  status?: string | null;
  platforms?: string[] | null;
  media_url?: string | null;
  error_message?: string | null;
  created_at?: string | null;
  published_at?: string | null;
  metrics?: Record<string, any> | null;
};

type Settings = {
  mode: "approval" | "automatic";
  posts_per_day: number;
  images_per_day: number;
  videos_per_day: number;
  stories_per_day: number;
  posting_times: string[];
  timezone: string;
  enabled: boolean;
};

const defaultSettings: Settings = {
  mode: "automatic",
  posts_per_day: 1,
  images_per_day: 1,
  videos_per_day: 0,
  stories_per_day: 0,
  posting_times: ["10:00"],
  timezone: "Asia/Riyadh",
  enabled: true,
};

export default function FoxyMarketingLive() {
  const [items, setItems] = useState<Item[]>([]);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [platforms, setPlatforms] = useState<string[]>(["facebook", "instagram"]);
  const [brief, setBrief] = useState("Create a simple AVERO OS awareness post for business owners. Keep it clean, premium and easy to understand.");
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [note, setNote] = useState("");

  async function load() {
    try {
      const [contentRes, scheduleRes] = await Promise.all([
        fetch("/api/marketing/content", { cache: "no-store" }),
        fetch("/api/marketing/schedule", { cache: "no-store" }),
      ]);
      if (contentRes.ok) setItems((await contentRes.json()).items || []);
      if (scheduleRes.ok) {
        const json = await scheduleRes.json();
        if (json.settings) setSettings(json.settings);
      }
    } catch {}
  }

  useEffect(() => {
    load();
  }, []);

  const preview = useMemo(
    () => items.find((item) => !["published", "publishing", "rejected"].includes(String(item.status || ""))) || items[0],
    [items]
  );

  function togglePlatform(platform: string) {
    setPlatforms((current) =>
      current.includes(platform)
        ? current.length === 1
          ? current
          : current.filter((item) => item !== platform)
        : [...current, platform]
    );
  }

  async function generatePreview() {
    setGenerating(true);
    setNote("");
    try {
      const response = await fetch("/api/marketing/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platforms,
          objective: "First AVERO OS publishing test",
          audience: "Business owners and operations managers",
          content_type: "post",
          creative_brief: brief,
          currency: "SAR",
        }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error || "Could not create preview");
      const contentId = json?.item?.id;
      if (!contentId) throw new Error("Foxy created the post but could not prepare its visual.");

      setNote("Foxy wrote the post. Now creating a custom AI visual...");
      const mediaResponse = await fetch(`/api/marketing/content/${contentId}/media`, {
        method: "POST",
      });
      const mediaJson = await mediaResponse.json().catch(() => ({}));
      if (!mediaResponse.ok) throw new Error(mediaJson.error || "Could not create the post image");

      setNote(
        mediaJson.fallback
          ? "Preview ready. Foxy used the safe fallback visual because AI image generation was unavailable."
          : "Preview ready. Foxy created a custom visual for this exact post."
      );
      await load();
    } catch (error) {
      setNote(error instanceof Error ? error.message : "Could not create preview");
    } finally {
      setGenerating(false);
    }
  }

  async function publishNow() {
    if (!preview) return;
    setPublishing(true);
    setNote("");
    try {
      const response = await fetch(`/api/marketing/content/${preview.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve_publish",
          platforms: preview.platforms?.length ? preview.platforms : platforms,
        }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error || "Publishing failed");
      setNote(json.message || "Publish request completed.");
      await load();
    } catch (error) {
      setNote(error instanceof Error ? error.message : "Publishing failed");
    } finally {
      setPublishing(false);
    }
  }

  const status = settings.enabled ? "Foxy is active" : "Foxy is paused";
  const scheduleTime = settings.posting_times?.[0] || "10:00";

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Sidebar />
      <div className="ml-64 min-h-screen">
        <DashboardHeader />

        <main className="p-4 md:p-7">
          <div className="mx-auto max-w-5xl space-y-5">
            <section className="flex flex-col gap-4 rounded-3xl border border-violet-400/20 bg-slate-900/70 p-5 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-violet-500/10 text-4xl">🦊</div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[.2em] text-violet-300">Foxy Marketing</p>
                  <h1 className="mt-1 text-2xl font-black">First Publishing Test</h1>
                  <p className="mt-1 text-sm text-slate-400">Create one post, preview it, then publish it.</p>
                </div>
              </div>

              <div className="rounded-2xl bg-slate-950/80 px-4 py-3 text-sm">
                <div className="flex items-center gap-2 font-bold text-emerald-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  {status}
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                  <Clock3 size={13} />
                  Auto schedule: {scheduleTime} · {settings.timezone || "Asia/Riyadh"}
                </div>
              </div>
            </section>

            {note && (
              <div className="rounded-2xl border border-violet-500/25 bg-violet-500/10 px-4 py-3 text-sm text-violet-100">
                {note}
              </div>
            )}

            <section className="grid gap-5 lg:grid-cols-[.85fr_1.15fr]">
              <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5">
                <div className="flex items-center gap-2">
                  <Sparkles size={18} className="text-violet-300" />
                  <div>
                    <p className="text-xs font-black uppercase tracking-[.16em] text-violet-300">Step 1</p>
                    <h2 className="text-lg font-black">Create the post</h2>
                  </div>
                </div>

                <label className="mt-5 block text-xs font-bold text-slate-400">Publish to</label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {["facebook", "instagram"].map((platform) => {
                    const active = platforms.includes(platform);
                    return (
                      <button
                        key={platform}
                        onClick={() => togglePlatform(platform)}
                        className={`rounded-xl border px-3 py-3 text-sm font-black transition ${
                          active
                            ? "border-cyan-400/50 bg-cyan-400/10 text-cyan-200"
                            : "border-slate-800 bg-slate-950 text-slate-500"
                        }`}
                      >
                        {active ? "✓ " : ""}
                        {platform === "facebook" ? "Facebook" : "Instagram"}
                      </button>
                    );
                  })}
                </div>

                <label className="mt-5 block text-xs font-bold text-slate-400">What should Foxy post?</label>
                <textarea
                  value={brief}
                  onChange={(event) => setBrief(event.target.value)}
                  rows={5}
                  className="mt-2 w-full resize-none rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm leading-6 text-slate-200 outline-none focus:border-violet-400/50"
                  placeholder="Write one simple idea for the post..."
                />

                <button
                  onClick={generatePreview}
                  disabled={generating || !brief.trim()}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-500 px-4 py-3.5 text-sm font-black transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {generating ? <Loader2 size={17} className="animate-spin" /> : <Sparkles size={17} />}
                  {generating ? "Foxy is creating post + image..." : "Generate Preview"}
                </button>

                <p className="mt-3 text-center text-[11px] leading-5 text-slate-600">
                  Foxy writes the post and creates a matching branded image. Nothing is published yet.
                </p>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5">
                <div className="flex items-center gap-2">
                  <ImageIcon size={18} className="text-cyan-300" />
                  <div>
                    <p className="text-xs font-black uppercase tracking-[.16em] text-cyan-300">Step 2</p>
                    <h2 className="text-lg font-black">Preview & publish</h2>
                  </div>
                </div>

                {preview ? (
                  <div className="mt-5 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/70">
                    <div
                      className="aspect-square bg-slate-900 bg-cover bg-center"
                      style={preview.media_url ? { backgroundImage: `url("${preview.media_url}")` } : undefined}
                    >
                      {!preview.media_url && (
                        <div className="grid h-full place-items-center text-center text-slate-600">
                          <div>
                            <ImageIcon className="mx-auto mb-2" size={34} />
                            <p className="text-xs">Foxy is preparing a custom image for this post.</p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-base font-black">{preview.campaign_name || "Foxy Post"}</p>
                          <p className="mt-1 text-[10px] uppercase tracking-[.12em] text-slate-500">
                            {String(preview.status || "preview").replaceAll("_", " ")}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          {(preview.platforms || []).map((platform) => (
                            <span key={platform} className="rounded-lg bg-slate-800 px-2 py-1 text-[10px] text-slate-400">
                              {platform === "facebook" ? "FB" : platform === "instagram" ? "IG" : platform}
                            </span>
                          ))}
                        </div>
                      </div>

                      <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                        {preview.caption || "Foxy is preparing the caption."}
                      </p>

                      {preview.error_message && (
                        <p className="mt-4 rounded-xl bg-rose-500/10 px-3 py-2 text-xs leading-5 text-rose-300">
                          {preview.error_message}
                        </p>
                      )}

                      {String(preview.status) === "published" ? (
                        <div className="mt-5 flex items-center justify-center gap-2 rounded-2xl bg-emerald-500/10 px-4 py-3.5 text-sm font-black text-emerald-300">
                          <CheckCircle2 size={18} />
                          Published successfully
                        </div>
                      ) : (
                        <button
                          onClick={publishNow}
                          disabled={publishing}
                          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-4 py-3.5 text-sm font-black text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {publishing ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
                          {publishing ? "Publishing..." : "Publish Now"}
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 grid min-h-[460px] place-items-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 px-6 text-center">
                    <div>
                      <Sparkles className="mx-auto mb-3 text-slate-700" size={36} />
                      <p className="font-bold text-slate-400">No preview yet</p>
                      <p className="mt-2 text-xs leading-5 text-slate-600">
                        Generate your first post from the left. It will appear here before anything is published.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900/40 px-4 py-3 text-xs text-slate-500">
              <span className="font-bold text-slate-300">Simple mode:</span> Foxy handles the caption, visual preparation and publisher. Advanced marketing tools stay hidden for now.
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
