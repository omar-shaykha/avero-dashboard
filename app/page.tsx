import { redirect } from "next/navigation";
import { getAuthorizationContext } from "@/lib/auth/authorization";

export const dynamic = "force-dynamic";

export default async function RootPage() {
  const access = await getAuthorizationContext();
  if (!access) redirect("/login");
  if (!access.profile.company_id) redirect("/profile");
  redirect("/workspace");
}
