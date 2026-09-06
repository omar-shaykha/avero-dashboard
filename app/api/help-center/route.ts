import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

async function context() {
  const auth = await createServerClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Missing Supabase configuration");
  const admin = createAdminClient(url, key);
  const { data: profile } = await admin.from("user_profiles").select("company_id").eq("user_id",user.id).maybeSingle();
  if (!profile?.company_id) return null;
  return { user, companyId: profile.company_id as string, admin };
}

export async function GET() {
  try {
    const ctx = await context();
    if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const { data, error } = await ctx.admin.from("help_center_messages").select("id,role,message,metadata,created_at").eq("user_id",ctx.user.id).order("created_at",{ascending:true}).limit(100);
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

    const { data: saved, error } = await ctx.admin.from("help_center_messages").insert({
      company_id: ctx.companyId,
      user_id: ctx.user.id,
      role: "user",
      message,
      metadata: { source: "help_center" },
    }).select("id,role,message,created_at").single();
    if (error) return Response.json({ error: "Failed to save message" }, { status: 500 });

    const looksLikeAction = /\b(change|update|enable|disable|turn on|turn off|edit|modify|activate|deactivate)\b/i.test(message) || /(غير|غيّر|عدل|عدّل|فعل|فعّل|طفي|أوقف|شغل|شغّل)/.test(message);
    let actionRequest = null;
    if (looksLikeAction) {
      const { data: action } = await ctx.admin.from("ai_action_requests").insert({
        company_id: ctx.companyId,
        user_id: ctx.user.id,
        command: message,
        action_type: "user_requested_change",
        status: "awaiting_confirmation",
        requires_confirmation: true,
      }).select("id,status,requires_confirmation,created_at").single();
      actionRequest = action;
    }

    return Response.json({ message: saved, action_request: actionRequest });
  } catch (error) {
    console.error("Help center POST error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
