import { createClient } from "@supabase/supabase-js";
import { canAccess, getAuthorizationContext, isKingAdmin } from "@/lib/auth/authorization";

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Missing Supabase configuration");
  return createClient(url, key);
}

const platforms = ["facebook", "instagram", "tiktok", "snapchat"];

export async function GET() {
  try {
    const ctx = await getAuthorizationContext();
    if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (!canAccess(ctx, "ai_marketing", "marketing.view")) return Response.json({ error: "Forbidden" }, { status: 403 });
    const companyId = ctx.profile.company_id;
    if (!companyId) return Response.json({ error: "Company not configured" }, { status: 409 });

    const { data, error } = await db()
      .from("company_social_connections")
      .select("id,platform,account_name,external_account_id,connection_status,health_status,page_url,permissions,last_sync_at,connected_at,updated_at")
      .eq("company_id", companyId)
      .in("platform", platforms);

    if (error) return Response.json({ error: "Failed to load social connections" }, { status: 500 });
    const byPlatform = new Map((data || []).map((row) => [row.platform, row]));
    const connections = platforms.map((platform) => byPlatform.get(platform) || {
      platform,
      account_name: null,
      external_account_id: null,
      connection_status: "pending",
      health_status: "not_connected",
      page_url: null,
      permissions: [],
      connected_at: null,
      last_sync_at: null,
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
    if (!platforms.includes(platform)) return Response.json({ error: "Unsupported platform" }, { status: 400 });

    const now = new Date().toISOString();
    const payload = {
      company_id: companyId,
      platform,
      account_name: String(body.account_name || "").slice(0, 180) || null,
      external_account_id: String(body.external_account_id || "").slice(0, 240) || null,
      page_url: String(body.page_url || "").slice(0, 1000) || null,
      connection_status: body.connection_status === "connected" ? "connected" : "pending",
      health_status: body.connection_status === "connected" ? "ready" : "not_connected",
      permissions: Array.isArray(body.permissions) ? body.permissions.map((p: unknown) => String(p).slice(0, 80)).slice(0, 20) : [],
      connected_at: body.connection_status === "connected" ? now : null,
      last_sync_at: now,
      updated_at: now,
    };

    const { data, error } = await db()
      .from("company_social_connections")
      .upsert(payload, { onConflict: "company_id,platform" })
      .select("id,platform,account_name,external_account_id,connection_status,health_status,page_url,permissions,last_sync_at,connected_at,updated_at")
      .single();

    if (error) return Response.json({ error: "Failed to save social connection" }, { status: 500 });
    return Response.json({ connection: data });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
