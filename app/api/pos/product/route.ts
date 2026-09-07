import { createClient } from "@supabase/supabase-js";
import { getAuthorizationContext } from "@/lib/auth/authorization";

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Missing Supabase configuration");
  return createClient(url, key);
}

const UNIT_MAP: Record<string, { name: string; symbol: string }> = {
  GRAM: { name: "Gram", symbol: "g" },
  KG: { name: "Kilogram", symbol: "kg" },
  PCS: { name: "Piece", symbol: "pcs" },
  LTR: { name: "Liter", symbol: "L" },
};

function skuCode() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}`;
  return `PRD-${ymd}-${Math.floor(1000 + Math.random() * 9000)}`;
}
function barcodeCode() {
  return `6281${String(Date.now()).slice(-8)}${Math.floor(Math.random()*10)}`;
}

async function auth() {
  const access = await getAuthorizationContext();
  const companyId = access?.profile.company_id;
  if (!access || !companyId) return null;
  return { access, companyId };
}

async function ensureUnit(companyId: string, code: string) {
  const s = db();
  const unit = UNIT_MAP[code] || UNIT_MAP.PCS;
  let { data } = await s.from("pos_units").select("id").eq("company_id", companyId).eq("symbol", unit.symbol).maybeSingle();
  if (!data) {
    const created = await s.from("pos_units").insert({ company_id: companyId, name: unit.name, symbol: unit.symbol }).select("id").single();
    if (created.error) throw created.error;
    data = created.data;
  }
  return data.id;
}

export async function POST(request: Request) {
  try {
    const a = await auth();
    if (!a) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const b = await request.json();
    const s = db();
    const name = String(b.name || "").trim();
    if (!name) return Response.json({ error: "Product / service name is required" }, { status: 400 });

    const unitCode = UNIT_MAP[String(b.unit_code || "PCS")] ? String(b.unit_code) : "PCS";
    const unitId = await ensureUnit(a.companyId, unitCode);
    const taxEnabled = b.tax_enabled === true;
    const b2c = Number(b.b2c_price ?? b.sale_price ?? 0);
    const b2b = Number(b.b2b_price ?? 0);
    const sku = String(b.sku || "").trim() || skuCode();
    const barcode = String(b.barcode || "").trim() || barcodeCode();

    const payload = {
      company_id: a.companyId,
      name,
      description: String(b.description || "").trim() || null,
      category_name: String(b.category_name || "").trim() || "General",
      category_id: null,
      unit_id: unitId,
      sku,
      barcode,
      product_type: ["stock","service","prepared","bundle"].includes(b.product_type) ? b.product_type : "stock",
      sale_price: b2c,
      b2c_price: b2c,
      b2b_price: b2b,
      cost_price: Number(b.cost_price || 0),
      tax_enabled: taxEnabled,
      tax_rate: taxEnabled ? Math.max(0, Number(b.tax_rate || 0)) : 0,
      min_stock: Number(b.min_stock || 0),
      track_stock: b.product_type === "service" ? false : b.track_stock !== false,
      image_url: String(b.image_url || "").trim() || null,
      active: b.active !== false,
      updated_at: new Date().toISOString(),
    };

    const q = b.id
      ? s.from("pos_products").update(payload).eq("company_id", a.companyId).eq("id", b.id)
      : s.from("pos_products").insert(payload);
    const { data, error } = await q.select("*").single();
    if (error) {
      if (error.code === "23505") return Response.json({ error: "SKU or barcode is already in use" }, { status: 409 });
      throw error;
    }
    return Response.json({ ok: true, item: data });
  } catch (e) {
    console.error(e);
    return Response.json({ error: e instanceof Error ? e.message : "Could not save product" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const a = await auth();
    if (!a) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await request.json();
    if (!id) return Response.json({ error: "Product id required" }, { status: 400 });
    const s = db();
    const { error } = await s.from("pos_products").update({ active: false, updated_at: new Date().toISOString() }).eq("company_id", a.companyId).eq("id", id);
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (e) {
    console.error(e);
    return Response.json({ error: e instanceof Error ? e.message : "Could not archive product" }, { status: 500 });
  }
}
