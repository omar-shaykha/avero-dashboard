"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Logout error:", error);
      setIsLoading(false);
      return;
    }

    router.push("/login");
    router.refresh();
  };

  return (
    <button
      onClick={handleLogout}
      disabled={isLoading}
      className="rounded-lg bg-red-900/20 border border-red-800 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoading ? "Signing out..." : "Logout"}
    </button>
  );
}
