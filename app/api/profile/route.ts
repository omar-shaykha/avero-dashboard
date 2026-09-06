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

export async function GET() {
  try {
    const ctx = await context();
    if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const { data, error } = await ctx.admin.from("user_profiles").select("user_id,company_id,role,full_name,username,nickname,age,talents,job_title,bio,avatar_url").eq("user_id",ctx.user.id).maybeSingle();
    if (error) return Response.json({ error: "Failed to load profile" }, { status: 500 });
    return Response.json({
      email: ctx.user.email || "",
      ...(data || {}),
      full_name: data?.full_name || ctx.user.user_metadata?.full_name || "",
      username: data?.username || ctx.user.user_metadata?.username || "",
      nickname: data?.nickname || ctx.user.user_metadata?.nickname || "",
      age: data?.age ?? ctx.user.user_metadata?.age ?? null,
      talents: data?.talents || ctx.user.user_metadata?.talents || "",
      job_title: data?.job_title || ctx.user.user_metadata?.job_title || "",
      bio: data?.bio || ctx.user.user_metadata?.bio || "",
      avatar_url: data?.avatar_url || ctx.user.user_metadata?.avatar_url || "",
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
    const profile = {
      full_name: String(body.full_name || "").trim() || null,
      username: String(body.username || "").trim() || null,
      nickname: String(body.nickname || "").trim() || null,
      age: body.age === "" || body.age == null ? null : Number(body.age),
      talents: String(body.talents || "").trim() || null,
      job_title: String(body.job_title || "").trim() || null,
      bio: String(body.bio || "").trim() || null,
      avatar_url: String(body.avatar_url || "").trim() || null,
      updated_at: new Date().toISOString(),
    };
    if (profile.age !== null && (!Number.isInteger(profile.age) || profile.age < 0 || profile.age > 130)) return Response.json({ error: "Invalid age" }, { status: 400 });

    const { data, error } = await ctx.admin.from("user_profiles").update(profile).eq("user_id",ctx.user.id).select("*").single();
    if (error) {
      console.error("Profile database error:", error);
      return Response.json({ error: error.code === "23505" ? "Username already in use" : "Failed to save profile" }, { status: error.code === "23505" ? 409 : 500 });
    }

    await ctx.admin.auth.admin.updateUserById(ctx.user.id, { user_metadata: profile });
    return Response.json(data);
  } catch (error) {
    console.error("Profile PUT error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
