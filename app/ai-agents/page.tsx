import { redirect } from "next/navigation";
import { canAccess, getAuthorizationContext, hasApp, isKingAdmin } from "@/lib/auth/authorization";
import AiAgentsHome from "@/app/components/AiAgentsHome";

export const dynamic = "force-dynamic";

export default async function AiAgentsPage() {
  const access = await getAuthorizationContext();
  if (!access) redirect("/login");
  if (!hasApp(access,"app_intelligence") || !(isKingAdmin(access) || canAccess(access,"ai_sales","sales.view") || canAccess(access,"ai_marketing","marketing.manage"))) redirect("/workspace");
  const user = access.user;
  const userName = user.email?.split("@")[0];
  return <AiAgentsHome userEmail={user.email} userName={userName} access={access} />;
}
