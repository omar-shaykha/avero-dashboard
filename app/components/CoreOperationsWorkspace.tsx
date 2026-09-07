"use client";
import {useState} from "react";
import SuppliersWorkspace from "@/app/components/SuppliersWorkspace";
import InventoryWorkspace from "@/app/components/InventoryWorkspace";
import InventoryAdvancedControls from "@/app/components/InventoryAdvancedControls";
import InventoryPermissionsPanel from "@/app/components/InventoryPermissionsPanel";
export default function CoreOperationsWorkspace(){const[area,setArea]=useState<'inventory'|'suppliers'>('inventory');return <div><div className="mb-6 flex gap-2 rounded-2xl border border-slate-800 bg-slate-900 p-2"><button onClick={()=>setArea('inventory')} className={`rounded-xl px-5 py-2.5 text-sm font-black ${area==='inventory'?'bg-cyan-400 text-slate-950':'text-slate-400'}`}>Inventory</button><button onClick={()=>setArea('suppliers')} className={`rounded-xl px-5 py-2.5 text-sm font-black ${area==='suppliers'?'bg-cyan-400 text-slate-950':'text-slate-400'}`}>Suppliers</button></div>{area==='inventory'?<div className="space-y-8"><InventoryWorkspace/><InventoryAdvancedControls/><InventoryPermissionsPanel/></div>:<SuppliersWorkspace/>}</div>}
