import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthorizationContext, isSuperAdmin } from "@/lib/auth/authorization";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_REPLY_LENGTH = 4000;

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Missing Supabase configuration");
  return createClient(url, key);
}
async function superAdmin() {
  const access = await getAuthorizationContext();
  if (!access) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (!isSuperAdmin(access)) return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { access };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await superAdmin(); if (auth.error) return auth.error;
    const sessionId = request.nextUrl.searchParams.get("session_id");
    const supabase = admin();
    if (sessionId) {
      if (!UUID_RE.test(sessionId)) return NextResponse.json({ error: "Invalid session id" }, { status: 400 });
      const { data: session, error: sessionError } = await supabase.from("ai_help_sessions").select("id,user_id,company_id,status,handling_mode,taken_over_by,taken_over_at,created_at,updated_at").eq("id", sessionId).maybeSingle();
      if (sessionError) return NextResponse.json({ error: "Failed to load session" }, { status: 500 });
      if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
      const [{ data: company }, { data: profile }, { data: messages, error: messagesError }] = await Promise.all([
        supabase.from("companies").select("id,name").eq("id", session.company_id).maybeSingle(),
        supabase.from("user_profiles").select("user_id,first_name,last_name,full_name,nickname,username,avatar_url").eq("user_id", session.user_id).maybeSingle(),
        supabase.from("ai_help_messages").select("id,role,message,created_at").eq("session_id", session.id).order("created_at", { ascending: true }).limit(500),
      ]);
      if (messagesError) return NextResponse.json({ error: "Failed to load conversation" }, { status: 500 });
      return NextResponse.json({ session: { ...session, company, profile }, messages: messages || [] });
    }
    const { data: sessions, error: sessionsError } = await supabase.from("ai_help_sessions").select("id,user_id,company_id,status,handling_mode,taken_over_by,taken_over_at,created_at,updated_at").order("updated_at", { ascending: false }).limit(100);
    if (sessionsError) return NextResponse.json({ error: "Failed to load Help Center inbox" }, { status: 500 });
    if (!sessions?.length) return NextResponse.json([]);
    const companyIds = [...new Set(sessions.map((s) => s.company_id).filter(Boolean))]; const userIds = [...new Set(sessions.map((s) => s.user_id).filter(Boolean))]; const sessionIds = sessions.map((s) => s.id);
    const [{ data: companies }, { data: profiles }, { data: recentMessages }] = await Promise.all([
      supabase.from("companies").select("id,name").in("id", companyIds),
      supabase.from("user_profiles").select("user_id,first_name,last_name,full_name,nickname,username,avatar_url").in("user_id", userIds),
      supabase.from("ai_help_messages").select("id,session_id,role,message,created_at").in("session_id", sessionIds).order("created_at", { ascending: false }).limit(1000),
    ]);
    const companyMap = new Map((companies || []).map((c) => [c.id, c])); const profileMap = new Map((profiles || []).map((p) => [p.user_id, p])); const lastMessageMap = new Map<string, any>();
    for (const message of recentMessages || []) if (!lastMessageMap.has(message.session_id)) lastMessageMap.set(message.session_id, message);
    return NextResponse.json(sessions.map((session) => ({ ...session, company: companyMap.get(session.company_id) || null, profile: profileMap.get(session.user_id) || null, last_message: lastMessageMap.get(session.id) || null })));
  } catch (error) { console.error("Admin Help Center GET error:", error); return NextResponse.json({ error: "Internal server error" }, { status: 500 }); }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await superAdmin(); if (auth.error) return auth.error;
    const body = await request.json(); const sessionId = String(body.session_id || ""); const action = String(body.action || "");
    if (!UUID_RE.test(sessionId)) return NextResponse.json({ error: "Invalid session id" }, { status: 400 });
    if (!['take_over','return_to_ai'].includes(action)) return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    const supabase = admin();
    const changes = action === 'take_over' ? { handling_mode:'human', taken_over_by:auth.access!.user.id, taken_over_at:new Date().toISOString(), updated_at:new Date().toISOString() } : { handling_mode:'ai', taken_over_by:null, taken_over_at:null, updated_at:new Date().toISOString() };
    const { data, error } = await supabase.from("ai_help_sessions").update(changes).eq("id", sessionId).select("id,handling_mode,taken_over_by,taken_over_at,updated_at").maybeSingle();
    if (error) return NextResponse.json({ error: "Failed to update handling mode" }, { status: 500 }); if (!data) return NextResponse.json({ error: "Session not found" }, { status: 404 });
    return NextResponse.json({ ok:true, session:data });
  } catch (error) { console.error("Admin Help Center PATCH error:", error); return NextResponse.json({ error: "Internal server error" }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await superAdmin(); if (auth.error) return auth.error;
    const body = await request.json(); const sessionId = String(body.session_id || ""); const message = String(body.message || "").trim();
    if (!UUID_RE.test(sessionId)) return NextResponse.json({ error: "Invalid session id" }, { status: 400 });
    if (!message || message.length > MAX_REPLY_LENGTH) return NextResponse.json({ error: "Invalid message" }, { status: 400 });
    const supabase = admin(); const { data: session } = await supabase.from("ai_help_sessions").select("id,user_id,company_id,handling_mode").eq("id",sessionId).maybeSingle();
    if (!session) return NextResponse.json({ error:"Session not found" },{status:404});
    if (session.handling_mode !== 'human') return NextResponse.json({ error:"Take over the conversation before replying" },{status:409});
    const { data, error } = await supabase.from("ai_help_messages").insert({ session_id:session.id, user_id:session.user_id, role:'assistant', message }).select("id,role,message,created_at").single();
    if (error) return NextResponse.json({ error:"Failed to send reply" },{status:500});
    await supabase.from("ai_help_sessions").update({updated_at:new Date().toISOString()}).eq("id",session.id);
    return NextResponse.json({ok:true,message:data});
  } catch(error){console.error("Admin Help Center POST error:",error);return NextResponse.json({error:"Internal server error"},{status:500});}
}
