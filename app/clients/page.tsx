"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/app/components/Sidebar";
import DashboardHeader from "@/app/components/DashboardHeader";
import ClientsTable from "@/app/components/ClientsTable";
import AddClientModal from "@/app/components/AddClientModal";
import { useLanguage } from "@/app/components/LanguageProvider";

interface Company { id:string; name:string; whatsapp_phone_number_id?:string; created_at:string; }
interface User { id:string; email?:string; }

export default function ClientsPage() {
  const { language } = useLanguage(); const ar = language === "ar";
  const router=useRouter(); const [companies,setCompanies]=useState<Company[]>([]); const [loading,setLoading]=useState(true); const [accessDenied,setAccessDenied]=useState(false); const [user,setUser]=useState<User|null>(null); const [userName,setUserName]=useState(""); const [showModal,setShowModal]=useState(false); const [successMessage,setSuccessMessage]=useState("");

  useEffect(()=>{const load=async()=>{try{const userRes=await fetch("/api/auth/user"); if(!userRes.ok){router.push("/login");return;} const userData=await userRes.json();setUser(userData); const profileRes=await fetch("/api/auth/profile"); if(!profileRes.ok){setAccessDenied(true);setLoading(false);return;} const profileData=await profileRes.json(); if(profileData.role!=="super_admin"){setAccessDenied(true);setLoading(false);return;} setUserName(profileData.name||userData.email?.split("@")[0]||""); const companiesRes=await fetch("/api/clients"); if(!companiesRes.ok){setLoading(false);return;} setCompanies(await companiesRes.json());setLoading(false);}catch(error){console.error("Error loading clients page:",error);setAccessDenied(true);setLoading(false);}};load();},[router]);

  const handleAddClient=async(formData:{companyName:string;adminEmail:string;temporaryPassword:string;whatsappPhoneNumberId:string;})=>{try{const response=await fetch("/api/clients",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({company_name:formData.companyName.trim(),admin_email:formData.adminEmail.trim(),temporary_password:formData.temporaryPassword.trim(),whatsapp_phone_number_id:formData.whatsappPhoneNumberId.trim()})});const data=await response.json();if(!response.ok){if(response.status===409) alert(ar?`تعارض: ${data.error||"تعذر إنشاء العميل"}`:`Conflict: ${data.error||"Unable to create client"}`);else if(response.status===400) alert(ar?`بيانات غير صالحة: ${data.error||"راجع البيانات المدخلة"}`:`Invalid input: ${data.error||"Please check your entries"}`);else alert(ar?`خطأ: ${data.error||"فشل إنشاء العميل"}`:`Error: ${data.error||"Failed to create client"}`);return;}setSuccessMessage(ar?"تم إنشاء العميل بنجاح!":"Client created successfully!");setShowModal(false);const companiesRes=await fetch("/api/clients");if(companiesRes.ok)setCompanies(await companiesRes.json());setTimeout(()=>setSuccessMessage(""),3000);}catch(error){console.error("Error creating client:",error);alert(ar?"حدث خطأ. حاول مرة أخرى.":"An error occurred. Please try again.");}};

  const shell=(content:React.ReactNode)=><div className="min-h-screen bg-slate-950"><Sidebar userEmail={user?.email} userName={userName}/><div className="ml-64 flex min-h-screen flex-col"><DashboardHeader userEmail={user?.email} userName={userName}/>{content}</div></div>;
  if(loading) return shell(<div className="flex flex-1 items-center justify-center"><p className="text-slate-400">{ar?"جارٍ التحميل...":"Loading..."}</p></div>);
  if(accessDenied) return shell(<div className="flex flex-1 items-center justify-center px-6 py-12"><div className="w-full max-w-md text-center"><div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full border border-red-500/30 bg-red-500/20"><span className="text-3xl text-red-400">!</span></div><h2 className="mb-2 text-2xl font-bold text-white">{ar?"تم رفض الوصول":"Access Denied"}</h2><p className="text-slate-400">{ar?"ليس لديك صلاحية للوصول إلى صفحة العملاء.":"You do not have permission to access the Clients page."}</p></div></div>);

  return shell(<div className="flex-1 px-6 py-6"><div className="mb-6 flex items-center justify-between"><div><h1 className="text-3xl font-bold text-white">{ar?"العملاء":"Clients"}</h1><p className="mt-1 text-slate-400">{ar?"إدارة حسابات الشركات واشتراكاتها":"Manage company accounts"}</p></div><button onClick={()=>setShowModal(true)} className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700">+ {ar?"إضافة عميل":"Add Client"}</button></div>{successMessage&&<div className="mb-6 rounded-lg border border-green-500/30 bg-green-500/20 p-4"><p className="text-green-400">{successMessage}</p></div>}<ClientsTable companies={companies}/>{showModal&&<AddClientModal onClose={()=>setShowModal(false)} onSubmit={handleAddClient}/>}</div>);
}
