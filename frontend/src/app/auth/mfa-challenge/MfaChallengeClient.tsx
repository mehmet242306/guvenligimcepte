"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

type ChallengeFactor = {
  id: string;
  friendlyName: string;
  factorType: string;
};

type MfaChallengeClientProps = {
  next: string;
  userEmail: string;
  factors: ChallengeFactor[];
};

export function MfaChallengeClient({
  next,
  userEmail,
  factors,
}: MfaChallengeClientProps) {
  const t = useTranslations("auth.mfa");
  const router = useRouter();
  const [selectedFactorId, setSelectedFactorId] = useState(factors[0]?.id ?? "");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedFactor = useMemo(
    () => factors.find((factor) => factor.id === selectedFactorId) ?? null,
    [factors, selectedFactorId]
  );

  async function handleVerify() {
    const normalizedCode = code.replace(/\s+/g, "");
    if (!selectedFactorId) {
      setError(t("errNoFactor"));
      return;
    }
    if (!/^\d{6}$/.test(normalizedCode)) {
      setError(t("errCodeFormat"));
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      setError(t("errNoSupabase"));
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
        factorId: selectedFactorId,
        code: normalizedCode,
      });

      if (verifyError) throw verifyError;

      router.replace(next);
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("errVerifyFallback");
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    const supabase = createClient();
    if (!supabase) {
      router.replace("/login");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      await supabase.auth.signOut();
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-secondary/35 p-4">
        <p className="text-sm leading-7 text-muted-foreground">
          {t.rich("intro", {
            email: () => <span className="font-medium text-foreground">{userEmail}</span>,
          })}
        </p>
      </div>

      {factors.length > 1 ? (
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">{t("deviceLabel")}</label>
          <div className="grid gap-2">
            {factors.map((factor) => (
              <button
                key={factor.id}
                type="button"
                onClick={() => setSelectedFactorId(factor.id)}
                className={[
                  "rounded-2xl border px-4 py-3 text-left transition-colors",
                  selectedFactorId === factor.id
                    ? "border-primary bg-primary/8"
                    : "border-border bg-card hover:border-primary/35",
                ].join(" ")}
              >
                <div className="text-sm font-medium text-foreground">
                  {factor.friendlyName}
                </div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  {factor.factorType}
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <Input
        id="mfa-code"
        label={t("codeLabel")}
        inputMode="numeric"
        autoComplete="one-time-code"
        value={code}
        onChange={(e) =>
          setCode(e.target.value.replace(/[^\d]/g, "").slice(0, 6))
        }
        placeholder="123456"
        hint={
          selectedFactor
            ? t("codeHintWithFactor", { factorName: selectedFactor.friendlyName })
            : t("codeHintDefault")
        }
        error={error ?? undefined}
        className="tracking-[0.25em]"
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          type="button"
          onClick={handleVerify}
          disabled={busy || code.length !== 6 || !selectedFactorId}
          className="sm:min-w-44"
        >
          {busy ? t("verifyBusy") : t("verifyCta")}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleSignOut}
          disabled={busy}
          className="sm:min-w-36"
        >
          {t("signOutCta")}
        </Button>
      </div>
    </div>
  );
}
