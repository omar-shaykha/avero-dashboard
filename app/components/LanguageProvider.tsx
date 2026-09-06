"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

type Language = "en" | "ar";
type Dictionary = Record<string, { en: string; ar: string }>;

const dictionary: Dictionary = {
  dashboard:{en:"Dashboard",ar:"لوحة التحكم"}, aiAgents:{en:"AI Agents",ar:"وكلاء الذكاء الاصطناعي"}, crm:{en:"CRM",ar:"إدارة العملاء"}, analytics:{en:"Analytics",ar:"التحليلات"}, clients:{en:"Clients",ar:"العملاء"}, profile:{en:"Profile",ar:"الملف الشخصي"}, settings:{en:"Settings",ar:"الإعدادات"}, online:{en:"Online",ar:"متصل"}, logout:{en:"Logout",ar:"تسجيل الخروج"},
  salesAgent:{en:"AI Sales Agent",ar:"وكيل المبيعات"}, marketingAgent:{en:"AI Marketing Agent",ar:"وكيل التسويق"}, hrAgent:{en:"AI HR Agent",ar:"وكيل الموارد البشرية"}, supportAgent:{en:"AI Support Agent",ar:"وكيل الدعم"}, crmHub:{en:"CRM Hub",ar:"مركز إدارة العملاء"}, salesCrm:{en:"AI Sales CRM",ar:"CRM المبيعات"}, marketingCrm:{en:"AI Marketing CRM",ar:"CRM التسويق"}, hrCrm:{en:"AI HR CRM",ar:"CRM الموارد البشرية"}, supportCrm:{en:"AI Support CRM",ar:"CRM الدعم"},
  businessOverview:{en:"Business Overview",ar:"نظرة عامة على الأعمال"}, businessOverviewDesc:{en:"Live metrics from your CRM data. Comparisons are shown only when prior-period data exists.",ar:"مؤشرات مباشرة من بيانات CRM. تظهر المقارنات فقط عند توفر بيانات للفترة السابقة."}, totalLeads:{en:"Total Leads",ar:"إجمالي العملاء المحتملين"}, qualified:{en:"Qualified",ar:"مؤهلون"}, quotations:{en:"Quotations",ar:"عروض الأسعار"}, negotiations:{en:"Negotiations",ar:"المفاوضات"}, won:{en:"Won",ar:"تم الفوز"}, lost:{en:"Lost",ar:"مفقود"}, conversionRate:{en:"Conversion Rate",ar:"معدل التحويل"}, pipelineValue:{en:"Estimated Pipeline Value",ar:"القيمة التقديرية للفرص"}, currentSalesStages:{en:"Current Sales Stages",ar:"مراحل المبيعات الحالية"}, selectedPeriodCounts:{en:"Real counts for the selected period",ar:"الأعداد الفعلية للفترة المحددة"}, leadSources:{en:"Lead Sources",ar:"مصادر العملاء المحتملين"}, acquisitionChannels:{en:"Acquisition channels from customer records",ar:"قنوات الاستحواذ من سجلات العملاء"}, noSourceData:{en:"No source data for this period.",ar:"لا توجد بيانات مصادر لهذه الفترة."}, noPriorData:{en:"No prior data",ar:"لا توجد بيانات سابقة"}, vsPrevious:{en:"vs previous",ar:"مقارنة بالسابق"},
  today:{en:"Today",ar:"اليوم"}, yesterday:{en:"Yesterday",ar:"أمس"}, daysAgo:{en:"days ago",ar:"أيام مضت"}, sevenDays:{en:"7 Days",ar:"7 أيام"}, fourteenDays:{en:"Last 14 days",ar:"آخر 14 يومًا"}, thirtyDays:{en:"30 Days",ar:"30 يومًا"}, lastThirtyDays:{en:"Last 30 days",ar:"آخر 30 يومًا"}, lastSevenDays:{en:"Last 7 days",ar:"آخر 7 أيام"}, lastNinetyDays:{en:"Last 90 days",ar:"آخر 90 يومًا"}, thisMonth:{en:"This Month",ar:"هذا الشهر"}, thisYear:{en:"This Year",ar:"هذه السنة"},
  searchLeads:{en:"Search leads by name, phone, service, or location...",ar:"ابحث بالاسم أو الهاتف أو الخدمة أو الموقع..."}, allStatuses:{en:"All Statuses",ar:"كل الحالات"}, allCities:{en:"All Cities",ar:"كل المدن"}, addLead:{en:"Add Lead",ar:"إضافة عميل محتمل"}, new:{en:"New",ar:"جديد"}, quotation:{en:"Quotation",ar:"عرض سعر"}, negotiation:{en:"Negotiation",ar:"تفاوض"},
  companyName:{en:"Company Name",ar:"اسم الشركة"}, companyId:{en:"Company ID",ar:"معرّف الشركة"}, whatsappPhoneId:{en:"WhatsApp Phone ID",ar:"معرّف رقم واتساب"}, createdDate:{en:"Created Date",ar:"تاريخ الإنشاء"}, noClients:{en:"No clients yet. Create one to get started.",ar:"لا يوجد عملاء بعد. أضف أول عميل للبدء."}, manageAccess:{en:"Manage Access",ar:"إدارة الصلاحيات"},
  salesPipeline:{en:"Sales Pipeline",ar:"مسار المبيعات"}, salesPipelineDesc:{en:"Lead progression across the AVERO AI sales process",ar:"تقدم العملاء المحتملين عبر مراحل مبيعات AVERO AI"}, noLeads:{en:"No leads",ar:"لا يوجد عملاء محتملون"}, noLeadsStage:{en:"Leads in this stage will appear here",ar:"سيظهر العملاء المحتملون في هذه المرحلة هنا"}, unknown:{en:"Unknown",ar:"غير معروف"},
  leadDetails:{en:"Lead Details",ar:"تفاصيل العميل المحتمل"}, customerInfo:{en:"Customer Information",ar:"معلومات العميل"}, name:{en:"Name",ar:"الاسم"}, phone:{en:"Phone",ar:"الهاتف"}, email:{en:"Email",ar:"البريد الإلكتروني"}, openWhatsapp:{en:"Open WhatsApp",ar:"فتح واتساب"}, updateStatus:{en:"Update Status",ar:"تحديث الحالة"}, updating:{en:"Updating...",ar:"جارٍ التحديث..."}, statusUpdated:{en:"Status updated",ar:"تم تحديث الحالة"}, statusUpdateFailed:{en:"Failed to update status",ar:"فشل تحديث الحالة"}, leadInfo:{en:"Lead Information",ar:"معلومات العميل المحتمل"}, title:{en:"Title",ar:"العنوان"}, service:{en:"Service",ar:"الخدمة"}, city:{en:"City",ar:"المدينة"}, peopleCount:{en:"People Count",ar:"عدد الأشخاص"}, eventDate:{en:"Event Date",ar:"تاريخ المناسبة"}, interestLevel:{en:"Interest Level",ar:"مستوى الاهتمام"}, currentStatus:{en:"Current Status",ar:"الحالة الحالية"}, notes:{en:"Notes",ar:"ملاحظات"}, lastUpdated:{en:"Last updated",ar:"آخر تحديث"}, close:{en:"Close",ar:"إغلاق"}, high:{en:"High",ar:"مرتفع"}, medium:{en:"Medium",ar:"متوسط"}, low:{en:"Low",ar:"منخفض"}
};

type LanguageContextValue = { language: Language; setLanguage: (language: Language) => void; t: (key: string) => string; };
const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");
  const hydrated = useRef(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("avero-language");
    if (stored === "ar" || stored === "en") setLanguageState(stored);
    fetch("/api/settings", { cache: "no-store" }).then(r=>r.ok?r.json():null).then(data=>{
      if (data?.language === "ar" || data?.language === "en") setLanguageState(data.language);
    }).catch(()=>undefined).finally(()=>{ hydrated.current = true; });
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    window.localStorage.setItem("avero-language", language);
    if (hydrated.current) fetch("/api/settings", { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({language}) }).catch(()=>undefined);
  }, [language]);

  const value = useMemo(() => ({ language, setLanguage: setLanguageState, t: (key: string) => dictionary[key]?.[language] ?? key }), [language]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() { const context = useContext(LanguageContext); if (!context) throw new Error("useLanguage must be used within LanguageProvider"); return context; }
