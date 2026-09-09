import { redirect } from "next/navigation";
import { getAuthorizationContext, canAccess, isKingAdmin } from "@/lib/auth/authorization";
import MarketingDepartmentWorkspaceV2 from "@/app/components/MarketingDepartmentWorkspaceV2";

export const dynamic = "force-dynamic";

export default async function AiMarketingPage(){
  const access = await getAuthorizationContext();
  if(!access) redirect("/login");
  if(!(isKingAdmin(access) || canAccess(access,"ai_marketing","marketing.manage"))) redirect("/ai-agents");
  return <MarketingDepartmentWorkspaceV2/>;
}
