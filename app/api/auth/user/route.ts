import { createClient as createServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
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

    return new Response(JSON.stringify({ id: user.id, email: user.email }), {
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
