import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

const VALID_PLATFORMS = ["facebook", "instagram", "tiktok", "snapchat"];

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Missing Supabase configuration");
  return createClient(url, key);
}

function includesAny(text: string, words: string[]) {
  const t = text.toLowerCase();
  return words.some((word) => t.includes(word));
}

function platformList(text: string) {
  const t = text.toLowerCase();
  const found = VALID_PLATFORMS.filter(
    (platform) =>
      t.includes(platform) ||
      (platform === "facebook" && (t.includes("فيس") || t.includes("فايس"))) ||
      (platform === "instagram" && (t.includes("انستا") || t.includes("insta"))) ||
      (platform === "snapchat" && (t.includes("سناب") || t.includes("snap"))) ||
      (platform === "tiktok" && (t.includes("تيك") || t.includes("tik"))),
  );
  return found.length ? found : ["facebook", "instagram"];
}

function asArray(value: unknown, fallback: string[] = []) {
  const raw = Array.isArray(value) ? value : String(value || "").split(",");
  const items = raw.map((item) => String(item).trim()).filter(Boolean).slice(0, 12);
  return items.length ? items : fallback;
}

function safeString(value: unknown, fallback = "") {
  const text = String(value || fallback).trim();
  return text || fallback;
}

function fallbackDraft(input: { brandName: string; message: string; platforms: string[]; hasLogo: boolean }) {
  const brand = input.brandName || "AVERO OS";
  return {
    campaign_name: `${brand} Daily Post`,
    objective: "daily awareness and leads",
    audience: "business owners and operations managers",
    content_type: "post",
    platforms: input.platforms,
    caption: `${brand} is built to make business operations easier.\n\nFrom leads and CRM to POS, inventory, HR, marketing and AI agents, your team can work from one clean operating system instead of scattered tools.\n\nTell us what part of your business you want to automate first.`,
    hashtags: ["AVEROOS", "BusinessOS", "AI", "CRM", "POS", "Automation"],
    visual_idea: `${input.hasLogo ? "Use the uploaded AVERO logo" : "Use AVERO dark/cyan identity"}. Premium dark SaaS visual showing one command turning into content, CRM, POS and AI agents.` ,
    video_idea: "Short before/after reel: messy business workflow becomes one AVERO OS command center.",
    story_idea: "Story question: What is harder in your business today? Sales / Inventory / Team / Marketing.",
    carousel_idea: "4 slides: The problem, the command chat, AI departments, publish/track result.",
    call_to_action: "Message us to see AVERO OS in action.",
    needs_media: true,
  };
}

function parseJsonObject(text: string) {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("AI returned text, not JSON");
  return JSON.parse(cleaned.slice(start, end + 1));
}

async function geminiJson(prompt: string) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("AI key is not configured yet");
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.68, responseMimeType: "application/json" },
    }),
  });
  if (!response.ok) throw new Error(`AI provider failed: ${response.status}`);
  const json = await response.json();
  const text = json?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || "").join("").trim();
  if (!text) throw new Error("AI returned empty content");
  return parseJsonObject(text);
}

