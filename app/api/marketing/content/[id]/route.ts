import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { canAccess, getAuthorizationContext, isKingAdmin } from "@/lib/auth/authorization";
import sharp from "sharp";

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Missing Supabase configuration");
  return createClient(url, key);
}

function esc(value: unknown) {
  return String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;");
}

function words(text: string, max = 14) {
  return text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean).slice(0, max).join(" ");
}

function makeSvg(input: { title: string; subtitle: string; brand: string }) {
  return `<svg width="1080" height="1080" viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="g" cx="25%" cy="15%" r="80%"><stop offset="0" stop-color="#123A55"/><stop offset=".48" stop-color="#061427"/><stop offset="1" stop-color="#020617"/></radialGradient><linearGradient id="c" x1="0" x2="1"><stop stop-color="#22D3EE"/><stop offset="1" stop-color="#14B8A6"/></linearGradient><filter id="glow"><feGaussianBlur stdDeviation="10" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><rect width="1080" height="1080" fill="url(#g)"/><circle cx="840" cy="170" r="230" fill="#22D3EE" opacity=".12"/><circle cx="150" cy="895" r="260" fill="#14B8A6" opacity=".11"/><rect x="80" y="80" width="920" height="920" rx="58" fill="none" stroke="#22D3EE" stroke-opacity=".32" stroke-width="2"/><path d="M140 308 C285 190 385 420 548 315 C700 220 785 318 940 250" fill="none" stroke="#22D3EE" stroke-width="3" opacity=".55"/><text x="125" y="148" fill="#67E8F9" font-size="20" font-family="Arial, sans-serif" font-weight="900" letter-spacing="7">${esc(input.brand)}</text><foreignObject x="125" y="260" width="830" height="250"><div xmlns="http://www.w3.org/1999/xhtml" style="font-family:Arial,sans-serif;color:#F8FAFC;font-size:76px;line-height:1.03;font-weight:900;letter-spacing:-2px;">${esc(words(input.title, 10))}</div></foreignObject><foreignObject x="125" y="535" width="820" height="220"><div xmlns="http://www.w3.org/1999/xhtml" style="font-family:Arial,sans-serif;color:#CBD5E1;font-size:34px;line-height:1.38;font-weight:650;">${esc(words(input.subtitle, 30))}</div></foreignObject><g filter="url(#glow)"><rect x="125" y="780" width="830" height="120" rx="34" fill="#031525" stroke="#22D3EE" stroke-opacity=".36"/><circle cx="190" cy="840" r="24" fill="url(#c)"/><text x="235" y="832" fill="#E0F2FE" font-size="26" font-family="Arial, sans-serif" font-weight="900">AI Operating System for Businesses</text><text x="235" y="866" fill="#67E8F9" font-size="18" font-family="Arial, sans-serif" letter-spacing="4">CRM · POS · INVENTORY · HR · MARKETING</text></g><text x="125" y="950" fill="#22D3EE" font-size="22" font-family="Arial, sans-serif" font-weight="900" letter-spacing="7">THE BUSINESS OPERATING SYSTEM</text></svg>`;
}

async function ensureMediaUrl(s: SupabaseClient, item: Record<string, any>, companyId: string) {
  if (item.media_url) return { item, mediaUrl: item.media_url, generated: false };
  const { data: brandKit } = await s.from("company_marketing_brand_kits").select("brand_name").eq("company_id", companyId).maybeSingle();
  const image = await sharp(Buffer.from(makeSvg({ title: item.campaign_name || "AVERO OS", subtitle: item.metrics?.visual_idea || item.caption || "One command turns work into results.", brand: brandKit?.brand_name || "AVERO OS" }))).jpeg({ quality: 88, mozjpeg: true }).toBuffer();
  const path = `${companyId}/${item.id}-${Date.now()}.jpg`;
  const uploaded = await s.storage.from("marketing-media").upload(path, image, { contentType: "image/jpeg", upsert: true });
  if (uploaded.error) throw uploaded.error;
  const { data } = s.storage.from("marketing-media").getPublicUrl(path);
  const mediaUrl = data.publicUrl;
  const { data: updated, error } = await s.from("marketing_content_queue").update({ media_url: mediaUrl, updated_at: new Date().toISOString(), metrics: { ...(item.metrics || {}), generated_media: "avero_template_jpeg", generated_media_at: new Date().toISOString() } }).eq("id", item.id).eq("company_id", companyId).select("*").maybeSingle();
  if (error) throw new Error("Could not save generated media URL");
  return { item: updated || { ...item, media_url: mediaUrl }, mediaUrl, generated: true };
}

const allowedActions = new Set(["approve", "schedule", "publish", "approve_publish", "reject", "draft", "duplicate"]);
const GRAPH_VERSION = process.env.META_GRAPH_VERSION || "v24.0";

