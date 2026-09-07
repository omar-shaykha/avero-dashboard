import { createClient } from "@supabase/supabase-js";
import { canAccess, getAuthorizationContext, isKingAdmin } from "@/lib/auth/authorization";

const VALID_PLATFORMS = ["facebook", "instagram", "tiktok", "snapchat"];

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Missing Supabase configuration");
  return createClient(url, key);
}

async function generate(prompt: string) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Missing Gemini configuration");
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.72, responseMimeType: "application/json" },
    }),
  });
  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`AI provider request failed (${response.status}) ${details.slice(0, 240)}`);
  }
  const json = await response.json();
  const text = json?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || "").join("").trim();
  if (!text) throw new Error("AI provider returned no content");
  return text;
}

function asArray(value: unknown, fallback: string[] = []) {
  const raw = Array.isArray(value) ? value : String(value || "").split(",");
  const items = raw.map((item) => String(item).trim()).filter(Boolean).slice(0, 12);
  return items.length ? items : fallback;
}

function parseJsonObject(text: string) {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("AI output was not JSON");
  return JSON.parse(cleaned.slice(start, end + 1));
}

function safeString(value: unknown, fallback = "") {
  const text = String(value || fallback).trim();
  return text || fallback;
}

function cleanBudget(value: unknown) {
  if (value === "" || value == null) return null;
  const next = Number(value);
  return Number.isFinite(next) ? next : null;
}

function fallbackContent(input: {
  brandName: string;
  slogan: string;
  objective: string;
  audience: string;
  brief: string;
  platforms: string[];
  contentType: string;
  hasLogo: boolean;
}) {
  const brand = input.brandName || "AVERO OS";
  const logoLine = input.hasLogo ? "Use the uploaded brand logo clearly in the visual." : "Leave clean space for the brand logo once uploaded.";
  const caption = `${brand} helps businesses organize daily operations from one place.\n\nInstead of scattered tools, missed leads, manual follow-ups and unclear inventory, your team gets a smarter operating system for sales, CRM, inventory, marketing, HR, support and AI agents.\n\n${input.slogan ? `${input.slogan}\n\n` : ""}Ready to run your business with more control and less chaos?`;
  return {
    campaign_name: `${brand} Daily Content - Business Control`,
    objective: input.objective,
    audience: input.audience,
    content_type: input.contentType,
    platforms: input.platforms,
    caption,
    hashtags: ["AVEROOS", "BusinessOS", "AI", "CRM", "POS", "BusinessAutomation"],
    visual_idea: `Premium dark SaaS post with dashboard cards, AI agents, POS, CRM and inventory icons. ${logoLine}`,
    video_idea: "Short reel: show a messy business workflow turning into one clean AVERO OS dashboard with AI agents handling sales, marketing and operations.",
    story_idea: "Story poll: Are your leads, inventory and team tasks managed from one place? Yes / Not yet.",
    carousel_idea: "5 slides: Problem, One OS, Sales + CRM, Inventory + Team, Call to action.",
    ad_angle: "One operating system for businesses that want less chaos and more control.",
    call_to_action: "Message us to see how AVERO OS can fit your business.",
    platform_notes: {
      facebook: "Use as an awareness post with direct CTA.",
      instagram: "Use as a premium carousel or branded static post.",
      tiktok: "Turn the video idea into a quick before/after operations reel.",
      snapchat: "Use the story idea as a quick engagement snap.",
    },
    needs_media: true,
    provider_fallback: true,
  };
}

