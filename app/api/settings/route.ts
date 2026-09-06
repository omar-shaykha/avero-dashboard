import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

const defaults = {
  language: "en",
  theme: "dark",
  notification_master: true,
  notification_sound: true,
  notification_prefs: {
    new_lead: true,
    qualified_lead: true,
    quotation_request: true,
    negotiation_started: true,
    high_interest: true,
    new_customer_message: true,
    won_deal: true,
    lost_deal: false,
    event_soon: true,
    ai_handoff: true,
    automation_error: true,
    subscription_expiry: true,
    security_alert: true,
  },
};

async function context() {
  const auth = await createServerClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Missing Supabase configuration");
  const admin = createAdminClient(url, key);
  const { data: profile } = await admin.from("user_profiles").select("company_id").eq("user_id", user.id).maybeSingle();
  if (!profile?.company_id) return null;
  return { user, companyId: profile.company_id as string, admin };
}

export async function GET() {
  try {
    const ctx = await context();
    if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const { data, error } = await ctx.admin.from("user_settings").select("*").eq("user_id", ctx.user.id).maybeSingle();
    if (error) return Response.json({ error: "Failed to load settings" }, { status: 500 });
    if (!data) {
      const row = { user_id: ctx.user.id, company_id: ctx.companyId, ...defaults };
      const { data: created, error: createError } = await ctx.admin.from("user_settings").insert(row).select("*").single();
      if (createError) return Response.json({ error: "Failed to initialize settings" }, { status: 500 });
      return Response.json(created);
    }
    return Response.json(data);
  } catch (error) {
    console.error("Settings GET error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const ctx = await context();
    if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const body = await request.json();
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.language === "en" || body.language === "ar") update.language = body.language;
    if (["dark","light","system"].includes(body.theme)) update.theme = body.theme;
    if (typeof body.notification_master === "boolean") update.notification_master = body.notification_master;
    if (typeof body.notification_sound === "boolean") update.notification_sound = body.notification_sound;
    if (body.notification_prefs && typeof body.notification_prefs === "object" && !Array.isArray(body.notification_prefs)) update.notification_prefs = body.notification_prefs;

    const { data, error } = await ctx.admin.from("user_settings").upsert({
      user_id: ctx.user.id,
      company_id: ctx.companyId,
      ...defaults,
      ...update,
    }, { onConflict: "user_id" }).select("*").single();
    if (error) {
      console.error("Settings PATCH database error:", error);
      return Response.json({ error: "Failed to save settings" }, { status: 500 });
    }
    return Response.json(data);
  } catch (error) {
    console.error("Settings PATCH error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