export async function POST(req: NextRequest) {
  try {
    const auth = await createServerClient();
    const { data: { user } } = await auth.auth.getUser();
    if (!user) return NextResponse.json({ error: "سجّل دخولك أولاً." }, { status: 401 });

    const body = await req.json();
    const message = String(body.message || "").trim().slice(0, 2500);
    if (!message) return NextResponse.json({ error: "اكتب أمر للداشبورد." }, { status: 400 });

    const s = admin();
    const { data: profile } = await s.from("user_profiles").select("company_id,role,full_name,username,nickname").eq("user_id", user.id).maybeSingle();
    if (!profile?.company_id) return NextResponse.json({ error: "حسابك مش مربوط بشركة بعد." }, { status: 409 });

    const wantsMarketing = includesAny(message, ["بوست", "post", "ماركت", "marketing", "فيس", "facebook", "انستا", "instagram", "سناب", "snap", "تيك", "tiktok", "صورة", "story", "ستوري", "اعلان", "إعلان", "نزل", "نزّل"]);
    if (!wantsMarketing) {
      return NextResponse.json({ ok: true, kind: "assistant", message: "أنا AVERO Command Chat. احكيلي طبيعي: اعملي بوست اليوم على فيسبوك وانستغرام، أو حضّرلي ستوري، أو جهز إعلان." });
    }

    const platforms = platformList(message);
    const [{ data: brandKit }, { data: companyBrain }, { data: config }, { data: worker }] = await Promise.all([
      s.from("company_marketing_brand_kits").select("*").eq("company_id", profile.company_id).maybeSingle(),
      s.from("company_ai_profiles").select("industry,business_description,products_services,target_audience,brand_voice,languages,locations,social_notes").eq("company_id", profile.company_id).maybeSingle(),
      s.from("ai_agent_configs").select("enabled,autonomy_mode,instructions").eq("company_id", profile.company_id).eq("agent_key", "ai_marketing").maybeSingle(),
      s.from("ai_agent_workers").select("worker_key,worker_name,role_title,instructions").eq("company_id", profile.company_id).eq("boss_agent_key", "ai_marketing").eq("worker_key", "content_planner").eq("status", "active").maybeSingle(),
    ]);

    if (!config?.enabled) return NextResponse.json({ error: "Foxy Marketing مش مفعّل لهالشركة. فعّله من Client Launch أو الصلاحيات." }, { status: 409 });

    const brandName = safeString(brandKit?.brand_name, "AVERO OS");
    const hasLogo = Boolean(brandKit?.logo_data_url);
    const prompt = `You are AVERO Command Chat controlling Foxy Marketing. The user gives a natural command. Create one approval-ready marketing draft. Be creative and out-of-the-box, but do not invent fake prices, clients, guarantees or results.\n\nUser command: ${message}\n\nCompany brain: ${JSON.stringify(companyBrain || {})}\nBrand kit: ${JSON.stringify({ ...(brandKit || {}), logo_data_url: hasLogo ? "uploaded_logo_available" : null })}\nWorker: ${JSON.stringify(worker || { worker_name: "Pulse", role_title: "Trend & Ideas Specialist" })}\nPlatforms: ${platforms.join(", ")}\n\nReturn exactly valid JSON:\n{\"campaign_name\":\"short title\",\"caption\":\"ready caption\",\"hashtags\":[\"tag\"],\"visual_idea\":\"image design idea\",\"video_idea\":\"short video idea\",\"story_idea\":\"story idea\",\"carousel_idea\":\"carousel idea\",\"call_to_action\":\"CTA\",\"platforms\":[\"facebook\",\"instagram\"],\"content_type\":\"post\",\"needs_media\":true}`;

    let generated: Record<string, unknown>;
    let warning: string | null = null;
    try {
      generated = await geminiJson(prompt);
    } catch (error) {
      warning = error instanceof Error ? error.message : "AI fallback used";
      generated = fallbackDraft({ brandName, message, platforms, hasLogo });
    }

    const now = new Date().toISOString();
    const payload = {
      company_id: profile.company_id,
      created_by: user.id,
      campaign_name: safeString(generated.campaign_name, `${brandName} Content`).slice(0, 180),
      objective: "chat_command_marketing",
      audience: safeString(companyBrain?.target_audience, "business owners and operations managers").slice(0, 800),
      currency: "SAR",
      creative_brief: message,
      channel: platforms.length > 1 ? "multi_platform" : platforms[0],
      platforms: asArray(generated.platforms, platforms).filter((p) => VALID_PLATFORMS.includes(p)),
      content_type: safeString(generated.content_type, "post").slice(0, 80),
      caption: safeString(generated.caption).slice(0, 8000),
      hashtags: asArray(generated.hashtags, ["AVEROOS", "BusinessOS"]),
      status: "approval_required",
      approval_notes: [
        `Visual: ${safeString(generated.visual_idea)}`,
        `Video: ${safeString(generated.video_idea)}`,
        `Story: ${safeString(generated.story_idea)}`,
        `Carousel: ${safeString(generated.carousel_idea)}`,
        warning ? `Note: ${warning}` : "",
      ].filter(Boolean).join("\n"),
      metrics: {
        source: "command_chat",
        boss_agent: "Foxy",
        worker_key: "content_planner",
        worker_name: worker?.worker_name || "Pulse",
        command: message,
        visual_idea: generated.visual_idea || null,
        video_idea: generated.video_idea || null,
        story_idea: generated.story_idea || null,
        carousel_idea: generated.carousel_idea || null,
        call_to_action: generated.call_to_action || null,
        needs_media: generated.needs_media !== false,
        provider_warning: warning,
      },
      updated_at: now,
    };

    const { data: item, error } = await s.from("marketing_content_queue").insert(payload).select("*").single();
    if (error) return NextResponse.json({ error: `ما قدرت أحفظ المحتوى: ${error.message}` }, { status: 500 });

    await s.from("ai_agent_runs").insert({
      company_id: profile.company_id,
      agent_key: "ai_marketing",
      action: "command_chat_generate_post",
      status: "approval_required",
      input: { message, platforms, worker_key: "content_planner", worker_name: worker?.worker_name || "Pulse" },
      output: { content_id: item.id, campaign_name: item.campaign_name, status: item.status },
      completed_at: now,
    });

    return NextResponse.json({
      ok: true,
      kind: "marketing",
      message: `جهزتلك بوست جديد: ${item.campaign_name}. فوت على Foxy وشوف كرت الموافقة، وإذا عجبك كبس Publish Now.`,
      item,
      warning,
    });
  } catch (error) {
    console.error("Marketing chat command error", error);
    return NextResponse.json({ error: "ما قدرت نفّذ الأمر. جرّب صيغة أبسط مثل: اعملي بوست اليوم على فيسبوك وانستغرام." }, { status: 500 });
  }
}