function asPlatforms(value: unknown, fallback: string[]) {
  const raw = Array.isArray(value) ? value : String(value || "").split(",");
  const items = raw.map((item) => String(item).trim().toLowerCase()).filter(Boolean);
  return items.length ? items : fallback;
}

function captionWithTags(item: Record<string, any>) {
  const tags = Array.isArray(item.hashtags) ? item.hashtags.map((tag: string) => `#${String(tag).replace(/^#/, "")}`).join(" ") : "";
  return [item.caption || "", tags].filter(Boolean).join("\n\n").slice(0, 8000);
}

async function graphPost(path: string, body: Record<string, string>) {
  const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error?.message || `Meta Graph failed ${res.status}`);
  return json;
}

async function getDirectCredential(s: SupabaseClient, companyId: string, platform: string) {
  const { data: connection } = await s.from("company_social_connections")
    .select("external_account_id,direct_publishing_enabled")
    .eq("company_id", companyId)
    .eq("platform", platform)
    .maybeSingle();
  let token: string | null = null;
  if (connection?.direct_publishing_enabled) {
    const { data } = await s.rpc("marketing_get_social_token", { p_company_id: companyId, p_platform: platform });
    token = typeof data === "string" && data.trim() ? data : null;
  }
  return { id: connection?.external_account_id || null, token };
}

