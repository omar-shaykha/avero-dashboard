import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getAuthorizationContext, isKingAdmin } from "@/lib/auth/authorization";

export default async function PlatformIntegrationLayout({ children }: { children: ReactNode }) {
  const access = await getAuthorizationContext();
  if (!access) redirect("/login");
  if (!isKingAdmin(access)) redirect("/workspace");
  return children;
}
