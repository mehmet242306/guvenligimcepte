"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, FileDown, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import type { FieldInspectionTranslator } from "../../_lib/formatRunStartIssue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SubcategorySidebar, type SidebarItem } from "../SubcategorySidebar";
import type { SessionState, SessionActions } from "../../_hooks/useInspectionSession";

type Props = {
  state: SessionState;
  actions: SessionActions;
};

type ClosureGap = {
  key: string;
  messageKey:
    | "gapUnanswered"
    | "gapCriticalNote"
    | "gapCriticalAction"
    | "gapCriticalDeadline"
    | "gapCriticalPhoto"
    | "gapNaReason";
  snippet: string;
};

function formatClosureGap(t: FieldInspectionTranslator, g: ClosureGap) {
  const { snippet } = g;
  switch (g.messageKey) {
    case "gapUnanswered":
      return t("closure.gapUnanswered", { snippet });
    case "gapCriticalNote":
      return t("closure.gapCriticalNote", { snippet });
    case "gapCriticalAction":
      return t("closure.gapCriticalAction", { snippet });
    case "gapCriticalDeadline":
      return t("closure.gapCriticalDeadline", { snippet });
    case "gapCriticalPhoto":
      return t("closure.gapCriticalPhoto", { snippet });
    case "gapNaReason":
      return t("closure.gapNaReason", { snippet });
  }
}

