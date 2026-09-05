import { redirect } from "next/navigation";
import {
  canAccess,
  getAuthorizationContext,
  type FeatureKey,
} from "@/lib/auth/authorization";

export default async function ProtectedModulePage({
  feature,
  permission,
  title,
}: {
  feature: FeatureKey;
  permission: string;
  title: string;
}) {
  const access = await getAuthorizationContext();
  if (!access) redirect("/login");
  if (!canAccess(access, feature, permission)) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center px-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Access Denied</h1>
          <p className="text-slate-400 mt-2">You do not have access to {title}.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center px-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white">{title}</h1>
        <p className="text-slate-400 mt-2">This module is coming soon.</p>
      </div>
    </main>
  );
}
