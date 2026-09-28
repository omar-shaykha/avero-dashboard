import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthorizationContext, isKingAdmin } from "@/lib/auth/authorization";

const POS_ONLY_ON = ["app_sell"];
const POS_ONLY_OFF = ["app_accounting","app_stock","app_hr","app_loyalty","app_go","app_intelligence","app_zatca","app_operations","app_manager"];

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await getAuthorizationContext();
  if (!access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isKingAdmin(access)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id: companyId } = await params;
  const db = createAdminClient();
  const { data: company, error: companyError } = await db.from("companies").select("id").eq("id", companyId).maybeSingle();
  if (companyError) return NextResponse.json({ error: companyError.message }, { status: 500 });
  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

  const keys = [...POS_ONLY_ON, ...POS_ONLY_OFF];
  const { data: features, error: featureError } = await db.from("features").select("id,key").in("key", keys);
  if (featureError) return NextResponse.json({ error: featureError.message }, { status: 500 });

  const rows = (features || []).map(feature => ({
    company_id: companyId,
    feature_id: feature.id,
    enabled: POS_ONLY_ON.includes(feature.key),
    expires_at: null,
  }));
  if (rows.length) {
    const { error } = await db.from("company_features").upsert(rows, { onConflict: "company_id,feature_id" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, preset: "pos_only" });
}
