import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

const platforms = ["facebook", "instagram", "tiktok", "snapchat"];
function admin() { const u = process.env.NEXT_PUBLIC_SUPABASE_URL, k = process.env.SUPABASE_SECRET_KEY; if (!u || !k) throw new Error("Missing Supabase configuration"); return createClient(u, k); }
async function userContext() { const auth = await createServerClient(); const { data: { user } } = await auth.auth.getUser(); if (!user) return null; const s = admin(); const { data: profile } = await s.from("user_profiles").select("company_id,role,full_name,username,nickname").eq("user_id", user.id).maybeSingle(); if (!profile?.company_id) return null; return { user, profile, s }; }
function includesAny(text: string, words: string[]) { const t = text.toLowerCase(); return words.some((w) => t.includes(w)); }
function platformList(text: string) { const t = text.toLowerCase(); const found = platforms.filter((p) => t.includes(p) || (p === "facebook" && t.includes("فيس")) || (p === "instagram" && (t.includes("انستا") || t.includes("insta"))) || (p === "snapchat" && (t.includes("سناب") || t.includes("snap"))) || (p === "tiktok" && (t.includes("تيك") || t.includes("tik")))); return found.length ? found : ["facebook", "instagram"]; }
async function callGenerate(baseUrl: string, cookie: string, message: string, selectedPlatforms: string[]) { const res = await fetch(`${baseUrl}/api/marketing/generate`, { method: "POST", headers: { "Content-Type": "application/json", cookie }, body: JSON.stringify({ platforms: selectedPlatforms, objective: "marketing content from dashboard chat command", audience: "business owners and operations managers", content_type: "post", brief: message, creative_brief: message }) }); const data = await res.json().catch(() => ({})); if (!res.ok) throw new Error(data.error || "Marketing generation failed"); return data; }

export async function POST(req: NextRequest) {
  try {
    const ctx = await userContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized or company not configured" }, { status: 401 });
    const body = await req.json();
    const message = String(body.message || "").trim().slice(0, 2500);
    if (!message) return NextResponse.json({ error: "Message is required" }, { status: 400 });

    const selectedPlatforms = platformList(message);
    const wantsMarketing = includesAny(message, ["بوست", "post", "ماركت", "marketing", "فيس", "facebook", "انستا", "instagram", "سناب", "snap", "تيك", "tiktok", "صورة", "story", "ستوري", "اعلان", "إعلان"]);
    const now = new Date().toISOString();

    if (wantsMarketing) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
      const cookie = req.headers.get("cookie") || "";
      const generated = await callGenerate(baseUrl, cookie, message, selectedPlatforms);
      await ctx.s.from("ai_agent_runs").insert({ company_id: ctx.profile.company_id, agent_key: "ai_marketing", action: "chat_marketing_command", status: "approval_required", input: { message, platforms: selectedPlatforms }, output: { content_id: generated.item?.id, campaign_name: generated.item?.campaign_name, status: generated.item?.status }, completed_at: now });
      return NextResponse.json({ ok: true, kind: "marketing", message: `جهزتلك محتوى جديد عن: ${generated.item?.campaign_name || "طلبك"}. راجعه بكرت الموافقة واضغط OK & Post لما يعجبك.`, item: generated.item });
    }

    return NextResponse.json({ ok: true, kind: "assistant", message: "أنا AVERO Command Chat. فيك تقوللي: اعمل بوست اليوم على فيسبوك وانستغرام، أو جهز إعلان، أو حضّر ستوري. وأنا بحوّلها لأمر داخل النظام." });
  } catch (e) {
    console.error("Marketing chat command error", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Internal server error" }, { status: 500 });
  }
}