export async function POST(request: Request) {
  try {
    const ctx = await getAuthorizationContext();
    if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (!(isKingAdmin(ctx) || canAccess(ctx, "ai_marketing", "marketing.manage"))) return Response.json({ error: "Forbidden" }, { status: 403 });
    const companyId = ctx.profile.company_id;
    if (!companyId) return Response.json({ error: "Company not configured" }, { status: 409 });

    const body = await request.json();
    const s = db();
    const [{ data: brandKit }] = await Promise.all([
      s.from("company_marketing_brand_kits").select("*").eq("company_id", companyId).maybeSingle(),
    ]);

    const defaultPlatforms = asArray(brandKit?.default_platforms, ["facebook", "instagram"]);
    const platforms = asArray(body.platforms, defaultPlatforms).filter((p) => VALID_PLATFORMS.includes(p));
    const objective = String(body.objective || "brand awareness and qualified leads").slice(0, 180);
    const audience = String(body.audience || brandKit?.target_audience || "business owners and operations managers").slice(0, 800);
    const contentType = String(body.content_type || "post").slice(0, 80);
    const brief = String(body.creative_brief || body.brief || "Create a professional branded content idea for today based on the brand kit and company profile.").slice(0, 4000);
    if (!platforms.length) return Response.json({ error: "Choose at least one platform" }, { status: 400 });

    const [{ data: profile }, { data: config }, { data: connections }] = await Promise.all([
      s.from("company_ai_profiles").select("industry,business_description,products_services,target_audience,brand_voice,languages,locations,social_notes").eq("company_id", companyId).maybeSingle(),
      s.from("ai_agent_configs").select("enabled,instructions,knowledge_scope,autonomy_mode").eq("company_id", companyId).eq("agent_key", "ai_marketing").maybeSingle(),
      s.from("company_social_connections").select("platform,connection_status,account_name,health_status").eq("company_id", companyId).in("platform", platforms),
    ]);

    if (!config?.enabled) return Response.json({ error: "AI Marketing Department is disabled" }, { status: 409 });

    const brandName = safeString(brandKit?.brand_name || profile?.business_description?.toString().split(" ").slice(0, 2).join(" "), "AVERO OS");
    const hasLogo = Boolean(brandKit?.logo_data_url);
    const prompt = `You are Foxy, the AI Marketing Department for exactly one tenant company. Use the company profile and brand kit. Create content for approval only. Do not publish anything.\n\nCOMPANY PROFILE:\n${JSON.stringify(profile || {})}\n\nBRAND KIT:\n${JSON.stringify({ ...(brandKit || {}), logo_data_url: hasLogo ? "uploaded_logo_available" : null })}\n\nAGENT INSTRUCTIONS:\n${config.instructions || ""}\n\nCONNECTED CHANNEL STATUS:\n${JSON.stringify(connections || [])}\n\nCAMPAIGN REQUEST:\nPlatforms: ${platforms.join(", ")}\nObjective: ${objective}\nAudience: ${audience}\nContent type: ${contentType}\nBudget: ${String(body.budget || "")} ${String(body.currency || "SAR")}\nBrief: ${brief}\n\nRules:\n- Keep it professional, modern, clear and credible.\n- If a logo is available, mention how to use it in the visual idea.\n- Do not invent fake clients, fake numbers, fake prices, fake guarantees or fake results.\n- Include a strong design direction so the dashboard can generate or build a visual later.\n- Return exactly valid JSON and nothing else.\n\nShape:\n{\"campaign_name\":\"short name\",\"objective\":\"...\",\"audience\":\"...\",\"content_type\":\"post|story|cover|carousel|reel\",\"platforms\":[\"facebook\",\"instagram\"],\"caption\":\"main caption ready to publish\",\"hashtags\":[\"tag1\",\"tag2\"],\"platform_notes\":{\"facebook\":\"...\",\"instagram\":\"...\",\"tiktok\":\"...\",\"snapchat\":\"...\"},\"ad_angle\":\"...\",\"visual_idea\":\"...\",\"video_idea\":\"...\",\"story_idea\":\"...\",\"carousel_idea\":\"...\",\"call_to_action\":\"...\",\"needs_media\":true}`;

    const runInsert = await s.from("ai_agent_runs").insert({
      company_id: companyId,
      agent_key: "ai_marketing",
      action: "generate_campaign",
      status: "running",
      input: { platforms, objective, audience, content_type: contentType, budget: body.budget || null, brief, brand_kit_used: Boolean(brandKit), logo_used: hasLogo },
    }).select("id").single();

    let outputText = "";
    let providerWarning: string | null = null;
    let generated: Record<string, unknown>;

    try {
      outputText = await generate(prompt);
      generated = parseJsonObject(outputText);
    } catch (error) {
      providerWarning = error instanceof Error ? error.message : "AI provider failed";
      generated = fallbackContent({
        brandName,
        slogan: safeString(brandKit?.slogan),
        objective,
        audience,
        brief,
        platforms,
        contentType,
        hasLogo,
      });
    }

    const now = new Date().toISOString();
    const payload = {
      company_id: companyId,
      created_by: ctx.user.id,
      campaign_name: safeString(generated.campaign_name, objective).slice(0, 180),
      objective: safeString(generated.objective, objective).slice(0, 180),
      audience: safeString(generated.audience, audience).slice(0, 800),
      budget: cleanBudget(body.budget),
      currency: safeString(body.currency, "SAR").slice(0, 12),
      creative_brief: brief,
      channel: platforms.length > 1 ? "multi_platform" : platforms[0],
      platforms: asArray(generated.platforms, platforms).filter((p) => VALID_PLATFORMS.includes(p)),
      content_type: safeString(generated.content_type, contentType).slice(0, 80),
      caption: safeString(generated.caption).slice(0, 8000),
      hashtags: asArray(generated.hashtags, ["AVEROOS", "BusinessOS"]),
      status: config.autonomy_mode === "automatic" ? "approved" : "approval_required",
      approval_notes: [
        `Visual: ${safeString(generated.visual_idea)}`,
        `Video: ${safeString(generated.video_idea)}`,
        `Story: ${safeString(generated.story_idea)}`,
        `Carousel: ${safeString(generated.carousel_idea)}`,
        providerWarning ? `Provider warning: ${providerWarning.slice(0, 500)}` : "",
      ].filter(Boolean).join("\n"),
      metrics: {
        source: "dashboard_generate",
        brand_kit_used: Boolean(brandKit),
        logo_available: hasLogo,
        provider_warning: providerWarning,
        ad_angle: generated.ad_angle || null,
        visual_idea: generated.visual_idea || null,
        video_idea: generated.video_idea || null,
        story_idea: generated.story_idea || null,
        carousel_idea: generated.carousel_idea || null,
        call_to_action: generated.call_to_action || generated.cta || null,
        platform_notes: generated.platform_notes || {},
        needs_media: generated.needs_media !== false,
        visual_prompt: `${safeString(generated.visual_idea)} Brand: ${brandName}. Use colors ${brandKit?.primary_color || "#7C3AED"}, ${brandKit?.secondary_color || "#06B6D4"}. ${hasLogo ? "Logo uploaded in brand kit." : "Logo not uploaded yet."}`,
      },
      updated_at: now,
    };

    const { data: item, error } = await s.from("marketing_content_queue").insert(payload).select("*").single();
    if (error) throw error;

    if (runInsert.data?.id) {
      await s.from("ai_agent_runs").update({
        status: providerWarning ? "approval_required" : "approval_required",
        error_message: providerWarning,
        output: { content_id: item.id, generated, caption: item.caption, status: item.status, provider_warning: providerWarning },
        completed_at: now,
      }).eq("id", runInsert.data.id);
    }

    return Response.json({ item, generated, run_id: runInsert.data?.id || null, warning: providerWarning });
  } catch (error) {
    console.error("Marketing generation hard error", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return Response.json({ error: message || "Internal server error" }, { status: 500 });
  }
}
