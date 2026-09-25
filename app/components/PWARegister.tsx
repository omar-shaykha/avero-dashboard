"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "./LanguageProvider";

export default function PWARegister() {
  const { language } = useLanguage();
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let registration: ServiceWorkerRegistration | undefined;
    let hadController = Boolean(navigator.serviceWorker.controller);
    const onControllerChange = () => {
      if (hadController) setUpdateAvailable(true);
      hadController = true;
    };
    const checkForUpdates = () => {
      if (document.visibilityState === "visible") void registration?.update().catch(() => undefined);
    };

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    document.addEventListener("visibilitychange", checkForUpdates);
    navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).then((worker) => {
      registration = worker;
      if (worker.waiting && hadController) setUpdateAvailable(true);
      checkForUpdates();
    }).catch(() => {
      // PWA installation should not block the app if registration fails.
    });
    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      document.removeEventListener("visibilitychange", checkForUpdates);
    };
  }, []);

  if (!updateAvailable) return null;
  return <div role="status" className="fixed bottom-4 left-4 right-4 z-[100] flex items-center justify-between gap-4 rounded-xl border border-cyan-500 bg-slate-950 p-4 text-sm text-white shadow-2xl sm:right-auto">
    <span>{language === "ar" ? "يتوفر تحديث جديد لـ AVERO" : "A new AVERO update is available"}</span>
    <button type="button" className="rounded-lg bg-cyan-400 px-3 py-2 font-bold text-slate-950" onClick={() => window.location.reload()}>{language === "ar" ? "تحديث" : "Refresh"}</button>
  </div>;
}
