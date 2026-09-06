import { createClient } from "@supabase/supabase-js";
import { canAccess, getAuthorizationContext, isKingAdmin } from "@/lib/auth/authorization";

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Missing Supabase configuration");
  return createClient(url, key);
}

const allowedPlatforms = new Set(["facebook", "instagram", "tiktok", "snapchat", "linkedin", "x", "youtube", "whatsapp"]);
const allowedStatuses = new Set(["idea", "draft", "approval_required", "approved", "scheduled", "publishing", "published", "failed", "rejected"]);

function cleanText(value: unknown, max = 4000) {
  return String(value || "").trim().slice(0, max) || null;
}

function cleanArray(value: unknown, whitelist?: Set<string>) {
  const arr = Array.isArray(value) ? value : String(value || "").split(",");
  return arr
    .map((item) => String(item).trim().toLowerCase())
    .filter((item) => item && (!whitelist || whitelist.has(item)))
    .slice(0, 12);
}

export async function GET() {
  try {
    const ctx = await getAuthorizationContext();
    if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (!canAccess(ctx, "ai_marketing", "marketing.view")) return Response.json({ error: "Forbidden" }, { status: 403 });
    const companyId = ctx.profile.company_id;
    if (!companyId) return Response.json({ error: "Company not configured" }, { status: 409 });

    const { data, error } = await db()
      .from("marketing_content_queue")
      .select("id,campaign_name,objective,audience,budget,currency,creative_brief,channel,platforms,content_type,caption,media_url,hashtags,scheduled_for,status,approval_notes,approved_at,published_at,external_post_id,error_message,metrics,created_at,updated_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(80);

    if (error) return Response.json({ error: "Failed to load marketing queue" }, { status: 500 });
    return Response.json({ items: data || [] });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getAuthorizationContext();
    if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (!(isKingAdmin(ctx) || canAccess(ctx, "ai_marketing", "marketing.manage"))) return Response.json({ error: "Forbidden" }, { status: 403 });
    const companyId = ctx.profile.company_id;
    if (!companyId) return Response.json({ error: "Company not configured" }, { status: 409 });

    const body = await request.json();
    const platforms = cleanArray(body.platforms || body.channel, allowedPlatforms);
    const status = allowedStatuses.has(String(body.status || "draft")) ? String(body.status || "draft") : "draft";
    const scheduledFor = body.scheduled_for ? new Date(body.scheduled_for).toISOString() : null;

    const payload = {
      company_id: companyId,
      created_by: ctx.user.id,
      campaign_name: cleanText(body.campaign_name, 180),
      objective: cleanText(body.objective, 180),
      audience: cleanText(body.audience, 800),
      budget: body.budget === "" || body.budget == null ? null : Number(body.budget),
      currency: cleanText(body.currency, 12) || "SAR",
      creative_brief: cleanText(body.creative_brief, 4000),
      channel: platforms[0] || cleanText(body.channel, 80) || "general",
      platforms,
      content_type: cleanText(body.content_type, 80) || "post",
      caption: cleanText(body.caption, 8000),
      media_url: cleanText(body.media_url, 2000),
      hashtags: cleanArray(body.hashtags),
      scheduled_for: scheduledFor,
      status,
      approval_notes: cleanText(body.approval_notes, 2000),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await db().from("marketing_content_queue").insert(payload).select("*").single();
    if (error) return Response.json({ error: "Failed to create marketing content" }, { status: 500 });

    await db().from("ai_agent_runs").insert({
      company_id: companyId,
      agent_key: "ai_marketing",
      action: "content_queue_created",
      status: "completed",
      input: { platforms, objective: payload.objective, content_type: payload.content_type },
      output: { content_id: data.id, caption: data.caption, status: data.status },
      completed_at: new Date().toISOString(),
    });

    return Response.json({ item: data });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
