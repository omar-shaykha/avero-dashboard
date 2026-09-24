import { redirect } from "next/navigation";
import { getAuthorizationContext, hasAnyApp, hasPermission, isKingAdmin, isTenantAdmin } from "@/lib/auth/authorization";
import SettingsPageClient from "@/app/components/SettingsPageClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage(){
  const access=await getAuthorizationContext();
  if(!access)redirect("/login");
  if(!hasAnyApp(access)||!(isKingAdmin(access)||isTenantAdmin(access)||hasPermission(access,"settings.view")||hasPermission(access,"settings.manage")))redirect("/workspace");
  return <SettingsPageClient/>;
}
