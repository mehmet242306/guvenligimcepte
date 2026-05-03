"use client";

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
  const t = useTranslations("consentGate");
  const tType = useTranslations("consentGate.consentType");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [requirements, setRequirements] = useState<ConsentRequirementRow[]>([]);
  const [acknowledged, setAcknowledged] = useState<Record<string, boolean>>({});
  const [expandedVersionId, setExpandedVersionId] = useState<string | null>(null);
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
      setExpandedVersionId(rows.find((item) => item.is_required && !item.is_granted)?.version_id ?? null);
      setLoading(false);
    }

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  async function handleAcceptAll() {
    setSaving(true);
    setError(null);

    const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : null;
    for (const requirement of pendingRequirements) {
      if (!acknowledged[requirement.version_id]) {
        setError(t("errMustAcknowledge"));
        setSaving(false);
        return;
      }

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

  if (loading || pendingRequirements.length === 0) {
    return null;
  }

  const approvedCount = Object.values(acknowledged).filter(Boolean).length;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-5xl rounded-[2rem] border border-border bg-card shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
        <div className="border-b border-border px-6 py-5 sm:px-8">
          <span className="eyebrow">{t("eyebrow")}</span>
          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {t("title")}
              </h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                {t("description")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void quickSignOut("/login")}
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-border bg-background px-4 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary"
            >
              {t("signOutTemp")}
            </button>
          </div>
        </div>

        <div className="grid gap-4 px-6 py-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] sm:px-8">
          <aside className="space-y-3">
            {pendingRequirements.map((requirement) => (
              <button
                key={requirement.version_id}
                type="button"
                onClick={() => setExpandedVersionId(requirement.version_id)}
                className={`w-full rounded-2xl border p-4 text-left transition ${
                  expandedVersionId === requirement.version_id
                    ? "border-primary bg-primary/5"
                    : "border-border bg-background/70 hover:border-primary/40"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-foreground">{requirement.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {consentTypeLabel(requirement.consent_type, tType)} · {requirement.version}
                    </div>
                  </div>
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                    {t("mandatoryBadge")}
                  </span>
                </div>
                {requirement.version_summary && (
                  <p className="mt-3 text-xs leading-6 text-muted-foreground">{requirement.version_summary}</p>
                )}
                <label className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-foreground">
                  <input
                    type="checkbox"
                    checked={acknowledged[requirement.version_id] === true}
                    onChange={(event) =>
                      setAcknowledged((current) => ({
                        ...current,
                        [requirement.version_id]: event.target.checked,
                      }))
                    }
                  />
                  {t("readAcknowledge")}
                </label>
              </button>
            ))}
          </aside>

          <section className="rounded-2xl border border-border bg-background/60 p-5">
            {pendingRequirements.map((requirement) => {
              if (expandedVersionId !== requirement.version_id) return null;

              return (
                <div key={requirement.version_id} className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground">
                      {consentTypeLabel(requirement.consent_type, tType)}
                    </span>
                    <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground">
                      {requirement.version}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{requirement.title}</h3>
                    {requirement.description && (
                      <p className="mt-2 text-sm text-muted-foreground">{requirement.description}</p>
                    )}
                  </div>

                  <div className="max-h-[420px] overflow-y-auto rounded-2xl border border-border bg-card px-4 py-4">
                    <div className="whitespace-pre-wrap text-sm leading-7 text-foreground">
                      {requirement.content_markdown}
                    </div>
                  </div>
                </div>
              );
            })}

            {error && (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
                {error}
              </div>
            )}

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <span className="text-xs text-muted-foreground">
                {t("progress", { approved: approvedCount, total: pendingRequirements.length })}
              </span>
              <button
                type="button"
                onClick={() => void handleAcceptAll()}
                disabled={saving}
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? t("saving") : t("submit")}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
