import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const authClient = await createServerClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;
    if (!supabaseUrl || !supabaseSecretKey) return Response.json({ error: "Missing Supabase configuration" }, { status: 500 });

    const supabase = createClient(supabaseUrl, supabaseSecretKey);
    const { data: userProfile, error: profileError } = await supabase
      .from("user_profiles")
      .select("company_id,role,full_name,username,nickname,avatar_url")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Profile lookup error:", profileError);
      return Response.json({ error: "Failed to fetch profile" }, { status: 500 });
    }
    if (!userProfile) return Response.json({ error: "Profile record not configured" }, { status: 404 });

    return Response.json({
      company_id: userProfile.company_id,
      role: userProfile.role,
      full_name: userProfile.full_name,
      username: userProfile.username,
      nickname: userProfile.nickname,
      avatar_url: userProfile.avatar_url,
    });
  } catch (error) {
    console.error("Profile API error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
