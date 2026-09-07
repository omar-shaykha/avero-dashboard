import { createClient } from "@supabase/supabase-js";
import { canAccess, getAuthorizationContext, isKingAdmin } from "@/lib/auth/authorization";
import sharp from "sharp";

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Missing Supabase configuration");
  return createClient(url, key);
}

function esc(value: unknown) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function words(text: string, max = 14) {
  return text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean).slice(0, max).join(" ");
}

function svg(input: { title: string; subtitle: string; brand: string; footer: string }) {
  const title = esc(words(input.title, 10));
  const subtitle = esc(words(input.subtitle, 28));
  const brand = esc(input.brand || "AVERO OS");
  const footer = esc(input.footer || "AI OPERATING SYSTEM");
  return `
  <svg width="1080" height="1080" viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="g1" cx="22%" cy="15%" r="70%"><stop offset="0" stop-color="#123A55"/><stop offset="0.42" stop-color="#061427"/><stop offset="1" stop-color="#020617"/></radialGradient>
      <linearGradient id="cyan" x1="0" x2="1"><stop stop-color="#22D3EE"/><stop offset="1" stop-color="#14B8A6"/></linearGradient>
      <filter id="glow"><feGaussianBlur stdDeviation="10" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    <rect width="1080" height="1080" fill="url(#g1)"/>
    <circle cx="890" cy="170" r="210" fill="#0E7490" opacity="0.18"/>
    <circle cx="150" cy="900" r="250" fill="#22D3EE" opacity="0.10"/>
    <path d="M120 296 C260 190 365 418 535 315 C694 219 750 320 944 238" fill="none" stroke="#22D3EE" stroke-width="3" opacity="0.55"/>
    <path d="M145 770 C315 690 430 850 575 758 C710 672 815 760 950 685" fill="none" stroke="#14B8A6" stroke-width="3" opacity="0.35"/>
    <g filter="url(#glow)">
      <rect x="88" y="80" width="904" height="920" rx="54" fill="none" stroke="#22D3EE" stroke-opacity="0.35" stroke-width="2"/>
      <rect x="116" y="108" width="180" height="48" rx="24" fill="#22D3EE" opacity="0.14"/>
      <text x="146" y="140" fill="#67E8F9" font-size="18" font-family="Arial, sans-serif" font-weight="800" letter-spacing="6">${brand}</text>
    </g>
    <g transform="translate(120,260)">
      <text x="0" y="0" fill="#F8FAFC" font-size="78" font-family="Arial, sans-serif" font-weight="900">
        <tspan x="0" dy="0">${title}</tspan>
      </text>
      <foreignObject x="0" y="70" width="830" height="250">
        <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: Arial, sans-serif; color:#CBD5E1; font-size:34px; line-height:1.35; font-weight:600;">${subtitle}</div>
      </foreignObject>
    </g>
    <g transform="translate(120,720)">
      <rect width="840" height="118" rx="32" fill="#031525" stroke="#22D3EE" stroke-opacity="0.35"/>
      <circle cx="64" cy="59" r="24" fill="url(#cyan)"/>
      <text x="112" y="52" fill="#E0F2FE" font-size="25" font-family="Arial, sans-serif" font-weight="800">AI agents, CRM, POS, HR, Inventory & Marketing</text>
      <text x="112" y="84" fill="#67E8F9" font-size="18" font-family="Arial, sans-serif" letter-spacing="4">${footer}</text>
    </g>
    <text x="120" y="940" fill="#22D3EE" opacity="0.9" font-size="22" font-family="Arial, sans-serif" font-weight="900" letter-spacing="7">THE BUSINESS OPERATING SYSTEM</text>
  </svg>`;
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ctx = await getAuthorizationContext();
    if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (!(isKingAdmin(ctx) || canAccess(ctx, "ai_marketing", "marketing.manage"))) return Response.json({ error: "Forbidden" }, { status: 403 });
    const companyId = ctx.profile.company_id;
    if (!companyId) return Response.json({ error: "Company not configured" }, { status: 409 });

    const s = db();
    const { data: item, error } = await s.from("marketing_content_queue").select("id,campaign_name,caption,hashtags,platforms,metrics,media_url").eq("id", id).eq("company_id", companyId).maybeSingle();
    if (error) return Response.json({ error: "Could not load content" }, { status: 500 });
    if (!item) return Response.json({ error: "Content not found" }, { status: 404 });

    const { data: brandKit } = await s.from("company_marketing_brand_kits").select("brand_name,slogan").eq("company_id", companyId).maybeSingle();
    const title = item.campaign_name || brandKit?.brand_name || "AVERO OS";
    const subtitle = String(item.metrics?.visual_idea || item.caption || "One command turns your operations into results.");
    const image = await sharp(Buffer.from(svg({ title, subtitle, brand: brandKit?.brand_name || "AVERO OS", footer: brandKit?.slogan || "AI OPERATIONS" }))).jpeg({ quality: 88, mozjpeg: true }).toBuffer();
    const path = `${companyId}/${id}-${Date.now()}.jpg`;
    const uploaded = await s.storage.from("marketing-media").upload(path, image, { contentType: "image/jpeg", upsert: true });
    if (uploaded.error) return Response.json({ error: "Could not upload generated media" }, { status: 500 });
    const { data: publicUrl } = s.storage.from("marketing-media").getPublicUrl(path);
    const mediaUrl = publicUrl.publicUrl;
    const { data: updated, error: updateError } = await s.from("marketing_content_queue").update({ media_url: mediaUrl, updated_at: new Date().toISOString(), metrics: { ...(item.metrics || {}), generated_media: "avero_template_jpeg", generated_media_at: new Date().toISOString() } }).eq("id", id).eq("company_id", companyId).select("*").maybeSingle();
    if (updateError) return Response.json({ error: "Generated image but could not save media URL" }, { status: 500 });
    await s.from("ai_agent_runs").insert({ company_id: companyId, agent_key: "ai_marketing", action: "generate_media", status: "completed", input: { content_id: id }, output: { media_url: mediaUrl }, completed_at: new Date().toISOString() });
    return Response.json({ ok: true, media_url: mediaUrl, item: updated });
  } catch (error) {
    console.error("Marketing media generation error", error);
    return Response.json({ error: "ما قدرت ولّد صورة للبوست. جرّب مرة ثانية." }, { status: 500 });
  }
}
