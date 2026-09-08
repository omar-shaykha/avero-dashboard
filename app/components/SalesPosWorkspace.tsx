"use client";
import { useEffect, useMemo, useRef, useState } from 'react';

const panel='rounded-2xl border border-slate-800 bg-slate-900';
const btn='rounded-xl bg-cyan-400 px-4 py-3 font-black text-slate-950 disabled:opacity-40';
const ghost='rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 font-bold text-slate-300 hover:border-cyan-500/60';
const input='w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-400';

type CashierMode='hospitality'|'retail';

export default function SalesPosWorkspace(){
 const[d,S]=useState<any>({products:[],categories:[],orders:[],warehouses:[],shifts:[],settings:null});
 const[mode,setMode]=useState<CashierMode>('hospitality');
 const[cat,C]=useState('all'),[cart,K]=useState<any[]>([]),[search,Q]=useState('');
 const[service,setService]=useState('dine_in'),[discountPct,setDiscountPct]=useState(0),[discountOpen,setDiscountOpen]=useState(false),[customerOpen,setCustomerOpen]=useState(false),[holdsOpen,setHoldsOpen]=useState(false);
 const[customer,setCustomer]=useState({name:'',phone:'',email:'',notes:''}),[heldId,setHeldId]=useState<string|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const ref=useRef<HTMLInputElement>(null);

 async function load(){
  const r=await fetch('/api/sales',{cache:'no-store'});
  if(r.ok){
   const j=await r.json();
   S(j);
   setMode(j.settings?.cashier_mode==='retail'?'retail':'hospitality');
  }
 }
 useEffect(()=>{load()},[]);

 const currency=d.settings?.currency||'SAR';
 const openShift=d.shifts.find((x:any)=>x.status==='open');
 const warehouse=openShift?.warehouse_id||d.settings?.default_warehouse_id||d.warehouses[0]?.id;
 const heldOrders=d.orders.filter((x:any)=>x.status==='held');
 const products=useMemo(()=>d.products.filter((p:any)=>p.show_on_cashier&&(cat==='all'||p.category_id===cat)&&(!search||`${p.name} ${p.sku||''} ${p.barcode||''}`.toLowerCase().includes(search.toLowerCase()))),[d.products,cat,search]);

 function add(p:any){K((old:any[])=>{const i=old.findIndex(x=>x.id===p.id);return i<0?[...old,{...p,quantity:1}]:old.map((x,n)=>n===i?{...x,quantity:x.quantity+1}:x)})}
 function qty(id:string,n:number){K((old:any[])=>old.map(x=>x.id===id?{...x,quantity:Math.max(0,x.quantity+n)}:x).filter(x=>x.quantity>0))}

 const pricesIncludeTax=!!d.settings?.prices_include_tax;
 const computed=cart.map((x:any)=>{
  const listed=Number(x.price)*Number(x.quantity||0);
  const rate=x.tax_enabled?Math.max(0,Number(x.tax_rate||0)):0;
  const net=pricesIncludeTax&&rate>0?listed/(1+rate/100):listed;
  return{listed,rate,net};
 });
 const subtotal=computed.reduce((a:number,x:any)=>a+x.net,0);
 const discount=Math.min(subtotal,subtotal*Math.max(0,Math.min(100,discountPct))/100);
 const discountRatio=subtotal>0?discount/subtotal:0;
 const tax=computed.reduce((a:number,x:any)=>a+(x.rate>0?x.net*(1-discountRatio)*x.rate/100:0),0);
 const total=Math.max(0,subtotal-discount+tax);

 function reset(){K([]);Q('');setDiscountPct(0);setCustomer({name:'',phone:'',email:'',notes:''});setHeldId(null);setService(mode==='hospitality'?'dine_in':'retail')}
 async function api(kind:string,data:any){setBusy(true);setMessage('');const r=await fetch('/api/sales',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind,data})});const j=await r.json();setBusy(false);if(!r.ok){alert(j.error||'Action failed');return null}return j}

 async function openShiftNow(){
  if(!warehouse)return alert('Create/select a warehouse first');
  const raw=window.prompt('Opening cash amount','0');
  if(raw===null)return;
  const openingCash=Number(raw);
  if(!Number.isFinite(openingCash)||openingCash<0)return alert('Enter a valid opening cash amount');
  const j=await api('open_shift',{warehouse_id:warehouse,opening_cash:openingCash});
  if(j){setMessage('Shift opened');load()}
 }

 async function closeShiftNow(){
  if(!openShift)return;
  const raw=window.prompt('Count the cash drawer and enter closing cash','0');
  if(raw===null)return;
  const closingCash=Number(raw);
  if(!Number.isFinite(closingCash)||closingCash<0)return alert('Enter a valid closing cash amount');
  const j=await api('close_shift',{shift_id:openShift.id,closing_cash:closingCash});
  if(j){
   const variance=Number(j.variance||0);
   setMessage(`Shift closed · variance ${variance.toFixed(2)} ${currency}`);
   load();
  }
 }

 async function checkout(method='cash'){
  if(!cart.length)return;
  if(!warehouse)return alert('Default warehouse is required');
  if(!openShift)return alert('Open a shift before checkout');
  const j=await api('checkout',{shift_id:openShift.id,warehouse_id:warehouse,service_type:mode==='hospitality'?service:'retail',discount,discount_percent:discountPct,customer,held_order_id:heldId,lines:cart.map(x=>({product_id:x.id,quantity:x.quantity,discount:0})),payments:[{payment_method:method,amount:total}]});
  if(j){setMessage(`Paid · ${j.result?.order_no||'Sale completed'}`);reset();load()}
 }

 async function hold(){
  if(!cart.length)return;
  if(!warehouse)return alert('Warehouse is required');
  const j=await api('hold',{shift_id:openShift?.id||null,warehouse_id:warehouse,service_type:mode==='hospitality'?service:'retail',discount,discount_percent:discountPct,customer,lines:cart.map(x=>({product_id:x.id,quantity:x.quantity,discount:0}))});
  if(j){setMessage(`Order held · ${j.record?.order_no}`);reset();load()}
 }

 function recall(o:any){const lines=(o.sales_order_lines||[]).map((l:any)=>{const p=d.products.find((x:any)=>x.id===l.product_id);return p?{...p,quantity:Number(l.quantity)}:null}).filter(Boolean);K(lines);setHeldId(o.id);setCustomer({name:o.customer_name||'',phone:o.customer_phone||'',email:o.customer_email||'',notes:o.customer_notes||''});setDiscountPct(Number(o.discount_percent||0));setService(o.service_type||'dine_in');setHoldsOpen(false)}
 async function cancelHold(id:string){const j=await api('cancel_hold',{order_id:id});if(j){if(heldId===id)reset();load()}}
 function scan(e:any){if(e.key!=='Enter')return;const code=search.trim();const p=d.products.find((x:any)=>x.barcode===code||x.sku===code);if(p){add(p);Q('')}}

 return <div className="min-h-[78vh] space-y-4">
  <header className="flex flex-wrap items-center justify-between gap-3">
   <div><h1 className="text-3xl font-black">Cashier</h1><p className="text-sm text-slate-400">Two dedicated cashier interfaces · one shared product, recipe and inventory engine</p></div>
   <div className="flex flex-wrap gap-2"><button onClick={()=>setMode('hospitality')} className={mode==='hospitality'?btn:ghost}>Restaurant · Hotel · Catering</button><button onClick={()=>setMode('retail')} className={mode==='retail'?btn:ghost}>Retail · Grocery · Hypermarket</button></div>
  </header>
  <div className="flex flex-wrap items-center gap-2 text-sm"><span className={ghost}>Branch: {d.warehouses.find((w:any)=>w.id===warehouse)?.name||'Main'}</span><span className={ghost}>Shift: {openShift?'OPEN':'CLOSED'}</span>{!openShift?<button onClick={openShiftNow} className={btn}>Open Shift</button>:<button onClick={closeShiftNow} className={ghost}>Close Shift</button>}<button onClick={()=>setHoldsOpen(true)} className={ghost}>Held Orders ({heldOrders.length})</button>{pricesIncludeTax&&<span className={ghost}>Tax Included</span>}{message&&<span className="font-bold text-emerald-300">{message}</span>}</div>

  <div className="grid min-h-[700px] gap-4 xl:grid-cols-[1fr_420px]">
   <main className={`${panel} p-4`}>
    {mode==='hospitality'?<>
      <div className="mb-4 flex flex-wrap gap-2"><input ref={ref} value={search} onChange={e=>Q(e.target.value)} placeholder="Search menu item..." className={`${input} min-w-[250px] flex-1`}/>{['dine_in','takeaway','delivery'].map(x=><button key={x} onClick={()=>setService(x)} className={service===x?btn:ghost}>{x==='dine_in'?'Dine In':x==='takeaway'?'Takeaway':'Delivery'}</button>)}</div>
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1"><button onClick={()=>C('all')} className={cat==='all'?btn:ghost}>All</button>{d.categories.map((x:any)=><button key={x.id} onClick={()=>C(x.id)} className={cat===x.id?btn:ghost}>{x.name}</button>)}</div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-4">{products.map((p:any)=><button key={p.id} onClick={()=>add(p)} className="group overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 text-left hover:border-cyan-500/60"><div className="aspect-[16/10] bg-slate-800">{p.image_url?<img src={p.image_url} alt="" className="h-full w-full object-cover"/>:<div className="flex h-full items-center justify-center text-4xl text-slate-600">▣</div>}</div><div className="p-4"><div className="flex items-start justify-between gap-2"><b>{p.name}</b>{p.recipe_id&&<span className="rounded-full bg-emerald-500/15 px-2 py-1 text-[10px] font-black text-emerald-300">RECIPE</span>}</div><div className="mt-2 text-lg font-black text-cyan-300">{Number(p.price).toFixed(2)} {currency}</div></div></button>)}</div>
    </>:<>
      <div className="mb-4 rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-3"><label className="mb-2 block text-xs font-black uppercase tracking-wider text-cyan-300">Barcode / QR / SKU scanner</label><input ref={ref} autoFocus value={search} onChange={e=>Q(e.target.value)} onKeyDown={scan} placeholder="Scan barcode or QR, or type item name / SKU then press Enter..." className={`${input} text-lg`}/></div>
      <div className="mb-4 flex gap-2 overflow-x-auto"><button onClick={()=>C('all')} className={cat==='all'?btn:ghost}>All</button>{d.categories.map((x:any)=><button key={x.id} onClick={()=>C(x.id)} className={cat===x.id?btn:ghost}>{x.name}</button>)}</div>
      <div className="overflow-hidden rounded-2xl border border-slate-800"><div className="grid grid-cols-[1fr_140px_120px_90px] bg-slate-950 px-4 py-3 text-xs font-black uppercase text-slate-500"><span>Item</span><span>Barcode / SKU</span><span>Price</span><span></span></div>{products.map((p:any)=><button key={p.id} onClick={()=>add(p)} className="grid w-full grid-cols-[1fr_140px_120px_90px] items-center border-t border-slate-800 px-4 py-3 text-left hover:bg-slate-800/50"><span><b>{p.name}</b>{p.recipe_id&&<small className="ml-2 rounded bg-emerald-500/15 px-2 py-1 text-emerald-300">Recipe</small>}</span><span className="font-mono text-xs text-slate-400">{p.barcode||p.sku||'—'}</span><b>{Number(p.price).toFixed(2)} {currency}</b><span className="rounded-lg bg-cyan-400 px-3 py-2 text-center text-xs font-black text-slate-950">ADD</span></button>)}</div>
    </>}
   </main>

   <aside className={`${panel} flex flex-col overflow-hidden`}>
    <div className="border-b border-slate-800 p-5"><div className="flex items-center justify-between"><h2 className="text-xl font-black">Current Order</h2><button onClick={reset} className="text-sm font-bold text-rose-400">Clear</button></div><p className="text-xs text-slate-500">{cart.reduce((a:number,x:any)=>a+x.quantity,0)} items {heldId?'· recalled held order':''}</p>{customer.phone&&<p className="mt-1 text-xs font-bold text-cyan-300">Customer: {customer.name||customer.phone} · {customer.phone}</p>}</div>
    <div className="flex-1 overflow-y-auto p-4">{!cart.length&&<div className="flex h-full items-center justify-center text-center text-slate-600"><div><div className="text-5xl">▣</div><p className="mt-3 font-bold">No items yet</p><small>{mode==='retail'?'Scan a barcode or select an item':'Select a menu item'}</small></div></div>}{cart.map((x:any)=><div key={x.id} className="mb-2 rounded-xl border border-slate-800 bg-slate-950 p-3"><div className="flex justify-between gap-2"><div><b>{x.name}</b>{x.recipe_id&&<small className="ml-2 text-emerald-300">Recipe</small>}<small className="block text-slate-500">{Number(x.price).toFixed(2)} {currency}</small></div><b>{(Number(x.price)*x.quantity).toFixed(2)}</b></div><div className="mt-3 flex items-center gap-3"><button onClick={()=>qty(x.id,-1)} className="h-9 w-9 rounded-lg bg-slate-800 font-black">−</button><b>{x.quantity}</b><button onClick={()=>qty(x.id,1)} className="h-9 w-9 rounded-lg bg-slate-800 font-black">+</button><button onClick={()=>K(c=>c.filter(y=>y.id!==x.id))} className="ml-auto text-xs font-bold text-rose-400">Remove</button></div></div>)}</div>
    <div className="border-t border-slate-800 bg-slate-950/50 p-5"><div className="space-y-2 text-sm"><div className="flex justify-between"><span className="text-slate-400">Subtotal</span><b>{subtotal.toFixed(2)}</b></div>{discountPct>0&&<div className="flex justify-between text-emerald-300"><span>Discount {discountPct}%</span><b>-{discount.toFixed(2)}</b></div>}<div className="flex justify-between"><span className="text-slate-400">Tax</span><b>{tax.toFixed(2)}</b></div><div className="flex justify-between border-t border-slate-800 pt-3 text-2xl font-black"><span>Total</span><span className="text-cyan-300">{total.toFixed(2)} {currency}</span></div></div>
     <div className="mt-4 grid grid-cols-2 gap-2"><button disabled={busy||!cart.length||!openShift} onClick={()=>checkout('cash')} className={btn}>Cash</button><button disabled={busy||!cart.length||!openShift} onClick={()=>checkout('card')} className="rounded-xl bg-white px-4 py-3 font-black text-black disabled:opacity-40">Card</button></div>
     {!openShift&&cart.length>0&&<p className="mt-2 text-center text-xs font-bold text-amber-300">Open a shift before taking payment.</p>}
     <div className="mt-2 grid grid-cols-3 gap-2"><button disabled={!cart.length} onClick={hold} className={ghost}>Hold</button><button disabled={d.settings?.allow_discount===false} onClick={()=>setDiscountOpen(true)} className={ghost}>Discount</button><button onClick={()=>setCustomerOpen(true)} className={ghost}>Customer Details</button></div>
    </div>
   </aside>
  </div>

  {discountOpen&&<Modal title="Discount" close={()=>setDiscountOpen(false)}><p className="mb-3 text-sm text-slate-400">Apply a discount to the current invoice.</p><div className="grid grid-cols-3 gap-2">{[5,10,15,20,30].map(n=><button key={n} onClick={()=>{setDiscountPct(n);setDiscountOpen(false)}} className={discountPct===n?btn:ghost}>{n}%</button>)}<button onClick={()=>{setDiscountPct(0);setDiscountOpen(false)}} className={ghost}>No Discount</button></div><label className="mt-4 block text-xs font-bold text-slate-400">Custom %</label><div className="mt-2 flex gap-2"><input id="customDiscount" type="number" min="0" max="100" defaultValue={discountPct||0} className={input}/><button onClick={()=>{const el=document.getElementById('customDiscount') as HTMLInputElement;setDiscountPct(Math.max(0,Math.min(100,Number(el?.value||0))));setDiscountOpen(false)}} className={btn}>Apply</button></div></Modal>}
  {customerOpen&&<Modal title="Customer Details" close={()=>setCustomerOpen(false)}><div className="space-y-2"><input className={input} placeholder="Customer name" value={customer.name} onChange={e=>setCustomer({...customer,name:e.target.value})}/><input className={input} placeholder="Phone number" value={customer.phone} onChange={e=>setCustomer({...customer,phone:e.target.value})}/><input className={input} placeholder="Email (optional)" value={customer.email} onChange={e=>setCustomer({...customer,email:e.target.value})}/><textarea className={input} placeholder="Notes (optional)" value={customer.notes} onChange={e=>setCustomer({...customer,notes:e.target.value})}/><button onClick={()=>setCustomerOpen(false)} className={`${btn} w-full`}>Save Customer</button></div></Modal>}
  {holdsOpen&&<Modal title="Held Orders" close={()=>setHoldsOpen(false)}>{!heldOrders.length?<p className="text-slate-500">No held orders.</p>:<div className="space-y-2">{heldOrders.map((o:any)=><div key={o.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950 p-3"><div><b>{o.order_no}</b><small className="block text-slate-500">{o.customer_name||o.customer_phone||'Walk-in'} · {Number(o.total||0).toFixed(2)} {currency}</small></div><div className="flex gap-2"><button onClick={()=>recall(o)} className={btn}>Recall</button><button onClick={()=>cancelHold(o.id)} className="rounded-xl border border-rose-700 px-3 py-2 font-bold text-rose-300">Delete</button></div></div>)}</div>}</Modal>}
 </div>
}

function Modal({title,close,children}:any){return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"><div className="w-full max-w-lg rounded-3xl border border-slate-700 bg-slate-900 p-6"><div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-black">{title}</h2><button onClick={close} className="text-slate-400">✕</button></div>{children}</div></div>}
