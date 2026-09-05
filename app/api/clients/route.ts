import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

const AVERO_INTERNAL_ID = "9fbdd617-fdc4-4c1d-b16b-b1d3118bf3d9";

export async function GET() {
  try {
    // Authenticate user
    const authClient = await createServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Create server-side Supabase client with secret key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

    if (!supabaseUrl || !supabaseSecretKey) {
      return new Response(
        JSON.stringify({ error: "Missing Supabase configuration" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseSecretKey);

    // Verify user belongs to AVERO Internal
    const { data: userProfile, error: userProfileError } = await supabase
      .from("user_profiles")
      .select("company_id")
      .eq("user_id", user.id)
      .single();

    if (userProfileError || userProfile?.company_id !== AVERO_INTERNAL_ID) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Access restricted" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // Fetch all companies
    const { data: companies, error: companiesError } = await supabase
      .from("companies")
      .select("id, name, phone_number_id, created_at")
      .order("created_at", { ascending: false });

    if (companiesError) {
      console.error("Supabase error:", companiesError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch companies" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(companies || []), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("API error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function POST(request: Request) {
  try {
    // Authenticate user
    const authClient = await createServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const body = await request.json();
    const { company_name, whatsapp_phone_number_id, user_email } = body;

    // Validation
    if (!company_name || typeof company_name !== "string") {
      return new Response(
        JSON.stringify({ error: "Company name is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!user_email || typeof user_email !== "string") {
      return new Response(
        JSON.stringify({ error: "User email is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(user_email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Create server-side Supabase client with secret key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

    if (!supabaseUrl || !supabaseSecretKey) {
      return new Response(
        JSON.stringify({ error: "Missing Supabase configuration" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseSecretKey);

    // Verify user belongs to AVERO Internal
    const { data: userProfile, error: userProfileError } = await supabase
      .from("user_profiles")
      .select("company_id")
      .eq("user_id", user.id)
      .single();

    if (userProfileError || userProfile?.company_id !== AVERO_INTERNAL_ID) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Access restricted" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // Call RPC to create client company
    const { data, error: rpcError } = await supabase.rpc("create_client_company", {
      p_company_name: company_name.trim(),
      p_whatsapp_phone_number_id: whatsapp_phone_number_id?.trim() || null,
      p_user_email: user_email.trim(),
    });

    if (rpcError) {
      console.error("RPC error:", rpcError);

      // Check if it's an "Auth user not found" error
      if (rpcError.message?.includes("Auth user not found")) {
        return new Response(
          JSON.stringify({
            error: "Auth user not found: Create the user's login account first, then try again.",
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: rpcError.message || "Failed to create client" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ success: true, data }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("API error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
