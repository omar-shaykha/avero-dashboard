import { createClient } from "@supabase/supabase-js";
import { canAccess, getAuthorizationContext, isKingAdmin } from "@/lib/auth/authorization";

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Missing Supabase configuration");
  return createClient(url, key);
}

function cleanText(value: unknown, max = 2000) {
  if (typeof value !== "string") return null;
  const next = value.trim();
  return next ? next.slice(0, max) : null;
}

function cleanColor(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const next = value.trim();
  return /^#[0-9a-f]{6}$/i.test(next) ? next : fallback;
}

function cleanArray(value: unknown, fallback: string[] = []) {
  const raw = Array.isArray(value) ? value : String(value || "").split(",");
  return raw.map((item) => String(item).trim()).filter(Boolean).slice(0, 12);
}

function cleanLogo(value: unknown) {
  if (value == null || value === "") return null;
  if (typeof value !== "string") throw new Error("Invalid logo");
  const next = value.trim();
  if (!next.startsWith("data:image/")) throw new Error("Logo must be an image data URL");
  if (next.length > 1_500_000) throw new Error("Logo is too large. Use a compressed PNG or JPG under 1MB.");
  return next;
}

async function requireMarketingAccess() {
  const ctx = await getAuthorizationContext();
  if (!ctx) return { error: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  if (!(isKingAdmin(ctx) || canAccess(ctx, "ai_marketing", "marketing.manage"))) {
    return { error: Response.json({ error: "Forbidden" }, { status: 403 }) };
  }
  if (!ctx.profile.company_id) return { error: Response.json({ error: "Company not configured" }, { status: 409 }) };
  return { ctx, companyId: ctx.profile.company_id };
}

export async function GET() {
  try {
    const guard = await requireMarketingAccess();
    if (guard.error) return guard.error;
    const s = db();
    const { data, error } = await s
      .from("company_marketing_brand_kits")
      .select("*")
      .eq("company_id", guard.companyId)
      .maybeSingle();

    if (error) return Response.json({ error: "Could not load brand kit" }, { status: 500 });

    return Response.json({
      brand_kit: data || {
        company_id: guard.companyId,
        brand_name: "",
        slogan: "",
        logo_data_url: null,
        primary_color: "#7C3AED",
        secondary_color: "#06B6D4",
        accent_color: "#22C55E",
        tone_of_voice: "Professional, modern, simple, premium SaaS voice.",
        visual_style: "Dark premium SaaS visuals, clean cards, bold typography, futuristic operations dashboard feel.",
        target_audience: "Business owners, restaurants, retail stores and operations managers.",
        content_pillars: ["operations", "sales", "inventory", "AI agents", "customer experience"],
        default_platforms: ["facebook", "instagram"],
        daily_time: "09:00",
        timezone: "Asia/Riyadh",
        auto_generate_enabled: true,
        approval_required: true,
        notes: "",
      },
    });
  } catch (error) {
    console.error("Brand kit GET error", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const guard = await requireMarketingAccess();
    if (guard.error) return guard.error;
    const body = await request.json();
    const s = db();

    let logo: string | null | undefined = undefined;
    if ("logo_data_url" in body) logo = cleanLogo(body.logo_data_url);

    const payload: Record<string, unknown> = {
      company_id: guard.companyId,
      brand_name: cleanText(body.brand_name, 180),
      slogan: cleanText(body.slogan, 220),
      primary_color: cleanColor(body.primary_color, "#7C3AED"),
      secondary_color: cleanColor(body.secondary_color, "#06B6D4"),
      accent_color: cleanColor(body.accent_color, "#22C55E"),
      tone_of_voice: cleanText(body.tone_of_voice, 2000),
      visual_style: cleanText(body.visual_style, 2000),
      target_audience: cleanText(body.target_audience, 2000),
      content_pillars: cleanArray(body.content_pillars, []),
      default_platforms: cleanArray(body.default_platforms, ["facebook", "instagram"]).filter((p) => ["facebook", "instagram", "tiktok", "snapchat"].includes(p)),
      daily_time: cleanText(body.daily_time, 8) || "09:00",
      timezone: cleanText(body.timezone, 80) || "Asia/Riyadh",
      auto_generate_enabled: body.auto_generate_enabled !== false,
      approval_required: body.approval_required !== false,
      notes: cleanText(body.notes, 3000),
      updated_at: new Date().toISOString(),
    };
    if (logo !== undefined) payload.logo_data_url = logo;

    const { data, error } = await s
      .from("company_marketing_brand_kits")
      .upsert(payload, { onConflict: "company_id" })
      .select("*")
      .single();

    if (error) return Response.json({ error: "Could not save brand kit" }, { status: 500 });
    return Response.json({ brand_kit: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return Response.json({ error: message }, { status: message === "Internal server error" ? 500 : 400 });
  }
}
