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
    const ctx = await getAuthorizationContext();
    if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const { data, error } = await admin()
      .from("company_activity_catalog")
      .select("key,label_en,label_ar,category,default_brain,default_agents")
      .order("category", { ascending: true })
      .order("label_en", { ascending: true });
    if (error) return Response.json({ error: "Failed to load activities" }, { status: 500 });
    return Response.json({ activities: data || [] });
  } catch (error) {
    console.error("Company activities error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
