import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const auth = await createServerClient();
    const { data: { user } } = await auth.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY;
    if (!url || !key) return NextResponse.json({ error: "Missing Supabase configuration" }, { status: 500 });

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (!ALLOWED_TYPES.has(file.type)) return NextResponse.json({ error: "Only PNG, JPEG, and WebP images are allowed" }, { status: 400 });
    if (file.size <= 0 || file.size > MAX_FILE_SIZE) return NextResponse.json({ error: "Image must be under 5MB" }, { status: 400 });

    const supabase = createAdminClient(url, key);
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (profileError || !profile) return NextResponse.json({ error: "Profile record not configured" }, { status: 409 });

    const bucket = "avatars";
    const { data: buckets, error: bucketListError } = await supabase.storage.listBuckets();
    if (bucketListError) return NextResponse.json({ error: "Could not access avatar storage" }, { status: 500 });
    if (!buckets?.some((b) => b.name === bucket)) {
      const { error } = await supabase.storage.createBucket(bucket, {
        public: true,
        fileSizeLimit: MAX_FILE_SIZE,
        allowedMimeTypes: [...ALLOWED_TYPES],
      });
      if (error) return NextResponse.json({ error: "Could not initialize avatar storage" }, { status: 500 });
    }

    const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${user.id}/avatar.${extension}`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage.from(bucket).upload(path, bytes, {
      contentType: file.type,
      upsert: true,
      cacheControl: "3600",
    });
    if (uploadError) return NextResponse.json({ error: "Avatar upload failed" }, { status: 500 });

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    const avatarUrl = `${data.publicUrl}?v=${Date.now()}`;
    const { error: saveError } = await supabase
      .from("user_profiles")
      .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);
    if (saveError) return NextResponse.json({ error: "Avatar uploaded but profile could not be updated" }, { status: 500 });

    const metadata = { ...(user.user_metadata || {}), avatar_url: avatarUrl };
    const { error: authError } = await supabase.auth.admin.updateUserById(user.id, { user_metadata: metadata });
    if (authError) console.error("Avatar metadata sync error:", authError);

    return NextResponse.json({ url: avatarUrl });
  } catch (error) {
    console.error("Avatar upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
