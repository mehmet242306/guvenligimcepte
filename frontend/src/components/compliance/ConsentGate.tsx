"use client";

import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { quickSignOut } from "@/lib/auth/quick-sign-out";
import {
  listActiveConsentRequirements,
  recordUserConsent,
  type ConsentRequirementRow,
} from "@/lib/supabase/consent-api";

const CONSENT_TYPES = ["aydinlatma", "acik_riza", "kvkk", "yurt_disi_aktarim", "pazarlama"] as const;

function consentTypeLabel(type: string, tType: (key: string) => string) {
  if ((CONSENT_TYPES as readonly string[]).includes(type)) return tType(type);
  return type;
}

export function ConsentGate() {
  const pathname = usePathname();
  const t = useTranslations("consentGate");
  const tType = useTranslations("consentGate.consentType");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [requirements, setRequirements] = useState<ConsentRequirementRow[]>([]);
  const [acceptedAll, setAcceptedAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pendingRequirements = useMemo(
    () => requirements.filter((item) => item.is_required && !item.is_granted),
    [requirements],
  );

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      const rows = await listActiveConsentRequirements("platform");
      if (!mounted) return;
      setRequirements(rows);
      setLoading(false);
    }

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  async function handleAcceptAll() {
    if (!acceptedAll) {
      setError(t("errMustAcknowledge"));
      return;
    }

    setSaving(true);
    setError(null);

    const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : null;
    for (const requirement of pendingRequirements) {
      const ok = await recordUserConsent({
        versionId: requirement.version_id,
        sourceContext: "platform",
        userAgent,
      });

      if (!ok) {
        setError(t("errSaveFailed"));
        setSaving(false);
        return;
      }
    }

    const refreshed = await listActiveConsentRequirements("platform");
    setRequirements(refreshed);
    setSaving(false);
  }

  if (pathname?.startsWith("/consent/")) {
    return null;
  }

  if (loading || pendingRequirements.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/70 p-3 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="flex max-h-[min(92dvh,100%)] w-full max-w-lg flex-col overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-[0_30px_80px_rgba(0,0,0,0.35)] sm:max-w-xl">
        <div className="shrink-0 border-b border-border px-5 py-4 sm:px-6">
          <span className="eyebrow">{t("eyebrow")}</span>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{t("title")}</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("description")}</p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6">
          <p className="text-sm font-medium text-foreground">{t("documentsIntro")}</p>
          <ul className="mt-3 space-y-2">
            {pendingRequirements.map((requirement) => (
              <li
                key={requirement.version_id}
                className="rounded-xl border border-border bg-background/70 px-3 py-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={`/consent/${requirement.version_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-start gap-1.5 text-sm font-semibold text-primary underline-offset-4 hover:underline"
                  >
                    <span>{requirement.title}</span>
                    <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                  </Link>
                  <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                    {t("mandatoryBadge")}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {consentTypeLabel(requirement.consent_type, tType)} · {requirement.version}
                </p>
                {requirement.version_summary && (
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">{requirement.version_summary}</p>
                )}
              </li>
            ))}
          </ul>

          <label className="mt-5 flex items-start gap-3 rounded-xl border border-border bg-muted/20 px-3 py-3">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-border"
              checked={acceptedAll}
              onChange={(event) => {
                setAcceptedAll(event.target.checked);
                if (event.target.checked) setError(null);
              }}
            />
            <span className="text-sm leading-6 text-foreground">{t("singleCheckbox")}</span>
          </label>

          {error && (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
              {error}
            </div>
          )}
        </div>

        <div className="shrink-0 space-y-3 border-t border-border bg-card px-5 py-4 sm:px-6">
          <button
            type="button"
            onClick={() => void handleAcceptAll()}
            disabled={saving || !acceptedAll}
            className="inline-flex h-11 w-full items-center justify-center rounded-2xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? t("saving") : t("submit")}
          </button>
          <button
            type="button"
            onClick={() => void quickSignOut("/login")}
            className="inline-flex h-10 w-full items-center justify-center rounded-2xl border border-border bg-background px-4 text-sm font-medium text-foreground transition hover:border-primary hover:text-primary"
          >
            {t("signOutTemp")}
          </button>
        </div>
      </div>
    </div>
  );
}
