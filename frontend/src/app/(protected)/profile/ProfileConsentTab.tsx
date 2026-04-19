"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { listActiveConsentRequirements, type ConsentRequirementRow } from "@/lib/supabase/consent-api";
import { ProfileDataRightsPanel } from "./ProfileDataRightsPanel";

const CONSENT_TYPE_KEYS = [
  "aydinlatma",
  "acik_riza",
  "kvkk",
  "yurt_disi_aktarim",
  "pazarlama",
] as const;

export function ProfileConsentTab() {
  const t = useTranslations("consent");
  const [loading, setLoading] = useState(true);
  const [requirements, setRequirements] = useState<ConsentRequirementRow[]>([]);

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

  const activeCount = requirements.filter((item) => item.is_granted).length;
  const pendingCount = requirements.filter((item) => item.is_required && !item.is_granted).length;

  return (
    <div className="space-y-4">
      <ProfileDataRightsPanel />

      <div className="rounded-[1.75rem] border border-border bg-card p-6 shadow-[var(--shadow-card)] sm:p-7">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{t("title")}</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              {t("description")}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-background/70 px-4 py-3 text-xs text-muted-foreground">
            {t("stats", { active: activeCount, pending: pendingCount })}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-[1.75rem] border border-dashed border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
          {t("loading")}
        </div>
      ) : requirements.length === 0 ? (
        <div className="rounded-[1.75rem] border border-dashed border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
          {t("empty")}
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {requirements.map((item) => {
            const typeKey = (CONSENT_TYPE_KEYS as readonly string[]).includes(item.consent_type)
              ? (item.consent_type as (typeof CONSENT_TYPE_KEYS)[number])
              : null;
            const typeLabel = typeKey ? t(`types.${typeKey}`) : item.consent_type;

            return (
              <article
                key={item.version_id}
                className="rounded-[1.75rem] border border-border bg-card p-6 shadow-[var(--shadow-card)]"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground">
                    {typeLabel}
                  </span>
                  <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground">
                    {item.version}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      item.is_granted
                        ? "bg-[var(--color-success)]/15 text-[var(--color-success)]"
                        : "bg-[var(--color-warning)]/15 text-[var(--color-warning)]"
                    }`}
                  >
                    {item.is_granted
                      ? t("statusApproved")
                      : item.is_required
                        ? t("statusPending")
                        : t("statusOptional")}
                  </span>
                </div>

                <h3 className="mt-4 text-base font-semibold text-foreground">{item.title}</h3>
                {item.description && <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>}
                {item.version_summary && (
                  <p className="mt-3 rounded-2xl border border-border bg-background/60 px-4 py-3 text-sm text-muted-foreground">
                    {item.version_summary}
                  </p>
                )}

                <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                  <div>
                    {t("mandatory")}: {item.is_required ? t("mandatoryYes") : t("mandatoryNo")}
                  </div>
                  <div>
                    {t("lastStatus")}:{" "}
                    {item.granted_at
                      ? new Intl.DateTimeFormat("tr-TR", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(item.granted_at))
                      : t("notGranted")}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
