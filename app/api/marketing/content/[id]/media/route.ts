import { canAccess, getAuthorizationContext, isKingAdmin } from "@/lib/auth/authorization";
import { createAdminClient } from "@/lib/supabase/admin";
import sharp from "sharp";

const IMAGE_MODEL = process.env.CLOUDFLARE_IMAGE_MODEL || "@cf/black-forest-labs/flux-1-schnell";

function esc(value: unknown) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fallbackSvg(brand: string) {
  return `
  <svg width="1080" height="1080" viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="g1" cx="22%" cy="15%" r="70%"><stop offset="0" stop-color="#123A55"/><stop offset="0.42" stop-color="#061427"/><stop offset="1" stop-color="#020617"/></radialGradient>
      <linearGradient id="cyan" x1="0" x2="1"><stop stop-color="#22D3EE"/><stop offset="1" stop-color="#14B8A6"/></linearGradient>
    </defs>
    <rect width="1080" height="1080" fill="url(#g1)"/>
    <circle cx="890" cy="170" r="210" fill="#0E7490" opacity="0.18"/>
    <circle cx="150" cy="900" r="250" fill="#22D3EE" opacity="0.10"/>
    <rect x="88" y="80" width="904" height="920" rx="54" fill="none" stroke="#22D3EE" stroke-opacity="0.35" stroke-width="2"/>
    <text x="125" y="150" fill="#67E8F9" font-size="24" font-family="Arial, sans-serif" font-weight="900" letter-spacing="6">${esc(brand)}</text>
    <text x="125" y="420" fill="#F8FAFC" font-size="92" font-family="Arial, sans-serif" font-weight="900">AVERO OS</text>
    <text x="125" y="505" fill="#CBD5E1" font-size="36" font-family="Arial, sans-serif" font-weight="700">Business Operations Platform</text>
    <rect x="125" y="650" width="830" height="145" rx="34" fill="#031525" stroke="#22D3EE" stroke-opacity="0.36"/>
    <text x="170" y="713" fill="#E0F2FE" font-size="28" font-family="Arial, sans-serif" font-weight="900">SALES · CRM · POS · INVENTORY</text>
    <text x="170" y="756" fill="#67E8F9" font-size="22" font-family="Arial, sans-serif" font-weight="800">AI AGENTS · OPERATIONS · AUTOMATION</text>
    <text x="125" y="930" fill="#22D3EE" font-size="24" font-family="Arial, sans-serif" font-weight="900" letter-spacing="5">RUN YOUR BUSINESS FROM ONE SYSTEM</text>
  </svg>`;
}

function decodeDataUrl(value: string | null | undefined) {
  if (!value || !value.startsWith("data:image/")) return null;
  const comma = value.indexOf(",");
  if (comma < 0) return null;
  try {
    return Buffer.from(value.slice(comma + 1), "base64");
  } catch {
    return null;
  }
}

async function generateVisual(prompt: string) {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  if (!token || !accountId) throw new Error("Missing Cloudflare Workers AI configuration");

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${IMAGE_MODEL}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        steps: 8,
      }),
      signal: AbortSignal.timeout(90000),
    }
  );

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`Cloudflare image generation failed ${response.status}: ${details.slice(0, 500)}`);
  }

  const json = await response.json();
  const data = json?.result?.image || json?.image;
  if (!data) throw new Error("Cloudflare returned no image");

  return {
    buffer: Buffer.from(data, "base64"),
    mimeType: "image/jpeg",
  };
}

