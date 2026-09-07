import { createClient } from "@supabase/supabase-js";

const AVERO_COMPANY_ID = process.env.AVERO_INTERNAL_COMPANY_ID || "9fbdd617-fdc4-4c1d-b16b-b1d3118bf3d9";
const AVERO_KING_USER_ID = process.env.AVERO_KING_USER_ID || "1c5cfea6-a0d2-488f-90b3-3f6a1e5eaff2";
const VALID_PLATFORMS = ["facebook", "instagram", "tiktok", "snapchat"];

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Missing Supabase configuration");
  return createClient(url, key);
}

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET || process.env.AVERO_DAILY_CONTENT_SECRET;
  if (!secret) return false;
  const authorization = request.headers.get("authorization") || "";
  const bearer = authorization.replace(/^Bearer\s+/i, "").trim();
  const headerSecret = request.headers.get("x-avero-cron-secret") || "";
  return bearer === secret || headerSecret === secret;
}

async function generate(prompt: string) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Missing Gemini configuration");
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.75, responseMimeType: "application/json" },
      }),
    }
  );
  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`AI provider request failed (${response.status}) ${details.slice(0, 240)}`);
  }
  const json = await response.json();
  const text = json?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || "").join("").trim();
  if (!text) throw new Error("AI provider returned no content");
  return text;
}

