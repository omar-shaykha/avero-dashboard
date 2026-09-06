"use client";

import { useLanguage } from "./LanguageProvider";

export default function LocalizedState({ enTitle, arTitle, enDescription, arDescription }: { enTitle:string; arTitle:string; enDescription?:string; arDescription?:string }) {
  const { language } = useLanguage();
  const ar = language === "ar";
  return <div className="text-center"><h1 className="text-2xl font-bold text-white">{ar ? arTitle : enTitle}</h1>{(enDescription||arDescription)&&<p className="mt-2 text-slate-400">{ar ? arDescription : enDescription}</p>}</div>;
}
