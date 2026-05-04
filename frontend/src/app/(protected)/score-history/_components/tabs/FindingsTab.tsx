"use client";

import { useMemo, useState } from "react";
import { TriangleAlert, Link2, ShieldAlert, ListChecks } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SubcategorySidebar, type SidebarItem } from "../SubcategorySidebar";
import type { SessionState, SessionActions } from "../../_hooks/useInspectionSession";
import { RESPONSE_COPY } from "../../_lib/constants";
import type { ResponseStatus } from "@/lib/supabase/inspection-api";

type Props = {
  state: SessionState;
  actions: SessionActions;
};

export function FindingsTab({ state, actions }: Props) {
  const t = useTranslations("fieldInspection");
  const { activeTemplate, answers } = state;
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);

  const responseLabels = useMemo(
    () =>
      ({
        uygun: t("response.uygun"),
        uygunsuz: t("response.uygunsuz"),
        kritik: t("response.kritik"),
        na: t("response.na"),
      }) satisfies Record<ResponseStatus, string>,
    [t],
  );

  const findings = useMemo(() => {
    if (!activeTemplate) return [];
    return activeTemplate.questions
      .map((q) => ({ q, a: answers[q.id] }))
      .filter(({ a }) => a?.responseStatus === "uygunsuz" || a?.responseStatus === "kritik");
  }, [activeTemplate, answers]);

  const sidebarItems = useMemo<SidebarItem[]>(
    () =>
      findings.map(({ q, a }) => ({
        id: q.id,
        title: q.text.length > 60 ? `${q.text.slice(0, 57)}...` : q.text,
        description: `${q.category} · ${a?.decision === "pending" ? t("findings.decisionPending") : t("findings.decisionReviewed")}`,
        badge:
          a?.responseStatus === "kritik" ? responseLabels.kritik : responseLabels.uygunsuz,
      })),
    [findings, t, responseLabels],
  );

  const selected = findings.find(({ q }) => q.id === selectedQuestionId) ?? findings[0];
  const selectedStatus = selected?.a?.responseStatus;

  return (
    <div className="mt-4 space-y-4">
      {findings.length > 0 ? (
        <div className="rounded-xl border border-rose-200/70 bg-gradient-to-r from-rose-50/90 to-amber-50/40 px-4 py-3 text-sm leading-relaxed text-foreground shadow-sm dark:border-rose-400/20 dark:from-rose-950/40 dark:to-amber-950/20 dark:text-rose-50/95">
          <p>
            <strong className="font-semibold">{t("findings.introTitle")}</strong>{" "}
            {t("findings.introBody")}
          </p>
        </div>
      ) : null}

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
        <SubcategorySidebar
          title={t("findings.sidebarTitle", { count: findings.length })}
          items={sidebarItems}
          activeItemId={selected?.q.id ?? null}
          onSelect={setSelectedQuestionId}
          emptyLabel={t("findings.emptySidebar")}
        />

        {selected && selectedStatus ? (
          <div className="space-y-4">
            <div className="rounded-[1.5rem] border border-rose-200/70 bg-gradient-to-br from-white via-rose-50/55 to-orange-50/35 p-5 shadow-sm dark:border-rose-400/15 dark:from-slate-950 dark:via-rose-950/20 dark:to-slate-950">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-start gap-2">
                    <TriangleAlert
                      size={18}
                      className={cn(
                        selectedStatus === "kritik" ? "text-red-600" : "text-amber-600",
                      )}
                    />
                    <h3 className="break-words text-lg font-semibold leading-snug text-foreground">
                      {selected.q.text}
                    </h3>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {selected.q.section} · {selected.q.category}
                  </p>
                </div>
                <Badge variant={RESPONSE_COPY[selectedStatus]?.badgeVariant ?? "neutral"}>
                  {responseLabels[selectedStatus]}
                </Badge>
              </div>

              <div className="grid gap-4 pt-4 md:grid-cols-2">
                <DetailField label={t("findings.fieldNote")} value={selected.a?.note} />
                <DetailField label={t("findings.suggestedAction")} value={selected.a?.actionTitle} />
                <DetailField label={t("findings.deadline")} value={selected.a?.actionDeadline ?? undefined} />
                <DetailField
                  label={t("findings.photoCount")}
                  value={String(selected.a?.photoUrls.length ?? 0)}
                />
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-violet-200/70 bg-gradient-to-br from-white via-violet-50/55 to-amber-50/30 p-5 shadow-sm dark:border-violet-400/15 dark:from-slate-950 dark:via-violet-950/20 dark:to-slate-950">
              <div className="mb-3 flex items-center gap-2">
                <ShieldAlert size={18} className="text-[var(--gold)]" />
                <h4 className="text-base font-semibold text-foreground">{t("findings.novaSuggestionsTitle")}</h4>
              </div>
              <p className="mb-4 text-xs text-muted-foreground">{t("findings.novaSuggestionsBody")}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => actions.recordDecisionFor(selected.q.id, "linked_risk")}
                >
                  <Link2 className="mr-2 h-4 w-4" />
                  {t("findings.linkExistingRisk")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => actions.recordDecisionFor(selected.q.id, "linked_action")}
                >
                  <Link2 className="mr-2 h-4 w-4" />
                  {t("findings.linkOpenAction")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => actions.recordDecisionFor(selected.q.id, "started_dof")}
                >
                  {t("findings.startCapa")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => actions.recordDecisionFor(selected.q.id, "created_risk")}
                >
                  {t("findings.newRiskDraft")}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => actions.recordDecisionFor(selected.q.id, "ignored")}>
                  {t("findings.ignore")}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => actions.recordDecisionFor(selected.q.id, "reviewed")}>
                  <ListChecks className="mr-2 h-4 w-4" />
                  {t("findings.reviewOnly")}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex min-h-[320px] flex-col items-center justify-center gap-2 rounded-[1.5rem] border border-dashed border-rose-200/70 bg-rose-50/40 px-8 py-16 text-center dark:border-rose-400/15 dark:bg-rose-950/15">
            <TriangleAlert size={32} className="text-muted-foreground" />
            <p className="text-base font-semibold text-foreground">{t("findings.emptyTitle")}</p>
            <p className="text-sm text-muted-foreground">{t("findings.emptyBody")}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm text-foreground">
        {value && value.trim() ? value : <span className="text-muted-foreground">—</span>}
      </p>
    </div>
  );
}