function parseJsonObject(text: string) {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("AI output was not JSON");
  return JSON.parse(cleaned.slice(start, end + 1));
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

function fallbackDaily(brandKit: Record<string, unknown> | null, platforms: string[]) {
  const brand = safeString(brandKit?.brand_name, "AVERO OS");
  const slogan = safeString(brandKit?.slogan, "The Business Operating System");
  const hasLogo = Boolean(brandKit?.logo_data_url);
  return {
    campaign_name: `${brand} Daily Content - One System`,
    objective: "awareness_leads_and_trust",
    audience: safeString(brandKit?.target_audience, "business owners and operations managers"),
    content_type: "post",
    platforms,
    caption: `${brand} brings your business operations into one clear system.\n\nSales, CRM, inventory, HR, marketing, support and AI agents should not be scattered across tools and chats. With ${brand}, your team can work from one organized dashboard and make faster decisions every day.\n\n${slogan}\n\nWant to see how it fits your business? Send us a message.`,
    hashtags: ["AVEROOS", "BusinessOS", "POS", "CRM", "Inventory", "AIAgents", "BusinessAutomation"],
    visual_idea: `Create a premium dark SaaS branded post using ${brand} identity, dashboard panels, operations icons and AI agent accents. ${hasLogo ? "Use the uploaded logo from the Brand Kit." : "Keep a clean logo area."}`,
    video_idea: "Before/after reel: messy WhatsApp notes, Excel and manual follow-ups transform into one AVERO OS dashboard.",
    story_idea: "Story question: Is your business managed from one system? Yes / Not yet.",
    carousel_idea: "Slide 1: One OS. Slide 2: Sales. Slide 3: Inventory. Slide 4: AI Agents. Slide 5: Book a demo.",
    ad_angle: "One operating system for businesses that need clarity, control and growth.",
    call_to_action: "Message us to build your business operating system.",
    suggested_budget: null,
    currency: "SAR",
    platform_notes: {
      facebook: "Use as a clear educational awareness post.",
      instagram: "Best as a premium carousel or branded static post.",
      tiktok: "Use the before/after workflow video idea.",
      snapchat: "Use the story question for quick engagement.",
    },
    needs_media: true,
    approval_status: "pending",
    provider_fallback: true,
  };
}

export async function GET(request: Request) {
  return POST(request);
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized daily content request" }, { status: 401 });
  }

  const s = db();
  const now = new Date().toISOString();

  const runInsert = await s
    .from("ai_agent_runs")
    .insert({
      company_id: AVERO_COMPANY_ID,
      agent_key: "ai_marketing",
      action: "daily_content_pack",
      status: "running",
      input: { source: "daily_content_cron", schedule: "daily_09_00_asia_riyadh", mode: "approval_queue" },
    })
    .select("id")
    .single();

  let outputText = "";
  let providerWarning: string | null = null;

  try {
    const [{ data: profile }, { data: config }, { data: connections }, { data: brandKit }] = await Promise.all([
      s.from("company_ai_profiles").select("industry,business_description,products_services,target_audience,brand_voice,languages,locations,social_notes").eq("company_id", AVERO_COMPANY_ID).maybeSingle(),
      s.from("ai_agent_configs").select("enabled,instructions,knowledge_scope,autonomy_mode").eq("company_id", AVERO_COMPANY_ID).eq("agent_key", "ai_marketing").maybeSingle(),
      s.from("company_social_connections").select("platform,connection_status,account_name,external_account_id,health_status").eq("company_id", AVERO_COMPANY_ID).eq("connection_status", "connected"),
      s.from("company_marketing_brand_kits").select("*").eq("company_id", AVERO_COMPANY_ID).maybeSingle(),
    ]);

    if (!config?.enabled) {
      return Response.json({ error: "AI Marketing Department is disabled" }, { status: 409 });
    }

    const platforms = asArray(brandKit?.default_platforms, ["facebook", "instagram", "tiktok", "snapchat"]).filter((p) => VALID_PLATFORMS.includes(p));
    const prompt = `You are Foxy, the AI Marketing Department for AVERO Business OS. Create today's daily content pack for approval only. Do not publish anything.\n\nCOMPANY PROFILE:\n${JSON.stringify(profile || {})}\n\nBRAND KIT:\n${JSON.stringify({ ...(brandKit || {}), logo_data_url: brandKit?.logo_data_url ? "uploaded_logo_available" : null })}\n\nAGENT INSTRUCTIONS:\n${config.instructions || ""}\n\nCONNECTED SOCIAL CHANNELS:\n${JSON.stringify(connections || [])}\n\nCreate one complete multi-platform content pack for: ${platforms.join(", ")}.\n\nInclude caption, hashtags, CTA, visual/image idea, short video/Reel/TikTok idea, story/status idea, carousel idea and platform notes.\n\nRules:\n- Use the Brand Kit colors, slogan, style and uploaded logo when available.\n- Keep it professional, modern, premium SaaS, simple and credible.\n- Do not invent fake clients, fake numbers, fake prices, fake guarantees or fake results.\n- Make it ready for Omar/King Admin approval.\n- Output exactly one valid JSON object only.\n\nShape exactly:\n{\"campaign_name\":\"AVERO Daily Content - short theme\",\"objective\":\"awareness_leads_and_trust\",\"audience\":\"business owners and operations managers\",\"content_type\":\"post\",\"platforms\":[\"facebook\",\"instagram\",\"tiktok\",\"snapchat\"],\"caption\":\"publish-ready caption\",\"hashtags\":[\"AVEROOS\",\"BusinessOS\"],\"visual_idea\":\"image/post idea\",\"video_idea\":\"short video/reel/tiktok idea\",\"story_idea\":\"story/status idea\",\"carousel_idea\":\"carousel idea\",\"ad_angle\":\"hook/angle\",\"call_to_action\":\"call to action\",\"suggested_budget\":null,\"currency\":\"SAR\",\"platform_notes\":{\"facebook\":\"\",\"instagram\":\"\",\"tiktok\":\"\",\"snapchat\":\"\"},\"needs_media\":true,\"approval_status\":\"pending\"}`;

    let generated: Record<string, unknown>;
    try {
      outputText = await generate(prompt);
      generated = parseJsonObject(outputText);
    } catch (error) {
      providerWarning = error instanceof Error ? error.message : "AI provider failed";
      generated = fallbackDaily(brandKit as Record<string, unknown> | null, platforms);
    }

    const payload = {
      company_id: AVERO_COMPANY_ID,
      created_by: AVERO_KING_USER_ID,
      campaign_name: safeString(generated.campaign_name, "AVERO Daily Content").slice(0, 180),
      objective: safeString(generated.objective, "awareness_leads_and_trust").slice(0, 180),
      audience: safeString(generated.audience, "business owners and operations managers").slice(0, 800),
      budget: generated.suggested_budget == null ? null : Number(generated.suggested_budget),
      currency: safeString(generated.currency, "SAR").slice(0, 12),
      creative_brief: "Daily automatic content pack generated by Foxy. Pending King Admin approval before publishing.",
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
        providerWarning ? `Provider warning: ${providerWarning.slice(0, 500)}` : "",
      ].filter(Boolean).join("\n"),
      metrics: {
        source: "daily_content_cron",
        brand_kit_used: Boolean(brandKit),
        logo_available: Boolean(brandKit?.logo_data_url),
        provider_warning: providerWarning,
        ad_angle: generated.ad_angle || null,
        visual_idea: generated.visual_idea || null,
        video_idea: generated.video_idea || null,
        story_idea: generated.story_idea || null,
        carousel_idea: generated.carousel_idea || null,
        call_to_action: generated.call_to_action || null,
        platform_notes: generated.platform_notes || {},
        needs_media: Boolean(generated.needs_media),
        approval_status: "pending",
      },
      updated_at: now,
    };

    const { data: item, error } = await s.from("marketing_content_queue").insert(payload).select("*").single();
    if (error) throw error;

    if (runInsert.data?.id) {
      await s.from("ai_agent_runs").update({
        status: "approval_required",
        error_message: providerWarning,
        output: { content_id: item.id, generated, status: item.status, provider_warning: providerWarning },
        completed_at: now,
      }).eq("id", runInsert.data.id);
    }

    return Response.json({ item, generated, run_id: runInsert.data?.id || null, warning: providerWarning });
  } catch (error) {
    console.error("Daily marketing hard error", error, outputText);
    if (runInsert.data?.id) {
      await s.from("ai_agent_runs").update({
        status: "failed",
        error_message: error instanceof Error ? error.message : "Daily content hard error",
        output: { raw: outputText },
        completed_at: now,
      }).eq("id", runInsert.data.id);
    }
    return Response.json({ error: error instanceof Error ? error.message : "Daily AI marketing generation failed" }, { status: 500 });
  }
}
