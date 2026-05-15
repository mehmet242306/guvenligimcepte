"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Yalnızca `is_super_admin` RPC (platform admin hariç).
 * UI gating içindir; API route'ları `requireSuperAdmin` kullanır.
 */
export function useIsSuperAdmin(initialValue: boolean | null = null): boolean | null {
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(initialValue);

  useEffect(() => {
    if (initialValue !== null) return;

    let cancelled = false;

    (async () => {
      const supabase = createClient();
      if (!supabase) {
        if (!cancelled) setIsSuperAdmin(false);
        return;
      }

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (cancelled) return;
        if (!user) {
          setIsSuperAdmin(false);
          return;
        }

        const { data, error } = await supabase.rpc("is_super_admin");
        if (cancelled) return;
        if (error) {
          console.error("[useIsSuperAdmin] RPC error:", error);
          setIsSuperAdmin(false);
          return;
        }

        setIsSuperAdmin(data === true);
      } catch (err) {
        if (!cancelled) {
          console.error("[useIsSuperAdmin] unexpected:", err);
          setIsSuperAdmin(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [initialValue]);

  return isSuperAdmin;
}
