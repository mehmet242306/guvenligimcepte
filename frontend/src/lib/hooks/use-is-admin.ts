"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * useIsAdmin — Email allow-list based admin gate.
 *
 * Admin emails come from NEXT_PUBLIC_ADMIN_EMAILS (comma separated).
 * Fallback: hardcoded ADMIN_EMAILS below.
 *
 * Returns:
 *   null  → loading
 *   true  → admin
 *   false → not admin
 */

const FALLBACK_ADMIN_EMAILS: string[] = [
  "mehmet242306@gmail.com",
];

function getAdminEmails(): string[] {
  const envVal = process.env.NEXT_PUBLIC_ADMIN_EMAILS || "";
  const fromEnv = envVal
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (fromEnv.length > 0) return fromEnv;
  return FALLBACK_ADMIN_EMAILS.map((e) => e.toLowerCase());
}

export function useIsAdmin(): boolean | null {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      if (!supabase) {
        if (!cancelled) setIsAdmin(false);
        return;
      }
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (cancelled) return;
        if (!user?.email) {
          setIsAdmin(false);
          return;
        }
        const adminEmails = getAdminEmails();
        if (adminEmails.length === 0) {
          // Hiç admin tanımlanmamış → kimse admin değil (güvenli default)
          setIsAdmin(false);
          return;
        }
        setIsAdmin(adminEmails.includes(user.email.toLowerCase()));
      } catch {
        if (!cancelled) setIsAdmin(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return isAdmin;
}
