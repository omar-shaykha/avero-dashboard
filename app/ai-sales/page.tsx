import LeoSalesLive from "@/app/components/LeoSalesLive";
import { redirect } from "next/navigation";
import { getAuthorizationContext, hasFeature } from "@/lib/auth/authorization";

export default async function AiSalesPage() {
  const access=await getAuthorizationContext();
  if(!access)redirect("/login");
  if(!hasFeature(access,"ai_sales"))redirect("/workspace");
  return <LeoSalesLive />;
}
