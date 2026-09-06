import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthorizationContext, isKingAdmin } from "@/lib/auth/authorization";

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Missing Supabase configuration");
  return createClient(url, key);
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const access = await getAuthorizationContext();
    if (!access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isKingAdmin(access)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const supabase = admin();
    const [featuresResult, assignedResult, companyResult] = await Promise.all([
      supabase.from("features").select("id,key").order("key"),
      supabase.from("company_features").select("feature_id,enabled,expires_at").eq("company_id", id),
      supabase.from("companies").select("id,name").eq("id", id).maybeSingle(),
    ]);

    if (featuresResult.error || assignedResult.error || companyResult.error) return NextResponse.json({ error: "Could not load access configuration" }, { status: 500 });
    if (!companyResult.data) return NextResponse.json({ error: "Company not found" }, { status: 404 });

    const assignedMap = new Map((assignedResult.data || []).map((row) => [row.feature_id, row]));
    return NextResponse.json({ company: companyResult.data, features: (featuresResult.data || []).map((feature) => ({ ...feature, enabled: assignedMap.get(feature.id)?.enabled ?? false, expires_at: assignedMap.get(feature.id)?.expires_at ?? null })) });
  } catch (error) {
    console.error("Client feature GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const access = await getAuthorizationContext();
    if (!access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isKingAdmin(access)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const body = await request.json();
    const featureId = typeof body.feature_id === "string" ? body.feature_id.trim() : "";
    if (!featureId) return NextResponse.json({ error: "feature_id is required" }, { status: 400 });
    if (typeof body.enabled !== "boolean") return NextResponse.json({ error: "enabled must be boolean" }, { status: 400 });

    let expiresAt: string | null = null;
    if (body.expires_at != null && body.expires_at !== "") {
      const parsed = new Date(body.expires_at);
      if (Number.isNaN(parsed.getTime())) return NextResponse.json({ error: "Invalid expires_at" }, { status: 400 });
      expiresAt = parsed.toISOString();
    }

    const supabase = admin();
    const [{ data: company, error: companyError }, { data: feature, error: featureError }] = await Promise.all([
      supabase.from("companies").select("id").eq("id", id).maybeSingle(),
      supabase.from("features").select("id").eq("id", featureId).maybeSingle(),
    ]);
    if (companyError || featureError) return NextResponse.json({ error: "Could not validate access update" }, { status: 500 });
    if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });
    if (!feature) return NextResponse.json({ error: "Feature not found" }, { status: 404 });

    const { data: existing, error: existingError } = await supabase.from("company_features").select("feature_id").eq("company_id", id).eq("feature_id", featureId).maybeSingle();
    if (existingError) return NextResponse.json({ error: "Could not update access" }, { status: 500 });
    const result = existing ? await supabase.from("company_features").update({ enabled: body.enabled, expires_at: expiresAt }).eq("company_id", id).eq("feature_id", featureId) : await supabase.from("company_features").insert({ company_id: id, feature_id: featureId, enabled: body.enabled, expires_at: expiresAt });
    if (result.error) return NextResponse.json({ error: "Could not update access" }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Client feature PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
