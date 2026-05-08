"use client";

import { useEffect, useState } from "react";
import { isDigitalTwinEmailAllowlisted } from "@/lib/auth/digital-twin-access";
import { useIsAdmin } from "@/lib/hooks/use-is-admin";
import { createClient } from "@/lib/supabase/client";

/**
 * `true` / `false` / `null` (yukleniyor). Menu ve sayfa kapilari icin.
 */
export function useDigitalTwinAccess(initialIsAdmin: boolean | null = null): boolean | null {
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

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled) return;
      setEmailAllowed(isDigitalTwinEmailAllowlisted(user?.email));
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (isAdmin === null || emailAllowed === null) return null;
  return isAdmin === true || emailAllowed === true;
}
