"use client";

import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "./LanguageProvider";

const card="rounded-2xl border border-slate-800 bg-slate-900 p-5";
const inp="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm outline-none focus:border-cyan-400";
const btn="rounded-xl bg-cyan-400 px-4 py-2.5 font-black text-slate-950 disabled:opacity-50";
const ghost="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 font-bold text-slate-200";
const danger="rounded-xl border border-rose-700 px-3 py-2 font-bold text-rose-300";

async function squareImage(file:File,size=700){
  if(!file.type.startsWith("image/"))throw new Error("Please choose an image file");
  const url=URL.createObjectURL(file),img=new Image();
  await new Promise((resolve,reject)=>{img.onload=()=>resolve(null);img.onerror=reject;img.src=url;});
  const side=Math.min(img.width,img.height),sx=(img.width-side)/2,sy=(img.height-side)/2;
  const canvas=document.createElement("canvas");canvas.width=size;canvas.height=size;
  canvas.getContext("2d")!.drawImage(img,sx,sy,side,side,0,0,size,size);
  URL.revokeObjectURL(url);return canvas.toDataURL("image/jpeg",0.82);
}

export default function AddItemsWorkspace(){
  const {language}=useLanguage(),ar=language==="ar",L=(e:string,a:string)=>ar?a:e;
  const [d,setD]=useState<any>({products:[],categories:[],warehouses:[],suppliers:[],recipes:[]});
  const [cfg,setCfg]=useState<any>({categories:[],sections:[],products:[]});
  const [form,setForm]=useState<any>({});
  const [open,setOpen]=useState(false),[busy,setBusy]=useState(false);
  const [catOpen,setCatOpen]=useState(false),[catForm,setCatForm]=useState<any>({name:"",description:""});
  const [sectionOpen,setSectionOpen]=useState(false),[sectionForm,setSectionForm]=useState<any>({name:""});
  const [search,setSearch]=useState("");

  async function load(){
    const [a,b]=await Promise.all([fetch("/api/commerce-admin",{cache:"no-store"}),fetch("/api/cashier-config",{cache:"no-store"})]);
    if(a.ok)setD(await a.json());
    if(b.ok)setCfg(await b.json());
  }
  useEffect(()=>{load();},[]);

  const categories=cfg.categories?.length?cfg.categories:d.categories||[];
  const sections=cfg.sections||[];
  const visible=useMemo(()=>d.products.filter((p:any)=>!search||`${p.name} ${p.sku||""} ${p.barcode||""}`.toLowerCase().includes(search.toLowerCase())),[d.products,search]);
  const mainRecipes=(d.recipes||[]).filter((r:any)=>r.recipe_type!=="sub");
  const subRecipes=(d.recipes||[]).filter((r:any)=>r.recipe_type==="sub");

  function newItem(){
    setForm({name:"",price:"",cost:"",opening_quantity:"",category_id:"",section_id:"",sku:"",barcode:"",sale_unit:"piece",supplier_id:"",warehouse_id:"",show_on_cashier:true,purchasable:true,product_type:"purchased_product",inventory_policy:"stock",tax_enabled:true,tax_rate:15,image_url:null});
    setOpen(true);
  }
  function editItem(p:any){
    setForm({...p,cost:p.inventory_items?.average_cost??0,opening_quantity:"",supplier_id:p.preferred_supplier_id||"",warehouse_id:"",sale_unit:p.sale_unit||"piece",product_type:p.product_type||"purchased_product",inventory_policy:p.inventory_policy||"none",purchasable:p.purchasable??p.inventory_items?.purchasable??false,section_id:p.section_id||""});
    setOpen(true);
  }
  function changeType(t:string){
    const n:any={...form,product_type:t,recipe_id:null,sub_recipe_id:null};
    if(t==="raw_material"){n.inventory_policy="stock";n.show_on_cashier=false;n.purchasable=true;}
    else if(t==="purchased_product"){n.inventory_policy=n.inventory_policy==="none"?"none":"stock";n.show_on_cashier=true;}
    else if(t==="recipe_product"){n.inventory_policy="recipe_on_sale";n.show_on_cashier=true;n.purchasable=false;}
    else if(t==="sub_recipe"){n.inventory_policy="none";n.show_on_cashier=false;n.purchasable=false;}
    else{n.inventory_policy="none";n.show_on_cashier=true;n.purchasable=false;}
    setForm(n);
  }
  const tracked=form.inventory_policy==="stock"||form.inventory_policy==="produced_stock";
  const cashierBlocked=["raw_material","sub_recipe"].includes(form.product_type);

  async function post(url:string,kind:string,data:any){
    const r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({kind,data})});
    const j=await r.json();if(!r.ok){alert(j.error||L("Action failed","فشلت العملية"));return null;}return j;
  }
  async function generate(){
    const j=await post("/api/commerce-admin","generate_product_code",{product_type:form.product_type});
    if(j)setForm((v:any)=>({...v,sku:j.code,barcode:j.barcode}));
  }
  async function saveItem(){
    if(!String(form.name||"").trim())return alert(L("Product name is required","اسم الصنف مطلوب"));
    setBusy(true);
    const payload={...form,show_on_cashier:cashierBlocked?false:form.show_on_cashier!==false};
    const j=await post("/api/commerce-admin","product_save",payload);
    if(j?.record?.id){
      const s=await post("/api/cashier-config","product_section",{product_id:j.record.id,section_id:form.section_id||null});
      if(!s){setBusy(false);return;}
      setOpen(false);setForm({});await load();
    }
    setBusy(false);
  }
  async function saveCategory(){
    const j=await post("/api/cashier-config","category_save",catForm);
    if(j){setCatForm({name:"",description:""});await load();if(!catForm.id)setForm((v:any)=>({...v,category_id:j.record.id}));}
  }
  async function saveSection(){
    const j=await post("/api/cashier-config","section_save",sectionForm);
    if(j){setSectionForm({name:""});await load();if(!sectionForm.id)setForm((v:any)=>({...v,section_id:j.record.id}));}
  }

  const categoryName=(id:string)=>categories.find((c:any)=>c.id===id)?.name||L("No category","بدون تصنيف");
  const sectionName=(id:string)=>sections.find((s:any)=>s.id===id)?.name||L("No section","بدون قسم");

  return <div className="space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="text-3xl font-black">{L("Add Items","إضافة الأصناف")}</h1><p className="text-sm text-slate-400">{L("Create items once, then control Cashier, Inventory, Purchasing, Category and Section behavior.","أضف الصنف مرة واحدة وحدد ظهوره بالكاشير وتتبع المخزون والمشتريات والتصنيف والقسم.")}</p></div>
      <div className="flex flex-wrap gap-2"><button className={ghost} onClick={()=>setCatOpen(true)}>+ {L("Category","تصنيف")}</button><button className={ghost} onClick={()=>setSectionOpen(true)}>+ {L("Section","قسم")}</button><button className={btn} onClick={newItem}>+ {L("Item","صنف")}</button></div>
    </div>

    <input className={inp} placeholder={L("Search items / SKU / barcode","بحث عن صنف / SKU / باركود")} value={search} onChange={e=>setSearch(e.target.value)}/>

    <div className={card}>{visible.length===0?<p className="text-slate-500">{L("No items yet.","لا توجد أصناف بعد.")}</p>:visible.map((p:any)=><button key={p.id} onClick={()=>editItem(p)} className="grid w-full gap-2 border-b border-slate-800 py-3 text-left rtl:text-right md:grid-cols-[1fr_160px_150px_130px] md:items-center">
      <span><b>{p.name}</b><small className="block text-slate-500">{categoryName(p.category_id)} · {sectionName(p.section_id)} · {p.sale_unit||"piece"}</small></span>
      <span className="font-mono text-xs text-slate-400">{p.sku||"—"}</span>
      <span className={p.track_inventory?"text-emerald-300":"text-slate-500"}>{p.track_inventory?L("Track Inventory","تتبع مخزون"):L("No Stock Tracking","بدون تتبع")}</span>
      <span className={p.show_on_cashier&&!['raw_material','sub_recipe'].includes(p.product_type)?"text-cyan-300":"text-slate-500"}>{p.show_on_cashier&&!['raw_material','sub_recipe'].includes(p.product_type)?L("Cashier ON","ظاهر بالكاشير"):L("Cashier OFF","مخفي بالكاشير")}</span>
    </button>)}</div>

    {open&&<Modal title={form.id?L("Edit Item","تعديل الصنف"):L("New Item","صنف جديد")} close={()=>setOpen(false)}><div className="space-y-4">
      <Field label={L("Product Type","نوع الصنف")}><select className={inp} value={form.product_type||"purchased_product"} onChange={e=>changeType(e.target.value)}><option value="purchased_product">{L("Purchased Product","منتج مشتَرى")}</option><option value="raw_material">{L("Raw Material","مادة خام")}</option><option value="recipe_product">{L("Recipe Product","منتج وصفة")}</option><option value="sub_recipe">{L("Sub-Recipe","وصفة فرعية")}</option><option value="non_stock">{L("Non-stock / Service","غير مخزني / خدمة")}</option></select></Field>
      <Field label={L("Item Name *","اسم الصنف *")}><input className={inp} value={form.name||""} onChange={e=>setForm({...form,name:e.target.value})}/></Field>

      <div className="grid gap-3 md:grid-cols-2">
        <Field label={L("Category","التصنيف")}><div className="flex gap-2"><select className={inp} value={form.category_id||""} onChange={e=>setForm({...form,category_id:e.target.value})}><option value="">{L("No category","بدون تصنيف")}</option>{categories.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}</select><button type="button" className={ghost} onClick={()=>setCatOpen(true)}>+</button></div></Field>
        <Field label={L("Section","القسم")} hint={L("Use your own names. Later this section is the routing key for its kitchen/production printer.","سمِّ الأقسام كما تريد. هذا القسم سيكون مفتاح توجيه تذكرة المطبخ/الإنتاج إلى طابعته.")}><div className="flex gap-2"><select className={inp} value={form.section_id||""} onChange={e=>setForm({...form,section_id:e.target.value})}><option value="">{L("No section","بدون قسم")}</option>{sections.map((s:any)=><option key={s.id} value={s.id}>{s.name}</option>)}</select><button type="button" className={ghost} onClick={()=>setSectionOpen(true)}>+</button></div></Field>
      </div>

      <div className="grid gap-3 md:grid-cols-3"><Field label={L("Selling Price","سعر البيع")}><input className={inp} type="number" min="0" step="0.01" value={form.price??""} onChange={e=>setForm({...form,price:e.target.value})}/></Field><Field label={L("Cost","التكلفة")}><input className={inp} type="number" min="0" step="0.01" value={form.cost??""} onChange={e=>setForm({...form,cost:e.target.value})}/></Field><Field label={L("Unit","الوحدة")}><select className={inp} value={form.sale_unit||"piece"} onChange={e=>setForm({...form,sale_unit:e.target.value})}><option value="piece">{L("Piece","قطعة")}</option><option value="gram">{L("Gram","غرام")}</option><option value="kilogram">{L("Kilogram","كيلوغرام")}</option><option value="liter">{L("Liter","لتر")}</option><option value="milliliter">ML</option></select></Field></div>

      {form.product_type==="purchased_product"&&<label className="flex items-start gap-3 rounded-2xl border border-slate-800 bg-slate-950 p-4"><input className="mt-1 h-5 w-5" type="checkbox" checked={form.inventory_policy==="stock"} onChange={e=>setForm({...form,inventory_policy:e.target.checked?"stock":"none",purchasable:e.target.checked?form.purchasable:false})}/><span><b>{L("Track Inventory","تتبع المخزون")}</b><small className="block text-slate-500">{L("ON: sale must match available stock. OFF: item can be sold even with no stock record or zero stock.","مفعّل: البيع مرتبط برصيد المخزون. غير مفعّل: يمكن بيع الصنف حتى لو ما عنده رصيد أو غير موجود بالمخزون.")}</small></span></label>}
      {form.product_type==="raw_material"&&<div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-200">{L("Raw Material is always inventory-tracked and never appears on Cashier.","المادة الخام دائماً متتبعة بالمخزون ولا تظهر أبداً على شاشة الكاشير.")}</div>}
      {form.product_type==="recipe_product"&&<div className="grid gap-3 md:grid-cols-2"><Field label={L("Main Recipe","الوصفة الرئيسية")}><select className={inp} value={form.recipe_id||""} onChange={e=>setForm({...form,recipe_id:e.target.value})}><option value="">{L("Select recipe","اختر الوصفة")}</option>{mainRecipes.map((r:any)=><option key={r.id} value={r.id}>{r.name}</option>)}</select></Field><Field label={L("Inventory Logic","منطق المخزون")}><select className={inp} value={form.inventory_policy||"recipe_on_sale"} onChange={e=>setForm({...form,inventory_policy:e.target.value})}><option value="recipe_on_sale">{L("Consume ingredients on sale","استهلاك المكونات عند البيع")}</option><option value="produced_stock">{L("Produce finished stock first","إنتاج مخزون نهائي أولاً")}</option></select></Field></div>}
      {form.product_type==="sub_recipe"&&<Field label={L("Sub-Recipe","الوصفة الفرعية")}><select className={inp} value={form.sub_recipe_id||""} onChange={e=>setForm({...form,sub_recipe_id:e.target.value})}><option value="">{L("Select sub-recipe","اختر الوصفة الفرعية")}</option>{subRecipes.map((r:any)=><option key={r.id} value={r.id}>{r.name}</option>)}</select></Field>}

      <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]"><Field label="SKU"><input className={inp} value={form.sku||""} onChange={e=>setForm({...form,sku:e.target.value})}/></Field><Field label={L("Barcode","الباركود")}><input className={inp} value={form.barcode||""} onChange={e=>setForm({...form,barcode:e.target.value})}/></Field><button type="button" className={`${btn} self-end`} onClick={generate}>{L("Generate Code","إنشاء كود")}</button></div>

      <Field label={L("Item Image","صورة الصنف")}><div className="flex items-center gap-3"><label className={`${ghost} cursor-pointer`}>{L("Choose Image","اختيار صورة")}<input className="hidden" type="file" accept="image/*" onChange={async e=>{const f=e.target.files?.[0];if(f)setForm({...form,image_url:await squareImage(f)});}}/></label>{form.image_url&&<img src={form.image_url} alt="" className="h-16 w-16 rounded-xl object-cover"/>}</div></Field>

      {tracked&&<div className="grid gap-3 md:grid-cols-2"><Field label={L("Preferred Supplier","المورد المفضل")}><select className={inp} value={form.supplier_id||""} onChange={e=>setForm({...form,supplier_id:e.target.value})}><option value="">{L("No supplier","بدون مورد")}</option>{(d.suppliers||[]).map((s:any)=><option key={s.id} value={s.id}>{s.name}</option>)}</select></Field><Field label={L("Opening Stock Warehouse","مستودع الرصيد الافتتاحي")}><select className={inp} value={form.warehouse_id||""} onChange={e=>setForm({...form,warehouse_id:e.target.value})}><option value="">{L("Default / Main Warehouse","المستودع الافتراضي / الرئيسي")}</option>{(d.warehouses||[]).map((w:any)=><option key={w.id} value={w.id}>{w.name}</option>)}</select></Field></div>}
      {!form.id&&tracked&&<Field label={L("Opening Quantity","الكمية الافتتاحية")}><input className={inp} type="number" min="0" step={form.sale_unit==="piece"?"1":"0.001"} value={form.opening_quantity??""} onChange={e=>setForm({...form,opening_quantity:e.target.value})}/></Field>}

      <div className="grid gap-3 md:grid-cols-2">
        <label className={`flex gap-2 rounded-xl border border-slate-800 p-3 ${cashierBlocked?"opacity-50":""}`}><input type="checkbox" disabled={cashierBlocked} checked={!cashierBlocked&&form.show_on_cashier!==false} onChange={e=>setForm({...form,show_on_cashier:e.target.checked})}/><span>{L("Show on Cashier","إظهار على الكاشير")}</span></label>
        <label className={`flex gap-2 rounded-xl border border-slate-800 p-3 ${!tracked?"opacity-50":""}`}><input type="checkbox" disabled={!tracked} checked={tracked&&form.purchasable===true} onChange={e=>setForm({...form,purchasable:e.target.checked})}/><span>{L("Purchasable / Reorder from Supplier","قابل للشراء / إعادة الطلب من المورد")}</span></label>
      </div>
      <div className="grid gap-3 md:grid-cols-2"><label className="flex gap-2 rounded-xl border border-slate-800 p-3"><input type="checkbox" checked={form.tax_enabled!==false} onChange={e=>setForm({...form,tax_enabled:e.target.checked})}/><span>{L("Tax Enabled","خاضع للضريبة")}</span></label>{form.tax_enabled!==false&&<Field label={L("VAT %","نسبة الضريبة %")}><input className={inp} type="number" min="0" max="100" value={form.tax_rate??15} onChange={e=>setForm({...form,tax_rate:Number(e.target.value)})}/></Field>}</div>

      <button className={`${btn} w-full`} disabled={busy} onClick={saveItem}>{busy?L("Saving...","جارٍ الحفظ..."):L("Save Item","حفظ الصنف")}</button>
    </div></Modal>}

    {catOpen&&<Modal title={L("Categories","التصنيفات")} close={()=>setCatOpen(false)}><div className="space-y-4"><div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]"><input className={inp} placeholder={L("Category name","اسم التصنيف")} value={catForm.name||""} onChange={e=>setCatForm({...catForm,name:e.target.value})}/><input className={inp} placeholder={L("Description (optional)","الوصف (اختياري)")} value={catForm.description||""} onChange={e=>setCatForm({...catForm,description:e.target.value})}/><button className={btn} onClick={saveCategory}>{catForm.id?L("Update","تحديث"):L("Add Category","إضافة التصنيف")}</button></div>{categories.map((c:any)=><div key={c.id} className="flex items-center justify-between rounded-xl border border-slate-800 p-3"><span><b>{c.name}</b><small className="block text-slate-500">{c.description||c.code}</small></span><button className={ghost} onClick={()=>setCatForm(c)}>{L("Edit","تعديل")}</button></div>)}</div></Modal>}

    {sectionOpen&&<Modal title={L("Sections","الأقسام")} close={()=>setSectionOpen(false)}><div className="space-y-4"><p className="text-sm text-slate-400">{L("Create your own operational sections. No fixed names are imposed by AVERO.","أضف الأقسام التشغيلية بأسمائك أنت، ولا يفرض AVERO أسماء جاهزة.")}</p><div className="grid gap-2 md:grid-cols-[1fr_auto]"><input className={inp} placeholder={L("Section name","اسم القسم")} value={sectionForm.name||""} onChange={e=>setSectionForm({...sectionForm,name:e.target.value})}/><button className={btn} onClick={saveSection}>{sectionForm.id?L("Update","تحديث"):L("Add Section","إضافة القسم")}</button></div>{sections.map((s:any)=><div key={s.id} className="flex items-center justify-between rounded-xl border border-slate-800 p-3"><span><b>{s.name}</b><small className="block text-slate-500">{s.code}</small></span><button className={ghost} onClick={()=>setSectionForm(s)}>{L("Edit","تعديل")}</button></div>)}</div></Modal>}
  </div>;
}

function Field({label,hint,children}:any){return <label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-300">{label}</span>{children}{hint&&<small className="mt-1 block text-slate-500">{hint}</small>}</label>}
function Modal({title,close,children}:any){return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"><div className="max-h-[92vh] w-full max-w-4xl overflow-auto rounded-3xl border border-slate-700 bg-slate-900 p-6"><div className="mb-4 flex justify-between"><h2 className="text-xl font-black">{title}</h2><button onClick={close}>✕</button></div>{children}</div></div>}