export function ClosureTab({ state, actions }: Props) {
  const t = useTranslations("fieldInspection");
  const { activeTemplate, activeRun, answers } = state;
  const [subItem, setSubItem] = useState<string>("check");
  const [completing, setCompleting] = useState(false);

  const missingItems = useMemo<ClosureGap[]>(() => {
    if (!activeTemplate) return [];
    const gaps: ClosureGap[] = [];
    for (const q of activeTemplate.questions) {
      const a = answers[q.id];
      const snippet60 = q.text.length > 60 ? `${q.text.slice(0, 57)}...` : q.text;
      const snippet40 = q.text.length > 40 ? `${q.text.slice(0, 37)}...` : q.text;
      if (!a?.responseStatus) {
        gaps.push({ key: `${q.id}-unanswered`, messageKey: "gapUnanswered", snippet: snippet60 });
        continue;
      }
      if (a.responseStatus === "kritik") {
        if (!a.note?.trim())
          gaps.push({ key: `${q.id}-note`, messageKey: "gapCriticalNote", snippet: snippet40 });
        if (!a.actionTitle?.trim())
          gaps.push({ key: `${q.id}-action`, messageKey: "gapCriticalAction", snippet: snippet40 });
        if (!a.actionDeadline)
          gaps.push({ key: `${q.id}-deadline`, messageKey: "gapCriticalDeadline", snippet: snippet40 });
        if (a.photoUrls.length === 0)
          gaps.push({ key: `${q.id}-photo`, messageKey: "gapCriticalPhoto", snippet: snippet40 });
      }
      if (a.responseStatus === "na" && !a.naReason?.trim()) {
        gaps.push({ key: `${q.id}-na`, messageKey: "gapNaReason", snippet: snippet40 });
      }
    }
    return gaps;
  }, [activeTemplate, answers]);

  const sidebarItems: SidebarItem[] = useMemo(
    () => [
      {
        id: "check",
        title: t("closure.stepCheckTitle"),
        description:
          missingItems.length > 0
            ? t("closure.stepCheckDescGaps", { count: missingItems.length })
            : t("closure.stepCheckDescReady"),
        badge: missingItems.length > 0 ? t("closure.badgeMissing") : t("closure.badgeReady"),
      },
      {
        id: "report",
        title: t("closure.stepReportTitle"),
        description:
          activeRun?.status === "report_ready"
            ? t("closure.stepReportDescDone")
            : t("closure.stepReportDescWait"),
        badge: activeRun?.status === "report_ready" ? t("closure.badgeReady") : t("closure.badgeDash"),
      },
    ],
    [missingItems.length, activeRun?.status, t],
  );

  if (!activeRun) {
    return (
      <div className="mt-4 rounded-[1.5rem] border border-dashed border-border bg-muted/20 px-8 py-16 text-center">
        <FileDown className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
        <p className="text-base font-semibold text-foreground">{t("closure.noRunTitle")}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t("closure.noRunBody")}</p>
      </div>
    );
  }

  return (
    <div className="mt-4 grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
      <SubcategorySidebar
        title={t("closure.sidebarTitle")}
        items={sidebarItems}
        activeItemId={subItem}
        onSelect={setSubItem}
      />

      {subItem === "check" ? (
        <div className="rounded-[1.5rem] border border-emerald-200/70 bg-gradient-to-br from-white via-emerald-50/55 to-teal-50/35 p-5 shadow-sm dark:border-emerald-400/15 dark:from-slate-950 dark:via-emerald-950/20 dark:to-slate-950">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <h3 className="text-lg font-semibold text-foreground">{t("closure.summaryTitle")}</h3>
            <Badge variant="neutral">{activeRun.code ?? t("closure.recordPending")}</Badge>
            <Badge variant="success">
              {t("closure.readiness", { percent: activeRun.readinessScore })}
            </Badge>
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <StatBox label={t("closure.statUygun")} value={activeRun.uygunCount} tone="emerald" />
            <StatBox label={t("closure.statUygunsuz")} value={activeRun.uygunsuzCount} tone="amber" />
            <StatBox label={t("closure.statKritik")} value={activeRun.kritikCount} tone="red" />
            <StatBox label={t("closure.statNa")} value={activeRun.naCount} tone="slate" />
          </div>

          <div className="mt-5 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              {missingItems.length > 0 ? (
                <TriangleAlert className="h-4 w-4 text-amber-600" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              )}
              <span>
                {missingItems.length > 0
                  ? t("closure.gapsTitle", { count: missingItems.length })
                  : t("closure.gapsNone")}
              </span>
            </div>
            {missingItems.length > 0 ? (
              <ul className="max-h-64 space-y-1 overflow-auto rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-900 dark:border-amber-800/50 dark:bg-amber-950/20 dark:text-amber-200">
                {missingItems.map((g) => (
                  <li key={g.key}>
                    • {formatClosureGap(t, g)}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
            <Button
              disabled={missingItems.length > 0 || completing || activeRun.status !== "in_progress"}
              onClick={async () => {
                setCompleting(true);
                await actions.completeRun();
                setCompleting(false);
                setSubItem("report");
              }}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {completing ? t("closure.completing") : t("closure.complete")}
            </Button>
            <Button variant="outline" onClick={() => actions.abandonRun()}>
              {t("closure.abandon")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-[1.5rem] border border-emerald-200/70 bg-gradient-to-br from-white via-emerald-50/55 to-sky-50/35 p-5 shadow-sm dark:border-emerald-400/15 dark:from-slate-950 dark:via-emerald-950/20 dark:to-slate-950">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <FileDown size={18} className="text-[var(--gold)]" />
            <h3 className="text-lg font-semibold text-foreground">{t("closure.reportTitle")}</h3>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">{t("closure.reportBody")}</p>
          <div className="grid gap-2 sm:grid-cols-3">
            <Button variant="outline" disabled>
              <FileDown className="mr-2 h-4 w-4" />
              {t("closure.pdfSoon")}
            </Button>
            <Button variant="outline" disabled>
              {t("closure.riskExportSoon")}
            </Button>
            <Button variant="outline" disabled>
              {t("closure.emailSoon")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatBox({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "emerald" | "amber" | "red" | "slate";
}) {
  const toneClass: Record<typeof tone, string> = {
    emerald:
      "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800/40 dark:bg-emerald-950/20 dark:text-emerald-200",
    amber:
      "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800/40 dark:bg-amber-950/20 dark:text-amber-200",
    red: "border-red-200 bg-red-50 text-red-900 dark:border-red-800/40 dark:bg-red-950/20 dark:text-red-200",
    slate:
      "border-slate-200 bg-slate-50 text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-200",
  };
  return (
    <div className={`rounded-xl border p-3 ${toneClass[tone]}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
