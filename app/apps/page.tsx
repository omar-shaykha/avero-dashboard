import { redirect } from "next/navigation";
import { getAuthorizationContext, hasAnyApp } from "@/lib/auth/authorization";
import AppsPageClient from "@/app/components/AppsPageClient";

export const dynamic = "force-dynamic";

export default async function AppsPage(){
  const access=await getAuthorizationContext();
  if(!access)redirect("/login");
  if(!hasAnyApp(access))redirect("/workspace");
  return <AppsPageClient/>;
}
