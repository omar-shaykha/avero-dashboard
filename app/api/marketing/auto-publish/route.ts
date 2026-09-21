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

  const { data: brand } = await s.from("company_marketing_brand_kits")
    .select("brand_name,logo_data_url,primary_color,secondary_color,accent_color,visual_style,target_audience")
    .eq("company_id", companyId)
    .maybeSingle();

  const key = process.env.GEMINI_API_KEY;
  let image: Buffer;
  let provider = "gemini_3_1_flash_image";

  try {
    if (!key) throw new Error("Missing Gemini image key");
    const prompt = [
      `Create a premium 1:1 social-media advertising visual for ${brand?.brand_name || "AVERO OS"}.`,
      `The visual must specifically match this post: ${item.caption || item.campaign_name || ""}`,
      `Visual direction: ${item.metrics?.visual_idea || item.creative_brief || ""}`,
      `Brand style: ${brand?.visual_style || "dark premium SaaS, futuristic business technology, cyan and electric-blue accents"}.`,
      `Brand colors: ${brand?.primary_color || "#0B2A45"}, ${brand?.secondary_color || "#00C8FF"}, ${brand?.accent_color || "#22D3EE"}.`,
      "Professional art-directed campaign image, cinematic depth, polished lighting, strong business-tech visual metaphor.",
      "Do not render captions, paragraphs, hashtags, fake dashboards, logos, gibberish or placeholder text inside the image.",
      "Leave some clean space at the top-left for brand identity.",
    ].join("\n");

    const r = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-3.1-flash-image:generateContent`, {
      method: "POST",
      headers: {"x-goog-api-key": key, "Content-Type": "application/json"},
      body: JSON.stringify({
        contents:[{parts:[{text:prompt}]}],
        generationConfig:{responseModalities:["IMAGE"],responseFormat:{image:{aspectRatio:"1:1",imageSize:"1K"}}}
      }),
      signal: AbortSignal.timeout(90000),
    });
    if (!r.ok) throw new Error(`Gemini image failed ${r.status}`);
    const j = await r.json();
    const part = (j?.candidates?.[0]?.content?.parts || []).find((p:any)=>p?.inlineData?.data);
    if (!part?.inlineData?.data) throw new Error("No generated image returned");
    image = await sharp(Buffer.from(part.inlineData.data,"base64")).resize(1080,1080,{fit:"cover"}).jpeg({quality:92,mozjpeg:true}).toBuffer();
  } catch (e) {
    provider = "avero_template_fallback";
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080"><defs><radialGradient id="g" cx="25%" cy="15%" r="80%"><stop offset="0" stop-color="#123A55"/><stop offset=".48" stop-color="#061427"/><stop offset="1" stop-color="#020617"/></radialGradient></defs><rect width="1080" height="1080" fill="url(#g)"/><circle cx="870" cy="160" r="250" fill="#22D3EE" opacity=".12"/><text x="125" y="420" fill="#F8FAFC" font-family="Arial" font-size="92" font-weight="900">AVERO OS</text><text x="125" y="505" fill="#CBD5E1" font-family="Arial" font-size="36" font-weight="700">Business Operations Platform</text></svg>`;
    image = await sharp(Buffer.from(svg)).jpeg({quality:90}).toBuffer();
  }

  const path = `${companyId}/${item.id}-auto-${Date.now()}.jpg`;
  const up = await s.storage.from("marketing-media").upload(path,image,{contentType:"image/jpeg",upsert:true});
  if (up.error) throw up.error;
  const url = s.storage.from("marketing-media").getPublicUrl(path).data.publicUrl;
  await s.from("marketing_content_queue").update({
    media_url:url,
    metrics:{...(item.metrics||{}),generated_media:provider,generated_media_at:new Date().toISOString()},
    updated_at:new Date().toISOString()
  }).eq("id",item.id);
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
