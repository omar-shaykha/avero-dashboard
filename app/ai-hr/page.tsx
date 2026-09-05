import ProtectedModulePage from "@/app/components/ProtectedModulePage";
export default function AiHrPage() {
  return <ProtectedModulePage feature="ai_hr" permission="view_ai_hr" title="AI HR" />;
}
