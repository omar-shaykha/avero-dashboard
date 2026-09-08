"use client";
import { useEffect, useState } from "react";
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
import AccountingWorkspace from "@/app/components/AccountingWorkspace";

type Area = "inventory"|"suppliers"|"purchasing"|"production"|"recipes"|"subrecipes"|"products"|"customers"|"b2b"|"accounting"|"cashier";
const allowed:Area[]=["inventory","suppliers","purchasing","production","recipes","subrecipes","products","customers","b2b","accounting","cashier"];

export default function CoreOperationsWorkspace({initialArea="cashier"}:{initialArea?:string}) {
  const safeInitial=allowed.includes(initialArea as Area)?initialArea as Area:"cashier";
  const [area,setArea]=useState<Area>(safeInitial);
  useEffect(()=>{setArea(allowed.includes(initialArea as Area)?initialArea as Area:"cashier")},[initialArea]);

  return <div>
    {area==="inventory"?<div className="space-y-8"><InventoryWorkspace/><InventoryAdvancedControls/><InventoryPermissionsPanel/></div>:
     area==="suppliers"?<SuppliersWorkspace/>:
     area==="purchasing"?<PurchasingWorkspace/>:
     area==="production"?<ProductionWorkspace/>:
     area==="recipes"?<div className="space-y-8"><RecipeWorkspace type="main"/><RecipeCashierPublisher/></div>:
     area==="subrecipes"?<RecipeWorkspace type="sub"/>:
     area==="products"?<CommerceAdminWorkspace mode="products"/>:
     area==="customers"?<CommerceAdminWorkspace mode="customers"/>:
     area==="b2b"?<CommerceAdminWorkspace mode="b2b"/>:
     area==="accounting"?<AccountingWorkspace/>:
     <CashierWorkspace/>}
  </div>;
}
