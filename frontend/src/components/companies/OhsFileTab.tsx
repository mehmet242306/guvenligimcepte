"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { FileArchive, CheckCircle2, AlertCircle, Clock, Download, Loader2 } from "lucide-react";
import {
  archiveDownloadUrl,
  cancelArchiveJob,
  createArchiveJob,
  getArchiveJob,
  listArchiveJobs,
  listScopePresets,
  type OhsArchiveJob,
  type OhsArchiveScopePreset,
} from "@/lib/supabase/ohs-archive-api";

type Props = {
  companyWorkspaceId: string;
  companyName: string;
  jurisdictionCode?: string;
};

const POLL_INTERVAL_MS = 4000;

function yearOptions(): number[] {
  const current = new Date().getFullYear();
  const years: number[] = [];
  for (let y = current; y >= current - 5; y--) years.push(y);
  return years;
}

function formatBytes(bytes: number | null): string {
  if (bytes === null) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatDateTime(iso: string | null, locale: string): string {
  if (!iso) return "-";
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function statusPill(status: OhsArchiveJob["status"], label: string) {
  const styles: Record<string, string> = {
    pending: "bg-secondary text-muted-foreground",
    processing: "bg-[var(--color-warning)]/15 text-[var(--color-warning)]",
    completed: "bg-[var(--color-success)]/15 text-[var(--color-success)]",
    failed: "bg-[var(--color-danger)]/15 text-[var(--color-danger)]",
    expired: "bg-secondary text-muted-foreground",
    cancelled: "bg-secondary text-muted-foreground",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${styles[status] ?? styles.pending}`}>
      {label}
    </span>
  );
}

export function OhsFileTab({ companyWorkspaceId, companyName, jurisdictionCode = "TR" }: Props) {
  const t = useTranslations("ohsFile");
  const tStatus = useTranslations("ohsFile.status");

  const [preset, setPreset] = useState<OhsArchiveScopePreset | null>(null);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [jobs, setJobs] = useState<OhsArchiveJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load the default preset for this jurisdiction + initial selected set.
  const loadPreset = useCallback(async () => {
    const presets = await listScopePresets(jurisdictionCode);
    const def = presets.find((p) => p.is_default) ?? presets[0] ?? null;
    setPreset(def);
    if (def) {
      setSelected(
        new Set(
          def.categories
            .filter((c) => c.required || true) // start fully checked
            .map((c) => c.key),
        ),
      );
    }
  }, [jurisdictionCode]);

  const loadJobs = useCallback(async () => {
    setLoadingJobs(true);
    const rows = await listArchiveJobs(companyWorkspaceId, 20);
    setJobs(rows);
    setLoadingJobs(false);
  }, [companyWorkspaceId]);

  useEffect(() => { void loadPreset(); }, [loadPreset]);
  useEffect(() => { void loadJobs(); }, [loadJobs]);

  // Poll active jobs (pending + processing) every 4s until none remain.
  useEffect(() => {
    const hasActive = jobs.some((j) => j.status === "pending" || j.status === "processing");
    if (!hasActive) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }
    if (pollRef.current) return;

    pollRef.current = setInterval(async () => {
      const activeIds = jobs
        .filter((j) => j.status === "pending" || j.status === "processing")
        .map((j) => j.id);
      if (activeIds.length === 0) return;

      const updated = await Promise.all(activeIds.map((id) => getArchiveJob(id)));
      setJobs((prev) =>
        prev.map((p) => updated.find((u) => u?.id === p.id) ?? p),
      );
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [jobs]);

  const sortedCategories = useMemo(() => {
    if (!preset) return [];
    return [...preset.categories].sort((a, b) => a.order - b.order);
  }, [preset]);

  function toggle(key: string, required: boolean) {
    if (required) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleSubmit() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    const res = await createArchiveJob({
      company_workspace_id: companyWorkspaceId,
      year,
      jurisdiction_code: jurisdictionCode,
      categories: Array.from(selected),
    });
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    await loadJobs();
  }

  async function handleCancel(jobId: string) {
    const ok = await cancelArchiveJob(jobId);
    if (ok) await loadJobs();
  }

  const activeJob = jobs.find((j) => j.status === "pending" || j.status === "processing") ?? null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <section className="rounded-[1.7rem] border border-border/80 bg-card p-6 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FileArchive className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">{t("title")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("description", { company: companyName })}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Form: year + categories */}
      <section className="rounded-[1.7rem] border border-border/80 bg-card p-6 shadow-[var(--shadow-card)]">
        <h3 className="text-sm font-bold text-foreground">{t("createNew")}</h3>

        <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,180px)_minmax(0,1fr)]">
          <div>
            <label className="text-xs font-semibold text-muted-foreground">{t("yearLabel")}</label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              {yearOptions().map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground">{t("scopeLabel")}</label>
            <div className="mt-1.5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {sortedCategories.map((cat) => (
                <label
                  key={cat.key}
                  className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-xs transition ${
                    selected.has(cat.key)
                      ? "border-primary/50 bg-primary/5 text-foreground"
                      : "border-border bg-background/70 text-muted-foreground hover:border-primary/30"
                  } ${cat.required ? "cursor-not-allowed opacity-90" : "cursor-pointer"}`}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(cat.key)}
                    disabled={cat.required}
                    onChange={() => toggle(cat.key, cat.required)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-border text-primary focus:ring-primary/40"
                  />
                  <span className="min-w-0">
                    <span className="block font-medium">{cat.label_tr}</span>
                    {cat.required && <span className="mt-0.5 block text-[10px] uppercase tracking-wide text-primary/80">{t("required")}</span>}
                  </span>
                </label>
              ))}
              {sortedCategories.length === 0 && (
                <div className="col-span-full rounded-xl border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
                  {t("scopeEmpty")}
                </div>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 px-4 py-3 text-sm text-[var(--color-danger)]">
            {error}
          </div>
        )}

        <div className="mt-5 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {activeJob ? t("alreadyRunning") : t("asyncHint")}
          </p>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting || !!activeJob || selected.size === 0 || !preset}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("prepareButton")}
          </button>
        </div>
      </section>

      {/* Jobs history */}
      <section className="rounded-[1.7rem] border border-border/80 bg-card p-6 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground">{t("historyTitle")}</h3>
          <button
            type="button"
            onClick={() => void loadJobs()}
            className="text-xs font-medium text-primary hover:underline"
          >
            {t("refresh")}
          </button>
        </div>

        <div className="mt-4 space-y-2.5">
          {loadingJobs ? (
            <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground">
              {t("loading")}
            </div>
          ) : jobs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground">
              {t("empty")}
            </div>
          ) : (
            jobs.map((job) => {
              const isActive = job.status === "pending" || job.status === "processing";
              const isDone = job.status === "completed";
              const labelKey = job.status as OhsArchiveJob["status"];
              return (
                <div
                  key={job.id}
                  className="flex flex-col gap-3 rounded-2xl border border-border bg-background/60 px-4 py-3 sm:flex-row sm:items-center"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    {isDone ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : isActive ? (
                      <Clock className="h-4 w-4 animate-pulse" />
                    ) : job.status === "failed" ? (
                      <AlertCircle className="h-4 w-4 text-[var(--color-danger)]" />
                    ) : (
                      <FileArchive className="h-4 w-4" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{job.year}</span>
                      {statusPill(job.status, tStatus(labelKey))}
                      {job.file_size_bytes !== null && (
                        <span className="text-[11px] text-muted-foreground">{formatBytes(job.file_size_bytes)}</span>
                      )}
                    </div>
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      {t("createdAt")}: {formatDateTime(job.created_at, "tr-TR")}
                      {job.completed_at ? ` · ${t("completedAt")}: ${formatDateTime(job.completed_at, "tr-TR")}` : ""}
                    </div>
                    {isActive && (
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${Math.max(5, job.progress)}%` }}
                        />
                      </div>
                    )}
                    {job.status === "failed" && job.error_message && (
                      <div className="mt-2 text-[11px] text-[var(--color-danger)]">{job.error_message}</div>
                    )}
                  </div>

                  <div className="flex shrink-0 gap-2">
                    {isDone && (
                      <a
                        href={archiveDownloadUrl(job.id)}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground transition hover:bg-primary-hover"
                      >
                        <Download className="h-3.5 w-3.5" />
                        {t("download")}
                      </a>
                    )}
                    {isActive && (
                      <button
                        type="button"
                        onClick={() => void handleCancel(job.id)}
                        className="inline-flex h-9 items-center rounded-lg border border-border bg-card px-3 text-xs font-medium text-muted-foreground hover:border-[var(--color-danger)]/40 hover:text-[var(--color-danger)]"
                      >
                        {t("cancel")}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
