"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function usePermission(permissionCode: string): boolean | null {
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const supabase = createClient();
      if (!supabase) {
        if (!cancelled) setAllowed(false);
        return;
      }

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (cancelled) return;
        if (!user) {
          setAllowed(false);
          return;
        }

        const { data, error } = await supabase.rpc("user_has_permission", {
          p_permission_code: permissionCode,
        });

        if (cancelled) return;

        if (error) {
          console.error(`[usePermission] RPC error for ${permissionCode}:`, error);
          setAllowed(false);
          return;
        }

        setAllowed(data === true);
      } catch (error) {
        if (cancelled) return;
        console.error(`[usePermission] unexpected error for ${permissionCode}:`, error);
        setAllowed(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [permissionCode]);

  return allowed;
}
