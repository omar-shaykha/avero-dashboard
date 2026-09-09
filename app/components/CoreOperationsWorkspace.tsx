"use client";

import { useEffect, useState } from "react";
import AddItemsWorkspace from "@/app/components/AddItemsWorkspace";
import CashierWorkspace from "@/app/components/CashierWorkspace";

type Area = "cashier" | "add-items";

function normalizeArea(value?: string): Area {
  if (value === "add-items" || value === "products") return "add-items";
  return "cashier";
}

export default function CoreOperationsWorkspace({ initialArea = "cashier" }: { initialArea?: string }) {
  const [area, setArea] = useState<Area>(normalizeArea(initialArea));

  useEffect(() => {
    setArea(normalizeArea(initialArea));
  }, [initialArea]);

  return area === "add-items" ? <AddItemsWorkspace /> : <CashierWorkspace />;
}
