import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthorizationContext, isKingAdmin } from "@/lib/auth/authorization";

const AGENT_KEYS = [
  "ai_sales",
  "ai_marketing",
  "ai_hr",
  "ai_support",
  "ai_inventory",
  "ai_customer_care",
  "ai_analytics",
  "ai_warehouse",
] as const;

const CORE_FEATURE_KEYS = ["crm", "analytics", ...AGENT_KEYS] as const;
const VALID_MODES = new Set(["approval", "automatic", "manual"]);

type AgentKey = (typeof AGENT_KEYS)[number];
type PatchBody = {
  company?: { name?: string; whatsapp_phone_number_id?: string | null };
  brain?: Record<string, unknown>;
  agents?: Array<{ agent_key?: string; enabled?: boolean; autonomy_mode?: string; instructions?: string }>;
  features?: Array<{ key?: string; enabled?: boolean }>;
  activate_all?: boolean;
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status });
}

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Missing Supabase configuration");
  return createClient(url, key);
}

function isLikelyMetaPhoneNumberId(value?: string | null) {
  if (!value) return false;
  const clean = value.trim();
  return /^\d{10,32}$/.test(clean) && !clean.startsWith("0");
}

function normalizeText(value: unknown, max = 4000) {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  return cleaned ? cleaned.slice(0, max) : null;
}

function normalizeLanguages(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean).slice(0, 8);
  if (typeof value === "string") return value.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 8);
  return undefined;
}

