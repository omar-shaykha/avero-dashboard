import { createClient } from "@supabase/supabase-js";
import { getAuthorizationContext, isKingAdmin } from "@/lib/auth/authorization";

const GRAPH_VERSION = process.env.META_GRAPH_VERSION || "v23.0";

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Missing Supabase configuration");
  return createClient(url, key);
}

async function getSecret(s: ReturnType<typeof db>, name: string) {
  const { data, error } = await s.rpc("get_avero_secret", { secret_name: name });
  if (error) throw error;
  return typeof data === "string" ? data : null;
}

export async function GET() {
  try {
    const ctx = await getAuthorizationContext();
    if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (!isKingAdmin(ctx)) return Response.json({ error: "Forbidden" }, { status: 403 });
    const s = db();
    const [accessToken, verifyToken] = await Promise.all([
      getSecret(s, "meta_whatsapp_access_token"),
      getSecret(s, "meta_whatsapp_verify_token"),
    ]);
    const { data: company } = ctx.profile.company_id
      ? await s.from("companies").select("whatsapp_phone_number_id").eq("id", ctx.profile.company_id).maybeSingle()
      : { data: null } as any;
    return Response.json({
      connected: Boolean(accessToken),
      verify_token: verifyToken,
      phone_number_id: company?.whatsapp_phone_number_id || null,
      webhook_url: "https://avero-dashboard.vercel.app/api/integrations/whatsapp/native",
      token_preview: accessToken ? `${accessToken.slice(0, 6)}••••${accessToken.slice(-4)}` : null,
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Could not load Meta connection status" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getAuthorizationContext();
    if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (!isKingAdmin(ctx)) return Response.json({ error: "Forbidden" }, { status: 403 });

    const body = await request.json();
    const accessToken = String(body.access_token || "").trim();
    const phoneNumberId = String(body.phone_number_id || "").replace(/\D/g, "");
    if (!accessToken) return Response.json({ error: "Meta access token is required" }, { status: 400 });
    if (!/^\d{6,32}$/.test(phoneNumberId)) return Response.json({ error: "Valid WhatsApp Phone Number ID is required" }, { status: 400 });

    const check = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(phoneNumberId)}?fields=id,display_phone_number,verified_name,quality_rating`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    const details = await check.json().catch(() => ({}));
    if (!check.ok) {
      return Response.json({ error: "Meta rejected this token or Phone Number ID", details }, { status: 400 });
    }

    const s = db();
    const { error: secretError } = await s.rpc("set_avero_secret", {
      secret_name: "meta_whatsapp_access_token",
      secret_value: accessToken,
      secret_description: "AVERO WhatsApp Cloud API access token",
    });
    if (secretError) throw secretError;

    if (ctx.profile.company_id) {
      const { error: companyError } = await s
        .from("companies")
        .update({ whatsapp_phone_number_id: phoneNumberId })
        .eq("id", ctx.profile.company_id);
      if (companyError) throw companyError;
    }

    return Response.json({ ok: true, connected: true, phone_number_id: phoneNumberId, meta: details });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Could not connect Meta WhatsApp" }, { status: 500 });
  }
}
