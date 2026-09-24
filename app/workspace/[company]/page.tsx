import { redirect } from "next/navigation";
import { getAuthorizationContext } from "@/lib/auth/authorization";
import { createAdminClient } from "@/lib/supabase/admin";
import WorkspacePage from "../page";

export const dynamic = "force-dynamic";

export default async function CompanyWorkspace({params}:{params:Promise<{company:string}>}){
  const access=await getAuthorizationContext();
  if(!access)redirect("/login");
  const companyId=access.profile.company_id;
  if(!companyId)redirect("/workspace");
  const {company}=await params;
  if(company!==companyId){
    const {data,error}=await createAdminClient().from("go_stores").select("company_id").eq("company_id",companyId).eq("slug",company).maybeSingle();
    if(error)throw error;
    if(!data)redirect("/workspace");
  }
  return <WorkspacePage/>;
}
