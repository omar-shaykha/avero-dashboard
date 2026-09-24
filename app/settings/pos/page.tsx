import { redirect } from "next/navigation";

export default function LegacyReceiptSettingsPage() {
  redirect("/settings?tab=cashier&section=receipts");
}
