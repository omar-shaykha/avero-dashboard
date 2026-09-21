import sharp from "sharp";
import { createAdminClient } from "@/lib/supabase/admin";
import { publishMarketingContent } from "@/lib/marketing/publisher";

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  const bearer = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (secret && bearer === secret) return true;

  const userAgent = (request.headers.get("user-agent") || "").toLowerCase();
  const schedule = request.headers.get("x-vercel-cron-schedule") || "";
  return userAgent.includes("vercel-cron/1.0") && schedule === "5 7 * * *";
}

function esc(value: unknown) {
  return String(value || "").replace(/[&<>]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[m] || m));
}

async function media(s: any, item: any, companyId: string) {
  if (item.media_url) return item.media_url;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080"><defs><radialGradient id="g" cx="25%" cy="15%" r="80%"><stop offset="0" stop-color="#123A55"/><stop offset=".48" stop-color="#061427"/><stop offset="1" stop-color="#020617"/></radialGradient></defs><rect width="1080" height="1080" fill="url(#g)"/><circle cx="870" cy="160" r="250" fill="#22D3EE" opacity=".12"/><rect x="80" y="80" width="920" height="920" rx="58" fill="none" stroke="#22D3EE" stroke-opacity=".32" stroke-width="2"/><text x="125" y="150" fill="#67E8F9" font-family="Arial,sans-serif" font-size="24" font-weight="900" letter-spacing="6">AVERO OS</text><text x="125" y="420" fill="#F8FAFC" font-family="Arial,sans-serif" font-size="92" font-weight="900">AVERO OS</text><text x="125" y="505" fill="#CBD5E1" font-family="Arial,sans-serif" font-size="36" font-weight="700">Business Operations Platform</text><rect x="125" y="650" width="830" height="145" rx="34" fill="#031525" stroke="#22D3EE" stroke-opacity=".36"/><text x="170" y="713" fill="#E0F2FE" font-family="Arial,sans-serif" font-size="28" font-weight="900">SALES · CRM · POS · INVENTORY</text><text x="170" y="756" fill="#67E8F9" font-family="Arial,sans-serif" font-size="22" font-weight="800">AI AGENTS · OPERATIONS · AUTOMATION</text><text x="125" y="930" fill="#22D3EE" font-family="Arial,sans-serif" font-size="24" font-weight="900" letter-spacing="5">RUN YOUR BUSINESS FROM ONE SYSTEM</text></svg>`;
  const buf = await sharp(Buffer.from(svg)).jpeg({ quality: 88 }).toBuffer();
  const path = `${companyId}/${item.id}-auto.jpg`;
  const up = await s.storage.from("marketing-media").upload(path, buf, { contentType: "image/jpeg", upsert: true });
  if (up.error) throw up.error;
  const url = s.storage.from("marketing-media").getPublicUrl(path).data.publicUrl;
  await s.from("marketing_content_queue").update({ media_url: url, updated_at: new Date().toISOString() }).eq("id", item.id);
  return url;
}

export async function GET(request: Request) {
  if (!authorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const s = createAdminClient();
  const now = new Date().toISOString();

  try {
    const { data: rows, error: rowsError } = await s.from("marketing_content_queue")
      .select("*")
      .eq("status", "scheduled")
      .lte("scheduled_for", now)
      .order("scheduled_for", { ascending: true })
      .limit(20);

    if (rowsError) throw rowsError;

    let published = 0;
    let failed = 0;

    for (const item of rows || []) {
      const { data: setting } = await s.from("marketing_schedule_settings")
        .select("mode,enabled")
        .eq("company_id", item.company_id)
        .maybeSingle();

      if (!setting?.enabled || setting.mode !== "automatic") continue;

      await s.from("marketing_content_queue").update({ status: "publishing", updated_at: now }).eq("id", item.id);

      try {
        const platforms = Array.isArray(item.platforms) ? item.platforms : [item.channel].filter(Boolean);
        let mediaUrl = item.media_url || null;
        if (platforms.includes("instagram") && !mediaUrl) mediaUrl = await media(s, item, item.company_id);

        const results = await publishMarketingContent(s, item.company_id, item, platforms, mediaUrl);
        const complete = results.length > 0 && results.every((result) => result.status === "published");
        const somePublished = results.some((result) => result.status === "published");
        const status = somePublished ? "published" : "failed";
        const errorMessage = complete
          ? null
          : results.map((result) => `${result.platform}: ${result.status}${result.note ? ` - ${result.note}` : ""}`).join(" | ");

        await s.from("marketing_content_queue").update({
          status,
          published_at: somePublished ? new Date().toISOString() : null,
          external_post_id: results.filter((result) => result.id).map((result) => `${result.platform}:${result.id}`).join(",") || null,
          error_message: errorMessage,
          metrics: { ...(item.metrics || {}), publisher: "foxy_auto_router", publishing_result: results },
          updated_at: new Date().toISOString(),
        }).eq("id", item.id);

        await s.from("ai_agent_runs").insert({
          company_id: item.company_id,
          agent_key: "ai_marketing",
          action: "automatic_publish",
          status: somePublished ? "completed" : "failed",
          input: { content_id: item.id, scheduled_for: item.scheduled_for, platforms },
          output: { results },
          error_message: errorMessage,
          completed_at: new Date().toISOString(),
        });

        if (somePublished) published++;
        else failed++;
      } catch (error) {
        const reason = error instanceof Error ? error.message : "Auto publish failed";
        await s.from("marketing_content_queue").update({
          status: "failed",
          error_message: reason,
          updated_at: new Date().toISOString(),
        }).eq("id", item.id);

        await s.from("ai_agent_runs").insert({
          company_id: item.company_id,
          agent_key: "ai_marketing",
          action: "automatic_publish",
          status: "failed",
          input: { content_id: item.id },
          error_message: reason,
          completed_at: new Date().toISOString(),
        });
        failed++;
      }
    }

    return Response.json({ ok: true, due: rows?.length || 0, published, failed });
  } catch (error) {
    console.error("Foxy automatic publishing error", error);
    return Response.json({ error: "Automatic publishing failed" }, { status: 500 });
  }
}
