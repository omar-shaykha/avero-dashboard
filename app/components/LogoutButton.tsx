"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LogOut } from "lucide-react";
import { useLanguage } from "./LanguageProvider";

export default function LogoutButton() {
  const { language } = useLanguage();
  const ar = language === "ar";
  const router = useRouter();
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Logout error:", error);
      setIsLoading(false);
      return;
    }
    router.push("/login");
    router.refresh();
  };

  const label = ar ? "تسجيل الخروج" : "Sign out";
  return <button onClick={handleLogout} disabled={isLoading} title={label} aria-label={label} className="group flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/70 text-slate-400 shadow-sm transition-all hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-300 hover:shadow-[0_0_24px_rgba(244,63,94,0.10)] disabled:cursor-not-allowed disabled:opacity-50"><LogOut size={17} strokeWidth={1.9} className={isLoading ? "animate-pulse" : "transition-transform group-hover:translate-x-0.5"}/></button>;
}
