import { redirect } from "next/navigation";
import { canAccess, getAuthorizationContext, type FeatureKey } from "@/lib/auth/authorization";
import LocalizedState from "./LocalizedState";

export default async function ProtectedModulePage({ feature, permission, title }: { feature:FeatureKey; permission:string; title:string; }) {
  const access = await getAuthorizationContext();
  if (!access) redirect("/login");
  if (!canAccess(access, feature, permission)) {
    return <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6"><LocalizedState enTitle="Access Denied" arTitle="تم رفض الوصول" enDescription={`You do not have access to ${title}.`} arDescription={`ليس لديك صلاحية للوصول إلى ${title}.`}/></main>;
  }
  return <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6"><LocalizedState enTitle={title} arTitle={title} enDescription="This module is coming soon." arDescription="هذه الوحدة قيد التجهيز وستتوفر قريبًا."/></main>;
}
