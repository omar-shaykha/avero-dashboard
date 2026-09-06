import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthorizationContext, isKingAdmin } from "@/lib/auth/authorization";

const FEATURE_KEYS = new Set(["ai_sales", "crm", "analytics", "ai_marketing", "ai_hr", "ai_support"]);

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Missing Supabase configuration");
  return createClient(url, key);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const access = await getAuthorizationContext();
    if (!access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!access.profile.company_id) return NextResponse.json({ error: "Account is not assigned to a company" }, { status: 409 });

    const { id } = await params;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      return NextResponse.json({ error: "Invalid command id" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    if (typeof body.confirm !== "boolean") {
      return NextResponse.json({ error: "confirm must be true or false" }, { status: 400 });
    }

    const supabase = admin();
    const { data: command, error: commandError } = await supabase
      .from("ai_commands")
      .select("id,user_id,company_id,command_type,status,requires_confirmation,payload")
      .eq("id", id)
      .eq("user_id", access.user.id)
      .eq("company_id", access.profile.company_id)
      .maybeSingle();

    if (commandError) {
      console.error("AI command lookup error:", commandError);
      return NextResponse.json({ error: "Could not load command" }, { status: 500 });
    }
    if (!command) return NextResponse.json({ error: "Command not found" }, { status: 404 });
    if (command.status !== "awaiting_confirmation") {
      return NextResponse.json({ error: "Command is no longer awaiting confirmation", status: command.status }, { status: 409 });
    }

    if (!body.confirm) {
      const { error } = await supabase
        .from("ai_commands")
        .update({ status: "rejected", result: { rejected_by_user: true }, executed_at: new Date().toISOString() })
        .eq("id", command.id)
        .eq("user_id", access.user.id)
        .eq("company_id", access.profile.company_id)
        .eq("status", "awaiting_confirmation");
      if (error) return NextResponse.json({ error: "Could not reject command" }, { status: 500 });
      return NextResponse.json({ ok: true, status: "rejected" });
    }

    if (command.command_type !== "toggle_company_feature") {
      return NextResponse.json({ error: "This command type is not executable yet" }, { status: 400 });
    }

    if (!isKingAdmin(access)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const payload = (command.payload || {}) as Record<string, unknown>;
    const featureKey = typeof payload.feature_key === "string" ? payload.feature_key : "";
    const action = payload.action === "enable" || payload.action === "disable" ? payload.action : null;
    if (!FEATURE_KEYS.has(featureKey) || !action) {
      return NextResponse.json({ error: "Command payload is not allowed" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const { data: claimed, error: claimError } = await supabase
      .from("ai_commands")
      .update({ status: "approved", approved_at: now, error_message: null })
      .eq("id", command.id)
      .eq("user_id", access.user.id)
      .eq("company_id", access.profile.company_id)
      .eq("status", "awaiting_confirmation")
      .select("id")
      .maybeSingle();

    if (claimError) {
      console.error("AI command claim error:", claimError);
      return NextResponse.json({ error: "Could not approve command" }, { status: 500 });
    }
    if (!claimed) return NextResponse.json({ error: "Command was already handled" }, { status: 409 });

    await supabase.from("ai_commands").update({ status: "executing" }).eq("id", command.id).eq("status", "approved");

    try {
      const { data: feature, error: featureError } = await supabase
        .from("features")
        .select("id,key")
        .eq("key", featureKey)
        .maybeSingle();
      if (featureError) throw featureError;
      if (!feature) throw new Error("Feature not found");

      const enabled = action === "enable";
      const { data: existing, error: existingError } = await supabase
        .from("company_features")
        .select("feature_id")
        .eq("company_id", access.profile.company_id)
        .eq("feature_id", feature.id)
        .maybeSingle();
      if (existingError) throw existingError;

      const mutation = existing
        ? await supabase.from("company_features").update({ enabled }).eq("company_id", access.profile.company_id).eq("feature_id", feature.id)
        : await supabase.from("company_features").insert({ company_id: access.profile.company_id, feature_id: feature.id, enabled });
      if (mutation.error) throw mutation.error;

      const completedAt = new Date().toISOString();
      const result = { action, feature_key: featureKey, enabled, company_id: access.profile.company_id };
      const { error: finishError } = await supabase
        .from("ai_commands")
        .update({ status: "completed", result, executed_at: completedAt, error_message: null })
        .eq("id", command.id)
        .eq("user_id", access.user.id)
        .eq("company_id", access.profile.company_id);
      if (finishError) console.error("AI command completion log error:", finishError);

      return NextResponse.json({ ok: true, status: "completed", result });
    } catch (executionError) {
      console.error("AI command execution error:", executionError);
      await supabase
        .from("ai_commands")
        .update({ status: "failed", error_message: "Execution failed", executed_at: new Date().toISOString() })
        .eq("id", command.id)
        .eq("user_id", access.user.id)
        .eq("company_id", access.profile.company_id);
      return NextResponse.json({ error: "Command execution failed" }, { status: 500 });
    }
  } catch (error) {
    console.error("AI command confirm API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
