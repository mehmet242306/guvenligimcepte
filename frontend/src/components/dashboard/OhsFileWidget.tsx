"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Archive, Download, ArrowRight, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import {
  archiveDownloadUrl,
  listRecentArchiveJobs,
  type OhsArchiveJob,
} from "@/lib/supabase/ohs-archive-api";

function formatBytes(bytes: number | null): string {
  if (bytes === null) return "";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function timeAgoTR(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "az önce";
  if (mins < 60) return `${mins} dk önce`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} sa önce`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} gün önce`;
  const months = Math.floor(days / 30);
  return `${months} ay önce`;
}

export function OhsFileWidget() {
  const t = useTranslations("ohsFile");
  const tStatus = useTranslations("ohsFile.status");
  const [jobs, setJobs] = useState<OhsArchiveJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const rows = await listRecentArchiveJobs(5);
      if (!cancelled) {
        setJobs(rows);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="surface-card relative overflow-hidden">
      <div className="pointer-events-none absolute right-[-6rem] top-[-7rem] h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(14,165,233,0.13),transparent_68%)] blur-xl" />
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Archive size={16} className="text-[var(--gold)]" />
            {t("widgetTitle")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("widgetSubtitle")}</p>
        </div>
        <Link
          href="/companies"
          className="hidden text-xs font-semibold text-primary hover:underline sm:inline"
        >
          {t("widgetAll")} <ArrowRight className="inline h-3 w-3" />
        </Link>
      </div>

      {loading ? (
        <div className="rounded-[1.35rem] border border-dashed border-border bg-background/55 px-4 py-8 text-center text-xs text-muted-foreground">
          {t("loading")}
        </div>
      ) : jobs.length === 0 ? (
        <div className="rounded-[1.35rem] border border-dashed border-border bg-background/55 px-4 py-8 text-center text-xs text-muted-foreground">
          {t("widgetEmpty")}
        </div>
      ) : (
        <div className="space-y-2">
          {jobs.map((job) => {
            const isDone = job.status === "completed";
            const isActive = job.status === "pending" || job.status === "processing";
            const isFailed = job.status === "failed";
            return (
              <div
                key={job.id}
                className="group flex items-center gap-3 rounded-[1.15rem] border border-border/80 bg-[linear-gradient(145deg,rgba(255,255,255,0.72),rgba(255,252,247,0.46))] px-3 py-2.5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[var(--gold)]/30 hover:shadow-[var(--shadow-soft)] dark:bg-[linear-gradient(145deg,rgba(255,255,255,0.055),rgba(255,255,255,0.025))]"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/10 bg-primary/10 text-primary shadow-sm">
                  {isDone ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : isActive ? (
                    <Clock className="h-4 w-4 animate-pulse" />
                  ) : isFailed ? (
                    <AlertCircle className="h-4 w-4 text-[var(--color-danger)]" />
                  ) : (
                    <Archive className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{job.year}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {tStatus(job.status)}
                      {job.file_size_bytes ? ` · ${formatBytes(job.file_size_bytes)}` : ""}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    {timeAgoTR(job.created_at)}
                  </div>
                </div>
                {isDone && (
                  <a
                    href={archiveDownloadUrl(job.id)}
                    className="inline-flex h-8 items-center gap-1 rounded-lg bg-primary px-2.5 text-[11px] font-semibold text-primary-foreground shadow-sm transition hover:bg-primary-hover"
                    aria-label={t("download")}
                  >
                    <Download className="h-3 w-3" />
                    <span className="hidden sm:inline">{t("download")}</span>
                  </a>
                )}
                <Link
                  href={`/companies/${job.company_workspace_id}?tab=ohs_file&job=${job.id}`}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card/70 text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                  aria-label={t("openCompany")}
                  title={t("openCompany")}
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
