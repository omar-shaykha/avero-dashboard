// @ts-nocheck
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthorizationContext } from "@/lib/auth/authorization";

function db() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });
}

export async function GET() {
  const access = await getAuthorizationContext();
  if (!access?.profile?.company_id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const companyId = access.profile.company_id;
  const s = db();
  const { data, error } = await s.from("suppliers").select("*").eq("company_id", companyId).order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ suppliers: data || [] });
}

export async function POST(req: Request) {
  const access = await getAuthorizationContext();
  if (!access?.profile?.company_id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const companyId = access.profile.company_id;
  const userId = access.user?.id;
  const body = await req.json();
  if (!String(body.name || "").trim()) return NextResponse.json({ error: "Supplier name is required" }, { status: 400 });
  const s = db();
  const code = String(body.supplier_code || "").trim() || `SUP-${Date.now().toString().slice(-7)}`;
  const payload = {
    company_id: companyId, supplier_code: code, name: String(body.name).trim(), supplier_type: body.supplier_type || "local",
    contact_person: body.contact_person || null, phone: body.phone || null, whatsapp: body.whatsapp || null, email: body.email || null,
    address: body.address || null, city: body.city || null, country: body.country || null, tax_number: body.tax_number || null,
    cr_number: body.cr_number || null, tax_enabled: !!body.tax_enabled, tax_rate: body.tax_enabled ? Number(body.tax_rate || 0) : 0,
    payment_terms_days: Number(body.payment_terms_days || 0), credit_limit: Number(body.credit_limit || 0), opening_balance: Number(body.opening_balance || 0),
    currency: body.currency || "SAR", bank_name: body.bank_name || null, iban: body.iban || null, category: body.category || null,
    lead_time_days: Number(body.lead_time_days || 0), minimum_order: Number(body.minimum_order || 0), preferred: !!body.preferred,
    status: body.status || "active", notes: body.notes || null, tags: Array.isArray(body.tags) ? body.tags : [],
    contract_start: body.contract_start || null, contract_expiry: body.contract_expiry || null, price_list_expiry: body.price_list_expiry || null,
    created_by: userId, updated_by: userId, updated_at: new Date().toISOString()
  };
  const { data, error } = await s.from("suppliers").insert(payload).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ supplier: data });
}
