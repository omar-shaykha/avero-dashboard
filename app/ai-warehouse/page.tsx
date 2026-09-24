import AgentOperatingRoom from "@/app/components/AgentOperatingRoom";
import { redirect } from "next/navigation";
import { getAuthorizationContext, hasFeature } from "@/lib/auth/authorization";

export default async function AiWarehousePage() {
  const access=await getAuthorizationContext();
  if(!access)redirect("/login");
  if(!hasFeature(access,"ai_warehouse"))redirect("/workspace");
  return <AgentOperatingRoom agent="warehouse" />;
}
