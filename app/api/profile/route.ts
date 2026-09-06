import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

async function context() {
  const auth = await createServerClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Missing Supabase configuration");
  return { user, admin: createAdminClient(url, key) };
}

const clean = (value: unknown) => typeof value === "string" ? value.trim() : "";

export async function GET() {
  try {
    const ctx = await context();
    if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const { data, error } = await ctx.admin.from("user_profiles").select("user_id,company_id,role,full_name,username,nickname,age,talents,job_title,bio,avatar_url").eq("user_id", ctx.user.id).maybeSingle();
    if (error) return Response.json({ error: "Failed to load profile" }, { status: 500 });
    const m = ctx.user.user_metadata || {};
    return Response.json({
      email: ctx.user.email || "",
      ...(data || {}),
      full_name: data?.full_name ?? m.full_name ?? "",
      username: data?.username ?? m.username ?? "",
      nickname: data?.nickname ?? m.nickname ?? "",
      age: data?.age ?? m.age ?? null,
      talents: data?.talents ?? m.talents ?? "",
      job_title: data?.job_title ?? m.job_title ?? "",
      bio: data?.bio ?? m.bio ?? "",
      avatar_url: data?.avatar_url ?? m.avatar_url ?? "",
    });
  } catch (error) {
    console.error("Profile GET error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const ctx = await context();
    if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const body = await request.json();

    const { data: existing, error: lookupError } = await ctx.admin.from("user_profiles").select("user_id,company_id,role,full_name,username,nickname,age,talents,job_title,bio,avatar_url").eq("user_id", ctx.user.id).maybeSingle();
    if (lookupError) return Response.json({ error: "Failed to locate profile" }, { status: 500 });
    if (!existing) return Response.json({ error: "Profile record not configured" }, { status: 409 });

    // Client-controlled identity: nickname only. Company-managed identity and permissions stay fixed.
    const nickname = clean(body.nickname) || null;
    const { data, error } = await ctx.admin.from("user_profiles").update({ nickname, updated_at: new Date().toISOString() }).eq("user_id", ctx.user.id).select("user_id,company_id,role,full_name,username,nickname,age,talents,job_title,bio,avatar_url,updated_at").single();
    if (error) {
      console.error("Profile database error:", error);
      return Response.json({ error: "Failed to save nickname" }, { status: 500 });
    }

    const currentMetadata = ctx.user.user_metadata || {};
    const { error: authError } = await ctx.admin.auth.admin.updateUserById(ctx.user.id, { user_metadata: { ...currentMetadata, nickname: data.nickname } });
    if (authError) console.error("Profile nickname metadata sync error:", authError);

    return Response.json({ ok: true, profile: data });
  } catch (error) {
    console.error("Profile PUT error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
