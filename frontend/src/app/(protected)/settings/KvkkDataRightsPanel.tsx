"use client";

import { useEffect, useMemo, useState } from "react";
import {
  downloadDataExport,
  listDataExportsForAdmin,
  listDeletionRequestsForAdmin,
  listRetentionExecutions,
  listRetentionPolicies,
  requestDataExport,
  runRetentionPoliciesNow,
  saveRetentionPolicy,
  setDeletionRequestStatus,
  type DataDeletionRequestRow,
  type DataExportRow,
  type RetentionExecutionRow,
  type RetentionPolicyRow,
} from "@/lib/supabase/privacy-api";

function formatDateTime(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

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

function formatDeletionStatus(status: DataDeletionRequestRow["status"]) {
  switch (status) {
    case "scheduled":
      return "Planlandi";
    case "processing":
      return "Isleniyor";
    case "completed":
      return "Tamamlandi";
    case "cancelled":
      return "Iptal edildi";
    case "rejected":
      return "Reddedildi";
    default:
      return status;
  }
}

function formatExportStatus(status: DataExportRow["status"]) {
  switch (status) {
    case "completed":
      return "Tamamlandi";
    case "failed":
      return "Basarisiz";
    case "expired":
      return "Suresi doldu";
    default:
      return status;
  }
}

export function KvkkDataRightsPanel() {
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [requests, setRequests] = useState<DataDeletionRequestRow[]>([]);
  const [exports, setExports] = useState<DataExportRow[]>([]);
  const [policies, setPolicies] = useState<RetentionPolicyRow[]>([]);
  const [executions, setExecutions] = useState<RetentionExecutionRow[]>([]);
  const [manualExportTarget, setManualExportTarget] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stats = useMemo(
    () => ({
      scheduled: requests.filter((item) => item.status === "scheduled").length,
      completed: requests.filter((item) => item.status === "completed").length,
      exportCount: exports.length,
      policyCount: policies.length,
    }),
    [exports.length, policies.length, requests],
  );

  async function load() {
    setLoading(true);
    setError(null);

    const [requestRows, exportRows, policyRows, executionRows] = await Promise.all([
      listDeletionRequestsForAdmin(),
      listDataExportsForAdmin(),
      listRetentionPolicies(),
      listRetentionExecutions(8),
    ]);

    setRequests(requestRows);
    setExports(exportRows);
    setPolicies(policyRows);
    setExecutions(executionRows);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleStatusChange(
    requestId: string,
    status: "scheduled" | "cancelled" | "rejected",
  ) {
    const adminNotes =
      window.prompt(
        status === "scheduled" ? "Istege bagli yonetici notu" : "Bu karar icin yonetici notu",
        "",
      ) ?? "";

    setWorking(true);
    setFeedback(null);
    setError(null);

    const updated = await setDeletionRequestStatus(requestId, status, adminNotes);
    if (!updated) {
      setError("Silme talebi guncellenemedi.");
      setWorking(false);
      return;
    }

    setFeedback("Silme talebi guncellendi.");
    await load();
    setWorking(false);
  }

  async function handleExport(targetUserId: string, format: "json" | "csv") {
    setWorking(true);
    setFeedback(null);
    setError(null);

    try {
      const created = await requestDataExport(format, targetUserId);
      const file = await downloadDataExport(created.exportId);
      triggerDownload(file.blob, file.fileName);
      setFeedback(`${format.toUpperCase()} export olusturuldu ve indirildi.`);
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Export olusturulamadi.");
    } finally {
      setWorking(false);
    }
  }

  async function handleRetentionSave(policy: RetentionPolicyRow) {
    setWorking(true);
    setFeedback(null);
    setError(null);

    const saved = await saveRetentionPolicy({
      id: policy.id,
      entity_type: policy.entity_type,
      retention_days: policy.retention_days,
      action: policy.action,
      description: policy.description,
      is_active: policy.is_active,
    });

    if (!saved) {
      setError("Saklama politikasi kaydedilemedi.");
      setWorking(false);
      return;
    }

    setFeedback("Saklama politikasi guncellendi.");
    await load();
    setWorking(false);
  }

  async function handleRunRetention() {
    setWorking(true);
    setFeedback(null);
    setError(null);

    try {
      const result = await runRetentionPoliciesNow();
      setFeedback(`Gunluk saklama kosusu tamamlandi. ${result.results.length} politika isledi.`);
      await load();
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Saklama kosusu basarisiz oldu.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h4 className="text-sm font-semibold text-foreground">Veri Haklari ve Saklama Politikasi</h4>
          <p className="mt-1 text-xs text-muted-foreground">
            Silme taleplerini izleyin, admin exportlarini tetikleyin ve saklama politikalarini canli olarak yonetin.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
          <div className="rounded-xl border border-border bg-background px-3 py-2 text-muted-foreground">
            <div>Planli talep</div>
            <div className="mt-1 text-lg font-semibold text-foreground">{stats.scheduled}</div>
          </div>
          <div className="rounded-xl border border-border bg-background px-3 py-2 text-muted-foreground">
            <div>Tamamlanan</div>
            <div className="mt-1 text-lg font-semibold text-foreground">{stats.completed}</div>
          </div>
          <div className="rounded-xl border border-border bg-background px-3 py-2 text-muted-foreground">
            <div>Export</div>
            <div className="mt-1 text-lg font-semibold text-foreground">{stats.exportCount}</div>
          </div>
          <div className="rounded-xl border border-border bg-background px-3 py-2 text-muted-foreground">
            <div>Politika</div>
            <div className="mt-1 text-lg font-semibold text-foreground">{stats.policyCount}</div>
          </div>
        </div>
      </div>

      {feedback && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
          {feedback}
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
          {error}
        </div>
      )}

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-background/70 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-sm font-semibold text-foreground">Hizli Admin Export</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Hedef auth user ID ile veri paketi olusturun.
                </div>
              </div>
              <button
                type="button"
                onClick={() => void handleRunRetention()}
                disabled={working}
                className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
              >
                Saklama kosusunu calistir
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input
                value={manualExportTarget}
                onChange={(event) => setManualExportTarget(event.target.value)}
                placeholder="Hedef auth user id"
                className="flex-1 rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={working || !manualExportTarget.trim()}
                  onClick={() => void handleExport(manualExportTarget.trim(), "json")}
                  className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-foreground transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  JSON export
                </button>
                <button
                  type="button"
                  disabled={working || !manualExportTarget.trim()}
                  onClick={() => void handleExport(manualExportTarget.trim(), "csv")}
                  className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-foreground transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  CSV export
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-background/70 p-4">
            <div className="text-sm font-semibold text-foreground">Silme Talepleri</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Planlanmis ve tamamlanmis KVKK madde 11 taleplerini buradan izleyin.
            </div>

            <div className="mt-4 space-y-3">
              {loading ? (
                <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                  Talepler yukleniyor...
                </div>
              ) : requests.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                  Silme talebi kaydi bulunmadi.
                </div>
              ) : (
                requests.map((item) => (
                  <article key={item.id} className="rounded-2xl border border-border bg-card p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">
                            {item.target_full_name || item.target_email || item.target_user_id}
                          </span>
                          <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground">
                            {formatDeletionStatus(item.status)}
                          </span>
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">
                          {item.target_email || "E-posta yok"} · Talep: {formatDateTime(item.requested_at)}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Kalici silme: {formatDateTime(item.scheduled_purge_at)}
                        </div>
                        {item.reason && <p className="mt-3 text-sm text-muted-foreground">{item.reason}</p>}
                        {item.admin_notes && (
                          <p className="mt-2 rounded-xl border border-border bg-background/70 px-3 py-2 text-xs text-muted-foreground">
                            Not: {item.admin_notes}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 lg:justify-end">
                        <button
                          type="button"
                          onClick={() => void handleExport(item.target_user_id, "json")}
                          disabled={working}
                          className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-foreground transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          JSON export
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleExport(item.target_user_id, "csv")}
                          disabled={working}
                          className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-foreground transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          CSV export
                        </button>
                        {item.status === "scheduled" && (
                          <>
                            <button
                              type="button"
                              onClick={() => void handleStatusChange(item.id, "cancelled")}
                              disabled={working}
                              className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300"
                            >
                              Iptal et
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleStatusChange(item.id, "rejected")}
                              disabled={working}
                              className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300"
                            >
                              Reddet
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-background/70 p-4">
            <div className="text-sm font-semibold text-foreground">Son Veri Exportlari</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Admin veya kullanici tarafindan tetiklenen son export kayitlari.
            </div>

            <div className="mt-4 space-y-3">
              {loading ? (
                <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                  Export kayitlari yukleniyor...
                </div>
              ) : exports.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                  Export gecmisi yok.
                </div>
              ) : (
                exports.slice(0, 8).map((item) => (
                  <div key={item.id} className="rounded-2xl border border-border bg-card px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-foreground">{item.file_name}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {item.target_full_name || item.target_email || item.target_user_id} · {item.export_format.toUpperCase()} · {formatExportStatus(item.status)}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Indirme sayisi: {item.download_count}
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
                            setError(downloadError instanceof Error ? downloadError.message : "Export indirilemedi.");
                          }
                        }}
                        className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-foreground transition hover:border-primary hover:text-primary"
                      >
                        Indir
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-background/70 p-4">
            <div className="text-sm font-semibold text-foreground">Saklama Politikalari</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Gunluk silme veya anonimlestirme surelerini burada yonetin.
            </div>

            <div className="mt-4 space-y-3">
              {loading ? (
                <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                  Politikalar yukleniyor...
                </div>
              ) : (
                policies.map((policy) => (
                  <div key={policy.id} className="rounded-2xl border border-border bg-card p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-semibold text-foreground">{policy.entity_type}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {policy.description || "Aciklama yok."}
                        </div>
                      </div>
                      <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={policy.is_active}
                          onChange={(event) =>
                            setPolicies((current) =>
                              current.map((item) =>
                                item.id === policy.id ? { ...item, is_active: event.target.checked } : item,
                              ),
                            )
                          }
                        />
                        Aktif
                      </label>
                    </div>

                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <input
                        type="number"
                        min={0}
                        value={policy.retention_days}
                        onChange={(event) =>
                          setPolicies((current) =>
                            current.map((item) =>
                              item.id === policy.id
                                ? { ...item, retention_days: Number(event.target.value) || 0 }
                                : item,
                            ),
                          )
                        }
                        className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary"
                      />
                      <select
                        value={policy.action}
                        onChange={(event) =>
                          setPolicies((current) =>
                            current.map((item) =>
                              item.id === policy.id
                                ? { ...item, action: event.target.value as "delete" | "anonymize" }
                                : item,
                            ),
                          )
                        }
                        className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary"
                      >
                        <option value="delete">Delete</option>
                        <option value="anonymize">Anonymize</option>
                      </select>
                    </div>

                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={() => void handleRetentionSave(policy)}
                        disabled={working}
                        className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-foreground transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Kaydet
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-background/70 p-4">
            <div className="text-sm font-semibold text-foreground">Saklama Gecmisi</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Son cron veya manuel saklama calistirmalari.
            </div>

            <div className="mt-4 space-y-3">
              {loading ? (
                <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                  Saklama gecmisi yukleniyor...
                </div>
              ) : executions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                  Henuz saklama execution kaydi bulunmuyor.
                </div>
              ) : (
                executions.map((execution) => (
                  <div key={execution.id} className="rounded-2xl border border-border bg-card px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{execution.entity_type}</span>
                      <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground">
                        {execution.action}
                      </span>
                      <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground">
                        {execution.status}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {formatDateTime(execution.executed_at)} · {execution.affected_count} kayit
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
