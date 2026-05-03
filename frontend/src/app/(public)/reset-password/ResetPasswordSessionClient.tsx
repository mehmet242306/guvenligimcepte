"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";

export function ResetPasswordSessionClient({ code }: { code?: string | null }) {
  const t = useTranslations("auth.resetPage");
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(!code);

  useEffect(() => {
    let cancelled = false;

    async function recoverPasswordSession() {
      if (!code) return;

      const supabase = createClient();
      if (!supabase) {
        setError(t("errPrepareSession"));
        setReady(true);
        return;
      }

      const exchangeResult = await supabase.auth.exchangeCodeForSession(code);
      let session = exchangeResult.data.session;
      let exchangeError = exchangeResult.error;

      if (exchangeError || !session?.access_token || !session.refresh_token) {
        const { data: existing } = await supabase.auth.getSession();
        if (existing.session?.access_token && existing.session.refresh_token) {
          session = existing.session;
          exchangeError = null;
        }
      }

      if (cancelled) return;

      if (exchangeError || !session?.access_token || !session.refresh_token) {
        setError(t("errInvalidResetLink"));
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete("code");
        window.history.replaceState({}, "", cleanUrl.toString());
        setReady(true);
        return;
      }

      const { error: cookieError } = await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });

      if (cancelled) return;

      if (cookieError) {
        setError(t("errSessionRefresh"));
      }

      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete("code");
      window.history.replaceState({}, "", cleanUrl.toString());
      setReady(true);
    }

    void recoverPasswordSession();

    return () => {
      cancelled = true;
    };
  }, [code]);

  if (!ready) {
    return (
      <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
        {t("preparingSession")}
      </div>
    );
  }

  if (!error) return null;

  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
      {error}
    </div>
  );
}
