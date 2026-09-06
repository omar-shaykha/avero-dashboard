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
    const age = body.age === "" || body.age == null ? null : Number(body.age);
    if (age !== null && (!Number.isInteger(age) || age < 0 || age > 130)) return Response.json({ error: "Invalid age" }, { status: 400 });

    const profile = {
      full_name: clean(body.full_name) || null,
      username: clean(body.username) || null,
      nickname: clean(body.nickname) || null,
      age,
      talents: clean(body.talents) || null,
      job_title: clean(body.job_title) || null,
      bio: clean(body.bio) || null,
      avatar_url: clean(body.avatar_url) || null,
      updated_at: new Date().toISOString(),
    };

    const { data: existing, error: lookupError } = await ctx.admin.from("user_profiles").select("user_id,company_id,role").eq("user_id", ctx.user.id).maybeSingle();
    if (lookupError) return Response.json({ error: "Failed to locate profile" }, { status: 500 });
    if (!existing) return Response.json({ error: "Profile record not configured" }, { status: 409 });

    const { data, error } = await ctx.admin.from("user_profiles").update(profile).eq("user_id", ctx.user.id).select("user_id,company_id,role,full_name,username,nickname,age,talents,job_title,bio,avatar_url,updated_at").single();
    if (error) {
      console.error("Profile database error:", error);
      return Response.json({ error: error.code === "23505" ? "Username already in use" : "Failed to save profile" }, { status: error.code === "23505" ? 409 : 500 });
    }

    const metadata = { full_name: data.full_name, username: data.username, nickname: data.nickname, age: data.age, talents: data.talents, job_title: data.job_title, bio: data.bio, avatar_url: data.avatar_url };
    const { error: authError } = await ctx.admin.auth.admin.updateUserById(ctx.user.id, { user_metadata: metadata });
    if (authError) console.error("Profile auth metadata sync error:", authError);

    return Response.json({ ok: true, profile: data });
  } catch (error) {
    console.error("Profile PUT error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
