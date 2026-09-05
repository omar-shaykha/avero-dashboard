import { getAuthorizationContext } from "@/lib/auth/authorization";

export async function GET() {
  try {
    const context = await getAuthorizationContext();
    if (!context) return Response.json({ error: "Unauthorized" }, { status: 401 });
    return Response.json({
      user: context.user,
      profile: context.profile,
      permissions: context.permissions,
      features: context.features,
    });
  } catch (error) {
    console.error("Authorization error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
