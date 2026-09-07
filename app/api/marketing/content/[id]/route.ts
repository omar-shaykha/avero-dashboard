import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { canAccess, getAuthorizationContext, isKingAdmin } from "@/lib/auth/authorization";

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Missing Supabase configuration");
  return createClient(url, key);
}

async function getPublisherWebhook(s: SupabaseClient) {
  if (process.env.MAKE_MARKETING_PUBLISH_WEBHOOK_URL) return process.env.MAKE_MARKETING_PUBLISH_WEBHOOK_URL;
  if (process.env.MAKE_MARKETING_WEBHOOK_URL) return process.env.MAKE_MARKETING_WEBHOOK_URL;
  const { data } = await s
    .from("ai_agent_engine_connections")
    .select("make_webhook_url,enabled,status")
    .eq("agent_key", "ai_marketing_publisher")
    .eq("enabled", true)
    .eq("status", "active")
    .maybeSingle();
  return data?.make_webhook_url || null;
}

const allowedActions = new Set(["approve", "schedule", "publish", "approve_publish", "reject", "draft", "duplicate"]);

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

    const s = db();
    const now = new Date().toISOString();

    if (action === "duplicate") {
      const { data: original, error: originalError } = await s.from("marketing_content_queue").select("*").eq("id", id).eq("company_id", companyId).maybeSingle();
      if (originalError) return Response.json({ error: "Failed to load original content" }, { status: 500 });
      if (!original) return Response.json({ error: "Not found" }, { status: 404 });
      const { id: _oldId, created_at: _createdAt, updated_at: _updatedAt, approved_by: _approvedBy, approved_at: _approvedAt, published_at: _publishedAt, external_post_id: _externalPostId, error_message: _errorMessage, ...copy } = original;
      const { data: item, error } = await s.from("marketing_content_queue").insert({
        ...copy,
        created_by: ctx.user.id,
        campaign_name: `${String(original.campaign_name || "Content").slice(0, 150)} - Repost`,
        status: "approval_required",
        scheduled_for: null,
        approved_by: null,
        approved_at: null,
        published_at: null,
        external_post_id: null,
        error_message: null,
        metrics: { ...(original.metrics || {}), source: "repost_duplicate", repost_of: id },
        updated_at: now,
      }).select("*").single();
      if (error) return Response.json({ error: "Could not create repost draft" }, { status: 500 });
      await s.from("ai_agent_runs").insert({ company_id: companyId, agent_key: "ai_marketing", action: "content_duplicate", status: "completed", input: { original_content_id: id }, output: { content_id: item.id, status: item.status, platforms: item.platforms || [item.channel] }, completed_at: now });
      return Response.json({ item, message: "تم إنشاء نسخة Repost بانتظار موافقتك." });
    }

    const update: Record<string, unknown> = { updated_at: now };
    const hasApprovalNotes = Object.prototype.hasOwnProperty.call(body, "approval_notes");
    let message = "تم حفظ التعديل.";
    let publishWebhook: string | null = null;

    if (action === "approve") {
      update.status = "approved";
      update.approved_by = ctx.user.id;
      update.approved_at = now;
      if (hasApprovalNotes) update.approval_notes = String(body.approval_notes || "").slice(0, 2000) || null;
      message = "تمت الموافقة على المحتوى.";
    }

    if (action === "schedule") {
      update.status = "scheduled";
      update.scheduled_for = body.scheduled_for ? new Date(body.scheduled_for).toISOString() : null;
      update.approved_by = ctx.user.id;
      update.approved_at = now;
      if (hasApprovalNotes) update.approval_notes = String(body.approval_notes || "").slice(0, 2000) || null;
      message = "تمت جدولة المحتوى.";
    }

    if (action === "reject") {
      update.status = "rejected";
      update.approval_notes = String(body.approval_notes || "Rejected by reviewer").slice(0, 2000);
      message = "تم رفض المحتوى.";
    }

    if (action === "draft") {
      update.status = "draft";
      message = "رجع المحتوى كمسودة.";
    }

    if (action === "publish" || action === "approve_publish") {
      publishWebhook = await getPublisherWebhook(s);
      update.approved_by = ctx.user.id;
      update.approved_at = now;
      if (hasApprovalNotes) update.approval_notes = String(body.approval_notes || "").slice(0, 2000) || null;
      if (!publishWebhook) {
        update.status = "failed";
        update.error_message = "Publisher مش مربوط بعد. المحتوى انحفظ وانوافق عليه، بس النشر الحقيقي يحتاج Make Publisher webhook.";
        message = "Publisher مش مربوط بعد. لازم نركّب سيناريو النشر الحقيقي.";
      } else {
        update.status = "publishing";
        update.error_message = null;
        message = "عم ابعت المحتوى إلى Boost Publisher.";
      }
    }

    const { data, error } = await s.from("marketing_content_queue").update(update).eq("id", id).eq("company_id", companyId).select("*").maybeSingle();
    if (error) return Response.json({ error: "Failed to update content" }, { status: 500 });
    if (!data) return Response.json({ error: "Not found" }, { status: 404 });

    let finalItem = data;
    let finalStatus = data.status;
    let finalMessage = message;

    if ((action === "publish" || action === "approve_publish") && publishWebhook) {
      try {
        const publisherResponse = await fetch(publishWebhook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ company_id: companyId, content_id: id, action: "publish", platforms: body.platforms || data.platforms || [data.channel], caption: data.caption, media_url: data.media_url || null }),
        });
        if (publisherResponse.ok) {
          const { data: published } = await s
            .from("marketing_content_queue")
            .update({
              status: "published",
              published_at: new Date().toISOString(),
              external_post_id: `boost-publisher-${id}`,
              error_message: null,
              updated_at: new Date().toISOString(),
              metrics: { ...(data.metrics || {}), publisher_gateway: "accepted", publisher_note: "Boost Publisher accepted the request. Full platform posting modules are the next step." },
            })
            .eq("id", id)
            .eq("company_id", companyId)
            .select("*")
            .maybeSingle();
          if (published) finalItem = published;
          finalStatus = "published";
          finalMessage = "Boost استلم طلب النشر وتم تحديث الكرت إلى Published.";
        } else {
          const details = await publisherResponse.text().catch(() => "");
          const { data: failed } = await s.from("marketing_content_queue").update({ status: "failed", error_message: `Boost Publisher رفض الطلب: ${publisherResponse.status} ${details.slice(0, 180)}`, updated_at: new Date().toISOString() }).eq("id", id).eq("company_id", companyId).select("*").maybeSingle();
          if (failed) finalItem = failed;
          finalStatus = "failed";
          finalMessage = "Boost Publisher رفض الطلب. شوف رسالة الخطأ بالكرت.";
        }
      } catch (err) {
        const { data: failed } = await s.from("marketing_content_queue").update({ status: "failed", error_message: "ما قدرت أوصل لBoost Publisher. جرّب Publish مرة ثانية.", updated_at: new Date().toISOString() }).eq("id", id).eq("company_id", companyId).select("*").maybeSingle();
        if (failed) finalItem = failed;
        finalStatus = "failed";
        finalMessage = "ما قدرت أوصل لBoost Publisher.";
        console.error("Marketing publish webhook failed", err);
      }
    }

    await s.from("ai_agent_runs").insert({
      company_id: companyId,
      agent_key: "ai_marketing",
      action: `content_${action}`,
      status: finalStatus === "failed" ? "failed" : "completed",
      input: { content_id: id, action, scheduled_for: body.scheduled_for || null, platforms: body.platforms || data.platforms || [data.channel] },
      output: { content_id: id, status: finalStatus, platforms: data.platforms || [data.channel], error_message: finalItem.error_message || null },
      error_message: finalItem.error_message || null,
      completed_at: now,
    });

    return Response.json({ item: finalItem, message: finalMessage });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "صار خطأ بتحديث المحتوى. جرّب Refresh أو ارجع ولّد Draft جديد." }, { status: 500 });
  }
}
