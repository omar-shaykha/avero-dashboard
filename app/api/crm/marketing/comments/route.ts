import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthorizationContext } from "@/lib/auth/authorization";

export const dynamic = "force-dynamic";

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Missing Supabase configuration");
  return createClient(url, key);
}

export async function GET() {
  const access = await getAuthorizationContext();
  if (!access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const companyId = access.profile.company_id;
  if (!companyId) return NextResponse.json({ comments: [], stats: { total:0, pending:0, replied:0, escalated:0, spam:0 } });

  const { data, error } = await db().from("marketing_social_comments")
    .select("id,platform,external_comment_id,external_post_id,author_name,comment_text,sentiment,category,status,ai_reply,reply_status,replied_at,created_at")
    .eq("company_id", companyId).order("created_at", { ascending:false }).limit(100);
  if (error) return NextResponse.json({ error:error.message }, { status:500 });
  const comments = data || [];
  const stats = {
    total: comments.length,
    pending: comments.filter(x => x.reply_status === "pending").length,
    replied: comments.filter(x => x.reply_status === "replied").length,
    escalated: comments.filter(x => x.status === "escalated").length,
    spam: comments.filter(x => x.status === "spam").length,
  };
  return NextResponse.json({ comments, stats });
}
