"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "./LanguageProvider";

const card="rounded-2xl border border-slate-800 bg-slate-900 p-5";
const inp="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm outline-none focus:border-cyan-400";
const btn="rounded-xl bg-cyan-400 px-4 py-2.5 font-black text-slate-950 disabled:opacity-50";
const ghost="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 font-bold text-slate-200";
const danger="rounded-xl border border-rose-700 px-4 py-2.5 font-black text-rose-300";

async function squareImageBlob(file:File,size=700){
  if(!file.type.startsWith("image/"))throw new Error("Please choose an image file");
  const url=URL.createObjectURL(file),img=new Image();
  await new Promise((resolve,reject)=>{img.onload=()=>resolve(null);img.onerror=reject;img.src=url;});
  const side=Math.min(img.width,img.height),sx=(img.width-side)/2,sy=(img.height-side)/2;
  const canvas=document.createElement("canvas");canvas.width=size;canvas.height=size;
  canvas.getContext("2d")!.drawImage(img,sx,sy,side,side,0,0,size,size);
  URL.revokeObjectURL(url);
  return await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error("Image processing failed")),"image/jpeg",0.82));
}

export default function ProductsWorkspace(){
  const {language}=useLanguage(),ar=language==="ar",L=(e:string,a:string)=>ar?a:e;
  const [d,setD]=useState<any>({products:[],categories:[],warehouses:[],suppliers:[],recipes:[],sections:[],inventory_items:[],units:[]});
  const [form,setForm]=useState<any>({});
  const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[menuId,setMenuId]=useState<string|null>(null),[preview,setPreview]=useState<any>(null);
  const [catOpen,setCatOpen]=useState(false),[catForm,setCatForm]=useState<any>({});
  const [sectionOpen,setSectionOpen]=useState(false),[sectionForm,setSectionForm]=useState<any>({});
  const [imageBlob,setImageBlob]=useState<Blob|null>(null),[imagePreview,setImagePreview]=useState<string|null>(null);
  const [recipeQuery,setRecipeQuery]=useState("");
  const [recipeBuilder,setRecipeBuilder]=useState(false);
  const [recipeDraft,setRecipeDraft]=useState<any>({name:"",lines:[]});
  const migrated=useRef(false);

  async function fetchData(){const r=await fetch("/api/product-data",{cache:"no-store"});if(!r.ok)return null;return await r.json();}
  async function load(){
    const j=await fetchData();if(!j)return;setD(j);
    if(j.legacy_image_count>0&&!migrated.current){
      migrated.current=true;
      await fetch("/api/product-images",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({kind:"migrate_legacy"})}).catch(()=>null);
      const fresh=await fetchData();if(fresh)setD(fresh);
    }
  }
  useEffect(()=>{load();return()=>{if(imagePreview?.startsWith("blob:"))URL.revokeObjectURL(imagePreview);};},[]);

  async function post(url:string,kind:string,data:any){
    const r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({kind,data})});
    const j=await r.json().catch(()=>({}));if(!r.ok){alert(j.error||L("Action failed","فشلت العملية"));return null;}return j;
  }
  function resetImage(){if(imagePreview?.startsWith("blob:"))URL.revokeObjectURL(imagePreview);setImageBlob(null);setImagePreview(null);}
  function resetRecipe(){setRecipeQuery("");setRecipeBuilder(false);setRecipeDraft({name:"",lines:[]});}
  function newProduct(){resetImage();resetRecipe();setForm({name:"",price:"",cost:"",opening_quantity:"",category_id:"",section_id:"",sku:"",barcode:"",sale_unit:"piece",supplier_id:"",warehouse_id:"",show_on_cashier:true,purchasable:true,product_type:"purchased_product",inventory_policy:"stock",tax_enabled:true,tax_rate:15,image_url:null,image_path:null});setOpen(true);}
  function editProduct(p:any){resetImage();setRecipeBuilder(false);setRecipeDraft({name:"",lines:[]});const rp=d.recipes.find((r:any)=>r.id===p.recipe_id);setRecipeQuery(rp?.name||"");setForm({...p,cost:p.inventory_items?.average_cost??0,opening_quantity:"",supplier_id:p.preferred_supplier_id||"",warehouse_id:"",sale_unit:p.sale_unit||"piece",product_type:p.product_type||"non_stock",inventory_policy:p.product_type==="recipe_product"?"recipe_on_sale":p.inventory_policy||"none",purchasable:p.product_type==="recipe_product"?false:p.purchasable??p.inventory_items?.purchasable??false,section_id:p.section_id||""});setOpen(true);setMenuId(null);}
  function changeType(t:string){const n:any={...form,product_type:t,recipe_id:null,sub_recipe_id:null};if(t==="raw_material"){n.inventory_policy="stock";n.show_on_cashier=false;n.purchasable=true;setRecipeQuery("");}else if(t==="purchased_product"){n.inventory_policy="stock";n.show_on_cashier=true;n.purchasable=true;setRecipeQuery("");}else if(t==="recipe_product"){n.inventory_policy="recipe_on_sale";n.show_on_cashier=true;n.purchasable=false;setRecipeQuery(String(form.name||""));}else if(t==="sub_recipe"){n.inventory_policy="none";n.show_on_cashier=false;n.purchasable=false;setRecipeQuery("");}else{n.inventory_policy="none";n.show_on_cashier=true;n.purchasable=false;setRecipeQuery("");}setRecipeBuilder(false);setForm(n);}
  function changeProductName(name:string){
    const next:any={...form,name};
    if(form.product_type==="recipe_product"){
      const exact=mainRecipes.find((r:any)=>String(r.name||"").trim().toLowerCase()===name.trim().toLowerCase());
      if(exact){next.recipe_id=exact.id;setRecipeQuery(exact.name);}else if(!form.recipe_id){setRecipeQuery(name);}
    }
    setForm(next);
  }
  async function generateCode(){setBusy(true);const j=await post("/api/commerce-admin","generate_product_code",{product_type:form.product_type});setBusy(false);if(j)setForm((v:any)=>({...v,sku:j.code,barcode:j.barcode}));}
  async function chooseImage(file?:File){if(!file)return;try{const blob=await squareImageBlob(file);resetImage();setImageBlob(blob);setImagePreview(URL.createObjectURL(blob));}catch(e:any){alert(e.message||"Image failed");}}
  async function saveProduct(){
    if(!String(form.name||"").trim())return alert(L("Product name is required","اسم المنتج مطلوب"));
    if(form.product_type==="recipe_product"&&!form.recipe_id)return alert(L("Choose an existing recipe or add a new recipe first.","اختر وصفة موجودة أو أضف وصفة جديدة أولاً."));
    setBusy(true);
    const blocked=["raw_material","sub_recipe"].includes(form.product_type);
    const payload={...form,show_on_cashier:blocked?false:form.show_on_cashier!==false};
    if(form.product_type==="recipe_product"){payload.inventory_policy="recipe_on_sale";payload.purchasable=false;}
    if(imageBlob){payload.image_url=form.id?form.image_url||null:null;payload.image_path=form.image_path||null;}
    const j=await post("/api/commerce-admin","product_save",payload);
    if(!j?.record?.id){setBusy(false);return;}
    const productId=j.record.id;
    const sec=await post("/api/cashier-config","product_section",{product_id:productId,section_id:form.section_id||null});
    if(!sec){setBusy(false);return;}
    if(imageBlob){
      const fd=new FormData();fd.append("file",new File([imageBlob],"product.jpg",{type:"image/jpeg"}));
      const ur=await fetch("/api/product-images",{method:"POST",body:fd});const uj=await ur.json().catch(()=>({}));
      if(ur.ok){const br=await fetch("/api/product-images",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({kind:"bind",product_id:productId,path:uj.path,url:uj.url})});if(!br.ok)alert((await br.json().catch(()=>({}))).error||L("Product saved, but image linking failed","تم حفظ المنتج لكن ربط الصورة فشل"));}
      else alert(uj.error||L("Product saved, but image upload failed","تم حفظ المنتج لكن رفع الصورة فشل"));
    }
    resetImage();resetRecipe();setOpen(false);setForm({});await load();setBusy(false);
  }
  async function archiveProduct(id:string){if(!confirm(L("Archive this product? Previous invoices remain saved.","أرشفة هذا المنتج؟ الفواتير السابقة ستبقى محفوظة.")))return;setBusy(true);const j=await post("/api/product-data","archive",{id});if(j){setMenuId(null);setOpen(false);await load();}setBusy(false);}
  async function saveCategory(){setBusy(true);const j=await post("/api/commerce-admin","category_save",catForm);if(j){setCatForm({});await load();}setBusy(false);}
  async function saveSection(){setBusy(true);const j=await post("/api/cashier-config","section_save",sectionForm);if(j){setSectionForm({});await load();}setBusy(false);}
  function openRecipeBuilder(){
    const firstItem=d.inventory_items?.[0];
    setRecipeDraft({name:String(form.name||"").trim(),lines:[{item_id:"",quantity:"",unit_id:firstItem?.base_unit_id||""}]});
    setRecipeBuilder(true);
  }
  function addRecipeLine(){setRecipeDraft((v:any)=>({...v,lines:[...(v.lines||[]),{item_id:"",quantity:"",unit_id:""}]}));}
  function updateRecipeLine(index:number,patch:any){setRecipeDraft((v:any)=>({...v,lines:(v.lines||[]).map((l:any,i:number)=>i===index?{...l,...patch}:l)}));}
  function removeRecipeLine(index:number){setRecipeDraft((v:any)=>({...v,lines:(v.lines||[]).filter((_:any,i:number)=>i!==index)}));}
  async function saveInlineRecipe(){
    const name=String(recipeDraft.name||form.name||"").trim();
    if(!name)return alert(L("Recipe name is required","اسم الوصفة مطلوب"));
    const lines=(recipeDraft.lines||[]).filter((l:any)=>l.item_id&&Number(l.quantity)>0);
    if(!lines.length)return alert(L("Add at least one ingredient with a quantity.","أضف مكوّناً واحداً على الأقل مع الكمية."));
    setBusy(true);
    const j=await post("/api/product-data","recipe_create",{name,lines});
    if(j?.record){setForm((v:any)=>({...v,recipe_id:j.record.id,inventory_policy:"recipe_on_sale",purchasable:false}));setRecipeQuery(j.record.name);setRecipeBuilder(false);setRecipeDraft({name:"",lines:[]});await load();}
    setBusy(false);
  }

  const typeLabel=(t:string)=>({raw_material:L("Raw Material","مادة خام"),purchased_product:L("Purchased Product","منتج مشتَرى"),recipe_product:L("Recipe Product","منتج وصفة"),sub_recipe:L("Sub-Recipe","وصفة فرعية"),non_stock:L("Non-stock / Service","غير مخزني / خدمة")} as any)[t]||t;
  const policyLabel=(p:string)=>({none:L("No inventory movement","بدون حركة مخزون"),stock:L("Stock item","عنصر مخزون"),recipe_on_sale:L("Recipe linked","مربوط بوصفة"),produced_stock:L("Produce then sell from stock","إنتاج ثم بيع من المخزون")} as any)[p]||p;
  const tracked=form.inventory_policy==="stock"||form.inventory_policy==="produced_stock";
  const blocked=["raw_material","sub_recipe"].includes(form.product_type);
  const mainRecipes=d.recipes.filter((r:any)=>r.recipe_type!=="sub"),subRecipes=d.recipes.filter((r:any)=>r.recipe_type==="sub");
  const selectedRecipe=mainRecipes.find((r:any)=>r.id===form.recipe_id);
  const recipeNeedle=String(recipeQuery||form.name||"").trim().toLowerCase();
  const recipeResults=mainRecipes.filter((r:any)=>!recipeNeedle||String(r.name||"").toLowerCase().includes(recipeNeedle)||String(r.recipe_code||"").toLowerCase().includes(recipeNeedle)).slice(0,8);
  const inventoryLogic=form.product_type==="recipe_product"?L("The selected recipe ingredients are consumed automatically when this product is sold.","يتم استهلاك مكونات الوصفة المختارة تلقائياً عند بيع هذا المنتج."):form.inventory_policy==="produced_stock"?L("Production adds finished stock; Cashier later decreases the finished item.","الإنتاج يضيف مخزوناً نهائياً ثم الكاشير يخصم المنتج النهائي."):form.inventory_policy==="stock"?L("The product is linked to Inventory and Cashier decreases its stock when sold.","المنتج مربوط بالمخزون والكاشير يخصم من رصيده عند البيع."):L("No inventory movement. The item can be sold without stock tracking.","بدون حركة مخزون ويمكن بيع الصنف من دون تتبع الكمية.");
  const accountingLogic=form.product_type==="recipe_product"||tracked?L("Sale can post COGS against inventory according to its stock/recipe logic.","البيع يرحّل تكلفة البضاعة مقابل المخزون حسب منطق المخزون/الوصفة."):L("Revenue and VAT only; no Inventory Asset / COGS movement.","إيراد وضريبة فقط دون حركة أصل مخزون أو تكلفة بضاعة مباعة.");
  const sectionName=(id:any)=>d.sections.find((s:any)=>s.id===id)?.name||L("No section","بدون قسم");

  return <div className="space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-3xl font-black">{L("Products","المنتجات")}</h1><p className="text-sm text-slate-400">{L("One product master linked to Cashier, Inventory, Suppliers, Purchasing, Recipes and Accounting.","سجل منتج واحد مربوط بالكاشير والمخزون والموردين والمشتريات والوصفات والمحاسبة.")}</p></div><div className="flex flex-wrap gap-2"><button className={ghost} onClick={()=>setCatOpen(true)}>{L("Manage Categories","إدارة التصنيفات")}</button><button className={ghost} onClick={()=>setSectionOpen(true)}>{L("Manage Sections","إدارة الأقسام")}</button><button className={btn} onClick={newProduct}>+ {L("Product","منتج")}</button></div></div>

    <div className={card}>{d.products.length===0?<p className="text-slate-500">{L("No products yet.","لا توجد منتجات بعد.")}</p>:d.products.map((p:any)=><div key={p.id} className="relative grid gap-3 border-b border-slate-800 py-3 md:grid-cols-[70px_1fr_125px_105px_120px_44px] md:items-center">
      <div className="h-16 w-16 overflow-hidden rounded-xl bg-slate-800">{p.image_url&&!String(p.image_url).startsWith("data:image/")&&<img loading="lazy" src={p.image_url} alt="" className="h-full w-full object-cover"/>}</div>
      <button className="text-left rtl:text-right" onClick={()=>setPreview(p)}><div className="flex flex-wrap items-center gap-2"><b>{p.name}</b><span className="rounded-full bg-slate-800 px-2 py-1 text-[10px] font-black text-cyan-300">{typeLabel(p.product_type)}</span>{p.purchasable&&<span className="rounded-full bg-amber-500/10 px-2 py-1 text-[10px] font-black text-amber-300">{L("Purchasable","قابل للشراء")}</span>}</div><small className="block text-slate-500">{p.sales_categories?.name||L("Uncategorized","بدون تصنيف")} · {sectionName(p.section_id)} · {p.sale_unit||"piece"} · {policyLabel(p.inventory_policy)}</small></button>
      <span className="font-mono text-xs">{p.sku||"—"}</span><span>{Number(p.price).toFixed(2)} SAR</span><span className={p.show_on_cashier&&!['raw_material','sub_recipe'].includes(p.product_type)?"text-emerald-300":"text-slate-500"}>{p.show_on_cashier&&!['raw_material','sub_recipe'].includes(p.product_type)?L("Cashier ON","ظاهر بالكاشير"):L("Hidden","مخفي")}</span>
      <button className="rounded-xl border border-slate-700 p-2 text-xl" onClick={()=>setMenuId(menuId===p.id?null:p.id)}>⋯</button>
      {menuId===p.id&&<div className="absolute right-0 top-14 z-20 w-48 rounded-xl border border-slate-700 bg-slate-950 p-2 shadow-2xl rtl:left-0 rtl:right-auto"><button className="w-full rounded-lg px-3 py-2 text-left hover:bg-slate-800 rtl:text-right" onClick={()=>editProduct(p)}>{L("Edit Product","تعديل المنتج")}</button><button className="w-full rounded-lg px-3 py-2 text-left hover:bg-slate-800 rtl:text-right" onClick={()=>{setPreview(p);setMenuId(null);}}>{L("Quick Preview","معاينة سريعة")}</button><button className="w-full rounded-lg px-3 py-2 text-left text-rose-300 hover:bg-slate-800 rtl:text-right" onClick={()=>archiveProduct(p.id)}>{L("Delete / Archive","حذف / أرشفة")}</button></div>}
    </div>)}</div>

    {open&&<Modal title={form.id?L("Edit Product","تعديل المنتج"):L("New Product","منتج جديد")} onClose={()=>{resetImage();resetRecipe();setOpen(false);}}><div className="space-y-4">
      <Field label={L("Product Type *","نوع المنتج *")}><select className={inp} value={form.product_type||"purchased_product"} onChange={e=>changeType(e.target.value)}><option value="raw_material">{L("Raw Material","مادة خام")}</option><option value="purchased_product">{L("Purchased Product","منتج مشتَرى")}</option><option value="recipe_product">{L("Recipe Product","منتج وصفة")}</option><option value="sub_recipe">{L("Sub-Recipe","وصفة فرعية")}</option><option value="non_stock">{L("Non-stock / Service","غير مخزني / خدمة")}</option></select></Field>
      <Field label={L("Product Name *","اسم المنتج *")}><input className={inp} value={form.name||""} onChange={e=>changeProductName(e.target.value)}/></Field>
      <div className="grid gap-3 md:grid-cols-2"><Field label={L("Selling Price *","سعر البيع *")}><input className={inp} type="number" min="0" step="0.01" value={form.price??""} onChange={e=>setForm({...form,price:e.target.value})}/></Field><Field label={L("Cost","التكلفة")}><input className={inp} type="number" min="0" step="0.01" value={form.cost??""} onChange={e=>setForm({...form,cost:e.target.value})}/></Field></div>
      <div className="grid gap-3 md:grid-cols-3"><Field label={L("Unit *","الوحدة *")}><select className={inp} value={form.sale_unit||"piece"} onChange={e=>setForm({...form,sale_unit:e.target.value})}><option value="piece">{L("Pieces","قطعة")}</option><option value="gram">{L("Gram","غرام")}</option><option value="kilogram">{L("Kilogram","كيلوغرام")}</option><option value="liter">{L("Liter","لتر")}</option><option value="milliliter">{L("Milliliter (ML)","ملليلتر (ML)")}</option></select></Field><Field label={L("Sales Category","تصنيف المبيعات")}><select className={inp} value={form.category_id||""} onChange={e=>setForm({...form,category_id:e.target.value})}><option value="">{L("No category","بدون تصنيف")}</option>{d.categories.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}</select></Field><Field label={L("Section","القسم")} hint={L("Used later to route kitchen/production printing.","يستخدم لاحقاً لتوجيه طباعة المطبخ/الإنتاج.")}><select className={inp} value={form.section_id||""} onChange={e=>setForm({...form,section_id:e.target.value})}><option value="">{L("No section","بدون قسم")}</option>{d.sections.map((s:any)=><option key={s.id} value={s.id}>{s.name}</option>)}</select></Field></div>

      {form.product_type==="recipe_product"&&<div className="space-y-3 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4">
        <Field label={L("Main Recipe *","الوصفة الرئيسية *")} hint={L("Searches recipes by the product name. If it does not exist, create it here without leaving Add Items.","يبحث عن الوصفة باسم المنتج. إذا لم تكن موجودة، أنشئها هنا بدون الخروج من Add Items.")}>
          <div className="grid gap-2 md:grid-cols-[1fr_auto]"><input className={inp} placeholder={L("Search recipe by name or code","ابحث باسم الوصفة أو الكود")} value={recipeQuery} onChange={e=>{setRecipeQuery(e.target.value);setForm({...form,recipe_id:null});}}/><button type="button" className={ghost} onClick={openRecipeBuilder}>+ {L("Add New Recipe","إضافة وصفة جديدة")}</button></div>
        </Field>
        {selectedRecipe&&<div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200"><b>{L("Selected:","المختارة:")}</b> {selectedRecipe.name} · {selectedRecipe.recipe_code}</div>}
        <div className="max-h-44 overflow-auto rounded-xl border border-slate-800 bg-slate-950 p-2">
          {recipeResults.length?recipeResults.map((r:any)=><button type="button" key={r.id} className={`mb-1 block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-800 rtl:text-right ${form.recipe_id===r.id?"bg-cyan-500/10 text-cyan-300":""}`} onClick={()=>{setForm({...form,recipe_id:r.id,inventory_policy:"recipe_on_sale",purchasable:false});setRecipeQuery(r.name);}}><b>{r.name}</b><small className="ml-2 text-slate-500 rtl:mr-2">{r.recipe_code}</small></button>):<p className="px-3 py-2 text-sm text-slate-500">{L("No matching recipe. Use Add New Recipe.","لا توجد وصفة مطابقة. استخدم إضافة وصفة جديدة.")}</p>}
        </div>
        {recipeBuilder&&<div className="space-y-3 rounded-2xl border border-slate-700 bg-slate-950 p-4">
          <div className="flex items-center justify-between"><b>{L("Create Recipe for This Product","إنشاء وصفة لهذا المنتج")}</b><button type="button" onClick={()=>setRecipeBuilder(false)}>✕</button></div>
          <Field label={L("Recipe Name *","اسم الوصفة *")}><input className={inp} value={recipeDraft.name||""} onChange={e=>setRecipeDraft({...recipeDraft,name:e.target.value})}/></Field>
          <div className="space-y-2"><div className="flex items-center justify-between"><b className="text-sm">{L("Ingredients","المكونات")}</b><button type="button" className={ghost} onClick={addRecipeLine}>+ {L("Ingredient","مكوّن")}</button></div>
            {(recipeDraft.lines||[]).map((line:any,index:number)=><div key={index} className="grid gap-2 rounded-xl border border-slate-800 p-3 md:grid-cols-[1.5fr_.55fr_.8fr_auto]">
              <select className={inp} value={line.item_id||""} onChange={e=>{const item=d.inventory_items.find((i:any)=>i.id===e.target.value);updateRecipeLine(index,{item_id:e.target.value,unit_id:item?.base_unit_id||line.unit_id||""});}}><option value="">{L("Select ingredient","اختر المكوّن")}</option>{d.inventory_items.map((i:any)=><option key={i.id} value={i.id}>{i.name} · {i.sku}</option>)}</select>
              <input className={inp} type="number" min="0" step="0.001" placeholder={L("Qty","الكمية")} value={line.quantity??""} onChange={e=>updateRecipeLine(index,{quantity:e.target.value})}/>
              <select className={inp} value={line.unit_id||""} onChange={e=>updateRecipeLine(index,{unit_id:e.target.value})}><option value="">{L("Base unit","الوحدة الأساسية")}</option>{d.units.map((u:any)=><option key={u.id} value={u.id}>{u.name}{u.symbol?` (${u.symbol})`:""}</option>)}</select>
              <button type="button" className={danger} onClick={()=>removeRecipeLine(index)}>✕</button>
            </div>)}
            {!d.inventory_items.length&&<p className="text-sm text-amber-300">{L("Add raw materials/inventory items first so they can be used as recipe ingredients.","أضف المواد الخام/عناصر المخزون أولاً حتى تستخدم كمكونات للوصفة.")}</p>}
          </div>
          <button type="button" disabled={busy} className={`${btn} w-full`} onClick={saveInlineRecipe}>{busy?L("Creating...","جارٍ الإنشاء..."):L("Create Recipe & Use It","إنشاء الوصفة واستخدامها")}</button>
        </div>}
      </div>}
      {form.product_type==="sub_recipe"&&<><Field label={L("Sub-Recipe *","الوصفة الفرعية *")}><select className={inp} value={form.sub_recipe_id||""} onChange={e=>setForm({...form,sub_recipe_id:e.target.value})}><option value="">{L("Select sub-recipe","اختر الوصفة الفرعية")}</option>{subRecipes.map((r:any)=><option key={r.id} value={r.id}>{r.name} · {r.recipe_code}</option>)}</select></Field><Field label={L("Sub-Recipe Inventory Logic","منطق مخزون الوصفة الفرعية")}><select className={inp} value={form.inventory_policy||"none"} onChange={e=>setForm({...form,inventory_policy:e.target.value,purchasable:false})}><option value="none">{L("Internal recipe only","وصفة داخلية فقط")}</option><option value="produced_stock">{L("Produce and track stock","إنتاج وتتبع مخزون")}</option></select></Field></>}
      {form.product_type==="purchased_product"&&<Field label={L("Inventory Tracking","تتبع المخزون")} hint={L("ON requires stock for sale; OFF allows sale without stock.","المفعّل يربط البيع بالمخزون، وغير المفعّل يسمح بالبيع دون رصيد.")}><select className={inp} value={form.inventory_policy||"stock"} onChange={e=>setForm({...form,inventory_policy:e.target.value,purchasable:e.target.value==="stock"?form.purchasable!==false:false})}><option value="stock">{L("Track stock","تتبع المخزون")}</option><option value="none">{L("Do not track stock","بدون تتبع مخزون")}</option></select></Field>}

      <Field label={L("Product Image","صورة المنتج")} hint={L("Images are compressed and stored in Supabase Storage, not inside the database.","يتم ضغط الصور وحفظها في Supabase Storage وليس داخل قاعدة البيانات.")}><div className="flex items-center gap-3"><label className={`${btn} cursor-pointer`}>{L("Choose Image","اختيار صورة")}<input className="hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>chooseImage(e.target.files?.[0])}/></label>{(imagePreview||form.image_url)&&<img src={imagePreview||form.image_url} alt="" className="h-20 w-20 rounded-xl object-cover"/>}</div></Field>
      <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]"><Field label={L("SKU / Product Code","SKU / كود المنتج")}><input className={inp} value={form.sku||""} onChange={e=>setForm({...form,sku:e.target.value})}/></Field><Field label={L("Barcode","الباركود")}><input className={inp} value={form.barcode||""} onChange={e=>setForm({...form,barcode:e.target.value})}/></Field><button type="button" disabled={busy} className={`${btn} self-end`} onClick={generateCode}>{busy?L("Working...","جارٍ العمل..."):L("Generate Code","إنشاء كود")}</button></div>

      {tracked&&<label className="flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4"><input className="mt-1" type="checkbox" checked={form.purchasable===true} onChange={e=>setForm({...form,purchasable:e.target.checked})}/><span><b className="block text-amber-200">{L("Purchasable / Reorder from Supplier","قابل للشراء / إعادة الطلب من المورد")}</b><small className="text-slate-400">{L("When enabled, this item is available to Purchasing.","عند تفعيله يصبح الصنف متاحاً للمشتريات.")}</small></span></label>}
      {tracked&&<div className="grid gap-3 md:grid-cols-2"><Field label={L("Preferred Supplier","المورد المفضل")}><select className={inp} disabled={!form.purchasable} value={form.supplier_id||""} onChange={e=>setForm({...form,supplier_id:e.target.value})}><option value="">{d.suppliers.length?L("No preferred supplier","بدون مورد مفضل"):L("No suppliers yet","لا يوجد موردون بعد")}</option>{d.suppliers.map((s:any)=><option key={s.id} value={s.id}>{s.name}</option>)}</select></Field><Field label={L("Opening Stock Warehouse","مستودع الرصيد الافتتاحي")}><select className={inp} value={form.warehouse_id||""} onChange={e=>setForm({...form,warehouse_id:e.target.value})}><option value="">{d.warehouses.length?L("Automatic / Select warehouse","تلقائي / اختر المستودع"):L("Automatic Main Warehouse","المستودع الرئيسي تلقائياً")}</option>{d.warehouses.map((w:any)=><option key={w.id} value={w.id}>{w.name}</option>)}</select></Field></div>}
      {!form.id&&tracked&&<Field label={L("Opening Quantity","الكمية الافتتاحية")}><input className={inp} type="number" min="0" step={form.sale_unit==="piece"?"1":"0.001"} value={form.opening_quantity??""} onChange={e=>setForm({...form,opening_quantity:e.target.value})}/></Field>}
      <div className="grid gap-2 sm:grid-cols-2"><label className={blocked?"flex gap-2 opacity-50":"flex gap-2"}><input type="checkbox" disabled={blocked} checked={!blocked&&form.show_on_cashier!==false} onChange={e=>setForm({...form,show_on_cashier:e.target.checked})}/>{L("Show on Cashier","إظهار على الكاشير")}</label><label className="flex gap-2"><input type="checkbox" checked={form.tax_enabled!==false} onChange={e=>setForm({...form,tax_enabled:e.target.checked})}/>{L("Tax Enabled","خاضع للضريبة")}</label></div>
      {form.tax_enabled!==false&&<Field label={L("VAT %","نسبة الضريبة %")}><input className={inp} type="number" min="0" max="100" value={form.tax_rate??15} onChange={e=>setForm({...form,tax_rate:Number(e.target.value)})}/></Field>}
      <div className="rounded-2xl border border-cyan-500/25 bg-cyan-500/5 p-4"><b className="text-cyan-300">{L("System Logic","منطق النظام")}</b><p className="mt-2 text-sm"><b>{L("Cashier:","الكاشير:")}</b> {!blocked&&form.show_on_cashier!==false?L("Product appears after save.","يظهر المنتج بعد الحفظ."):L("Product stays hidden from Cashier.","يبقى المنتج مخفياً عن الكاشير.")}</p><p className="mt-1 text-sm"><b>{L("Inventory:","المخزون:")}</b> {inventoryLogic}</p><p className="mt-1 text-sm"><b>{L("Purchasing:","المشتريات:")}</b> {tracked&&form.purchasable?L("Available for purchasing.","متاح للمشتريات."):L("Not listed as purchasable.","غير مدرج كصنف قابل للشراء.")}</p><p className="mt-1 text-sm"><b>{L("Accounting:","المحاسبة:")}</b> {accountingLogic}</p></div>
      <div className="flex gap-2"><button disabled={busy} className={`${btn} flex-1`} onClick={saveProduct}>{busy?L("Saving...","جارٍ الحفظ..."):L("Save Product & Sync","حفظ المنتج ومزامنته")}</button>{form.id&&<button className={danger} onClick={()=>archiveProduct(form.id)}>{L("Delete","حذف")}</button>}</div>
    </div></Modal>}

    {preview&&<Modal title={L("Quick Product Preview","معاينة سريعة للمنتج")} onClose={()=>setPreview(null)}><div className="mx-auto max-w-md overflow-hidden rounded-3xl border border-slate-700 bg-slate-950"><div className="aspect-square bg-slate-800">{preview.image_url&&!String(preview.image_url).startsWith("data:image/")?<img src={preview.image_url} className="h-full w-full object-cover" alt=""/>:<div className="flex h-full items-center justify-center text-slate-600">{L("No image","لا توجد صورة")}</div>}</div><div className="p-5"><div className="flex justify-between"><div><h3 className="text-xl font-black">{preview.name}</h3><p className="text-sm text-slate-500">{typeLabel(preview.product_type)} · {preview.sales_categories?.name||L("Uncategorized","بدون تصنيف")} · {sectionName(preview.section_id)}</p></div><b className="text-xl text-cyan-300">{Number(preview.price).toFixed(2)} SAR</b></div><div className="mt-4 grid grid-cols-2 gap-2 text-sm"><span>SKU: {preview.sku||"—"}</span><span>{L("Barcode","الباركود")}: {preview.barcode||"—"}</span><span>{L("Unit","الوحدة")}: {preview.sale_unit}</span><span>{preview.show_on_cashier&&!['raw_material','sub_recipe'].includes(preview.product_type)?L("Visible on Cashier","ظاهر على الكاشير"):L("Hidden","مخفي")}</span><span>{preview.track_inventory?L("Inventory tracked","متتبع بالمخزون"):L("No stock tracking","بدون تتبع مخزون")}</span><span>{preview.purchasable?L("Purchasable","قابل للشراء"):L("Not purchasable","غير قابل للشراء")}</span></div></div></div></Modal>}

    {catOpen&&<Modal title={L("Sales Categories","تصنيفات المبيعات")} onClose={()=>{setCatOpen(false);setCatForm({});}}><div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]"><input className={inp} placeholder={L("Category name","اسم التصنيف")} value={catForm.name||""} onChange={e=>setCatForm({...catForm,name:e.target.value})}/><input className={inp} placeholder={L("Description (optional)","الوصف (اختياري)")} value={catForm.description||""} onChange={e=>setCatForm({...catForm,description:e.target.value})}/><button className={btn} disabled={busy} onClick={saveCategory}>{catForm.id?L("Update","تحديث"):L("Add","إضافة")}</button></div><div className="mt-4 space-y-2">{d.categories.map((c:any)=><div key={c.id} className="flex items-center justify-between rounded-xl border border-slate-800 p-3"><div><b>{c.name}</b><small className="block text-slate-500">{c.description||c.code}</small></div><div className="flex gap-2"><button className={ghost} onClick={()=>setCatForm(c)}>{L("Edit","تعديل")}</button><button className={danger} onClick={async()=>{if(confirm(L("Delete this empty category?","حذف هذا التصنيف الفارغ؟"))){setBusy(true);await post("/api/commerce-admin","category_delete",{id:c.id});await load();setBusy(false);}}}>{L("Delete","حذف")}</button></div></div>)}</div></Modal>}

    {sectionOpen&&<Modal title={L("Sections","الأقسام")} onClose={()=>{setSectionOpen(false);setSectionForm({});}}><p className="mb-4 text-sm text-slate-400">{L("Create your own sections. Printer routing will use this section later.","أنشئ الأقسام بأسمائك. لاحقاً سيتم ربط طابعة كل قسم به.")}</p><div className="grid gap-2 md:grid-cols-[1fr_auto]"><input className={inp} placeholder={L("Section name","اسم القسم")} value={sectionForm.name||""} onChange={e=>setSectionForm({...sectionForm,name:e.target.value})}/><button className={btn} disabled={busy} onClick={saveSection}>{sectionForm.id?L("Update","تحديث"):L("Add","إضافة")}</button></div><div className="mt-4 space-y-2">{d.sections.map((s:any)=><div key={s.id} className="flex items-center justify-between rounded-xl border border-slate-800 p-3"><b>{s.name}</b><div className="flex gap-2"><button className={ghost} onClick={()=>setSectionForm(s)}>{L("Edit","تعديل")}</button><button className={danger} onClick={async()=>{if(confirm(L("Delete this empty section?","حذف هذا القسم الفارغ؟"))){setBusy(true);await post("/api/cashier-config","section_delete",{id:s.id});await load();setBusy(false);}}}>{L("Delete","حذف")}</button></div></div>)}</div></Modal>}
  </div>;
}

function Modal({title,onClose,children}:any){return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"><div className="max-h-[92vh] w-full max-w-4xl overflow-auto rounded-3xl border border-slate-700 bg-slate-900 p-6"><div className="mb-4 flex justify-between"><h2 className="text-xl font-black">{title}</h2><button onClick={onClose}>✕</button></div>{children}</div></div>;}
function Field({label,hint,children}:any){return <label className="block"><span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-300">{label}</span>{children}{hint&&<small className="mt-1 block text-slate-500">{hint}</small>}</label>;}
