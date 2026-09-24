import { redirect } from "next/navigation";

export default function LegacyCashierSettingsPage() {
  redirect("/settings?tab=cashier");
}
