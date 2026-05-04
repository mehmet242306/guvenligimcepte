"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Sparkles, Wand2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { SubcategorySidebar, type SidebarItem } from "../SubcategorySidebar";
import type { SessionActions } from "../../_hooks/useInspectionSession";
import { INSPECTION_MODE_ORDER, MODE_QUESTION_COUNTS, type InspectionModeKey } from "../../_lib/constants";
import { createClient } from "@/lib/supabase/client";

type Props = {
  actions: SessionActions;
  onTemplateCreated: (templateId: string) => void;
};

type NovaSources = {
  risks: boolean;
  previousFindings: boolean;
  openActions: boolean;
  dof: boolean;
  library: boolean;
  reports: boolean;
};

const SOURCE_KEYS: Array<keyof NovaSources> = [
  "risks",
  "previousFindings",
  "openActions",
  "dof",
  "library",
  "reports",
];

export function NovaTab({ actions, onTemplateCreated }: Props) {
  const t = useTranslations("fieldInspection");
  const [subItem, setSubItem] = useState<string>("studio");
  const [purpose, setPurpose] = useState("");
  const purposeSeeded = useRef(false);
  useLayoutEffect(() => {
    if (purposeSeeded.current) return;
    purposeSeeded.current = true;
    setPurpose(t("nova.purposePlaceholder"));
  }, [t]);
  const [mode, setMode] = useState<InspectionModeKey>("standard");
  const [siteLabel, setSiteLabel] = useState("");
  const [sources, setSources] = useState<NovaSources>({
    risks: true,
    previousFindings: true,
    openActions: true,
    dof: false,
    library: true,
    reports: false,
  });
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const sourceLabels = useMemo(
    () =>
      ({
        risks: t("nova.sourceRisks"),
        previousFindings: t("nova.sourcePastFindings"),
        openActions: t("nova.sourceOpenActions"),
        dof: t("nova.sourceDof"),
        library: t("nova.sourceLibrary"),
        reports: t("nova.sourceReports"),
      }) satisfies Record<keyof NovaSources, string>,
    [t],
  );

  const sidebarItems: SidebarItem[] = useMemo(
    () => [
      {
        id: "studio",
        title: t("nova.studioTitle"),
        description: t("nova.studioDesc"),
        badge: t("nova.studioBadge"),
      },
      {
        id: "memory",
        title: t("nova.memoryTitle"),
        description: t("nova.memoryDesc"),
        badge: t("nova.memoryBadge"),
      },
    ],
    [t],
  );

  const handleCreate = async () => {
    setCreating(true);
    setErrorMsg(null);

    const mappedSources: string[] = [];
    if (sources.risks) mappedSources.push("existing_risks");
    if (sources.previousFindings) mappedSources.push("past_findings");
    if (sources.openActions) mappedSources.push("open_actions");
    if (sources.dof) mappedSources.push("dof");
    if (sources.library) mappedSources.push("library");
    if (sources.reports) mappedSources.push("reports");

    const supabase = createClient();
    if (!supabase) {
      setErrorMsg(t("nova.errNoClient"));
      setCreating(false);
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      setErrorMsg(t("nova.errNoSession"));
      setCreating(false);
      return;
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const apiKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !apiKey) {
      setErrorMsg(t("nova.errEnv"));
      setCreating(false);
      return;
    }

    let res: Response;
    try {
      res = await fetch(`${supabaseUrl}/functions/v1/nova-checklist-generator`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          apikey: apiKey,
        },
        body: JSON.stringify({
          purpose,
          mode,
          sources: mappedSources,
          context: siteLabel ? { location: siteLabel } : undefined,
        }),
      });
    } catch (err) {
      setCreating(false);
      setErrorMsg(
        t("nova.errNetwork", {
          message: err instanceof Error ? err.message : String(err),
        }),
      );
      return;
    }

    setCreating(false);

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.warn(`nova-checklist-generator ${res.status}:`, text);
      setErrorMsg(
        t("nova.errHttp", {
          status: res.status,
          text: text.slice(0, 240) || "—",
        }),
      );
      return;
    }

    const data = (await res.json().catch(() => null)) as { checklist_id?: string } | null;
    const checklistId = data?.checklist_id;
    if (!checklistId) {
      setErrorMsg(t("nova.errBadResponse"));
      return;
    }

    await actions.refreshTemplates();
    onTemplateCreated(checklistId);
  };

  return (
    <div className="mt-4 grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
      <SubcategorySidebar
        title={t("nova.sidebarTitle")}
        items={sidebarItems}
        activeItemId={subItem}
        onSelect={setSubItem}
      />

      {subItem === "studio" ? (
        <div className="space-y-4">
          <div className="rounded-[1.5rem] border border-violet-200/70 bg-gradient-to-br from-white via-violet-50/55 to-fuchsia-50/35 p-5 shadow-sm dark:border-violet-400/15 dark:from-slate-950 dark:via-violet-950/20 dark:to-slate-950">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles size={18} className="text-[var(--gold)]" />
              <h3 className="text-lg font-semibold text-foreground">{t("nova.panelTitle")}</h3>
              <Badge variant="success">{t("nova.panelBadge")}</Badge>
            </div>
            {errorMsg ? (
              <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-800/40 dark:bg-red-950/20 dark:text-red-200">
                {errorMsg}
              </div>
            ) : null}

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("nova.purposeLabel")}
                </label>
                <Textarea
                  rows={3}
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder={t("nova.purposePlaceholder")}
                  className="mt-1"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("nova.modeLabel")}
                  </label>
                  <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value as InspectionModeKey)}
                    className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
                  >
                    {INSPECTION_MODE_ORDER.map((k) => (
                      <option key={k} value={k}>
                        {t(`mode.${k}.label`)} ({t("checklists.questionsCount", { count: MODE_QUESTION_COUNTS[k] })})
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-muted-foreground">{t(`mode.${mode}.description`)}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("nova.locationLabel")}
                  </label>
                  <Input
                    value={siteLabel}
                    onChange={(e) => setSiteLabel(e.target.value)}
                    placeholder={t("nova.locationPlaceholder")}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("nova.sourcesLabel")}
                </label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {SOURCE_KEYS.map((key) => (
                    <label
                      key={key}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-muted/20 px-3 py-2 text-sm transition",
                        sources[key] && "border-[var(--gold)] bg-[var(--gold)]/10",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={sources[key]}
                        onChange={(e) =>
                          setSources((prev) => ({ ...prev, [key]: e.target.checked }))
                        }
                      />
                      <span>{sourceLabels[key]}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
                <Button onClick={handleCreate} disabled={creating || !purpose.trim()}>
                  <Wand2 className="mr-2 h-4 w-4" />
                  {creating ? t("nova.creating") : t("nova.createDraft")}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">{t("nova.footerHint")}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex min-h-[320px] flex-col items-center justify-center gap-2 rounded-[1.5rem] border border-dashed border-violet-200/70 bg-violet-50/40 px-8 py-16 text-center dark:border-violet-400/15 dark:bg-violet-950/15">
          <Sparkles size={32} className="text-muted-foreground" />
          <p className="text-base font-semibold text-foreground">{t("nova.memorySoonTitle")}</p>
          <p className="text-sm text-muted-foreground">{t("nova.memorySoonBody")}</p>
        </div>
      )}
    </div>
  );
}
