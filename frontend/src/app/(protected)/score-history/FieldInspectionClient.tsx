"use client";

import { useEffect, useState } from "react";
import { Play, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { StatusAlert } from "@/components/ui/status-alert";
import { getActiveWorkspace, type WorkspaceRow } from "@/lib/supabase/workspace-api";
import { CategoryTabs } from "./_components/CategoryTabs";
import { ChecklistsTab } from "./_components/tabs/ChecklistsTab";
import { ActiveInspectionTab } from "./_components/tabs/ActiveInspectionTab";
import { FindingsTab } from "./_components/tabs/FindingsTab";
import { NovaTab } from "./_components/tabs/NovaTab";
import { ClosureTab } from "./_components/tabs/ClosureTab";
import { useInspectionSession } from "./_hooks/useInspectionSession";
import { formatRunStartIssue } from "./_lib/formatRunStartIssue";
import type { SurfaceCategoryId } from "./_lib/constants";

type WorkspaceContext = {
  name: string;
  countryCode: string;
};

function mapWorkspace(row: WorkspaceRow | null, fallbackName: string): WorkspaceContext {
  if (!row) return { name: fallbackName, countryCode: "TR" };
  return {
    name: row.name,
    countryCode: row.country_code.toUpperCase(),
  };
}

export function FieldInspectionClient() {
  const t = useTranslations("fieldInspection");
  const [workspace, setWorkspace] = useState<WorkspaceContext>({
    name: t("workspaceFallback"),
    countryCode: "TR",
  });
  const [activeCategory, setActiveCategory] = useState<SurfaceCategoryId>("checklists");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    tone: "success" | "warning" | "danger" | "info";
    message: string;
  } | null>(null);

  const [state, actions] = useInspectionSession();

  useEffect(() => {
    let mounted = true;
    getActiveWorkspace()
      .then((row) => {
        if (mounted) setWorkspace(mapWorkspace(row, t("workspaceFallback")));
      })
      .catch(() => {
        if (mounted) setWorkspace(mapWorkspace(null, t("workspaceFallback")));
      });
    return () => {
      mounted = false;
    };
  }, [t]);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 5000);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  useEffect(() => {
    if (selectedTemplateId) {
      void actions.selectTemplate(selectedTemplateId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTemplateId]);

  const handleSelectTemplate = (id: string) => {
    setSelectedTemplateId(id);
  };

  const handleStartInspection = async (mode: "official" | "preview") => {
    if (!state.activeTemplate) {
      setFeedback({ tone: "warning", message: t("feedback.selectChecklistFirst") });
      return;
    }
    const run = await actions.startRun({
      mode,
      siteLabel: (state.activeTemplate.metadata as { siteLabel?: string })?.siteLabel ?? undefined,
    });
    if (run) {
      setFeedback({
        tone: mode === "preview" ? "info" : "success",
        message:
          mode === "preview"
            ? t("feedback.previewStarted", { title: state.activeTemplate.title })
            : t("feedback.officialStarted", {
                title: state.activeTemplate.title,
                ref: run.code ?? run.id.slice(0, 8),
              }),
      });
      setActiveCategory("inspection");
    } else {
      setFeedback({ tone: "danger", message: t("feedback.startFailed") });
    }
  };

  const handleOpenStudio = () => {
    setActiveCategory("nova");
  };

  const handleNovaTemplateCreated = async (templateId: string) => {
    setSelectedTemplateId(templateId);
    setActiveCategory("checklists");
    setFeedback({
      tone: "success",
      message: t("feedback.novaDraftCreated"),
    });
  };

  const counts = {
    checklists: state.templates.length || "",
    inspection: state.activeRun
      ? `${state.activeRun.answeredCount}/${state.activeRun.totalQuestions || state.activeTemplate?.questions.length || 0}`
      : "",
    findings: state.activeTemplate
      ? state.activeTemplate.questions.filter((q) => {
          const a = state.answers[q.id];
          return a?.responseStatus === "uygunsuz" || a?.responseStatus === "kritik";
        }).length || ""
      : "",
    nova: "",
    closure:
      state.activeRun?.status === "report_ready"
        ? t("counts.closureReady")
        : state.activeRun
          ? t("counts.closureWaiting")
          : "",
  };

  const runIssueText = state.startRunIssue ? formatRunStartIssue(state.startRunIssue, t) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t("header.eyebrow")}
        title={t("header.title")}
        description={t("header.description")}
        meta={
          <>
            <span className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground">
              {t("header.activeArea", { name: workspace.name })}
            </span>
            {state.activeRun ? (
              <span className="rounded-full border border-[var(--gold)]/40 bg-[var(--gold)]/10 px-3 py-1.5 text-xs font-semibold text-[var(--gold)]">
                {state.activeRun.code
                  ? t("header.auditRunning", {
                      code: state.activeRun.code,
                      percent: state.activeRun.readinessScore,
                    })
                  : t("header.auditRunningNoCode", { percent: state.activeRun.readinessScore })}
              </span>
            ) : null}
          </>
        }
        actions={
          <>
            <Button
              size="lg"
              className="w-full min-[480px]:w-auto"
              disabled={!state.activeTemplate}
              onClick={() => handleStartInspection("official")}
            >
              <Play className="mr-1.5 h-4 w-4" />
              {t("actions.startAudit")}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full min-[480px]:w-auto"
              onClick={() => setActiveCategory("nova")}
            >
              <Sparkles className="mr-1.5 h-4 w-4" />
              {t("actions.checklistWithNova")}
            </Button>
          </>
        }
      />

      {feedback ? (
        <StatusAlert tone={feedback.tone}>{feedback.message}</StatusAlert>
      ) : null}

      {runIssueText ? <StatusAlert tone="danger">{runIssueText}</StatusAlert> : null}

      <section className="relative overflow-hidden rounded-[2rem] border border-amber-200/70 bg-gradient-to-br from-white via-amber-50/45 to-sky-50/35 p-4 shadow-[var(--shadow-card)] dark:border-white/10 dark:from-slate-950 dark:via-slate-900 dark:to-amber-950/20 sm:p-6">
        <span className="pointer-events-none absolute -right-24 -top-24 h-60 w-60 rounded-full bg-amber-300/25 blur-3xl dark:bg-amber-400/10" />
        <span className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-sky-300/20 blur-3xl dark:bg-sky-400/10" />
        <div className="relative">
          <CategoryTabs active={activeCategory} onChange={setActiveCategory} counts={counts} />

          {activeCategory === "checklists" ? (
            <ChecklistsTab
              state={state}
              actions={actions}
              selectedTemplateId={selectedTemplateId}
              onSelectTemplate={handleSelectTemplate}
              onStartOfficial={() => handleStartInspection("official")}
              onStartPreview={() => handleStartInspection("preview")}
              onOpenStudio={handleOpenStudio}
            />
          ) : null}

          {activeCategory === "inspection" ? (
            <ActiveInspectionTab
              state={state}
              actions={actions}
              onOpenFindings={() => setActiveCategory("findings")}
            />
          ) : null}

          {activeCategory === "findings" ? (
            <FindingsTab state={state} actions={actions} />
          ) : null}

          {activeCategory === "nova" ? (
            <NovaTab actions={actions} onTemplateCreated={handleNovaTemplateCreated} />
          ) : null}

          {activeCategory === "closure" ? (
            <ClosureTab state={state} actions={actions} />
          ) : null}
        </div>
      </section>
    </div>
  );
}
