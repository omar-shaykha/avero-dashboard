import { createClient } from "@supabase/supabase-js";
import { canAccess, getAuthorizationContext, isKingAdmin } from "@/lib/auth/authorization";

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Missing Supabase configuration");
  return createClient(url, key);
}

const platforms = ["facebook", "instagram", "tiktok", "snapchat"] as const;
const GRAPH_VERSION = process.env.META_GRAPH_VERSION || "v24.0";

async function verifyMetaAccount(platform: string, externalId: string, token: string) {
  const fields = platform === "instagram" ? "id,username" : "id,name";
  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(externalId)}`);
  url.searchParams.set("fields", fields);
  url.searchParams.set("access_token", token);
  const res = await fetch(url, { cache: "no-store" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error?.message || `Meta verification failed (${res.status})`);
  if (String(json?.id || "") !== externalId) throw new Error("Meta account ID does not match the token.");
  return json;
}

export async function GET() {
  try {
    const ctx = await getAuthorizationContext();
    if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (!canAccess(ctx, "ai_marketing", "marketing.view")) return Response.json({ error: "Forbidden" }, { status: 403 });
    const companyId = ctx.profile.company_id;
    if (!companyId) return Response.json({ error: "Company not configured" }, { status: 409 });

    const { data, error } = await db()
      .from("company_social_connections")
      .select("id,platform,account_name,external_account_id,connection_status,health_status,page_url,permissions,last_sync_at,connected_at,updated_at,direct_publishing_enabled,metadata")
      .eq("company_id", companyId)
      .in("platform", [...platforms]);

    if (error) return Response.json({ error: "Failed to load social connections" }, { status: 500 });
    const byPlatform = new Map((data || []).map((row) => [row.platform, row]));
    const connections = platforms.map((platform) => {
      const row = byPlatform.get(platform) as any;
      if (!row) return {
        platform,
        account_name: null,
        external_account_id: null,
        connection_status: "pending",
        health_status: "not_connected",
        direct_publishing_enabled: false,
        source: null,
        page_url: null,
        permissions: [],
        connected_at: null,
        last_sync_at: null,
      };
      return {
        ...row,
        source: row.metadata?.source || null,
        metadata: undefined,
      };
    });
    return Response.json({ connections });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getAuthorizationContext();
    if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (!(isKingAdmin(ctx) || canAccess(ctx, "ai_marketing", "marketing.manage"))) return Response.json({ error: "Forbidden" }, { status: 403 });
    const companyId = ctx.profile.company_id;
    if (!companyId) return Response.json({ error: "Company not configured" }, { status: 409 });

    const body = await request.json();
    const platform = String(body.platform || "").toLowerCase();
    if (!platforms.includes(platform as any)) return Response.json({ error: "Unsupported platform" }, { status: 400 });

    const s = db();
    const accessToken = String(body.access_token || "").trim();
    const externalId = String(body.external_account_id || "").trim();

    if (accessToken) {
      if (!["facebook", "instagram"].includes(platform)) {
        return Response.json({ error: `${platform} direct publishing is not enabled yet.` }, { status: 400 });
      }
      if (!externalId) return Response.json({ error: "Account/Page ID is required." }, { status: 400 });

      let verified: any;
      try {
        verified = await verifyMetaAccount(platform, externalId, accessToken);
      } catch (error) {
        return Response.json({ error: error instanceof Error ? error.message : "Meta token verification failed." }, { status: 400 });
      }

      const accountName = platform === "instagram"
        ? (verified?.username ? `@${verified.username}` : String(body.account_name || "Instagram"))
        : String(verified?.name || body.account_name || "Facebook Page");

      const { error: vaultError } = await s.rpc("marketing_store_social_token", {
        p_company_id: companyId,
        p_platform: platform,
        p_token: accessToken,
        p_external_account_id: externalId,
        p_account_name: accountName,
      });
      if (vaultError) {
        console.error("Social token vault error", vaultError);
        return Response.json({ error: "Could not save the publishing credential securely." }, { status: 500 });
      }

      const { data: connection, error } = await s
        .from("company_social_connections")
        .select("id,platform,account_name,external_account_id,connection_status,health_status,page_url,permissions,last_sync_at,connected_at,updated_at,direct_publishing_enabled")
        .eq("company_id", companyId)
        .eq("platform", platform)
        .single();
      if (error) return Response.json({ error: "Credential saved, but the connection could not be reloaded." }, { status: 500 });
      return Response.json({ connection, verified: true });
    }

    const now = new Date().toISOString();
    const payload = {
      company_id: companyId,
      platform,
      account_name: String(body.account_name || "").slice(0, 180) || null,
      external_account_id: externalId.slice(0, 240) || null,
      page_url: String(body.page_url || "").slice(0, 1000) || null,
      connection_status: body.connection_status === "connected" ? "connected" : "pending",
      health_status: body.connection_status === "connected" ? "ready" : "not_connected",
      permissions: Array.isArray(body.permissions) ? body.permissions.map((p: unknown) => String(p).slice(0, 80)).slice(0, 20) : [],
      connected_at: body.connection_status === "connected" ? now : null,
      last_sync_at: now,
      updated_at: now,
    };

    const { data, error } = await s
      .from("company_social_connections")
      .upsert(payload, { onConflict: "company_id,platform" })
      .select("id,platform,account_name,external_account_id,connection_status,health_status,page_url,permissions,last_sync_at,connected_at,updated_at,direct_publishing_enabled")
      .single();

    if (error) return Response.json({ error: "Failed to save social connection" }, { status: 500 });
    return Response.json({ connection: data });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
