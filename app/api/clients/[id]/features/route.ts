import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthorizationContext, isSuperAdmin } from "@/lib/auth/authorization";

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!);
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await getAuthorizationContext();
  if (!isSuperAdmin(access)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const supabase = admin();
  const [{ data: features, error: fError }, { data: assigned, error: aError }, { data: company }] = await Promise.all([
    supabase.from("features").select("id,key").order("key"),
    supabase.from("company_features").select("feature_id,enabled,expires_at").eq("company_id", id),
    supabase.from("companies").select("id,name").eq("id", id).maybeSingle(),
  ]);
  if (fError || aError) return NextResponse.json({ error: "Could not load access configuration" }, { status: 500 });
  const assignedMap = new Map((assigned || []).map((row) => [row.feature_id, row]));
  return NextResponse.json({
    company,
    features: (features || []).map((feature) => ({ ...feature, enabled: assignedMap.get(feature.id)?.enabled ?? false, expires_at: assignedMap.get(feature.id)?.expires_at ?? null })),
  });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await getAuthorizationContext();
  if (!isSuperAdmin(access)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const body = await request.json();
  const featureId = body.feature_id as string | undefined;
  const enabled = Boolean(body.enabled);
  const expiresAt = body.expires_at || null;
  if (!featureId) return NextResponse.json({ error: "feature_id is required" }, { status: 400 });

  const supabase = admin();
  const { data: existing } = await supabase.from("company_features").select("feature_id").eq("company_id", id).eq("feature_id", featureId).maybeSingle();
  let error;
  if (existing) {
    ({ error } = await supabase.from("company_features").update({ enabled, expires_at: expiresAt }).eq("company_id", id).eq("feature_id", featureId));
  } else {
    ({ error } = await supabase.from("company_features").insert({ company_id: id, feature_id: featureId, enabled, expires_at: expiresAt }));
  }
  if (error) return NextResponse.json({ error: "Could not update access" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
