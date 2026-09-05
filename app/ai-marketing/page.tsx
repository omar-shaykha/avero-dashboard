import ProtectedModulePage from "@/app/components/ProtectedModulePage";
export default function AiMarketingPage() {
  return <ProtectedModulePage feature="ai_marketing" permission="view_ai_marketing" title="AI Marketing" />;
}
