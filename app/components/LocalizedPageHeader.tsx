"use client";

import { useLanguage } from "./LanguageProvider";

export default function LocalizedPageHeader({ enEyebrow, arEyebrow, enTitle, arTitle }: { enEyebrow?:string; arEyebrow?:string; enTitle:string; arTitle:string }) {
  const { language } = useLanguage(); const ar = language === "ar";
  return <div>{(enEyebrow||arEyebrow)&&<p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">{ar ? arEyebrow : enEyebrow}</p>}<h1 className="mt-1 text-2xl font-bold text-white">{ar ? arTitle : enTitle}</h1></div>;
}
