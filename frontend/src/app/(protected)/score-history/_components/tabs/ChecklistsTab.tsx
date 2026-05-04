"use client";

import { useMemo, useState } from "react";
import { ClipboardCheck, Play, PackageOpen, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SubcategorySidebar, type SidebarItem } from "../SubcategorySidebar";
import type { SessionState, SessionActions } from "../../_hooks/useInspectionSession";
import { seedStarterTemplates } from "@/lib/supabase/checklist-api";

type Props = {
  state: SessionState;
  actions: SessionActions;
  selectedTemplateId: string | null;
  onSelectTemplate: (id: string) => void;
  onStartOfficial: () => void;
  onStartPreview: () => void;
  onOpenStudio: () => void;
};

const SOURCE_KEYS = ["manual", "nova", "library", "risk_analysis", "imported"] as const;

function sourceLabel(t: (key: string) => string, source: string) {
  if ((SOURCE_KEYS as readonly string[]).includes(source)) {
    return (t as (key: string) => string)(`sources.${source}`);
  }
  return source;
}

export function ChecklistsTab({
  state,
  actions,
  selectedTemplateId,
  onSelectTemplate,
  onStartOfficial,
  onStartPreview,
  onOpenStudio,
}: Props) {
  const t = useTranslations("fieldInspection");
  const { templates, activeTemplate, loadingTemplates, loadingActive } = state;
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState<string | null>(null);

  const handleSeedStarter = async () => {
    setSeeding(true);
    setSeedMsg(null);
    const result = await seedStarterTemplates();
    setSeeding(false);
    if (result.skipped) {
      setSeedMsg(
        result.reason === "already_seeded"
          ? t("checklists.seedSkipped")
          : t("checklists.seedFailed"),
      );
      return;
    }
    setSeedMsg(t("checklists.seedLoaded", { count: result.created }));
    await actions.refreshTemplates();
  };

  const sidebarItems = useMemo<SidebarItem[]>(
    () =>
      templates.map((tmpl) => ({
        id: tmpl.id,
        title: tmpl.title,
        description: t("checklists.sidebarItemDescription", {
          count: tmpl.questionCount ?? 0,
          source: sourceLabel(t, tmpl.source),
        }),
        badge:
          tmpl.status === "draft"
            ? t("checklists.statusDraft")
            : tmpl.status === "archived"
              ? t("checklists.statusArchived")
              : t("checklists.statusPublished"),
      })),
    [templates, t],
  );

  return (
    <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
      <SubcategorySidebar
        title={t("checklists.sidebarTitle")}
        items={sidebarItems}
        activeItemId={selectedTemplateId}
        onSelect={onSelectTemplate}
        emptyLabel={
          loadingTemplates ? t("checklists.loading") : t("checklists.emptyList")
        }
        footer={
          <Button variant="outline" size="sm" className="w-full" onClick={onOpenStudio}>
            <Sparkles className="mr-2 h-4 w-4" />
            {t("checklists.footerNova")}
          </Button>
        }
      />

      <div className="rounded-[1.5rem] border border-sky-200/70 bg-gradient-to-br from-white via-sky-50/55 to-amber-50/35 p-5 shadow-sm dark:border-sky-400/15 dark:from-slate-950 dark:via-sky-950/20 dark:to-slate-950">
        {!activeTemplate ? (
          <EmptyState
            loading={loadingActive || loadingTemplates}
            hasTemplates={templates.length > 0}
            seeding={seeding}
            seedMessage={seedMsg}
            onSeedStarter={handleSeedStarter}
            onOpenStudio={onOpenStudio}
          />
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <ClipboardCheck size={18} className="text-[var(--gold)]" />
                  <h3 className="text-lg font-semibold text-foreground">
                    {activeTemplate.title}
                  </h3>
                  <Badge variant={activeTemplate.status === "draft" ? "warning" : "success"}>
                    {activeTemplate.status === "draft"
                      ? t("checklists.statusDraft")
                      : t("checklists.statusPublished")}
                  </Badge>
                </div>
                {activeTemplate.description ? (
                  <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                    {activeTemplate.description}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-2 pt-2 text-xs text-muted-foreground">
                  <span>
                    {t("checklists.questionsCount", { count: activeTemplate.questions.length })}
                  </span>
                  <span>·</span>
                  <span>{t("checklists.version", { version: activeTemplate.version })}</span>
                  <span>·</span>
                  <span>{sourceLabel(t, activeTemplate.source)}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={onStartOfficial}>
                  <Play className="mr-1.5 h-4 w-4" />
                  {t("checklists.startOfficial")}
                </Button>
                <Button variant="outline" onClick={onStartPreview}>
                  {t("checklists.walkthrough")}
                </Button>
              </div>
            </div>

            <div className="grid gap-2">
              {activeTemplate.questions.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border/60 bg-muted/20 px-4 py-6 text-center text-xs text-muted-foreground">
                  {t("checklists.noQuestionsHint")}
                </p>
              ) : (
                activeTemplate.questions.map((q, index) => (
                  <div
                    key={q.id}
                    className={cn(
                      "flex items-start gap-3 rounded-xl border border-sky-200/70 bg-white/70 px-3 py-2.5 text-sm transition hover:border-sky-300 hover:bg-sky-50 dark:border-sky-400/15 dark:bg-white/5 dark:hover:bg-sky-400/10",
                    )}
                  >
                    <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--gold)]/15 text-[11px] font-semibold text-[var(--gold)]">
                      {index + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-foreground">{q.text}</p>
                      <p className="mt-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                        {q.section} · {q.category}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

type EmptyStateProps = {
  loading: boolean;
  hasTemplates: boolean;
  seeding: boolean;
  seedMessage: string | null;
  onSeedStarter: () => void;
  onOpenStudio: () => void;
};

function EmptyState({
  loading,
  hasTemplates,
  seeding,
  seedMessage,
  onSeedStarter,
  onOpenStudio,
}: EmptyStateProps) {
  const t = useTranslations("fieldInspection");
  if (loading) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-center">
        <div className="rounded-full bg-[var(--gold)]/10 p-4">
          <ClipboardCheck size={32} className="text-[var(--gold)]" />
        </div>
        <p className="text-sm text-muted-foreground">{t("checklists.emptyLoadingTemplates")}</p>
      </div>
    );
  }

  if (!hasTemplates) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-center">
        <div className="rounded-full bg-[var(--gold)]/10 p-4">
          <PackageOpen size={32} className="text-[var(--gold)]" />
        </div>
        <p className="text-base font-semibold text-foreground">{t("checklists.emptyNoTemplatesTitle")}</p>
        <p className="max-w-lg text-sm text-muted-foreground">{t("checklists.emptyNoTemplatesBody")}</p>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <Button onClick={onSeedStarter} disabled={seeding}>
            <PackageOpen className="mr-2 h-4 w-4" />
            {seeding ? t("checklists.loading") : t("checklists.emptyNoTemplatesLoad")}
          </Button>
          <Button variant="outline" onClick={onOpenStudio}>
            <Sparkles className="mr-2 h-4 w-4" />
            {t("checklists.emptyNoTemplatesNova")}
          </Button>
        </div>
        {seedMessage ? (
          <p className="mt-2 text-xs text-muted-foreground">{seedMessage}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-center">
      <div className="rounded-full bg-[var(--gold)]/10 p-4">
        <ClipboardCheck size={32} className="text-[var(--gold)]" />
      </div>
      <p className="text-base font-semibold text-foreground">{t("checklists.emptyHasTemplatesTitle")}</p>
      <p className="max-w-md text-sm text-muted-foreground">{t("checklists.emptyHasTemplatesBody")}</p>
      <Button variant="outline" size="sm" className="mt-2" onClick={onOpenStudio}>
        <Sparkles className="mr-2 h-4 w-4" />
        {t("checklists.emptyOpenStudio")}
      </Button>
    </div>
  );
}
