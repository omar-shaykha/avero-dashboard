import { createClient } from "@supabase/supabase-js";
import { canAccess, getAuthorizationContext, isKingAdmin } from "@/lib/auth/authorization";

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Missing Supabase configuration");
  return createClient(url, key);
}

const allowedActions = new Set(["approve", "schedule", "publish", "reject", "draft"]);

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ctx = await getAuthorizationContext();
    if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (!(isKingAdmin(ctx) || canAccess(ctx, "ai_marketing", "marketing.manage"))) return Response.json({ error: "Forbidden" }, { status: 403 });
    const companyId = ctx.profile.company_id;
    if (!companyId) return Response.json({ error: "Company not configured" }, { status: 409 });

    const body = await request.json();
    const action = String(body.action || "");
    if (!allowedActions.has(action)) return Response.json({ error: "Unknown action" }, { status: 400 });

    const now = new Date().toISOString();
    const update: Record<string, unknown> = { updated_at: now };
    if (action === "approve") {
      update.status = "approved";
      update.approved_by = ctx.user.id;
      update.approved_at = now;
      update.approval_notes = String(body.approval_notes || "").slice(0, 2000) || null;
    }
    if (action === "schedule") {
      update.status = "scheduled";
      update.scheduled_for = body.scheduled_for ? new Date(body.scheduled_for).toISOString() : null;
      update.approved_by = ctx.user.id;
      update.approved_at = now;
    }
    if (action === "publish") {
      update.status = "publishing";
      update.approved_by = ctx.user.id;
      update.approved_at = now;
    }
    if (action === "reject") {
      update.status = "rejected";
      update.approval_notes = String(body.approval_notes || "").slice(0, 2000) || null;
    }
    if (action === "draft") {
      update.status = "draft";
    }

    const s = db();
    const { data, error } = await s
      .from("marketing_content_queue")
      .update(update)
      .eq("id", id)
      .eq("company_id", companyId)
      .select("*")
      .maybeSingle();

    if (error) return Response.json({ error: "Failed to update content" }, { status: 500 });
    if (!data) return Response.json({ error: "Not found" }, { status: 404 });

    await s.from("ai_agent_runs").insert({
      company_id: companyId,
      agent_key: "ai_marketing",
      action: `content_${action}`,
      status: "completed",
      input: { content_id: id, action, scheduled_for: body.scheduled_for || null },
      output: { content_id: id, status: data.status, platforms: data.platforms || [data.channel] },
      completed_at: now,
    });

    const publishWebhook = process.env.MAKE_MARKETING_WEBHOOK_URL;
    if (action === "publish" && publishWebhook) {
      fetch(publishWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_id: companyId, content_id: id, action: "publish" }),
      }).catch((err) => console.error("Marketing publish webhook failed", err));
    }

    return Response.json({ item: data });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
