"use client";

import { useCallback, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ClipboardCopy, FileText, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusAlert } from "@/components/ui/status-alert";
import { cn } from "@/lib/utils";
import { downloadAnnualEvaluationPdf } from "../_lib/annual-evaluation-pdf";

type Props = {
  companyWorkspaceId: string;
  companyName: string;
};

function yearOptions(): number[] {
  const current = new Date().getFullYear();
  const years: number[] = [];
  for (let y = current; y >= current - 6; y--) years.push(y);
  return years;
}

export function AnnualEvaluationReportSection({ companyWorkspaceId, companyName }: Props) {
  const t = useTranslations("reports.companyFile.annualEvaluation");
  const locale = useLocale();
  const apiLocale = locale === "tr" ? "tr" : "en";

  const [year, setYear] = useState(() => new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const subtitle = useMemo(() => t("subtitle", { company: companyName, year }), [t, companyName, year]);

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    setError(null);
    setMarkdown(null);
    try {
      const res = await fetch("/api/reports/annual-evaluation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_workspace_id: companyWorkspaceId,
          year,
          locale: apiLocale,
        }),
      });
      const data = (await res.json()) as { markdown?: string; error?: string };
      if (!res.ok) {
        throw new Error(data.error || t("errorGeneric"));
      }
      if (!data.markdown?.trim()) {
        throw new Error(t("errorEmpty"));
      }
      setMarkdown(data.markdown);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("errorGeneric"));
    } finally {
      setLoading(false);
    }
  }, [companyWorkspaceId, year, apiLocale, t]);

  async function handleCopy() {
    if (!markdown) return;
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handlePdf() {
    if (!markdown) return;
    await downloadAnnualEvaluationPdf({
      markdown,
      title: t("pdfTitle", { year }),
      subtitle: `${companyName} · RiskNova`,
      filenameBase: `yillik-degerlendirme-${year}-${companyName.replace(/[^\w\-]+/g, "_").slice(0, 40)}`,
    });
  }

  return (
    <section className="rounded-[1.75rem] border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-base font-semibold text-foreground">{t("title")}</h3>
            <p className="mt-1 max-w-2xl text-xs text-muted-foreground leading-relaxed">{t("description")}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{t("yearLabel")}</label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              disabled={loading}
              className="h-10 min-w-[100px] rounded-xl border border-border bg-background px-3 text-sm text-foreground"
            >
              {yearOptions().map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <Button variant="primary" onClick={() => void handleGenerate()} disabled={loading} className="h-10">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
            {loading ? t("generating") : t("generate")}
          </Button>
        </div>
      </div>

      <p className="mt-3 text-[11px] text-muted-foreground">{t("disclaimer")}</p>

      {error ? (
        <div className="mt-3">
          <StatusAlert tone="danger">
            {t("errorPrefix")} {error}
          </StatusAlert>
        </div>
      ) : null}

      {markdown ? (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => void handleCopy()}>
              <ClipboardCopy className="mr-1.5 h-4 w-4" />
              {copied ? t("copied") : t("copy")}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => void handlePdf()}>
              {t("downloadPdf")}
            </Button>
          </div>
          <p className="text-xs font-medium text-muted-foreground">{subtitle}</p>
          <article
            className={cn(
              "max-h-[min(520px,55vh)] overflow-y-auto rounded-xl border border-border/80 bg-muted/25 p-4 text-sm leading-relaxed",
              "whitespace-pre-wrap font-sans text-foreground",
            )}
          >
            {markdown}
          </article>
        </div>
      ) : null}
    </section>
  );
}
