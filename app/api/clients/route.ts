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

    // Verify user belongs to AVERO Internal AND has admin role
    const { data: userProfile, error: userProfileError } = await supabase
      .from("user_profiles")
      .select("company_id, role")
      .eq("user_id", user.id)
      .single();

    if (
      userProfileError ||
      userProfile?.company_id !== AVERO_INTERNAL_ID ||
      userProfile?.role !== "admin"
    ) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Access restricted" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // Fetch all companies
    const { data: companies, error: companiesError } = await supabase
      .from("companies")
      .select("id, name, whatsapp_phone_number_id, created_at")
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
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;
  let createdUserId: string | null = null;

  try {
    // 1. Authenticate requester
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

    // Check server config
    if (!supabaseUrl || !supabaseSecretKey) {
      return new Response(
        JSON.stringify({ error: "Missing Supabase configuration" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseSecretKey);

    // 2. Verify requester is AVERO Internal admin
    const { data: requesterProfile, error: requesterProfileError } = await supabase
      .from("user_profiles")
      .select("company_id, role")
      .eq("user_id", user.id)
      .single();

    if (
      requesterProfileError ||
      requesterProfile?.company_id !== AVERO_INTERNAL_ID ||
      requesterProfile?.role !== "admin"
    ) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Access restricted" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Parse and validate input
    const body = await request.json();
    const {
      company_name,
      admin_email,
      temporary_password,
      whatsapp_phone_number_id,
    } = body;

    // Validate company_name
    if (!company_name || typeof company_name !== "string") {
      return new Response(
        JSON.stringify({ error: "Company name is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate admin_email
    if (!admin_email || typeof admin_email !== "string") {
      return new Response(
        JSON.stringify({ error: "Admin email is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(admin_email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate temporary_password
    if (!temporary_password || typeof temporary_password !== "string") {
      return new Response(
        JSON.stringify({ error: "Temporary password is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (temporary_password.length < 8) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 8 characters" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const trimmedEmail = admin_email.trim();
    const trimmedPassword = temporary_password.trim();
    const trimmedCompanyName = company_name.trim();
    const trimmedWhatsappId = whatsapp_phone_number_id?.trim() || null;

    // 4. Check if Auth user exists by email
    let existingAuthUser = null;
    try {
      const { data: authUserData, error: getUserError } =
        await supabase.auth.admin.getUserByEmail(trimmedEmail);

      if (!getUserError && authUserData) {
        existingAuthUser = authUserData;
      }
    } catch (err) {
      console.error("Error checking for existing user:", err);
    }

    let authUserCreated = false;

    if (!existingAuthUser) {
      // 5. Create Auth user server-side if doesn't exist
      try {
        const { data: newAuthUser, error: createUserError } =
          await supabase.auth.admin.createUser({
            email: trimmedEmail,
            password: trimmedPassword,
            email_confirm: true,
          });

        if (createUserError) {
          console.error("Auth user creation error:", createUserError);
          return new Response(
            JSON.stringify({
              error: "Failed to create Auth user: " + createUserError.message,
            }),
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        }

        if (!newAuthUser || !newAuthUser.id) {
          return new Response(
            JSON.stringify({ error: "Failed to create Auth user" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        }

        createdUserId = newAuthUser.id;
        authUserCreated = true;
        console.log(`Created new Auth user: ${newAuthUser.id} for email: ${trimmedEmail}`);
      } catch (err) {
        console.error("Unexpected error creating Auth user:", err);
        return new Response(
          JSON.stringify({ error: "Unexpected error creating Auth user" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    } else {
      // 6. User already exists - check if they belong to another company
      const { data: userProfiles, error: profilesError } = await supabase
        .from("user_profiles")
        .select("company_id")
        .eq("user_id", existingAuthUser.id)
        .maybeSingle();

      if (profilesError && profilesError.code !== "PGRST116") {
        // PGRST116 = no rows returned (not an error in this case)
        console.error("Error checking user profiles:", profilesError);
        return new Response(
          JSON.stringify({ error: "Failed to check existing user status" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      if (userProfiles) {
        // User already belongs to a company
        return new Response(
          JSON.stringify({
            error: `User ${trimmedEmail} already belongs to another company. Cannot reassign users.`,
          }),
          { status: 409, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // 7. Call the RPC to create company and link user
    let rpcCompanyId: string;
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        "create_client_company",
        {
          p_company_name: trimmedCompanyName,
          p_whatsapp_phone_number_id: trimmedWhatsappId,
          p_user_email: trimmedEmail,
        }
      );

      if (rpcError) {
        console.error("RPC error:", rpcError);

        // Handle specific conflict errors
        if (rpcError.message?.includes("already belongs to company")) {
          // Rollback: delete the Auth user if we created it
          if (authUserCreated && createdUserId) {
            try {
              await supabase.auth.admin.deleteUser(createdUserId);
              console.log(`Rolled back Auth user: ${createdUserId}`);
            } catch (rollbackErr) {
              console.error("Failed to rollback Auth user:", rollbackErr);
            }
          }
          return new Response(
            JSON.stringify({
              error: `User already belongs to another company. Cannot reassign.`,
            }),
            { status: 409, headers: { "Content-Type": "application/json" } }
          );
        }

        if (rpcError.message?.includes("already assigned")) {
          // Rollback: delete the Auth user if we created it
          if (authUserCreated && createdUserId) {
            try {
              await supabase.auth.admin.deleteUser(createdUserId);
              console.log(`Rolled back Auth user: ${createdUserId}`);
            } catch (rollbackErr) {
              console.error("Failed to rollback Auth user:", rollbackErr);
            }
          }
          return new Response(
            JSON.stringify({
              error: "WhatsApp phone number is already assigned to another company",
            }),
            { status: 409, headers: { "Content-Type": "application/json" } }
          );
        }

        // Generic RPC error
        // Rollback: delete the Auth user if we created it
        if (authUserCreated && createdUserId) {
          try {
            await supabase.auth.admin.deleteUser(createdUserId);
            console.log(`Rolled back Auth user: ${createdUserId}`);
          } catch (rollbackErr) {
            console.error("Failed to rollback Auth user:", rollbackErr);
          }
        }

        return new Response(
          JSON.stringify({
            error: rpcError.message || "Failed to create client company",
          }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      if (rpcData === null || rpcData === undefined) {
        if (authUserCreated && createdUserId) {
          try {
            await supabase.auth.admin.deleteUser(createdUserId);
            console.log(`Rolled back Auth user: ${createdUserId}`);
          } catch (rollbackErr) {
            console.error("Failed to rollback Auth user:", rollbackErr);
          }
        }
        return new Response(
          JSON.stringify({ error: "Failed to create client company" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      rpcCompanyId = rpcData;
    } catch (err) {
      console.error("Unexpected error calling RPC:", err);
      if (authUserCreated && createdUserId) {
        try {
          await supabase.auth.admin.deleteUser(createdUserId);
          console.log(`Rolled back Auth user: ${createdUserId}`);
        } catch (rollbackErr) {
          console.error("Failed to rollback Auth user:", rollbackErr);
        }
      }
      return new Response(
        JSON.stringify({ error: "Unexpected error creating client" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // 8. Success - return response
    return new Response(
      JSON.stringify({
        success: true,
        company_id: rpcCompanyId,
        company_name: trimmedCompanyName,
        admin_email: trimmedEmail,
        auth_user_created: authUserCreated,
      }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("API error:", error);

    // Rollback: delete Auth user if we created it
    if (createdUserId && supabaseUrl && supabaseSecretKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseSecretKey);
        await supabase.auth.admin.deleteUser(createdUserId);
        console.log(`Emergency rollback - deleted Auth user: ${createdUserId}`);
      } catch (rollbackErr) {
        console.error("Failed to rollback Auth user on exception:", rollbackErr);
      }
    }

    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
