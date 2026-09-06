import { createClient } from "@supabase/supabase-js";

const AVERO_COMPANY_ID = process.env.AVERO_INTERNAL_COMPANY_ID || "9fbdd617-fdc4-4c1d-b16b-b1d3118bf3d9";
const AVERO_KING_USER_ID = process.env.AVERO_KING_USER_ID || "1c5cfea6-a0d2-488f-90b3-3f6a1e5eaff2";

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
        generationConfig: { temperature: 0.75 },
      }),
    }
  );

  if (!response.ok) throw new Error("AI provider request failed");

  const json = await response.json();
  const text = json?.candidates?.[0]?.content?.parts
    ?.map((part: { text?: string }) => part.text || "")
    .join("")
    .trim();

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

function asArray(value: unknown) {
  return (Array.isArray(value) ? value : String(value || "").split(","))
    .map((item) => String(item).trim())
    .filter(Boolean)
    .slice(0, 12);
}

function safeString(value: unknown, fallback = "") {
  return String(value || fallback).trim();
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
      input: {
        source: "daily_content_cron",
        schedule: "daily_09_00_asia_riyadh",
        platforms: ["facebook", "instagram", "tiktok", "snapchat"],
        mode: "approval_queue",
      },
    })
    .select("id")
    .single();

  let outputText = "";

  try {
    const [{ data: profile }, { data: config }, { data: connections }] = await Promise.all([
      s
        .from("company_ai_profiles")
        .select("industry,business_description,products_services,target_audience,brand_voice,languages,locations,social_notes")
        .eq("company_id", AVERO_COMPANY_ID)
        .maybeSingle(),
      s
        .from("ai_agent_configs")
        .select("enabled,instructions,knowledge_scope,autonomy_mode")
        .eq("company_id", AVERO_COMPANY_ID)
        .eq("agent_key", "ai_marketing")
        .maybeSingle(),
      s
        .from("company_social_connections")
        .select("platform,connection_status,account_name,external_account_id,health_status")
        .eq("company_id", AVERO_COMPANY_ID)
        .eq("connection_status", "connected"),
    ]);

    if (!config?.enabled) {
      return Response.json({ error: "AI Marketing Department is disabled" }, { status: 409 });
    }

    const prompt = `You are Foxy, the AI Marketing Department for AVERO Business OS.\n\nCreate today's DAILY CONTENT PACK for approval only. Do not publish anything.\n\nCOMPANY PROFILE:\n${JSON.stringify(profile || {})}\n\nAGENT INSTRUCTIONS:\n${config.instructions || ""}\n\nCONNECTED SOCIAL CHANNELS:\n${JSON.stringify(connections || [])}\n\nTarget audience: business owners, restaurant owners, retail stores, operations managers, and teams who need to organize sales, inventory, employees, marketing, customer follow-up and AI assistants.\n\nCreate one complete multi-platform content pack for Facebook, Instagram, TikTok and Snapchat.\n\nInclude a publish-ready caption, hashtags, CTA, visual/image idea, short video/Reel/TikTok idea, story/status idea, carousel idea, and platform-specific notes.\n\nRules:\n- Keep it professional, modern, simple, premium and sales-focused.\n- Do not invent fake clients, fake numbers, fake prices, fake guarantees or fake results.\n- Mention how AVERO helps businesses organize operations, leads, inventory, employees, marketing and AI agents.\n- Make it ready for Omar/King Admin approval.\n- Output exactly one valid JSON object only. No Markdown. No code fences.\n\nShape exactly:\n{\"campaign_name\":\"AVERO Daily Content - short theme\",\"objective\":\"awareness_leads_and_trust\",\"audience\":\"business owners and operations managers\",\"content_type\":\"post\",\"platforms\":[\"facebook\",\"instagram\",\"tiktok\",\"snapchat\"],\"caption\":\"publish-ready caption\",\"hashtags\":[\"AVEROOS\",\"BusinessOS\"],\"visual_idea\":\"image/post idea\",\"video_idea\":\"short video/reel/tiktok idea\",\"story_idea\":\"story/status idea\",\"carousel_idea\":\"carousel idea\",\"ad_angle\":\"hook/angle\",\"call_to_action\":\"call to action\",\"suggested_budget\":null,\"currency\":\"SAR\",\"platform_notes\":{\"facebook\":\"\",\"instagram\":\"\",\"tiktok\":\"\",\"snapchat\":\"\"},\"needs_media\":true,\"approval_status\":\"pending\"}`;

    outputText = await generate(prompt);
    const generated = parseJsonObject(outputText);

    const payload = {
      company_id: AVERO_COMPANY_ID,
      created_by: AVERO_KING_USER_ID,
      campaign_name: safeString(generated.campaign_name, "AVERO Daily Content").slice(0, 180),
      objective: safeString(generated.objective, "awareness_leads_and_trust").slice(0, 180),
      audience: safeString(generated.audience, "business owners and operations managers").slice(0, 800),
      budget: generated.suggested_budget == null ? null : Number(generated.suggested_budget),
      currency: safeString(generated.currency, "SAR").slice(0, 12),
      creative_brief: "Daily automatic content pack generated by Foxy for AVERO Business OS. Pending King Admin approval before publishing.",
      channel: "multi_platform",
      platforms: asArray(generated.platforms),
      content_type: safeString(generated.content_type, "post").slice(0, 80),
      caption: safeString(generated.caption).slice(0, 8000),
      hashtags: asArray(generated.hashtags),
      status: "approval_required",
      approval_notes: [
        `Visual: ${safeString(generated.visual_idea)}`,
        `Video: ${safeString(generated.video_idea)}`,
        `Story: ${safeString(generated.story_idea)}`,
        `Carousel: ${safeString(generated.carousel_idea)}`,
      ].join("\n"),
      metrics: {
        source: "daily_content_cron",
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
      await s
        .from("ai_agent_runs")
        .update({
          status: "approval_required",
          output: { content_id: item.id, generated, status: item.status },
          completed_at: now,
        })
        .eq("id", runInsert.data.id);
    }

    return Response.json({ item, generated, run_id: runInsert.data?.id || null });
  } catch (error) {
    console.error(error, outputText);
    if (runInsert.data?.id) {
      await s
        .from("ai_agent_runs")
        .update({
          status: "failed",
          error_message: "Daily AI marketing generation failed",
          output: { raw: outputText },
          completed_at: now,
        })
        .eq("id", runInsert.data.id);
    }

    return Response.json({ error: "Daily AI marketing generation failed" }, { status: 502 });
  }
}
