"use client";
import { useState } from "react";
import Link from "next/link";
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
import { useLanguage } from "@/app/components/LanguageProvider";

type Area = "inventory"|"suppliers"|"purchasing"|"production"|"recipes"|"subrecipes"|"products"|"customers"|"b2b"|"accounting"|"cashier";

type MenuItem={key:Area;en:string;ar:string;group:"operations"|"master"|"finance"|"sales"};

export default function CoreOperationsWorkspace() {
  const [area,setArea]=useState<Area>("cashier");
  const [menuOpen,setMenuOpen]=useState(false);
  const {language}=useLanguage();
  const ar=language==="ar";
  const L=(en:string,arabic:string)=>ar?arabic:en;
  const items:MenuItem[]=[
    {key:"cashier",en:"Cashier",ar:"الكاشير",group:"sales"},
    {key:"inventory",en:"Inventory",ar:"المخزون",group:"operations"},
    {key:"suppliers",en:"Suppliers",ar:"الموردون",group:"operations"},
    {key:"purchasing",en:"Purchasing",ar:"المشتريات",group:"operations"},
    {key:"production",en:"Production",ar:"الإنتاج",group:"operations"},
    {key:"recipes",en:"Recipes",ar:"الوصفات",group:"master"},
    {key:"subrecipes",en:"Sub Recipe",ar:"الوصفات الفرعية",group:"master"},
    {key:"products",en:"Products",ar:"المنتجات",group:"master"},
    {key:"customers",en:"Customers",ar:"العملاء",group:"master"},
    {key:"b2b",en:"B2B",ar:"منشآت B2B",group:"master"},
    {key:"accounting",en:"Accounting",ar:"المحاسبة",group:"finance"},
  ];
  const current=items.find(i=>i.key===area)!;
  const groups=[
    ["sales",L("Sales","المبيعات")],
    ["operations",L("Operations","العمليات")],
    ["master",L("Master Data","البيانات الأساسية")],
    ["finance",L("Finance","المالية")],
  ] as const;
  const choose=(key:Area)=>{setArea(key);setMenuOpen(false)};

  return <div className="relative">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div className="relative">
        <button onClick={()=>setMenuOpen(v=>!v)} className="inline-flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-black text-slate-100 hover:border-cyan-500/60">
          <span className="text-lg leading-none">☰</span>
          <span>{L("POS Menu","قائمة نقاط البيع")}</span>
          <span className="text-cyan-300">· {ar?current.ar:current.en}</span>
          <span className={`text-xs text-slate-500 transition ${menuOpen?"rotate-180":""}`}>▼</span>
        </button>
        {menuOpen&&<div className={`absolute top-12 z-40 w-[320px] rounded-2xl border border-slate-700 bg-slate-950 p-3 shadow-2xl ${ar?"right-0":"left-0"}`}>
          {groups.map(([group,label])=><div key={group} className="mb-3 last:mb-0">
            <div className="px-2 pb-1 text-[10px] font-black uppercase tracking-[.18em] text-slate-600">{label}</div>
            <div className="grid gap-1">
              {items.filter(i=>i.group===group).map(i=><button key={i.key} onClick={()=>choose(i.key)} className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-bold ${area===i.key?"bg-cyan-400 text-slate-950":"text-slate-300 hover:bg-slate-900"}`}>
                <span>{ar?i.ar:i.en}</span>{area===i.key&&<span>✓</span>}
              </button>)}
            </div>
          </div>)}
          <div className="mt-3 border-t border-slate-800 pt-3">
            <Link href="/settings?tab=pos" className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-bold text-slate-300 hover:bg-slate-900" onClick={()=>setMenuOpen(false)}>
              <span>{L("POS, Payments & Invoice Settings","إعدادات نقاط البيع والدفع والفاتورة")}</span><span>→</span>
            </Link>
          </div>
        </div>}
      </div>
      {area!=="cashier"&&<button onClick={()=>choose("cashier")} className="rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-black text-slate-950">{L("Back to Cashier","العودة للكاشير")}</button>}
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
     area==="accounting"?<AccountingWorkspace/>:
     <CashierWorkspace/>}
  </div>;
}
