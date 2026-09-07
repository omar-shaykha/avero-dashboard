import { createClient } from "@supabase/supabase-js";
import { getAuthorizationContext } from "@/lib/auth/authorization";
import sharp from "sharp";

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Missing Supabase configuration");
  return createClient(url, key);
}

export async function POST(request: Request) {
  try {
    const access = await getAuthorizationContext();
    const companyId = access?.profile.company_id;
    if (!access || !companyId) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return Response.json({ error: "Image is required" }, { status: 400 });
    if (!file.type.startsWith("image/")) return Response.json({ error: "Only image files are allowed" }, { status: 400 });
    if (file.size > 8 * 1024 * 1024) return Response.json({ error: "Image is too large (max 8MB)" }, { status: 400 });

    const input = Buffer.from(await file.arrayBuffer());
    const optimized = await sharp(input)
      .rotate()
      .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();

    const path = `${companyId}/${crypto.randomUUID()}.webp`;
    const s = db();
    const { error } = await s.storage.from("pos-product-images").upload(path, optimized, {
      contentType: "image/webp",
      cacheControl: "31536000",
      upsert: false,
    });
    if (error) throw error;
    const { data } = s.storage.from("pos-product-images").getPublicUrl(path);
    return Response.json({ ok: true, url: data.publicUrl });
  } catch (e) {
    console.error(e);
    return Response.json({ error: e instanceof Error ? e.message : "Image upload failed" }, { status: 500 });
  }
}
