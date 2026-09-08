"use client";
import { useState } from "react";
import SuppliersWorkspace from "@/app/components/SuppliersWorkspace";
import InventoryWorkspace from "@/app/components/InventoryWorkspace";
import InventoryAdvancedControls from "@/app/components/InventoryAdvancedControls";
import InventoryPermissionsPanel from "@/app/components/InventoryPermissionsPanel";
import PurchasingWorkspace from "@/app/components/PurchasingWorkspace";
import ProductionRecipeWorkspace from "@/app/components/ProductionRecipeWorkspace";
import SalesPosWorkspace from "@/app/components/SalesPosWorkspace";

export default function CoreOperationsWorkspace() {
  const [area, setArea] = useState<
    "inventory" | "suppliers" | "purchasing" | "production" | "cashier"
  >("inventory");

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-2 rounded-2xl border border-slate-800 bg-slate-900 p-2">
        {[
          ["inventory", "Inventory"],
          ["suppliers", "Suppliers"],
          ["purchasing", "Purchasing"],
          ["production", "Production / Recipes"],
          ["cashier", "Cashier"],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setArea(key as typeof area)}
            className={`rounded-xl px-5 py-2.5 text-sm font-black ${
              area === key
                ? "bg-cyan-400 text-slate-950"
                : "text-slate-400"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {area === "inventory" ? (
        <div className="space-y-8">
          <InventoryWorkspace />
          <InventoryAdvancedControls />
          <InventoryPermissionsPanel />
        </div>
      ) : area === "suppliers" ? (
        <SuppliersWorkspace />
      ) : area === "purchasing" ? (
        <PurchasingWorkspace />
      ) : area === "production" ? (
        <ProductionRecipeWorkspace />
      ) : (
        <SalesPosWorkspace />
      )}
    </div>
  );
}
