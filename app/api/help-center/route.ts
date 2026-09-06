import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

const MAX_MESSAGE_LENGTH = 4000;
const FEATURE_ALIASES: Array<{ key: string; patterns: RegExp[] }> = [
  { key: "ai_sales", patterns: [/\bai\s*sales\b/i, /\bsales\s*ai\b/i, /مبيعات.*ذكاء|ذكاء.*مبيعات/i] },
  { key: "ai_marketing", patterns: [/\bai\s*marketing\b/i, /\bmarketing\s*ai\b/i, /تسويق.*ذكاء|ذكاء.*تسويق/i] },
  { key: "ai_hr", patterns: [/\bai\s*hr\b/i, /\bhr\s*ai\b/i, /موارد.*بشرية|اتش\s*ار/i] },
  { key: "ai_support", patterns: [/\bai\s*support\b/i, /\bsupport\s*ai\b/i, /دعم.*ذكاء|ذكاء.*دعم/i] },
  { key: "analytics", patterns: [/\banalytics\b/i, /تحليلات|التحليلات/i] },
  { key: "crm", patterns: [/\bcrm\b/i, /سي\s*ار\s*ام/i] },
];

function parseFeatureToggle(message: string) {
  const disable = /\b(disable|deactivate|turn\s*off|switch\s*off)\b/i.test(message) || /(طفي|طفّي|أوقف|وقف|عطّل|عطل)/.test(message);
  const enable = /\b(enable|activate|turn\s*on|switch\s*on)\b/i.test(message) || /(فعّل|فعل|شغّل|شغل)/.test(message);
  if (enable === disable) return null;
  const feature = FEATURE_ALIASES.find((item) => item.patterns.some((pattern) => pattern.test(message)));
  if (!feature) return null;
  return { feature_key: feature.key, action: enable ? "enable" as const : "disable" as const };
}

async function context() {
  const auth = await createServerClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Missing Supabase configuration");

  const admin = createAdminClient(url, key);
  const { data: profile, error } = await admin
    .from("user_profiles")
    .select("company_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw error;
  if (!profile?.company_id) return null;

  return { user, companyId: profile.company_id as string, admin };
}

async function openSession(ctx: NonNullable<Awaited<ReturnType<typeof context>>>) {
  const found = await ctx.admin
    .from("ai_help_sessions")
    .select("id")
    .eq("user_id", ctx.user.id)
    .eq("company_id", ctx.companyId)
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (found.error) throw found.error;
  if (found.data) return found.data.id;

  const made = await ctx.admin
    .from("ai_help_sessions")
    .insert({ user_id: ctx.user.id, company_id: ctx.companyId, status: "open" })
    .select("id")
    .single();
  if (made.error) throw made.error;
  return made.data.id;
}

export async function GET() {
  try {
    const ctx = await context();
    if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const sessionId = await openSession(ctx);
    const { data, error } = await ctx.admin
      .from("ai_help_messages")
      .select("id,role,message,created_at")
      .eq("session_id", sessionId)
      .eq("user_id", ctx.user.id)
      .order("created_at", { ascending: true })
      .limit(100);

    if (error) return Response.json({ error: "Failed to load messages" }, { status: 500 });
    return Response.json(data || []);
  } catch (error) {
    console.error("Help center GET error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await context();
    if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const message = String(body.message || "").trim();
    if (!message) return Response.json({ error: "Message is required" }, { status: 400 });
    if (message.length > MAX_MESSAGE_LENGTH) return Response.json({ error: "Message is too long" }, { status: 400 });

    const sessionId = await openSession(ctx);
    const saved = await ctx.admin
      .from("ai_help_messages")
      .insert({ session_id: sessionId, user_id: ctx.user.id, role: "user", message })
      .select("id,role,message,created_at")
      .single();
    if (saved.error) return Response.json({ error: "Failed to save message" }, { status: 500 });

    const { error: sessionUpdateError } = await ctx.admin
      .from("ai_help_sessions")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", sessionId)
      .eq("user_id", ctx.user.id)
      .eq("company_id", ctx.companyId);
    if (sessionUpdateError) console.error("Help center session timestamp error:", sessionUpdateError);

    const featureToggle = parseFeatureToggle(message);
    const looksLikeAction = Boolean(featureToggle)
      || /\b(change|update|enable|disable|turn on|turn off|edit|modify|activate|deactivate)\b/i.test(message)
      || /(غير|غيّر|عدل|عدّل|فعل|فعّل|طفي|أوقف|شغل|شغّل)/.test(message);

    let command = null;
    if (looksLikeAction) {
      const executable = Boolean(featureToggle);
      const made = await ctx.admin
        .from("ai_commands")
        .insert({
          user_id: ctx.user.id,
          company_id: ctx.companyId,
          command_type: executable ? "toggle_company_feature" : "user_requested_change",
          command_text: message,
          target_type: executable ? "feature" : null,
          status: "awaiting_confirmation",
          requires_confirmation: true,
          payload: {
            source: "help_center",
            session_id: sessionId,
            ...(featureToggle || {}),
          },
        })
        .select("id,command_type,status,requires_confirmation,payload,created_at")
        .single();

      if (made.error) {
        console.error("Help center command creation error:", made.error);
      } else {
        command = made.data;
      }
    }

    return Response.json({ message: saved.data, action_request: command });
  } catch (error) {
    console.error("Help center POST error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
