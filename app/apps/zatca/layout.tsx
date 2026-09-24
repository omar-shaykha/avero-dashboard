import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getAuthorizationContext, hasApp, hasPermission, isTenantAdmin } from "@/lib/auth/authorization";

export default async function ZatcaAppLayout({ children }: { children: ReactNode }) {
  const access = await getAuthorizationContext();
  if (!access) redirect("/login");
  if (!hasApp(access, "app_sell") || !(isTenantAdmin(access) || hasPermission(access, "settings.view") || hasPermission(access, "settings.manage"))) redirect("/workspace");
  return children;
}
