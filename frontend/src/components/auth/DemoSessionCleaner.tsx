"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

const CLEANUP_FLAG = "risknova.demoCleanupDone";

/**
 * Süresi dolan demo kullanıcısı /register'a yönlendirildiğinde çalışır.
 * Session cookie'si hâlâ auth'lı sayılıyor ama demo_access_expired olduğu için
 * tekrar /dashboard'a dönünce middleware onu tekrar /register'a atar.
 *
 * Bu component sessizce signOut() çağırıp session'ı temizler.
 *
 * ÖNEMLİ: sessionStorage + useRef ile ÇİFT guard — React Strict Mode (dev)
 * effect'i iki kez çağırır ve signOut'un auth state değişikliği parent
 * re-render'ına yol açıp modal titremesine sebep oluyordu. Artık yalnızca
 * bir kez çalışır.
 */
export function DemoSessionCleaner() {
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    if (typeof window !== "undefined" && sessionStorage.getItem(CLEANUP_FLAG) === "1") {
      ranRef.current = true;
      return;
    }
    ranRef.current = true;
    try {
      sessionStorage.setItem(CLEANUP_FLAG, "1");
    } catch {
      /* private mode / quota */
    }
    const supabase = createClient();
    if (!supabase) return;
    void supabase.auth.signOut();
  }, []);

  return null;
}
