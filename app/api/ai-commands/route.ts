import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthorizationContext } from "@/lib/auth/authorization";

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Missing Supabase configuration");
  return createClient(url, key);
}

export async function GET() {
  try {
    const access = await getAuthorizationContext();
    if (!access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!access.profile.company_id) return NextResponse.json([]);

    const supabase = admin();
    const { data, error } = await supabase
      .from("ai_commands")
      .select("id,command_type,command_text,status,requires_confirmation,payload,created_at")
      .eq("user_id", access.user.id)
      .eq("company_id", access.profile.company_id)
      .eq("status", "awaiting_confirmation")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("AI commands list error:", error);
      return NextResponse.json({ error: "Could not load commands" }, { status: 500 });
    }
    return NextResponse.json(data || []);
  } catch (error) {
    console.error("AI commands API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
