import { redirect } from "next/navigation";
import { getAuthorizationContext, isKingAdmin } from "@/lib/auth/authorization";
import ClientLaunchCenter from "@/app/components/ClientLaunchCenter";

export const dynamic = "force-dynamic";

export default async function ClientCommandPage({ params }: { params: Promise<{ id: string }> }) {
  const access = await getAuthorizationContext();
  if (!access) redirect("/login");
  if (!isKingAdmin(access)) redirect("/");
  const { id } = await params;
  return <ClientLaunchCenter clientId={id} />;
}
