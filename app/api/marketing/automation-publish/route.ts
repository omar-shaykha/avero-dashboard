import { createHash } from "crypto";
import sharp from "sharp";
import { createAdminClient } from "@/lib/supabase/admin";
import { publishMarketingContent } from "@/lib/marketing/publisher";

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function esc(value: unknown) {
  return String(value || "").replace(/[&<>]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[m] || m));
}

async function ensureMedia(s: ReturnType<typeof createAdminClient>, item: any, companyId: string) {
  if (item.media_url) return item.media_url as string;

  const { data: brand } = await s.from("company_marketing_brand_kits")
    .select("brand_name,primary_color,secondary_color")
    .eq("company_id", companyId)
    .maybeSingle();

  const brandName = brand?.brand_name || "AVERO OS";
  const primary = brand?.primary_color || "#7C3AED";
  const secondary = brand?.secondary_color || "#06B6D4";
  const title = String(item.campaign_name || "AVERO OS").slice(0, 80);
  const subtitle = String(item.approval_notes || item.caption || "AI-powered business operations").slice(0, 220);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080">
  <defs>
    <radialGradient id="g" cx="20%" cy="15%" r="100%">
      <stop offset="0" stop-color="${esc(primary)}" stop-opacity=".35"/>
      <stop offset=".48" stop-color="#07111f"/>
      <stop offset="1" stop-color="#020617"/>
    </radialGradient>
    <linearGradient id="a" x1="0" x2="1">
      <stop stop-color="${esc(primary)}"/>
      <stop offset="1" stop-color="${esc(secondary)}"/>
    </linearGradient>
  </defs>
  <rect width="1080" height="1080" fill="url(#g)"/>
  <circle cx="900" cy="145" r="260" fill="${esc(secondary)}" opacity=".12"/>
  <rect x="72" y="72" width="936" height="936" rx="58" fill="none" stroke="${esc(secondary)}" stroke-opacity=".32" stroke-width="2"/>
  <text x="112" y="145" fill="${esc(secondary)}" font-size="22" font-family="Arial,sans-serif" font-weight="800" letter-spacing="6">${esc(brandName)}</text>
  <foreignObject x="112" y="250" width="850" height="300">
    <div xmlns="http://www.w3.org/1999/xhtml" style="font-family:Arial,sans-serif;color:#fff;font-size:72px;line-height:1.05;font-weight:900;">${esc(title)}</div>
  </foreignObject>
  <foreignObject x="112" y="565" width="850" height="210">
    <div xmlns="http://www.w3.org/1999/xhtml" style="font-family:Arial,sans-serif;color:#cbd5e1;font-size:31px;line-height:1.35;font-weight:600;">${esc(subtitle)}</div>
  </foreignObject>
  <rect x="112" y="825" width="856" height="115" rx="30" fill="#071525" stroke="url(#a)" stroke-width="2"/>
  <text x="155" y="874" fill="#f8fafc" font-size="27" font-family="Arial,sans-serif" font-weight="800">AI Operating System for Business</text>
  <text x="155" y="910" fill="${esc(secondary)}" font-size="17" font-family="Arial,sans-serif" letter-spacing="3">SALES · CRM · OPERATIONS · AI AGENTS</text>
</svg>`;

  const buffer = await sharp(Buffer.from(svg)).jpeg({ quality: 90, mozjpeg: true }).toBuffer();
  const path = `${companyId}/${item.id}-automation.jpg`;
  const upload = await s.storage.from("marketing-media").upload(path, buffer, {
    contentType: "image/jpeg",
    upsert: true,
  });
  if (upload.error) throw upload.error;

  const mediaUrl = s.storage.from("marketing-media").getPublicUrl(path).data.publicUrl;
  await s.from("marketing_content_queue")
    .update({ media_url: mediaUrl, updated_at: new Date().toISOString() })
    .eq("id", item.id)
    .eq("company_id", companyId);

  return mediaUrl;
}

export async function POST(request: Request) {
  const companyId = String(request.headers.get("x-avero-company-id") || "").trim();
  const key = String(request.headers.get("x-avero-automation-key") || "").trim();

  if (!companyId || !key) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const s = createAdminClient();
  const { data: secretRow } = await s.from("marketing_automation_secrets")
    .select("secret_hash")
    .eq("company_id", companyId)
    .maybeSingle();

  if (!secretRow?.secret_hash || hash(key) !== secretRow.secret_hash) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: setting } = await s.from("marketing_schedule_settings")
    .select("mode,enabled")
    .eq("company_id", companyId)
    .maybeSingle();

  if (!setting?.enabled || setting.mode !== "automatic") {
    return Response.json({ ok: true, skipped: true, reason: "Automatic mode is disabled" });
  }

  const now = new Date().toISOString();
  const { data: rows, error: rowsError } = await s.from("marketing_content_queue")
    .select("*")
    .eq("company_id", companyId)
    .eq("status", "scheduled")
    .lte("scheduled_for", now)
    .order("scheduled_for", { ascending: true })
    .limit(10);

  if (rowsError) return Response.json({ error: "Could not load scheduled content" }, { status: 500 });

  let published = 0;
  let failed = 0;
  const resultsSummary: any[] = [];

  for (const item of rows || []) {
    await s.from("marketing_content_queue")
      .update({ status: "publishing", updated_at: new Date().toISOString(), error_message: null })
      .eq("id", item.id)
      .eq("company_id", companyId);

    try {
      const platforms = Array.isArray(item.platforms) && item.platforms.length
        ? item.platforms.map((p: unknown) => String(p).toLowerCase())
        : [String(item.channel || "facebook").toLowerCase()];

      let mediaUrl = item.media_url || null;
      if (platforms.includes("instagram") && !mediaUrl) mediaUrl = await ensureMedia(s, item, companyId);

      const platformResults = await publishMarketingContent(s, companyId, item, platforms, mediaUrl);
      const somePublished = platformResults.some((r) => r.status === "published");
      const complete = platformResults.length > 0 && platformResults.every((r) => r.status === "published");
      const errorMessage = complete
        ? null
        : platformResults.map((r) => `${r.platform}: ${r.status}${r.note ? ` - ${r.note}` : ""}`).join(" | ");

      await s.from("marketing_content_queue").update({
        status: somePublished ? "published" : "failed",
        published_at: somePublished ? new Date().toISOString() : null,
        external_post_id: platformResults.filter((r) => r.id).map((r) => `${r.platform}:${r.id}`).join(",") || null,
        error_message: errorMessage,
        metrics: { ...(item.metrics || {}), publisher: "foxy_make_scheduler", publishing_result: platformResults },
        updated_at: new Date().toISOString(),
      }).eq("id", item.id).eq("company_id", companyId);

      await s.from("ai_agent_runs").insert({
        company_id: companyId,
        agent_key: "ai_marketing",
        action: "automatic_publish",
        status: somePublished ? "completed" : "failed",
        input: { content_id: item.id, scheduled_for: item.scheduled_for, platforms },
        output: { platform_results: platformResults },
        error_message: errorMessage,
        completed_at: new Date().toISOString(),
      });

      if (somePublished) published++;
      else failed++;
      resultsSummary.push({ content_id: item.id, status: somePublished ? "published" : "failed", platforms: platformResults });
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Automatic publishing failed";
      await s.from("marketing_content_queue").update({
        status: "failed",
        error_message: reason,
        updated_at: new Date().toISOString(),
      }).eq("id", item.id).eq("company_id", companyId);

      await s.from("ai_agent_runs").insert({
        company_id: companyId,
        agent_key: "ai_marketing",
        action: "automatic_publish",
        status: "failed",
        input: { content_id: item.id },
        error_message: reason,
        completed_at: new Date().toISOString(),
      });

      failed++;
      resultsSummary.push({ content_id: item.id, status: "failed", error: reason });
    }
  }

  return Response.json({ ok: true, due: rows?.length || 0, published, failed, results: resultsSummary });
}
