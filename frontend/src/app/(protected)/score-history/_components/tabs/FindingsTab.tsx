"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { TriangleAlert, Link2, ShieldAlert, ListChecks, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SubcategorySidebar, type SidebarItem } from "../SubcategorySidebar";
import type { SessionState, SessionActions } from "../../_hooks/useInspectionSession";
import { RESPONSE_COPY } from "../../_lib/constants";
import type { InspectionAnswerRecord, ResponseStatus } from "@/lib/supabase/inspection-api";
import { createClient } from "@/lib/supabase/client";
import { getActiveWorkspace } from "@/lib/supabase/workspace-api";
import { resolveCompanyWorkspaceIdFromActiveWorkspaceId } from "@/lib/workspace-incident-site";
import {
  inspectionDecisionHref,
  listOpenActionsForInspectionLink,
  listRiskAssessmentsForInspectionLink,
  type InspectionActionPickRow,
  type InspectionRiskPickRow,
} from "@/lib/supabase/inspection-finding-link-options";

type Props = {
  state: SessionState;
  actions: SessionActions;
};

export function FindingsTab({ state, actions }: Props) {
  const t = useTranslations("fieldInspection");
  const { activeTemplate, answers, capaStartingQuestionId, activeRun } = state;
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [dofFeedback, setDofFeedback] = useState<"none" | "no_workspace" | "failed" | "ok">("none");
  const [picker, setPicker] = useState<null | "risk" | "action">(null);
  const [pickerRowsRisk, setPickerRowsRisk] = useState<InspectionRiskPickRow[]>([]);
  const [pickerRowsAction, setPickerRowsAction] = useState<InspectionActionPickRow[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerError, setPickerError] = useState(false);

  const getCompanyWorkspaceIdForPicker = useCallback(async (): Promise<string | null> => {
    if (activeRun?.companyWorkspaceId) return activeRun.companyWorkspaceId;
    const nw = await getActiveWorkspace();
    if (!nw?.id) return null;
    const mapped = await resolveCompanyWorkspaceIdFromActiveWorkspaceId(nw.id);
    return mapped?.companyWorkspaceId ?? null;
  }, [activeRun?.companyWorkspaceId]);

  const openRiskPicker = useCallback(async () => {
    setPickerError(false);
    setPickerLoading(true);
    setPicker("risk");
    const ws = await getCompanyWorkspaceIdForPicker();
    if (!ws) {
      setPickerRowsRisk([]);
      setPickerError(true);
      setPickerLoading(false);
      return;
    }
    const rows = await listRiskAssessmentsForInspectionLink(ws);
    setPickerRowsRisk(rows);
    setPickerLoading(false);
  }, [getCompanyWorkspaceIdForPicker]);

  const openActionPicker = useCallback(async () => {
    setPickerError(false);
    setPickerLoading(true);
    setPicker("action");
    const ws = await getCompanyWorkspaceIdForPicker();
    if (!ws) {
      setPickerRowsAction([]);
      setPickerError(true);
      setPickerLoading(false);
      return;
    }
    const rows = await listOpenActionsForInspectionLink(ws);
    setPickerRowsAction(rows);
    setPickerLoading(false);
  }, [getCompanyWorkspaceIdForPicker]);

  const closePicker = useCallback(() => {
    setPicker(null);
    setPickerLoading(false);
    setPickerError(false);
  }, []);

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

  useEffect(() => {
    setDofFeedback("none");
  }, [selected?.q.id]);

  useEffect(() => {
    if (selected?.a?.decision === "started_dof" && selected.a.decisionTargetId) {
      setDofFeedback("none");
    }
  }, [selected?.a?.decision, selected?.a?.decisionTargetId]);

  return (
    <div className="mt-4 space-y-4">
      {picker ? (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="inspection-link-picker-title"
        >
          <div className="max-h-[min(80vh,560px)] w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 id="inspection-link-picker-title" className="text-sm font-semibold text-foreground">
                {picker === "risk" ? t("findings.linkPickRiskTitle") : t("findings.linkPickActionTitle")}
              </h2>
              <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={closePicker}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="max-h-[min(60vh,480px)] overflow-auto p-3">
              {pickerLoading ? (
                <p className="px-2 py-8 text-center text-sm text-muted-foreground">{t("findings.linkPickLoading")}</p>
              ) : pickerError ? (
                <p className="px-2 py-6 text-center text-sm text-amber-800 dark:text-amber-200">
                  {t("findings.linkPickNoWorkspace")}
                </p>
              ) : picker === "risk" ? (
                pickerRowsRisk.length === 0 ? (
                  <p className="px-2 py-8 text-center text-sm text-muted-foreground">{t("findings.linkPickEmptyRisk")}</p>
                ) : (
                  <ul className="space-y-1">
                    {pickerRowsRisk.map((row) => (
                      <li key={row.id}>
                        <button
                          type="button"
                          className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-left text-sm transition hover:bg-muted/60"
                          onClick={async () => {
                            if (!selected) return;
                            await actions.recordDecisionFor(selected.q.id, "linked_risk", {
                              table: row.targetTable,
                              id: row.id,
                            });
                            closePicker();
                          }}
                        >
                          <span className="font-medium text-foreground">{row.title}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )
              ) : pickerRowsAction.length === 0 ? (
                <p className="px-2 py-8 text-center text-sm text-muted-foreground">{t("findings.linkPickEmptyAction")}</p>
              ) : (
                <ul className="space-y-1">
                  {pickerRowsAction.map((row) => (
                    <li key={`${row.targetTable}-${row.id}`}>
                      <button
                        type="button"
                        className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-left text-sm transition hover:bg-muted/60"
                        onClick={async () => {
                          if (!selected) return;
                          await actions.recordDecisionFor(selected.q.id, "linked_action", {
                            table: row.targetTable,
                            id: row.id,
                          });
                          closePicker();
                        }}
                      >
                        <span className="font-medium text-foreground">{row.title}</span>
                        {row.subtitle ? (
                          <span className="mt-0.5 block text-xs text-muted-foreground">{row.subtitle}</span>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="border-t border-border px-4 py-2">
              <Button type="button" variant="outline" size="sm" className="w-full" onClick={closePicker}>
                {t("findings.linkPickClose")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

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
              {dofFeedback !== "none" ? (
                <p
                  className={
                    dofFeedback === "ok"
                      ? "mb-3 rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-xs text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-950/30 dark:text-emerald-100"
                      : "mb-3 rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-100"
                  }
                >
                  {dofFeedback === "ok"
                    ? t("findings.dofStartSuccess")
                    : dofFeedback === "no_workspace"
                      ? t("findings.dofStartNoWorkspace")
                      : t("findings.dofStartFailed")}
                </p>
              ) : null}
              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={
                    Boolean(selected.a?.decision === "linked_risk" && selected.a.decisionTargetId) ||
                    capaStartingQuestionId === selected.q.id
                  }
                  onClick={() => void openRiskPicker()}
                >
                  <Link2 className="mr-2 h-4 w-4" />
                  {t("findings.linkExistingRisk")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={
                    Boolean(selected.a?.decision === "linked_action" && selected.a.decisionTargetId) ||
                    capaStartingQuestionId === selected.q.id
                  }
                  onClick={() => void openActionPicker()}
                >
                  <Link2 className="mr-2 h-4 w-4" />
                  {t("findings.linkOpenAction")}
                </Button>
                {(selected.a?.decision === "linked_risk" || selected.a?.decision === "linked_action") &&
                selected.a.decisionTargetId ? (
                  <InspectionLinkedBanner answer={selected.a} />
                ) : null}
                {selected.a?.decision === "started_dof" && selected.a.decisionTargetId ? (
                  <div className="sm:col-span-2 flex flex-col gap-2 rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-3 dark:border-emerald-500/25 dark:bg-emerald-950/20">
                    <p className="text-xs font-medium text-emerald-900 dark:text-emerald-100">
                      {t("findings.dofLinkedHint")}
                    </p>
                    <Link
                      href={`/corrective-actions/${selected.a.decisionTargetId}`}
                      className="inline-flex w-fit items-center text-sm font-semibold text-[var(--gold)] underline-offset-4 hover:underline"
                    >
                      {t("findings.dofOpenDetail")}
                    </Link>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={capaStartingQuestionId === selected.q.id}
                    onClick={async () => {
                      setDofFeedback("none");
                      const res = await actions.startCapaFromInspectionFinding(selected.q.id);
                      setDofFeedback(res === "ok" ? "ok" : res === "no_workspace" ? "no_workspace" : "failed");
                    }}
                  >
                    {capaStartingQuestionId === selected.q.id
                      ? t("findings.dofStarting")
                      : t("findings.startCapa")}
                  </Button>
                )}
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

function InspectionLinkedBanner({ answer }: { answer: InspectionAnswerRecord }) {
  const t = useTranslations("fieldInspection");
  const [findingAssessmentId, setFindingAssessmentId] = useState<string | null>(null);

  useEffect(() => {
    if (answer.decisionTargetTable !== "risk_assessment_findings" || !answer.decisionTargetId) {
      setFindingAssessmentId(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const sb = createClient();
      if (!sb) return;
      const { data } = await sb
        .from("risk_assessment_findings")
        .select("assessment_id")
        .eq("id", answer.decisionTargetId)
        .maybeSingle();
      if (!cancelled && data?.assessment_id) setFindingAssessmentId(String(data.assessment_id));
    })();
    return () => {
      cancelled = true;
    };
  }, [answer.decisionTargetTable, answer.decisionTargetId]);

  const href =
    answer.decisionTargetTable && answer.decisionTargetId
      ? inspectionDecisionHref(
          answer.decisionTargetTable,
          answer.decisionTargetId,
          findingAssessmentId,
        )
      : null;

  const isRisk = answer.decision === "linked_risk";
  const hint = isRisk ? t("findings.linkedRiskHint") : t("findings.linkedActionHint");
  const linkLabel = isRisk ? t("findings.openRiskAnalysis") : t("findings.openLinkedTarget");

  return (
    <div className="sm:col-span-2 flex flex-col gap-2 rounded-xl border border-sky-200/80 bg-sky-50/50 p-3 dark:border-sky-500/25 dark:bg-sky-950/20">
      <p className="text-xs font-medium text-sky-900 dark:text-sky-100">{hint}</p>
      <p className="text-xs text-muted-foreground">{t("findings.linkedTrackHint")}</p>
      {href ? (
        <Link
          href={href}
          className="inline-flex w-fit items-center text-sm font-semibold text-[var(--gold)] underline-offset-4 hover:underline"
        >
          {linkLabel}
        </Link>
      ) : (
        <p className="text-xs text-muted-foreground">{t("findings.linkedTargetResolving")}</p>
      )}
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
