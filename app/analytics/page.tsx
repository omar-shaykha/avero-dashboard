import ProtectedModulePage from "@/app/components/ProtectedModulePage";
export default function AnalyticsPage() {
  return <ProtectedModulePage feature="analytics" permission="view_analytics" title="Analytics" />;
}
