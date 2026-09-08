// @ts-nocheck
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthorizationContext, hasPermission, isKingAdmin, isTenantAdmin } from "@/lib/auth/authorization";

const db = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false },
  });

const can = (access: any, permission: string) => isKingAdmin(access) || isTenantAdmin(access) || hasPermission(access, permission);

async function ctx() {
  const a = await getAuthorizationContext();
  return a?.profile?.company_id ? { a, companyId: a.profile.company_id, s: db() } : null;
}

async function ownsSupplier(s: ReturnType<typeof db>, companyId: string, supplierId: string) {
  const { data, error } = await s
    .from("suppliers")
    .select("id")
    .eq("id", supplierId)
    .eq("company_id", companyId)
    .maybeSingle();
  return !error && !!data;
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const c = await ctx();
  if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(c.a, "suppliers.view") && !can(c.a, "suppliers.manage")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  const { data: supplier, error } = await c.s
    .from("suppliers")
    .select("*")
    .eq("id", id)
    .eq("company_id", c.companyId)
    .single();
  if (error) return NextResponse.json({ error: "Supplier not found" }, { status: 404 });

  const tables = [
    "supplier_contacts",
    "supplier_addresses",
    "supplier_items",
    "supplier_price_history",
    "supplier_documents",
    "supplier_transactions",
    "supplier_performance",
  ];
  const out: any = { supplier };
  for (const t of tables) {
    const { data } = await c.s
      .from(t)
      .select("*")
      .eq("supplier_id", id)
      .eq("company_id", c.companyId)
      .order("created_at", { ascending: false });
    out[t.replace("supplier_", "")] = data || [];
  }
  return NextResponse.json(out);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const c = await ctx();
  if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(c.a, "suppliers.manage")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  if (!(await ownsSupplier(c.s, c.companyId, id))) {
    return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
  }

  const b = await req.json();
  delete b.id;
  delete b.company_id;
  delete b.created_at;
  delete b.created_by;
  delete b.updated_by;
  b.updated_at = new Date().toISOString();
  b.updated_by = c.a.user?.id;

  if (b.tax_enabled && b.tax_rate !== undefined) {
    const taxRate = Number(b.tax_rate);
    if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) return NextResponse.json({ error: "Tax rate must be between 0 and 100" }, { status: 400 });
  }

  const { data, error } = await c.s
    .from("suppliers")
    .update(b)
    .eq("id", id)
    .eq("company_id", c.companyId)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ supplier: data });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const c = await ctx();
  if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(c.a, "suppliers.manage")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  if (!(await ownsSupplier(c.s, c.companyId, id))) {
    return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
  }

  const b = await req.json();
  const map: any = {
    contact: "supplier_contacts",
    address: "supplier_addresses",
    item: "supplier_items",
    document: "supplier_documents",
    transaction: "supplier_transactions",
    performance: "supplier_performance",
    price: "supplier_price_history",
  };
  const table = map[b.kind];
  if (!table) return NextResponse.json({ error: "Invalid record type" }, { status: 400 });

  const raw = b?.data && typeof b.data === "object" ? { ...b.data } : {};
  delete raw.id;
  delete raw.company_id;
  delete raw.supplier_id;
  delete raw.created_at;
  delete raw.updated_at;
  delete raw.created_by;
  delete raw.updated_by;

  const payload = { ...raw, company_id: c.companyId, supplier_id: id };
  const { data, error } = await c.s.from(table).insert(payload).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (b.kind === "item" && Number(payload.current_price) > 0) {
    await c.s.from("supplier_price_history").insert({
      company_id: c.companyId,
      supplier_id: id,
      supplier_item_id: data.id,
      price: Number(payload.current_price),
      currency: c.a.profile?.currency || "SAR",
      source: "item_created",
    });
  }

  return NextResponse.json({ record: data });
}
