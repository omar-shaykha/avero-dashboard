import ProtectedModulePage from "@/app/components/ProtectedModulePage";
export default function AiSalesPage() {
  return <ProtectedModulePage feature="ai_sales" permission="view_ai_sales" title="AI Sales" />;
}
