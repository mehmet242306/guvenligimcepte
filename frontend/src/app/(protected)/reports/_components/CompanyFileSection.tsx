"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Download, FileArchive, Loader2, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusAlert } from "@/components/ui/status-alert";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
  collectCompanyFile,
  type CompanyFileCategory,
  type CompanyFileCategoryId,
} from "../_lib/company-file-collector";
import { downloadCompanyFileZip } from "../_lib/company-file-generator";
import { CompanyOverview } from "./CompanyOverview";

// =============================================================================
// CompanyFileSection — PageHeader'sız, başlık-şeritsiz gömülebilir versiyon.
// İSG Dosyası sekmesi ve benzeri dahili konumlarda tekrar kullanılır.
// =============================================================================

type Feedback =
  | { tone: "success" | "warning" | "danger" | "info"; message: string }
  | null;

type Props = {
  companyWorkspaceId: string;
  companyName: string;
};

export function CompanyFileSection({ companyWorkspaceId, companyName }: Props) {
  const t = useTranslations("reports.companyFile");
  const [orgId, setOrgId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [categories, setCategories] = useState<CompanyFileCategory[]>([]);
  const [selected, setSelected] = useState<Set<CompanyFileCategoryId>>(new Set());
  const [includeItemPdfs, setIncludeItemPdfs] = useState(true);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const loadContext = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    if (!supabase) {
      setLoading(false);
      return;
    }
    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes.user;

    let resolvedOrg: string | null = null;
    if (user) {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("organization_id, full_name")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      resolvedOrg = (profile?.organization_id as string | null) ?? null;
      setUserName((profile?.full_name as string | null) ?? user.email ?? null);
    }
    setOrgId(resolvedOrg);

    if (!resolvedOrg) {
      setCategories([]);
      setLoading(false);
      return;
    }

    const data = await collectCompanyFile(resolvedOrg, companyWorkspaceId);
    setCategories(data);
    setSelected(new Set(data.filter((c) => c.count > 0).map((c) => c.id)));
    setLoading(false);
  }, [companyWorkspaceId]);

  useEffect(() => {
    void loadContext();
  }, [loadContext]);

  const totalSelected = useMemo(
    () =>
      categories
        .filter((c) => selected.has(c.id))
        .reduce((sum, c) => sum + c.count, 0),
    [categories, selected],
  );

  const toggle = (id: CompanyFileCategoryId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === categories.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(categories.map((c) => c.id)));
    }
  };

  const handleDownload = async () => {
    if (selected.size === 0 || totalSelected === 0) {
      setFeedback({
        tone: "warning",
        message: t("warnSelectCategory"),
      });
      return;
    }

    setGenerating(true);
    setFeedback(null);
    try {
      await downloadCompanyFileZip({
        categories,
        selectedIds: selected as Set<string>,
        includePerItemPdf: includeItemPdfs,
        context: {
          companyName,
          organizationName: "RiskNova",
          generatedBy: userName,
          generatedAt: new Date(),
        },
      });
      setFeedback({
        tone: "success",
        message: t("successZip", { count: totalSelected }),
      });
    } catch (err) {
      setFeedback({
        tone: "danger",
        message: `${t("failZipPrefix")} ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Section header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-foreground">{t("title")}</h2>
          <p className="text-sm text-muted-foreground">{t("subtitle", { companyName })}</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {!loading ? (
            <span className="inline-flex items-center rounded-full border border-border/80 bg-background/70 px-3 py-1 font-medium text-muted-foreground">
              {t("selectedCount", { count: totalSelected })}
            </span>
          ) : null}
          <Button variant="outline" size="sm" onClick={() => void loadContext()} disabled={loading}>
            <RefreshCw className={cn("mr-1.5 h-4 w-4", loading && "animate-spin")} />
            {t("refresh")}
          </Button>
        </div>
      </div>

      {feedback ? (
        <StatusAlert tone={feedback.tone}>{feedback.message}</StatusAlert>
      ) : null}

      {/* Analitik şerit: KPI + 4 grafik */}
      <CompanyOverview categories={categories} loading={loading} />

      {/* Firma Dosyası kategori seçici + ZIP indir */}
      <section className="rounded-[1.75rem] border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--gold)]/15">
              <FileArchive className="h-5 w-5 text-[var(--gold)]" />
            </span>
            <div>
              <h3 className="text-base font-semibold text-foreground">{t("sectionTitle")}</h3>
              <p className="text-xs text-muted-foreground">{t("sectionHint")}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={includeItemPdfs}
                onChange={(e) => setIncludeItemPdfs(e.target.checked)}
              />
              <span>{t("includePdfPerRecord")}</span>
            </label>
            <Button variant="outline" size="sm" onClick={toggleAll} disabled={loading}>
              {selected.size === categories.length ? t("selectNone") : t("selectAll")}
            </Button>
            <Button
              onClick={handleDownload}
              disabled={generating || loading || totalSelected === 0}
            >
              {generating ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-1.5 h-4 w-4" />
              )}
              {generating ? t("downloading") : t("downloadZip")}
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {loading ? (
            <div className="col-span-full flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{t("loadingRecords")}</span>
            </div>
          ) : !orgId ? (
            <div className="col-span-full rounded-xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center text-sm text-muted-foreground">
              {t("noOrg")}
            </div>
          ) : categories.length === 0 ? (
            <div className="col-span-full rounded-xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center text-sm text-muted-foreground">
              {t("noCompanyRecords")}
            </div>
          ) : (
            categories.map((cat) => {
              const isSelected = selected.has(cat.id);
              const isEmpty = cat.count === 0;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => toggle(cat.id)}
                  disabled={isEmpty}
                  className={cn(
                    "flex flex-col items-start gap-2 rounded-2xl border px-4 py-3 text-left transition",
                    isSelected
                      ? "border-[var(--gold)]/60 bg-[var(--gold)]/10 shadow-[0_8px_18px_rgba(217,162,27,0.12)]"
                      : "border-border bg-muted/20 hover:border-[var(--gold)]/30",
                    isEmpty && "opacity-50 cursor-not-allowed hover:border-border",
                  )}
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <span className="text-lg">{cat.icon}</span>
                      {cat.label}
                    </span>
                    <Badge variant={isEmpty ? "neutral" : isSelected ? "success" : "neutral"}>
                      {cat.count}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {isEmpty ? t("categoryEmpty") : isSelected ? t("categoryIncluded") : t("categoryHint")}
                  </p>
                </button>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
