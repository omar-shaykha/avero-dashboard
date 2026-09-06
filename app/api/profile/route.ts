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
    const { data, error } = await ctx.admin.from("user_profiles")
      .select("user_id,company_id,role,first_name,last_name,full_name,username,nickname,age,bio,avatar_url")
      .eq("user_id", ctx.user.id).maybeSingle();
    if (error) return Response.json({ error: "Failed to load profile" }, { status: 500 });
    return Response.json({ email: ctx.user.email || "", ...(data || {}) });
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

    // Self-service identity: username and nickname are one public display handle.
    // Legal/managed first and last name are intentionally not accepted from this endpoint.
    const handle = clean(body.nickname ?? body.username) || null;
    const email = clean(body.email).toLowerCase();
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) return Response.json({ error: "Invalid email" }, { status: 400 });

    const profileUpdate = {
      username: handle,
      nickname: handle,
      age,
      bio: clean(body.bio) || null,
      updated_at: new Date().toISOString(),
    };

    const { data: existing, error: lookupError } = await ctx.admin.from("user_profiles")
      .select("user_id,first_name,last_name,full_name").eq("user_id", ctx.user.id).maybeSingle();
    if (lookupError) return Response.json({ error: "Failed to locate profile" }, { status: 500 });
    if (!existing) return Response.json({ error: "Profile record not configured" }, { status: 409 });

    const { data: profile, error: profileError } = await ctx.admin.from("user_profiles")
      .update(profileUpdate).eq("user_id", ctx.user.id)
      .select("user_id,company_id,role,first_name,last_name,full_name,username,nickname,age,bio,avatar_url,updated_at").single();
    if (profileError) {
      console.error("Profile database error:", profileError);
      return Response.json({ error: profileError.code === "23505" ? "Username already in use" : "Failed to save profile" }, { status: profileError.code === "23505" ? 409 : 500 });
    }

    const metadata = { ...(ctx.user.user_metadata || {}), username: profile.username, nickname: profile.nickname, age: profile.age, bio: profile.bio, avatar_url: profile.avatar_url };
    const authChanges: { email?: string; user_metadata: Record<string, unknown>; email_confirm?: boolean } = { user_metadata: metadata };
    if (email !== (ctx.user.email || "").toLowerCase()) { authChanges.email = email; authChanges.email_confirm = true; }
    const { data: authData, error: authError } = await ctx.admin.auth.admin.updateUserById(ctx.user.id, authChanges);
    if (authError) {
      console.error("Profile auth update error:", authError);
      return Response.json({ error: "Profile saved but email update failed" }, { status: 500 });
    }

    return Response.json({ ok: true, email: authData.user.email || email, profile });
  } catch (error) {
    console.error("Profile PUT error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
