import { createClient } from "@supabase/supabase-js";
import { canAccess, getAuthorizationContext, isKingAdmin } from "@/lib/auth/authorization";

const agents = {
  sales: { feature: "ai_sales", view: "sales.view", manage: "sales.manage", key: "ai_sales" },
  marketing: { feature: "ai_marketing", view: "marketing.view", manage: "marketing.manage", key: "ai_marketing" },
  hr: { feature: "ai_hr", view: "hr.view", manage: "hr.manage", key: "ai_hr" },
  support: { feature: "ai_support", view: "support.view", manage: "support.manage", key: "ai_support" },
} as const;

type Agent = keyof typeof agents;

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Missing Supabase configuration");
  return createClient(url, key);
}

function sanitizeLayout(layout: unknown) {
  if (!layout || typeof layout !== "object" || Array.isArray(layout)) return { nodes: [], connections: [] };
  const candidate = layout as { nodes?: unknown; connections?: unknown };
  const nodes = Array.isArray(candidate.nodes)
    ? candidate.nodes.slice(0, 24).map((node) => {
        const n = node as Record<string, unknown>;
        return {
          id: String(n.id || "").slice(0, 80),
          label: String(n.label || "Block").slice(0, 80),
          type: String(n.type || "step").slice(0, 40),
          x: Number.isFinite(Number(n.x)) ? Math.max(0, Math.min(900, Number(n.x))) : 0,
          y: Number.isFinite(Number(n.y)) ? Math.max(0, Math.min(520, Number(n.y))) : 0,
        };
      }).filter((node) => node.id)
    : [];
  const nodeIds = new Set(nodes.map((node) => node.id));
  const connections = Array.isArray(candidate.connections)
    ? candidate.connections.slice(0, 40).map((connection) => {
        const c = connection as Record<string, unknown>;
        return { from: String(c.from || "").slice(0, 80), to: String(c.to || "").slice(0, 80) };
      }).filter((connection) => nodeIds.has(connection.from) && nodeIds.has(connection.to))
    : [];
  return { nodes, connections };
}

export async function GET(_: Request, { params }: { params: Promise<{ agent: string }> }) {
  try {
    const { agent } = await params;
    if (!(agent in agents)) return Response.json({ error: "Unknown agent" }, { status: 404 });
    const a = agents[agent as Agent];
    const ctx = await getAuthorizationContext();
    if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (!canAccess(ctx, a.feature, a.view)) return Response.json({ error: "Forbidden" }, { status: 403 });
    const companyId = ctx.profile.company_id;
    if (!companyId) return Response.json({ error: "Company not configured" }, { status: 409 });
    const { data, error } = await db()
      .from("ai_agent_workflow_layouts")
      .select("layout,updated_at")
      .eq("company_id", companyId)
      .eq("agent_key", a.key)
      .maybeSingle();
    if (error) return Response.json({ error: "Failed to load workflow" }, { status: 500 });
    return Response.json({ agent: a.key, layout: data?.layout || null, updated_at: data?.updated_at || null });
  } catch (error) {
    console.error("AI workflow GET error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ agent: string }> }) {
  try {
    const { agent } = await params;
    if (!(agent in agents)) return Response.json({ error: "Unknown agent" }, { status: 404 });
    const a = agents[agent as Agent];
    const ctx = await getAuthorizationContext();
    if (!ctx) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (!(isKingAdmin(ctx) || canAccess(ctx, a.feature, a.manage))) return Response.json({ error: "Forbidden" }, { status: 403 });
    const companyId = ctx.profile.company_id;
    if (!companyId) return Response.json({ error: "Company not configured" }, { status: 409 });
    const body = await request.json();
    const layout = sanitizeLayout(body.layout);
    const { error } = await db().from("ai_agent_workflow_layouts").upsert(
      { company_id: companyId, agent_key: a.key, layout },
      { onConflict: "company_id,agent_key" }
    );
    if (error) return Response.json({ error: "Failed to save workflow" }, { status: 500 });
    return Response.json({ ok: true, layout });
  } catch (error) {
    console.error("AI workflow PUT error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
