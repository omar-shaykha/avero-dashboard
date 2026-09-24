import { redirect } from "next/navigation";
import type { ReactNode } from "react";

export default function LegacyZatcaLayout({ children: _children }: { children: ReactNode }) {
  redirect("/apps/zatca");
}
