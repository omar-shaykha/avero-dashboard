"use client";

import { useEffect } from "react";

const LABELS: Record<string, string> = {
  "Product / service name": "Product / Service Name",
  "SKU": "SKU / Item Code",
  "Barcode": "Barcode",
  "Sale price": "Sale Price",
  "Cost": "Cost Price",
  "Tax %": "Tax %",
  "Minimum stock": "Minimum Stock",
  "New category": "New Category",
};

function setReactInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

export default function PosFormEnhancer() {
  useEffect(() => {
    let stopped = false;
    const enhance = () => {
      if (stopped) return;
      const heading = Array.from(document.querySelectorAll("h2")).find((el) => el.textContent?.includes("Add / Edit Product"));
      const card = heading?.closest("section");
      if (!card) return;

      card.querySelectorAll<HTMLInputElement>("input[placeholder]").forEach((input) => {
        const placeholder = input.getAttribute("placeholder") || "";
        const labelText = LABELS[placeholder];
        if (!labelText || input.dataset.averoLabeled === "1") return;
        const label = document.createElement("div");
        label.textContent = labelText;
        label.className = "mb-1 text-[11px] font-bold uppercase tracking-[.12em] text-slate-400";
        input.parentElement?.insertBefore(label, input);
        input.dataset.averoLabeled = "1";
      });

      const selects = card.querySelectorAll<HTMLSelectElement>("select");
      const selectLabels = ["Category", "Unit", "Product Type"];
      selects.forEach((select, index) => {
        if (index > 2 || select.dataset.averoLabeled === "1") return;
        const label = document.createElement("div");
        label.textContent = selectLabels[index];
        label.className = "mb-1 text-[11px] font-bold uppercase tracking-[.12em] text-slate-400";
        select.parentElement?.insertBefore(label, select);
        select.dataset.averoLabeled = "1";
      });

      const sku = card.querySelector<HTMLInputElement>('input[placeholder="SKU"]');
      const barcode = card.querySelector<HTMLInputElement>('input[placeholder="Barcode"]');
      if (sku && barcode && !card.querySelector("[data-avero-code-controls]")) {
        const controls = document.createElement("div");
        controls.dataset.averoCodeControls = "1";
        controls.className = "col-span-full grid grid-cols-2 gap-2 rounded-xl border border-slate-800 bg-slate-950/70 p-2";

        const auto = document.createElement("button");
        auto.type = "button";
        auto.textContent = "Generate Codes Automatically";
        auto.className = "rounded-lg bg-cyan-500 px-3 py-2 text-xs font-black text-slate-950";
        auto.onclick = async () => {
          auto.textContent = "Generating...";
          auto.setAttribute("disabled", "true");
          try {
            const response = await fetch("/api/pos", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "product.generate_codes" }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Could not generate codes");
            setReactInputValue(sku, data.sku || "");
            setReactInputValue(barcode, data.barcode || "");
            auto.textContent = "Codes Generated ✓";
          } catch {
            auto.textContent = "Generate Codes Automatically";
          } finally {
            auto.removeAttribute("disabled");
          }
        };

        const manual = document.createElement("button");
        manual.type = "button";
        manual.textContent = "Use My Own Codes";
        manual.className = "rounded-lg border border-slate-700 px-3 py-2 text-xs font-black text-slate-300";
        manual.onclick = () => { sku.focus(); };

        controls.append(auto, manual);
        barcode.parentElement?.parentElement?.insertAdjacentElement("afterend", controls);
      }
    };

    enhance();
    const observer = new MutationObserver(enhance);
    observer.observe(document.body, { childList: true, subtree: true });
    const timer = window.setInterval(enhance, 700);
    return () => { stopped = true; observer.disconnect(); window.clearInterval(timer); };
  }, []);

  return null;
}
