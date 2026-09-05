import ProtectedModulePage from "@/app/components/ProtectedModulePage";
export default function CrmPage() {
  return <ProtectedModulePage feature="crm" permission="view_crm" title="CRM" />;
}