async function directMetaPublish(s: SupabaseClient, companyId: string, item: Record<string, any>, platforms: string[], mediaUrl: string | null) {
  const fb = await getDirectCredential(s, companyId, "facebook");
  const ig = await getDirectCredential(s, companyId, "instagram");
  const pageId = fb.id || process.env.META_FACEBOOK_PAGE_ID || null;
  const igId = ig.id || process.env.META_INSTAGRAM_ACCOUNT_ID || null;
  const pageToken = fb.token || process.env.META_FACEBOOK_PAGE_ACCESS_TOKEN || null;
  const igToken = ig.token || pageToken || process.env.META_INSTAGRAM_ACCESS_TOKEN || null;
  const results: Array<{ platform: string; status: string; id?: string; note?: string }> = [];
  const caption = captionWithTags(item);

  if (platforms.includes("facebook")) {
    if (!pageId || !pageToken) results.push({ platform: "facebook", status: "needs_connection", note: "Connect Facebook Direct Publishing in Foxy Channels." });
    else {
      const published = mediaUrl
        ? await graphPost(`${pageId}/photos`, { url: mediaUrl, caption, access_token: pageToken })
        : await graphPost(`${pageId}/feed`, { message: caption, access_token: pageToken });
      results.push({ platform: "facebook", status: "published", id: String(published.post_id || published.id || "facebook-post") });
    }
  }

  if (platforms.includes("instagram")) {
    if (!igId || !igToken) results.push({ platform: "instagram", status: "needs_connection", note: "Connect Instagram Direct Publishing in Foxy Channels." });
    else if (!mediaUrl) results.push({ platform: "instagram", status: "needs_media", note: "Instagram requires a public image/video URL." });
    else {
      const container = await graphPost(`${igId}/media`, { image_url: mediaUrl, caption: caption.slice(0, 2200), access_token: igToken });
      const published = await graphPost(`${igId}/media_publish`, { creation_id: String(container.id), access_token: igToken });
      results.push({ platform: "instagram", status: "published", id: String(published.id || "instagram-post") });
    }
  }

  for (const platform of platforms.filter((p) => !["facebook", "instagram"].includes(p))) {
    results.push({ platform, status: "needs_connector", note: `${platform} direct publishing is not connected yet.` });
  }
  return results;
}

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
      const { data: item, error } = await s.from("marketing_content_queue").insert({ ...copy, created_by: ctx.user.id, campaign_name: `${String(original.campaign_name || "Content").slice(0, 150)} - Repost`, status: "approval_required", scheduled_for: null, approved_by: null, approved_at: null, published_at: null, external_post_id: null, error_message: null, metrics: { ...(original.metrics || {}), source: "repost_duplicate", repost_of: id }, updated_at: now }).select("*").single();
      if (error) return Response.json({ error: "Could not create repost draft" }, { status: 500 });
      return Response.json({ item, message: "تم إنشاء نسخة Repost بانتظار موافقتك." });
    }

    const update: Record<string, unknown> = { updated_at: now };
    const hasApprovalNotes = Object.prototype.hasOwnProperty.call(body, "approval_notes");
    let message = "تم حفظ التعديل.";

    if (action === "approve") { update.status = "approved"; update.approved_by = ctx.user.id; update.approved_at = now; if (hasApprovalNotes) update.approval_notes = String(body.approval_notes || "").slice(0, 2000) || null; message = "تمت الموافقة على المحتوى."; }
    if (action === "schedule") { update.status = "scheduled"; update.scheduled_for = body.scheduled_for ? new Date(body.scheduled_for).toISOString() : null; update.approved_by = ctx.user.id; update.approved_at = now; if (hasApprovalNotes) update.approval_notes = String(body.approval_notes || "").slice(0, 2000) || null; message = "تمت جدولة المحتوى."; }
    if (action === "reject") { update.status = "rejected"; update.approval_notes = String(body.approval_notes || "Rejected by reviewer").slice(0, 2000); message = "تم رفض المحتوى."; }
    if (action === "draft") { update.status = "draft"; message = "رجع المحتوى كمسودة."; }
    if (action === "publish" || action === "approve_publish") { update.status = "publishing"; update.approved_by = ctx.user.id; update.approved_at = now; update.error_message = null; if (hasApprovalNotes) update.approval_notes = String(body.approval_notes || "").slice(0, 2000) || null; message = "AVERO Direct Publisher عم ينشر المحتوى."; }

    const { data, error } = await s.from("marketing_content_queue").update(update).eq("id", id).eq("company_id", companyId).select("*").maybeSingle();
    if (error) return Response.json({ error: "Failed to update content" }, { status: 500 });
    if (!data) return Response.json({ error: "Not found" }, { status: 404 });

    let finalItem = data;
    let finalStatus = data.status;
    let finalMessage = message;

    if (action === "publish" || action === "approve_publish") {
      const requestedPlatforms = asPlatforms(body.platforms, data.platforms || [data.channel]);
      let mediaUrl = data.media_url || null;
      let generatedMedia = false;
      if (requestedPlatforms.includes("instagram") && !mediaUrl) {
        const generated = await ensureMediaUrl(s, data, companyId);
        finalItem = generated.item;
        mediaUrl = generated.mediaUrl;
        generatedMedia = generated.generated;
      }

      try {
        const results = await directMetaPublish(s, companyId, finalItem, requestedPlatforms, mediaUrl);
        const complete = results.length > 0 && results.every((r) => r.status === "published");
        const somePublished = results.some((r) => r.status === "published");
        const nextStatus = somePublished ? "published" : "failed";
        const nextError = complete ? null : results.map((r) => `${r.platform}: ${r.status}${r.note ? ` - ${r.note}` : ""}`).join(" | ");
        const { data: saved } = await s.from("marketing_content_queue").update({
          status: nextStatus,
          published_at: somePublished ? new Date().toISOString() : null,
          external_post_id: results.filter((r) => r.id).map((r) => `${r.platform}:${r.id}`).join(",") || null,
          error_message: nextError,
          updated_at: new Date().toISOString(),
          metrics: { ...(finalItem.metrics || {}), publisher: "vercel_direct_meta", publishing_result: results, generated_media_before_publish: generatedMedia },
        }).eq("id", id).eq("company_id", companyId).select("*").maybeSingle();
        if (saved) finalItem = saved;
        finalStatus = nextStatus;
        finalMessage = complete ? "تم النشر فعلياً من داخل AVERO." : somePublished ? "تم النشر على بعض المنصات، والباقي يحتاج ربط مباشر." : "اربط Facebook / Instagram من Foxy Direct Publishing وبعدين جرّب Publish.";
      } catch (err) {
        const reason = err instanceof Error ? err.message : "Direct publisher failed";
        const { data: failed } = await s.from("marketing_content_queue").update({ status: "failed", error_message: `Direct Publisher failed: ${reason}`, updated_at: new Date().toISOString(), metrics: { ...(finalItem.metrics || {}), publisher: "vercel_direct_meta", direct_error: reason } }).eq("id", id).eq("company_id", companyId).select("*").maybeSingle();
        if (failed) finalItem = failed;
        finalStatus = "failed";
        finalMessage = "AVERO Direct Publisher فشل. شوف السبب بالكرت.";
      }
    }

    await s.from("ai_agent_runs").insert({ company_id: companyId, agent_key: "ai_marketing", action: `content_${action}`, status: finalStatus === "failed" ? "failed" : "completed", input: { content_id: id, action, scheduled_for: body.scheduled_for || null, platforms: body.platforms || data.platforms || [data.channel] }, output: { content_id: id, status: finalStatus, platforms: data.platforms || [data.channel], error_message: finalItem.error_message || null }, error_message: finalItem.error_message || null, completed_at: now });
    return Response.json({ item: finalItem, message: finalMessage });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "صار خطأ بتحديث المحتوى. جرّب Refresh أو ارجع ولّد Draft جديد." }, { status: 500 });
  }
}
