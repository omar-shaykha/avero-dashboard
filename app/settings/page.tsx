import { redirect } from "next/navigation";
import { getAuthorizationContext, hasAnyApp, hasApp, hasPermission, isKingAdmin, isTenantAdmin } from "@/lib/auth/authorization";
import SettingsPageClient from "@/app/components/SettingsPageClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage({searchParams}:{searchParams:Promise<{tab?:string;section?:string}>}){
  const access=await getAuthorizationContext();
  if(!access)redirect("/login");
  if(!hasAnyApp(access)||!(isKingAdmin(access)||isTenantAdmin(access)||hasPermission(access,"settings.view")||hasPermission(access,"settings.manage")))redirect("/workspace");
  const {tab,section}=await searchParams;
  const sellEnabled=hasApp(access,"app_sell");
  const initialTab=tab==="cashier"||tab==="receipts" ? (sellEnabled?"cashier":"company") : tab;
  return <SettingsPageClient initialTab={initialTab} initialCashierSection={section==="receipts"||tab==="receipts"?"receipts":"setup"} sellEnabled={sellEnabled}/>;
}
