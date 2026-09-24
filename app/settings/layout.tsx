import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getAuthorizationContext, hasAnyApp } from "@/lib/auth/authorization";

export default async function SettingsLayout({children}:{children:ReactNode}){
  const access=await getAuthorizationContext();
  if(!access)redirect("/login");
  if(!hasAnyApp(access))redirect("/workspace");
  return children;
}
