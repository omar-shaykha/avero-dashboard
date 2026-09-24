import LeoSalesLive from "@/app/components/LeoSalesLive";
import { redirect } from "next/navigation";
import { canAccess, getAuthorizationContext } from "@/lib/auth/authorization";

export default async function AiSalesPage() {
  const access=await getAuthorizationContext();
  if(!access)redirect("/login");
  if(!canAccess(access,"ai_sales","sales.view"))redirect("/workspace");
  return <LeoSalesLive />;
}
