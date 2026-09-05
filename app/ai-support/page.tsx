import ProtectedModulePage from "@/app/components/ProtectedModulePage";
export default function AiSupportPage() {
  return <ProtectedModulePage feature="ai_support" permission="view_ai_support" title="AI Support" />;
}
