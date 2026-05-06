"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useIsAdmin } from "@/lib/hooks/use-is-admin";
import { isLiveFieldScanEmailAllowlisted } from "@/lib/auth/live-field-scan-access";

/**
 * `true` / `false` / `null` (yükleniyor). Menü ve sayfa kapıları için.
 */
export function useLiveFieldScanAccess(initialIsAdmin: boolean | null = null): boolean | null {
  const isAdmin = useIsAdmin(initialIsAdmin);
  const [emailAllowed, setEmailAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      if (!supabase) {
        if (!cancelled) setEmailAllowed(false);
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      setEmailAllowed(isLiveFieldScanEmailAllowlisted(user?.email));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (isAdmin === null || emailAllowed === null) return null;
  return isAdmin === true || emailAllowed === true;
}
