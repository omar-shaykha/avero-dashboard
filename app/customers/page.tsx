"use client";
import { useEffect,useState } from "react";
import Sidebar from "@/app/components/Sidebar";
import DashboardHeader from "@/app/components/DashboardHeader";
import { useLanguage } from "@/app/components/LanguageProvider";

type Customer={id:string;customer_code?:string;name:string;phone?:string;email?:string;orders:number;total:number;cash:number;card:number;credit:number;other:number};
export default function CustomersPage(){
 const {language}=useLanguage(),ar=language==="ar",L=(en:string,arText:string)=>ar?arText:en;
 const [rows,setRows]=useState<Customer[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState("");
 useEffect(()=>{fetch("/api/customers",{cache:"no-store"}).then(async r=>{const j=await r.json();if(!r.ok)throw new Error(j.error||"Failed");setRows(j.customers||[])}).catch(e=>setError(e.message)).finally(()=>setLoading(false))},[]);
 return <div className="min-h-screen bg-slate-950 text-white"><Sidebar/><div className="min-h-screen md:ml-64"><DashboardHeader/><main className="mx-auto max-w-7xl p-5 md:p-8">
 <h1 className="text-3xl font-bold">{L("Customers","العملاء")}</h1><p className="mt-2 text-slate-400">{L("Customer sales and payment history from the cashier and point of sale.","مبيعات العملاء وسجل طرق الدفع من الكاشير ونقطة البيع.")}</p>
 {loading?<p className="mt-8 text-slate-400">{L("Loading…","جارٍ التحميل…")}</p>:error?<p className="mt-8 text-rose-300">{error}</p>:<div className="mt-6 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60"><table className="w-full text-sm"><thead className="border-b border-slate-800 text-slate-400"><tr>{[L("Customer","العميل"),L("Phone","الهاتف"),L("Orders","الطلبات"),L("Total purchases","إجمالي المشتريات"),L("Cash","نقدي"),L("Card","بطاقة"),L("Credit","آجل"),L("Other","أخرى")].map(x=><th key={x} className="px-4 py-3 text-left font-semibold">{x}</th>)}</tr></thead><tbody>{rows.map(c=><tr key={c.id} className="border-b border-slate-800/70"><td className="px-4 py-4"><strong>{c.name}</strong>{c.email&&<div className="text-xs text-slate-500">{c.email}</div>}</td><td className="px-4 py-4">{c.phone||"—"}</td><td className="px-4 py-4">{c.orders}</td>{[c.total,c.cash,c.card,c.credit,c.other].map((v,i)=><td key={i} className="px-4 py-4">{Number(v||0).toFixed(2)} SAR</td>)}</tr>)}{!rows.length&&<tr><td colSpan={8} className="px-4 py-12 text-center text-slate-500">{L("No customers yet.","لا يوجد عملاء بعد.")}</td></tr>}</tbody></table></div>}
 </main></div></div>;
}