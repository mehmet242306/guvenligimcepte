"use client";

import { useEffect, useMemo, useState } from "react";
import {
  downloadDataExport,
  listOwnDataExports,
  listOwnDeletionRequests,
  requestDataExport,
  requestSelfDeletion,
  type DataDeletionRequestRow,
  type DataExportRow,
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

function formatStatus(status: DataDeletionRequestRow["status"] | DataExportRow["status"]) {
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
    case "failed":
      return "Basarisiz";
    case "expired":
      return "Suresi doldu";
    default:
      return status;
  }
}

export function ProfileDataRightsPanel() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletionReason, setDeletionReason] = useState("");
  const [exports, setExports] = useState<DataExportRow[]>([]);
  const [requests, setRequests] = useState<DataDeletionRequestRow[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      setFeedback(`${format.toUpperCase()} export hazirlandi ve indirildi.`);
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Export olusturulamadi.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeletionRequest() {
    if (activeDeletionRequest) {
      setError("Aktif bir silme talebiniz zaten bulunuyor.");
      return;
    }

    if (
      !window.confirm(
        "Bu islem hesabiniz icin 30 gunluk silme surecini baslatir. Devam etmek istiyor musunuz?",
      )
    ) {
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    setError(null);

    try {
      const result = await requestSelfDeletion(deletionReason);
      setFeedback(
        `Silme talebiniz alindi. Planlanan kalici silme tarihi: ${formatDateTime(result.request.scheduled_purge_at)}.`,
      );
      setDeletionReason("");
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Silme talebi olusturulamadi.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[1.75rem] border border-border bg-card p-6 shadow-[var(--shadow-card)] sm:p-7">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Veri Haklari</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Kisisel verilerinizi indirebilir, silme talebi olusturabilir ve mevcut KVKK sureclerinizin durumunu takip edebilirsiniz.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-background/70 px-4 py-3">
              <div className="text-muted-foreground">Export</div>
              <div className="mt-1 text-lg font-semibold text-foreground">{exports.length}</div>
            </div>
            <div className="rounded-2xl border border-border bg-background/70 px-4 py-3">
              <div className="text-muted-foreground">Silme Talebi</div>
              <div className="mt-1 text-lg font-semibold text-foreground">{requests.length}</div>
            </div>
            <div className="rounded-2xl border border-border bg-background/70 px-4 py-3">
              <div className="text-muted-foreground">Aktif Surec</div>
              <div className="mt-1 text-lg font-semibold text-foreground">
                {activeDeletionRequest ? "Var" : "Yok"}
              </div>
            </div>
          </div>
        </div>

        {feedback && (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
            {feedback}
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
            {error}
          </div>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-[var(--shadow-card)] sm:p-7">
          <h3 className="text-base font-semibold text-foreground">Verilerimi Indir</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Profil, onay kayitlari, guvenlik olaylari ve veri hakki gecmisiniz JSON veya CSV olarak indirilebilir.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => void handleExport("json")}
              disabled={submitting}
              className="rounded-2xl border border-border bg-background/70 px-4 py-4 text-left transition hover:border-primary hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <div className="text-sm font-semibold text-foreground">JSON export</div>
              <div className="mt-1 text-xs text-muted-foreground">Tum verilerinizin yapilandirilmis paketi</div>
            </button>
            <button
              type="button"
              onClick={() => void handleExport("csv")}
              disabled={submitting}
              className="rounded-2xl border border-border bg-background/70 px-4 py-4 text-left transition hover:border-primary hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <div className="text-sm font-semibold text-foreground">CSV export</div>
              <div className="mt-1 text-xs text-muted-foreground">Tablosal raporlama ve dis sistem aktarimi</div>
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {loading ? (
              <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                Export gecmisi yukleniyor...
              </div>
            ) : exports.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                Henuz olusturulmus bir veri export kaydi yok.
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
                      className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition hover:border-primary hover:text-primary"
                    >
                      Indir
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-[var(--shadow-card)] sm:p-7">
          <h3 className="text-base font-semibold text-foreground">Verilerimi Sil</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Talep olusturdugunuzda hesabiniz ve iliskili kisisel verileriniz silme surecine alinir. Kalici silme, saklama politikasina gore 30 gun sonra tamamlanir.
          </p>

          <textarea
            rows={4}
            value={deletionReason}
            onChange={(event) => setDeletionReason(event.target.value)}
            placeholder="Istege bagli aciklama veya talep nedeni"
            className="mt-4 w-full rounded-2xl border border-border bg-background/70 px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary"
          />

          <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
            <span>Silme talebi olustuktan sonra surec geri donulemez hale gelmeden once idari olarak iptal edilebilir.</span>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => void handleDeletionRequest()}
              disabled={submitting || !!activeDeletionRequest}
              className="rounded-2xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {activeDeletionRequest ? "Aktif silme talebi var" : "Silme talebi olustur"}
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {loading ? (
              <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                Silme talepleri yukleniyor...
              </div>
            ) : requests.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                Henuz bir silme talebi bulunmuyor.
              </div>
            ) : (
              requests.map((item) => (
                <div key={item.id} className="rounded-2xl border border-border bg-background/70 px-4 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground">
                      {item.request_scope === "self" ? "Kisisel talep" : "Admin"}
                    </span>
                    <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground">
                      {formatStatus(item.status)}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                    <div>Talep tarihi: {formatDateTime(item.requested_at)}</div>
                    <div>Planlanan kalici silme: {formatDateTime(item.scheduled_purge_at)}</div>
                    {item.admin_notes && <div>Yonetici notu: {item.admin_notes}</div>}
                    {item.error_message && <div>Hata: {item.error_message}</div>}
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
