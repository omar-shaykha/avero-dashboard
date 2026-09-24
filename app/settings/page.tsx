import { redirect } from "next/navigation";
import { getAuthorizationContext, hasAnyApp } from "@/lib/auth/authorization";
import SettingsPageClient from "@/app/components/SettingsPageClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage(){
  const access=await getAuthorizationContext();
  if(!access)redirect("/login");
  if(!hasAnyApp(access))redirect("/workspace");
  return <SettingsPageClient/>;
}
