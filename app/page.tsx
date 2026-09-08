import { redirect } from "next/navigation";
import { getAuthorizationContext, hasPermission, isKingAdmin, isTenantAdmin } from "@/lib/auth/authorization";

export const dynamic = "force-dynamic";

export default async function RootPage() {
  const access = await getAuthorizationContext();
  if (!access) redirect("/login");
  if (!access.profile.company_id) redirect("/profile");

  const canMonitor = isKingAdmin(access) || isTenantAdmin(access) || hasPermission(access, "analytics.view");
  if (canMonitor) redirect("/manager-monitoring");

  const canUsePos = hasPermission(access, "sales.cashier") || hasPermission(access, "sales.view") || hasPermission(access, "sales.manage");
  if (canUsePos) redirect("/pos");

  redirect("/profile");
}
