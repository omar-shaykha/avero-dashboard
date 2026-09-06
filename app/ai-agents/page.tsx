import { redirect } from "next/navigation";
import { getAuthorizationContext } from "@/lib/auth/authorization";
import AiAgentsHome from "@/app/components/AiAgentsHome";

export const dynamic = "force-dynamic";

export default async function AiAgentsPage() {
  const access = await getAuthorizationContext();
  if (!access) redirect("/login");
  const user = access.user;
  const userName = user.email?.split("@")[0];
  return <AiAgentsHome userEmail={user.email} userName={userName} access={access} />;
}
