"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

type Language = "en" | "ar";
type Dictionary = Record<string, { en: string; ar: string }>;

const dictionary: Dictionary = {
  dashboard: { en: "Dashboard", ar: "لوحة التحكم" },
  aiAgents: { en: "AI Agents", ar: "وكلاء الذكاء الاصطناعي" },
  crm: { en: "CRM", ar: "إدارة العملاء" },
  analytics: { en: "Analytics", ar: "التحليلات" },
  clients: { en: "Clients", ar: "العملاء" },
  profile: { en: "Profile", ar: "الملف الشخصي" },
  settings: { en: "Settings", ar: "الإعدادات" },
  online: { en: "Online", ar: "متصل" },
  logout: { en: "Logout", ar: "تسجيل الخروج" },
  salesAgent: { en: "AI Sales Agent", ar: "وكيل المبيعات" },
  marketingAgent: { en: "AI Marketing Agent", ar: "وكيل التسويق" },
  hrAgent: { en: "AI HR Agent", ar: "وكيل الموارد البشرية" },
  supportAgent: { en: "AI Support Agent", ar: "وكيل الدعم" },
  crmHub: { en: "CRM Hub", ar: "مركز إدارة العملاء" },
  salesCrm: { en: "AI Sales CRM", ar: "CRM المبيعات" },
  marketingCrm: { en: "AI Marketing CRM", ar: "CRM التسويق" },
  hrCrm: { en: "AI HR CRM", ar: "CRM الموارد البشرية" },
  supportCrm: { en: "AI Support CRM", ar: "CRM الدعم" },
};

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    const stored = window.localStorage.getItem("avero-language");
    if (stored === "ar" || stored === "en") setLanguageState(stored);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    window.localStorage.setItem("avero-language", language);
  }, [language]);

  const value = useMemo(() => ({
    language,
    setLanguage: setLanguageState,
    t: (key: string) => dictionary[key]?.[language] ?? key,
  }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
}
