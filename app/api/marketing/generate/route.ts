import { createClient } from "@supabase/supabase-js";
import { canAccess, getAuthorizationContext, isKingAdmin } from "@/lib/auth/authorization";

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
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.7 } }),
  });
  if (!response.ok) throw new Error("AI provider request failed");
  const json = await response.json();
  const text = json?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || "").join("").trim();
  if (!text) throw new Error("AI provider returned no content");
  return text;
}

function asArray(value: unknown) {
  return (Array.isArray(value) ? value : String(value || "").split(","))
    .map((item) => String(item).trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 8);
}

function parseJsonObject(text: string) {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("AI output was not JSON");
  return JSON.parse(cleaned.slice(start, end + 1));
}

export async function POST(request: Request) {
  try {
    const ctx = await getAuthorizationContext();
    if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (!(isKingAdmin(ctx) || canAccess(ctx, "ai_marketing", "marketing.manage"))) return Response.json({ error: "Forbidden" }, { status: 403 });
    const companyId = ctx.profile.company_id;
    if (!companyId) return Response.json({ error: "Company not configured" }, { status: 409 });

    const body = await request.json();
    const platforms = asArray(body.platforms).filter((p) => ["facebook", "instagram", "tiktok", "snapchat"].includes(p));
    const objective = String(body.objective || "brand awareness").slice(0, 180);
    const audience = String(body.audience || "target customers").slice(0, 800);
    const contentType = String(body.content_type || "post").slice(0, 80);
    const brief = String(body.creative_brief || body.brief || "").slice(0, 4000);
    if (!platforms.length) return Response.json({ error: "Choose at least one platform" }, { status: 400 });
    if (!brief) return Response.json({ error: "Creative brief is required" }, { status: 400 });

    const s = db();
    const [{ data: profile }, { data: config }, { data: connections }] = await Promise.all([
      s.from("company_ai_profiles").select("industry,business_description,products_services,target_audience,brand_voice,languages,locations,social_notes").eq("company_id", companyId).maybeSingle(),
      s.from("ai_agent_configs").select("enabled,instructions,knowledge_scope,autonomy_mode").eq("company_id", companyId).eq("agent_key", "ai_marketing").maybeSingle(),
      s.from("company_social_connections").select("platform,connection_status,account_name,health_status").eq("company_id", companyId).in("platform", platforms),
    ]);

    if (!config?.enabled) return Response.json({ error: "AI Marketing Department is disabled" }, { status: 409 });

    const prompt = `You are the AI Marketing Department for exactly one tenant company. Never mention AVERO to end customers. Use only this company profile and approved instructions.\n\nCOMPANY PROFILE:\n${JSON.stringify(profile || {})}\n\nAGENT INSTRUCTIONS:\n${config.instructions || ""}\n\nCONNECTED CHANNEL STATUS:\n${JSON.stringify(connections || [])}\n\nCAMPAIGN REQUEST:\nPlatforms: ${platforms.join(", ")}\nObjective: ${objective}\nAudience: ${audience}\nContent type: ${contentType}\nBudget: ${String(body.budget || "")} ${String(body.currency || "SAR")}\nBrief: ${brief}\n\nReturn exactly valid JSON and nothing else. Shape:\n{\"campaign_name\":\"short name\",\"objective\":\"...\",\"audience\":\"...\",\"caption\":\"main caption ready to publish, natural and persuasive\",\"hashtags\":[\"tag1\",\"tag2\"],\"platform_notes\":{\"facebook\":\"...\",\"instagram\":\"...\",\"tiktok\":\"...\",\"snapchat\":\"...\"},\"ad_angle\":\"...\",\"visual_idea\":\"...\",\"call_to_action\":\"...\"}`;

    const runInsert = await s.from("ai_agent_runs").insert({
      company_id: companyId,
      agent_key: "ai_marketing",
      action: "generate_campaign",
      status: "running",
      input: { platforms, objective, audience, content_type: contentType, budget: body.budget || null, brief },
    }).select("id").single();

    let outputText = "";
    try {
      outputText = await generate(prompt);
      const generated = parseJsonObject(outputText);
      const now = new Date().toISOString();
      const payload = {
        company_id: companyId,
        created_by: ctx.user.id,
        campaign_name: String(generated.campaign_name || objective).slice(0, 180),
        objective: String(generated.objective || objective).slice(0, 180),
        audience,
        budget: body.budget === "" || body.budget == null ? null : Number(body.budget),
        currency: String(body.currency || "SAR").slice(0, 12),
        creative_brief: brief,
        channel: platforms[0],
        platforms,
        content_type: contentType,
        caption: String(generated.caption || "").slice(0, 8000),
        hashtags: asArray(generated.hashtags),
        status: config.autonomy_mode === "automatic" ? "approved" : "approval_required",
        approval_notes: String(generated.visual_idea || "").slice(0, 2000) || null,
        metrics: {
          ad_angle: generated.ad_angle || null,
          visual_idea: generated.visual_idea || null,
          call_to_action: generated.call_to_action || null,
          platform_notes: generated.platform_notes || {},
        },
        updated_at: now,
      };

      const { data: item, error } = await s.from("marketing_content_queue").insert(payload).select("*").single();
      if (error) throw error;

      if (runInsert.data?.id) {
        await s.from("ai_agent_runs").update({
          status: "approval_required",
          output: { content_id: item.id, generated, caption: item.caption, status: item.status },
          completed_at: now,
        }).eq("id", runInsert.data.id);
      }

      return Response.json({ item, generated, run_id: runInsert.data?.id || null });
    } catch (error) {
      console.error(error, outputText);
      if (runInsert.data?.id) await s.from("ai_agent_runs").update({ status: "failed", error_message: "AI marketing generation failed", output: { raw: outputText } }).eq("id", runInsert.data.id);
      return Response.json({ error: "AI marketing generation failed" }, { status: 502 });
    }
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
