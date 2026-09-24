"use client";

import { useEffect, useState } from "react";
import CashierWorkspace from "@/app/components/CashierWorkspace";
import ProductsWorkspace from "@/app/components/ProductsWorkspace";
import PurchasingWorkspace from "@/app/components/PurchasingWorkspace";

type Area = "cashier" | "add-items" | "purchasing";

function normalizeArea(value?: string): Area {
  if (value === "add-items" || value === "products") return "add-items";
  if (value === "purchasing") return "purchasing";
  return "cashier";
}

export default function CoreOperationsWorkspace({ initialArea = "cashier" }: { initialArea?: string }) {
  const [area, setArea] = useState<Area>(normalizeArea(initialArea));

  useEffect(() => {
    setArea(normalizeArea(initialArea));
  }, [initialArea]);

  return area === "add-items" ? <ProductsWorkspace /> : area === "purchasing" ? <PurchasingWorkspace /> : <CashierWorkspace />;
}
