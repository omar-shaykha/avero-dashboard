import { redirect } from "next/navigation";
import { getAuthorizationContext, canAccess, isKingAdmin } from "@/lib/auth/authorization";
import FoxyMarketingLive from "@/app/components/FoxyMarketingLive";

export const dynamic = "force-dynamic";

export default async function AiMarketingPage(){
  const access = await getAuthorizationContext();
  if(!access) redirect("/login");
  if(!(isKingAdmin(access) || canAccess(access,"ai_marketing","marketing.manage"))) redirect("/ai-agents");
  return <FoxyMarketingLive/>;
}
