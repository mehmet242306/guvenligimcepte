"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  downloadDataExport,
  listOwnDataExports,
  listOwnDeletionRequests,
  requestDataExport,
  requestSelfDeletion,
  type DataDeletionRequestRow,
  type DataExportRow,
} from "@/lib/supabase/privacy-api";

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

type StatusKey = DataDeletionRequestRow["status"] | DataExportRow["status"];

export function ProfileDataRightsPanel() {
  const t = useTranslations("dataRights");
  const locale = useLocale();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletionReason, setDeletionReason] = useState("");
  const [exports, setExports] = useState<DataExportRow[]>([]);
  const [requests, setRequests] = useState<DataDeletionRequestRow[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [locale],
  );

  function formatDateTime(value: string | null) {
    if (!value) return "-";
    return dateFormatter.format(new Date(value));
  }

  function formatStatus(status: StatusKey): string {
    const key = `status.${status}`;
    try {
      return t(key);
    } catch {
      return status;
    }
  }

  const activeDeletionRequest = useMemo(
    () => requests.find((item) => item.status === "scheduled" || item.status === "processing") ?? null,
    [requests],
  );

  async function load() {
    setLoading(true);
    setError(null);

    const [requestRows, exportRows] = await Promise.all([
      listOwnDeletionRequests(),
      listOwnDataExports(),
    ]);

    setRequests(requestRows);
    setExports(exportRows);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleExport(format: "json" | "csv") {
    setSubmitting(true);
    setFeedback(null);
    setError(null);

    try {
      const created = await requestDataExport(format);
      const file = await downloadDataExport(created.exportId);
      triggerDownload(file.blob, file.fileName);
      setFeedback(t("exportReady", { format: format.toUpperCase() }));
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t("exportFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeletionRequest() {
    if (activeDeletionRequest) {
      setError(t("deletionExists"));
      return;
    }

    if (!window.confirm(t("deletionConfirm"))) {
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    setError(null);

    try {
      const result = await requestSelfDeletion(deletionReason);
      setFeedback(
        t("deletionReceived", { date: formatDateTime(result.request.scheduled_purge_at) }),
      );
      setDeletionReason("");
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t("deletionFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[1.75rem] border border-border bg-card p-6 shadow-[var(--shadow-card)] sm:p-7">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{t("title")}</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              {t("description")}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-background/70 px-4 py-3">
              <div className="text-muted-foreground">{t("statExport")}</div>
              <div className="mt-1 text-lg font-semibold text-foreground">{exports.length}</div>
            </div>
            <div className="rounded-2xl border border-border bg-background/70 px-4 py-3">
              <div className="text-muted-foreground">{t("statDeletion")}</div>
              <div className="mt-1 text-lg font-semibold text-foreground">{requests.length}</div>
            </div>
            <div className="rounded-2xl border border-border bg-background/70 px-4 py-3">
              <div className="text-muted-foreground">{t("statActive")}</div>
              <div className="mt-1 text-lg font-semibold text-foreground">
                {activeDeletionRequest ? t("statActiveYes") : t("statActiveNo")}
              </div>
            </div>
          </div>
        </div>

        {feedback && (
          <div className="mt-4 rounded-2xl border border-[var(--color-success)]/30 bg-[var(--color-success)]/10 px-4 py-3 text-sm text-[var(--color-success)]">
            {feedback}
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-2xl border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 px-4 py-3 text-sm text-[var(--color-danger)]">
            {error}
          </div>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-[var(--shadow-card)] sm:p-7">
          <h3 className="text-base font-semibold text-foreground">{t("exportTitle")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("exportDescription")}
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => void handleExport("json")}
              disabled={submitting}
              className="rounded-2xl border border-border bg-background/70 px-4 py-4 text-left transition hover:border-primary hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <div className="text-sm font-semibold text-foreground">{t("exportJsonTitle")}</div>
              <div className="mt-1 text-xs text-muted-foreground">{t("exportJsonDesc")}</div>
            </button>
            <button
              type="button"
              onClick={() => void handleExport("csv")}
              disabled={submitting}
              className="rounded-2xl border border-border bg-background/70 px-4 py-4 text-left transition hover:border-primary hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <div className="text-sm font-semibold text-foreground">{t("exportCsvTitle")}</div>
              <div className="mt-1 text-xs text-muted-foreground">{t("exportCsvDesc")}</div>
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {loading ? (
              <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                {t("exportHistoryLoading")}
              </div>
            ) : exports.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                {t("exportHistoryEmpty")}
              </div>
            ) : (
              exports.slice(0, 4).map((item) => (
                <div key={item.id} className="rounded-2xl border border-border bg-background/70 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-foreground">{item.file_name}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {item.export_format.toUpperCase()} · {formatDateTime(item.requested_at)} · {formatStatus(item.status)}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {t("exportDownloadCount")}: {item.download_count}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const file = await downloadDataExport(item.id);
                          triggerDownload(file.blob, file.fileName);
                          await load();
                        } catch (downloadError) {
                          setError(downloadError instanceof Error ? downloadError.message : t("exportFailed"));
                        }
                      }}
                      className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition hover:border-primary hover:text-primary"
                    >
                      {t("download")}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-[var(--shadow-card)] sm:p-7">
          <h3 className="text-base font-semibold text-foreground">{t("deletionTitle")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("deletionDescription")}
          </p>

          <textarea
            rows={4}
            value={deletionReason}
            onChange={(event) => setDeletionReason(event.target.value)}
            placeholder={t("deletionReasonPlaceholder")}
            className="mt-4 w-full rounded-2xl border border-border bg-background/70 px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary"
          />

          <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 px-4 py-3 text-xs text-[var(--color-warning)]">
            <span>{t("deletionWarning")}</span>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => void handleDeletionRequest()}
              disabled={submitting || !!activeDeletionRequest}
              className="rounded-2xl bg-[var(--color-danger)] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {activeDeletionRequest ? t("deletionActive") : t("deletionSubmit")}
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {loading ? (
              <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                {t("deletionLoading")}
              </div>
            ) : requests.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                {t("deletionEmpty")}
              </div>
            ) : (
              requests.map((item) => (
                <div key={item.id} className="rounded-2xl border border-border bg-background/70 px-4 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground">
                      {item.request_scope === "self" ? t("scope.self") : t("scope.admin")}
                    </span>
                    <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground">
                      {formatStatus(item.status)}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                    <div>{t("requestDate")}: {formatDateTime(item.requested_at)}</div>
                    <div>{t("scheduledPurge")}: {formatDateTime(item.scheduled_purge_at)}</div>
                    {item.admin_notes && <div>{t("adminNotes")}: {item.admin_notes}</div>}
                    {item.error_message && <div>{t("errorMsg")}: {item.error_message}</div>}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
