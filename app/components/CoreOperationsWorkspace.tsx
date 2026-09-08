"use client";
import { useState } from "react";
import SuppliersWorkspace from "@/app/components/SuppliersWorkspace";
import InventoryWorkspace from "@/app/components/InventoryWorkspace";
import InventoryAdvancedControls from "@/app/components/InventoryAdvancedControls";
import InventoryPermissionsPanel from "@/app/components/InventoryPermissionsPanel";
import PurchasingWorkspace from "@/app/components/PurchasingWorkspace";
import ProductionWorkspace from "@/app/components/ProductionWorkspace";
import RecipeWorkspace from "@/app/components/RecipeWorkspace";
import RecipeCashierPublisher from "@/app/components/RecipeCashierPublisher";
import CommerceAdminWorkspace from "@/app/components/CommerceAdminWorkspace";
import CashierWorkspace from "@/app/components/CashierWorkspace";
import { useLanguage } from "@/app/components/LanguageProvider";

type Area = "inventory"|"suppliers"|"purchasing"|"production"|"recipes"|"subrecipes"|"products"|"customers"|"b2b"|"invoice"|"cashier";
export default function CoreOperationsWorkspace() {
  const [area,setArea]=useState<Area>("inventory");
  const {language}=useLanguage();const ar=language==="ar";const L=(en:string,arabic:string)=>ar?arabic:en;
  const tabs:[Area,string][]=[
    ["inventory",L("Inventory","المخزون")],["suppliers",L("Suppliers","الموردون")],["purchasing",L("Purchasing","المشتريات")],["production",L("Production","الإنتاج")],["recipes",L("Recipes","الوصفات")],["subrecipes",L("Sub Recipe","الوصفات الفرعية")],["products",L("Products","المنتجات")],["customers",L("Customers","العملاء")],["b2b","B2B"],["invoice",L("Invoice Customization","تخصيص الفاتورة")],["cashier",L("Cashier","الكاشير")]
  ];
  return <div>
    <div className="mb-6 flex flex-wrap gap-2 rounded-2xl border border-slate-800 bg-slate-900 p-2">
      {tabs.map(([key,label])=><button key={key} onClick={()=>setArea(key)} className={`rounded-xl px-4 py-2.5 text-sm font-black ${area===key?"bg-cyan-400 text-slate-950":"text-slate-400"}`}>{label}</button>)}
    </div>
    {area==="inventory"?<div className="space-y-8"><InventoryWorkspace/><InventoryAdvancedControls/><InventoryPermissionsPanel/></div>:
     area==="suppliers"?<SuppliersWorkspace/>:
     area==="purchasing"?<PurchasingWorkspace/>:
     area==="production"?<ProductionWorkspace/>:
     area==="recipes"?<div className="space-y-8"><RecipeWorkspace type="main"/><RecipeCashierPublisher/></div>:
     area==="subrecipes"?<RecipeWorkspace type="sub"/>:
     area==="products"?<CommerceAdminWorkspace mode="products"/>:
     area==="customers"?<CommerceAdminWorkspace mode="customers"/>:
     area==="b2b"?<CommerceAdminWorkspace mode="b2b"/>:
     area==="invoice"?<CommerceAdminWorkspace mode="invoice"/>:
     <CashierWorkspace/>}
  </div>;
}
