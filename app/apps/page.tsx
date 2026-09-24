import { redirect } from "next/navigation";
import { getAuthorizationContext, hasApp, hasPermission, isKingAdmin, isTenantAdmin } from "@/lib/auth/authorization";
import AppsPageClient from "@/app/components/AppsPageClient";

export const dynamic = "force-dynamic";

export default async function AppsPage(){
  const access=await getAuthorizationContext();
  if(!access)redirect("/login");
  if(!hasApp(access,"app_sell")||!(isTenantAdmin(access)||hasPermission(access,"settings.view")||hasPermission(access,"settings.manage")))redirect("/workspace");
  return <AppsPageClient showPlatformIntegrations={isKingAdmin(access)}/>;
}