async function brandedImage(aiBuffer: Buffer, logoDataUrl?: string | null) {
  let base = sharp(aiBuffer).resize(1080, 1080, { fit: "cover", position: "centre" });

  const logoBuffer = decodeDataUrl(logoDataUrl);
  if (!logoBuffer) return base.jpeg({ quality: 92, mozjpeg: true }).toBuffer();

  try {
    const logo = await sharp(logoBuffer)
      .resize({ width: 250, height: 150, fit: "inside", withoutEnlargement: true })
      .png()
      .toBuffer();

    return base
      .composite([{ input: logo, left: 58, top: 58 }])
      .jpeg({ quality: 92, mozjpeg: true })
      .toBuffer();
  } catch {
    return base.jpeg({ quality: 92, mozjpeg: true }).toBuffer();
  }
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ctx = await getAuthorizationContext();
    if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (!(isKingAdmin(ctx) || canAccess(ctx, "ai_marketing", "marketing.manage"))) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const companyId = ctx.profile.company_id;
    if (!companyId) return Response.json({ error: "Company not configured" }, { status: 409 });

    const s = createAdminClient();
    const [{ data: item, error }, { data: brandKit }] = await Promise.all([
      s.from("marketing_content_queue")
        .select("id,campaign_name,caption,hashtags,platforms,metrics,media_url,creative_brief,objective,audience")
        .eq("id", id)
        .eq("company_id", companyId)
        .maybeSingle(),
      s.from("company_marketing_brand_kits")
        .select("brand_name,slogan,logo_data_url,primary_color,secondary_color,accent_color,visual_style,tone_of_voice,target_audience")
        .eq("company_id", companyId)
        .maybeSingle(),
    ]);

    if (error) return Response.json({ error: "Could not load content" }, { status: 500 });
    if (!item) return Response.json({ error: "Content not found" }, { status: 404 });

    const brandName = brandKit?.brand_name || "AVERO OS";
    const visualIdea = String(item.metrics?.visual_idea || item.metrics?.visual_prompt || item.creative_brief || "");
    const prompt = [
      `Create one premium square social-media campaign visual for ${brandName}.`,
      `This visual must be specifically inspired by this post: ${item.caption || item.campaign_name || ""}`,
      `Campaign objective: ${item.objective || "brand awareness"}.`,
      `Audience: ${item.audience || brandKit?.target_audience || "business owners and operations managers"}.`,
      `Foxy visual direction: ${visualIdea || "Create a powerful visual metaphor that communicates the main idea of the post."}`,
      `Brand visual style: ${brandKit?.visual_style || "premium futuristic business technology, dark navy and black, cyan/electric-blue accents, clean high-end SaaS aesthetic"}.`,
      `Brand colors: primary ${brandKit?.primary_color || "#0B2A45"}, secondary ${brandKit?.secondary_color || "#00C8FF"}, accent ${brandKit?.accent_color || "#22D3EE"}.`,
      "The image must look like a professionally art-directed advertising visual, not a generic template.",
      "Generate ONLY the photographic/illustrative campaign artwork. Absolutely no letters, words, numbers, typography, logos, icons with letters, app screens, dashboards, interface cards, charts with labels, signs, packaging text, or watermark-like marks.",
      "Treat all brand identity as a later compositing layer: use the brand palette and visual mood, but NEVER attempt to draw the brand name or logo.",
      "Prefer one strong hero concept with premium materials, cinematic lighting and intentional negative space over a busy collage.",
      "Use strong composition, realistic premium lighting, depth, subtle futuristic business/AI/operations elements, and enough negative space for brand identity.",
      "Do not render paragraphs, captions, hashtags, UI screenshots, fake dashboards, or random text inside the image.",
      "Do not generate logos or imitate another company logo. Leave the top-left area visually clean because AVERO's real logo will be overlaid there after generation.",
      "No gibberish, no placeholder text, no watermark-like text, no social media interface.",
      "The visual should clearly match the meaning of this exact post, so different posts produce genuinely different images.",
    ].join("\n");

    let image: Buffer;
    let provider = "cloudflare_flux_1_schnell";
    let generationError: string | null = null;

    try {
      const generated = await generateVisual(prompt);
      image = await brandedImage(generated.buffer, brandKit?.logo_data_url);
    } catch (generationFailure) {
      generationError = generationFailure instanceof Error ? generationFailure.message : "AI image generation failed";
      console.error("Foxy AI visual generation failed", generationFailure);

      await s.from("marketing_content_queue")
        .update({
          media_url: null,
          metrics: {
            ...(item.metrics || {}),
            generated_media: "unavailable",
            generated_media_at: new Date().toISOString(),
            generated_media_error: generationError,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("company_id", companyId);

      await s.from("ai_agent_runs").insert({
        company_id: companyId,
        agent_key: "ai_marketing",
        action: "generate_media",
        status: "failed",
        input: { content_id: id, visual_idea: visualIdea },
        error_message: generationError,
        completed_at: new Date().toISOString(),
      });

      return Response.json({
        error: "Foxy Image AI is not available right now. Check the Cloudflare Workers AI connection.",
        provider_error: generationError,
      }, { status: 503 });
    }

    const path = `${companyId}/${id}-foxy-${Date.now()}.jpg`;
    const uploaded = await s.storage.from("marketing-media").upload(path, image, {
      contentType: "image/jpeg",
      upsert: true,
    });
    if (uploaded.error) return Response.json({ error: "Could not upload generated media" }, { status: 500 });

    const mediaUrl = s.storage.from("marketing-media").getPublicUrl(path).data.publicUrl;
    const metrics = {
      ...(item.metrics || {}),
      generated_media: provider,
      generated_media_at: new Date().toISOString(),
      generated_media_prompt: prompt,
      generated_media_error: generationError,
    };

    const { data: updated, error: updateError } = await s.from("marketing_content_queue")
      .update({
        media_url: mediaUrl,
        metrics,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("company_id", companyId)
      .select("*")
      .maybeSingle();

    if (updateError) return Response.json({ error: "Generated image but could not save media URL" }, { status: 500 });

    await s.from("ai_agent_runs").insert({
      company_id: companyId,
      agent_key: "ai_marketing",
      action: "generate_media",
      status: provider === "cloudflare_flux_1_schnell" ? "completed" : "completed_with_fallback",
      input: { content_id: id, visual_idea: visualIdea },
      output: { media_url: mediaUrl, provider, generation_error: generationError },
      error_message: generationError,
      completed_at: new Date().toISOString(),
    });

    return Response.json({
      ok: true,
      media_url: mediaUrl,
      item: updated,
      provider,
      fallback: provider !== "cloudflare_flux_1_schnell",
    });
  } catch (error) {
    console.error("Marketing media generation error", error);
    return Response.json({ error: "ما قدرت Foxy يولّد صورة للبوست. جرّب مرة ثانية." }, { status: 500 });
  }
}