async function requireKing() {
  const access = await getAuthorizationContext();
  if (!access) return { error: json({ error: "Unauthorized" }, 401) };
  if (!isKingAdmin(access)) return { error: json({ error: "Forbidden" }, 403) };
  return { access };
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requireKing();
    if (guard.error) return guard.error;
    const { id } = await params;
    const db = admin();

    const [companyRes, brainRes, configsRes, featuresRes, assignedFeaturesRes, enginesRes, leadsRes, profilesRes, socialRes] = await Promise.all([
      db.from("companies").select("id,name,email,phone,industry,city,status,whatsapp_phone_number_id,created_at").eq("id", id).maybeSingle(),
      db.from("company_ai_profiles").select("*").eq("company_id", id).maybeSingle(),
      db.from("ai_agent_configs").select("agent_key,enabled,autonomy_mode,instructions,updated_at").eq("company_id", id).order("agent_key"),
      db.from("features").select("id,key").in("key", [...CORE_FEATURE_KEYS]).order("key"),
      db.from("company_features").select("feature_id,enabled,expires_at").eq("company_id", id),
      db.from("ai_agent_engine_connections").select("agent_key,agent_slug,persona_name,engine_provider,make_scenario_id,enabled,status,updated_at").order("agent_key"),
      db.from("leads").select("id,status,probability,estimated_value,updated_at,created_at").eq("company_id", id),
      db.from("user_profiles").select("user_id,role,must_change_password,created_at").eq("company_id", id).order("created_at"),
      db.from("company_social_connections").select("platform,account_name,connection_status,health_status,updated_at").eq("company_id", id).order("platform"),
    ]);

    if (companyRes.error || brainRes.error || configsRes.error || featuresRes.error || assignedFeaturesRes.error || enginesRes.error || leadsRes.error || profilesRes.error || socialRes.error) {
      console.error("Activation overview error", { companyRes, brainRes, configsRes, featuresRes, assignedFeaturesRes, enginesRes, leadsRes, profilesRes, socialRes });
      return json({ error: "Could not load activation center" }, 500);
    }
    if (!companyRes.data) return json({ error: "Company not found" }, 404);

    const users = [] as Array<Record<string, unknown>>;
    for (const profile of profilesRes.data || []) {
      const { data: auth } = await db.auth.admin.getUserById(profile.user_id);
      users.push({ ...profile, email: auth?.user?.email || null, last_sign_in_at: auth?.user?.last_sign_in_at || null, email_confirmed_at: auth?.user?.email_confirmed_at || null });
    }

    const assignedMap = new Map((assignedFeaturesRes.data || []).map((row) => [row.feature_id, row]));
    const features = (featuresRes.data || []).map((feature) => ({ ...feature, enabled: assignedMap.get(feature.id)?.enabled ?? false, expires_at: assignedMap.get(feature.id)?.expires_at ?? null }));
    const featureKeys = new Set(features.filter((feature) => feature.enabled).map((feature) => feature.key));
    const configs = (configsRes.data || []).filter((config) => AGENT_KEYS.includes(config.agent_key as AgentKey));
    const enabledAgents = configs.filter((config) => config.enabled).length;

    const leads = leadsRes.data || [];
    const won = leads.filter((lead) => String(lead.status || "new").toLowerCase() === "won").length;
    const lost = leads.filter((lead) => String(lead.status || "new").toLowerCase() === "lost").length;
    const activePipeline = leads.filter((lead) => ["qualified", "quotation", "negotiation"].includes(String(lead.status || "new").toLowerCase())).length;
    const probabilityValues = leads.map((lead) => typeof lead.probability === "number" ? lead.probability : null).filter((value): value is number => value !== null);
    const avgProbability = probabilityValues.length ? Math.round((probabilityValues.reduce((sum, value) => sum + value, 0) / probabilityValues.length) * 10) / 10 : 0;
    const estimatedValue = leads.reduce((sum, lead) => sum + (typeof lead.estimated_value === "number" ? lead.estimated_value : 0), 0);
    const stageCounts = ["new", "qualified", "quotation", "negotiation", "won", "lost"].map((stage) => ({ stage, count: leads.filter((lead) => String(lead.status || "new").toLowerCase() === stage).length }));

    const brain = brainRes.data;
    const brainReady = Boolean(brain?.industry && brain?.business_description && brain?.products_services && brain?.brand_voice);
    const whatsappReady = isLikelyMetaPhoneNumberId(companyRes.data.whatsapp_phone_number_id);
    const enginesReady = AGENT_KEYS.every((agentKey) => (enginesRes.data || []).some((engine) => engine.agent_key === agentKey && engine.enabled && engine.status === "connected"));
    const featuresReady = CORE_FEATURE_KEYS.every((featureKey) => featureKeys.has(featureKey));
    const agentsReady = AGENT_KEYS.every((agentKey) => configs.some((config) => config.agent_key === agentKey && config.enabled));
    const loginReady = users.some((user) => user.email_confirmed_at && user.must_change_password === false);
    const readinessItems = [
      { key: "login", label: "Client login ready", ok: loginReady },
      { key: "brain", label: "Company brain filled", ok: brainReady },
      { key: "features", label: "CRM, Analytics and 8 agents enabled", ok: featuresReady && agentsReady },
      { key: "make", label: "8 Make engines connected", ok: enginesReady },
      { key: "whatsapp", label: "Meta WhatsApp Phone Number ID", ok: whatsappReady },
    ];
    const readinessScore = Math.round((readinessItems.filter((item) => item.ok).length / readinessItems.length) * 100);

    return json({
      company: companyRes.data,
      users,
      brain: brain || null,
      agents: configs,
      features,
      engines: enginesRes.data || [],
      social_connections: socialRes.data || [],
      lead_metrics: { total: leads.length, won, lost, active_pipeline: activePipeline, avg_probability: avgProbability, estimated_value: estimatedValue, stage_counts: stageCounts, with_probability: probabilityValues.length },
      readiness: { score: readinessScore, items: readinessItems, whatsapp_warning: whatsappReady ? null : "This looks like a mobile number, not a Meta WhatsApp Phone Number ID." },
    });
  } catch (error) {
    console.error("Activation GET error:", error);
    return json({ error: "Internal server error" }, 500);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requireKing();
    if (guard.error) return guard.error;
    const { id } = await params;
    const body = (await request.json()) as PatchBody;
    const db = admin();

    const { data: company, error: companyCheckError } = await db.from("companies").select("id").eq("id", id).maybeSingle();
    if (companyCheckError) return json({ error: "Could not validate company" }, 500);
    if (!company) return json({ error: "Company not found" }, 404);

    if (body.company) {
      const update: Record<string, unknown> = {};
      const name = normalizeText(body.company.name, 160);
      if (name) update.name = name;
      if (body.company.whatsapp_phone_number_id !== undefined) {
        const whatsapp = body.company.whatsapp_phone_number_id === null ? null : normalizeText(body.company.whatsapp_phone_number_id, 32);
        if (whatsapp && !/^\d{6,32}$/.test(whatsapp)) return json({ error: "Invalid WhatsApp Phone Number ID" }, 400);
        update.whatsapp_phone_number_id = whatsapp || null;
      }
      if (Object.keys(update).length) {
        const { error } = await db.from("companies").update(update).eq("id", id);
        if (error) return json({ error: error.message.includes("duplicate") ? "WhatsApp Phone Number ID already assigned" : "Could not update company" }, error.message.includes("duplicate") ? 409 : 500);
      }
    }

    if (body.brain) {
      const brainUpdate: Record<string, unknown> = { company_id: id, updated_at: new Date().toISOString() };
      for (const key of ["industry", "business_description", "products_services", "target_audience", "brand_voice", "locations", "website_url", "social_notes"] as const) {
        if (key in body.brain) brainUpdate[key] = normalizeText(body.brain[key], key === "website_url" ? 500 : 4000);
      }
      const languages = normalizeLanguages(body.brain.languages);
      if (languages) brainUpdate.languages = languages;
      const { error } = await db.from("company_ai_profiles").upsert(brainUpdate, { onConflict: "company_id" });
      if (error) return json({ error: "Could not update company brain" }, 500);
    }

    const { data: allFeatures, error: featuresError } = await db.from("features").select("id,key").in("key", [...CORE_FEATURE_KEYS]);
    if (featuresError) return json({ error: "Could not load features" }, 500);
    const featureByKey = new Map((allFeatures || []).map((feature) => [feature.key, feature.id]));

    if (body.activate_all) {
      const rows = [...CORE_FEATURE_KEYS].map((key) => ({ company_id: id, feature_id: featureByKey.get(key), enabled: true })).filter((row) => row.feature_id);
      if (rows.length) {
        const { error } = await db.from("company_features").upsert(rows, { onConflict: "company_id,feature_id" });
        if (error) return json({ error: "Could not activate features" }, 500);
      }
      const { error } = await db.from("ai_agent_configs").update({ enabled: true, updated_at: new Date().toISOString() }).eq("company_id", id).in("agent_key", [...AGENT_KEYS]);
      if (error) return json({ error: "Could not activate agents" }, 500);
    }

    if (Array.isArray(body.features)) {
      const rows = body.features.map((item) => ({ company_id: id, feature_id: item.key ? featureByKey.get(item.key) : null, enabled: item.enabled === true })).filter((row) => row.feature_id);
      if (rows.length) {
        const { error } = await db.from("company_features").upsert(rows, { onConflict: "company_id,feature_id" });
        if (error) return json({ error: "Could not update features" }, 500);
      }
    }

    if (Array.isArray(body.agents)) {
      for (const agent of body.agents) {
        if (!AGENT_KEYS.includes(agent.agent_key as AgentKey)) continue;
        const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (typeof agent.enabled === "boolean") update.enabled = agent.enabled;
        if (agent.autonomy_mode && VALID_MODES.has(agent.autonomy_mode)) update.autonomy_mode = agent.autonomy_mode;
        if (typeof agent.instructions === "string") update.instructions = agent.instructions.slice(0, 8000);
        const { error } = await db.from("ai_agent_configs").update(update).eq("company_id", id).eq("agent_key", agent.agent_key);
        if (error) return json({ error: `Could not update ${agent.agent_key}` }, 500);
      }
    }

    return json({ ok: true });
  } catch (error) {
    console.error("Activation PATCH error:", error);
    return json({ error: "Internal server error" }, 500);
  }
}
