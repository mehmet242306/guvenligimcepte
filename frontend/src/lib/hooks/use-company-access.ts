"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  isValidAccessRole,
  normalizeAccessRole,
  type AccessRole,
} from "@/lib/company-role-adapter";

export type CompanyAccessState = {
  role: AccessRole | null;
  loading: boolean;
  error: string | null;
};

/**
 * Current user için bu firma workspace'indeki `access_role` değerini döner.
 * Kullanıcı o firmada üye değilse role = null.
 */
export function useCompanyAccessRole(companyWorkspaceId: string): CompanyAccessState {
  const [state, setState] = useState<CompanyAccessState>({
    role: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    if (!supabase) {
      setState({ role: null, loading: false, error: "Veritabanı bağlantısı kurulamadı." });
      return;
    }

    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          if (!cancelled) {
            setState({ role: null, loading: false, error: null });
          }
          return;
        }
        const { data, error } = await supabase
          .from("company_memberships")
          .select("access_role")
          .eq("company_workspace_id", companyWorkspaceId)
          .eq("user_id", user.id)
          .is("deleted_at", null)
          .eq("status", "active")
          .maybeSingle();

        if (cancelled) return;

        if (error) {
          setState({ role: null, loading: false, error: error.message });
          return;
        }

        const raw = (data?.access_role as string | null | undefined) ?? null;
        const role: AccessRole | null = isValidAccessRole(raw)
          ? normalizeAccessRole(raw)
          : null;
        setState({ role, loading: false, error: null });
      } catch (e) {
        if (cancelled) return;
        setState({
          role: null,
          loading: false,
          error: e instanceof Error ? e.message : "Rol bilgisi alınamadı.",
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [companyWorkspaceId]);

  return state;
}
