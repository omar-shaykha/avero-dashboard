import type { SupabaseClient } from "@supabase/supabase-js";

export type PublishingResult = {
  platform: string;
  status: "published" | "needs_connection" | "needs_media" | "needs_connector" | "failed";
  id?: string;
  note?: string;
};

const GRAPH_VERSION = process.env.META_GRAPH_VERSION || "v24.0";

function captionWithTags(item: Record<string, any>) {
  const tags = Array.isArray(item.hashtags)
    ? item.hashtags.map((tag: string) => `#${String(tag).replace(/^#/, "")}`).join(" ")
    : "";
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

async function connection(s: SupabaseClient, companyId: string, platform: string) {
  const { data } = await s.from("company_social_connections")
    .select("platform,external_account_id,connection_status,direct_publishing_enabled,metadata")
    .eq("company_id", companyId)
    .eq("platform", platform)
    .maybeSingle();

  let token: string | null = null;
  if (data?.direct_publishing_enabled) {
    const tokenResult = await s.rpc("marketing_get_social_token", {
      p_company_id: companyId,
      p_platform: platform,
    });
    token = typeof tokenResult.data === "string" && tokenResult.data.trim() ? tokenResult.data : null;
  }

  return {
    id: data?.external_account_id || null,
    token,
    connected: data?.connection_status === "connected",
    source: data?.metadata?.source || null,
    publisherWebhook: data?.metadata?.publisher_webhook_url || null,
  };
}

async function publishViaMake(
  webhook: string,
  companyId: string,
  item: Record<string, any>,
  platforms: string[],
  mediaUrl: string | null,
) {
  const res = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      company_id: companyId,
      content_id: item.id,
      action: "publish",
      platforms,
      caption: item.caption || "",
      media_url: mediaUrl,
    }),
    signal: AbortSignal.timeout(90000),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.message || json?.error || `Make Publisher failed ${res.status}`);
  return json;
}

export async function publishMarketingContent(
  s: SupabaseClient,
  companyId: string,
  item: Record<string, any>,
  platforms: string[],
  mediaUrl: string | null,
): Promise<PublishingResult[]> {
  const requested = [...new Set(platforms.map((p) => String(p).toLowerCase()).filter(Boolean))];
  const results: PublishingResult[] = [];
  const caption = captionWithTags(item);
  const fb = await connection(s, companyId, "facebook");
  const ig = await connection(s, companyId, "instagram");

  if (requested.includes("facebook")) {
    const pageId = fb.id || process.env.META_FACEBOOK_PAGE_ID || null;
    const pageToken = fb.token || process.env.META_FACEBOOK_PAGE_ACCESS_TOKEN || null;
    if (pageId && pageToken) {
      const published = mediaUrl
        ? await graphPost(`${pageId}/photos`, { url: mediaUrl, caption, access_token: pageToken })
        : await graphPost(`${pageId}/feed`, { message: caption, access_token: pageToken });
      results.push({ platform: "facebook", status: "published", id: String(published.post_id || published.id || "facebook-post") });
    } else {
      results.push({ platform: "facebook", status: "needs_connection", note: "Facebook direct token is not available." });
    }
  }

  if (requested.includes("instagram")) {
    const igId = ig.id || process.env.META_INSTAGRAM_ACCOUNT_ID || null;
    const igToken = ig.token || fb.token || process.env.META_INSTAGRAM_ACCESS_TOKEN || process.env.META_FACEBOOK_PAGE_ACCESS_TOKEN || null;
    if (!mediaUrl) {
      results.push({ platform: "instagram", status: "needs_media", note: "Instagram requires a public image/video URL." });
    } else if (igId && igToken) {
      const container = await graphPost(`${igId}/media`, { image_url: mediaUrl, caption: caption.slice(0, 2200), access_token: igToken });
      const published = await graphPost(`${igId}/media_publish`, { creation_id: String(container.id), access_token: igToken });
      results.push({ platform: "instagram", status: "published", id: String(published.id || "instagram-post") });
    } else {
      results.push({ platform: "instagram", status: "needs_connection", note: "Instagram direct token is not available." });
    }
  }

  const makeEligible = results
    .filter((r) => ["facebook", "instagram"].includes(r.platform) && r.status !== "published")
    .map((r) => r.platform)
    .filter((platform) => {
      const c = platform === "facebook" ? fb : ig;
      return c.connected && c.source === "make" && !!c.publisherWebhook && (platform !== "instagram" || !!mediaUrl);
    });

  if (makeEligible.length) {
    const webhook = (makeEligible.includes("facebook") ? fb.publisherWebhook : ig.publisherWebhook) as string;
    try {
      await publishViaMake(webhook, companyId, item, makeEligible, mediaUrl);
      for (const platform of makeEligible) {
        const index = results.findIndex((r) => r.platform === platform);
        const replacement: PublishingResult = {
          platform,
          status: "published",
          id: `make:${platform}:${item.id}`,
          note: "Published through the verified Make connection.",
        };
        if (index >= 0) results[index] = replacement;
        else results.push(replacement);
      }
    } catch (error) {
      const note = error instanceof Error ? error.message : "Make Publisher failed";
      for (const platform of makeEligible) {
        const index = results.findIndex((r) => r.platform === platform);
        const replacement: PublishingResult = { platform, status: "failed", note };
        if (index >= 0) results[index] = replacement;
        else results.push(replacement);
      }
    }
  }

  for (const platform of requested.filter((p) => !["facebook", "instagram"].includes(p))) {
    results.push({
      platform,
      status: "needs_connector",
      note: `${platform} direct publishing is not connected yet.`,
    });
  }

  return results;
}
