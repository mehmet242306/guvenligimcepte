"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime, getSeverityTone } from "./admin-monitoring-utils";

type AdminNotificationRow = {
  id: string;
  category: string;
  level: "info" | "warning" | "critical";
  title: string;
  message: string;
  link: string | null;
  metadata: Record<string, unknown> | null;
  is_resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
};

export function AdminNotificationsTab() {
  const [rows, setRows] = useState<AdminNotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  async function load() {
    const supabase = createClient();
    if (!supabase) {
      setError("Supabase baglantisi kurulamadi.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: queryError } = await supabase
      .from("admin_notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(150);

    if (queryError) {
      setRows([]);
      setError(queryError.message);
    } else {
      setRows((data ?? []) as AdminNotificationRow[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    const supabase = createClient();
    // Initial notification fetch intentionally runs once before realtime subscription.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();

    if (!supabase) return;

    const channel = supabase
      .channel("admin-notifications-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "admin_notifications",
        },
        () => {
          void load();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const stats = useMemo(() => {
    const open = rows.filter((row) => !row.is_resolved).length;
    const critical = rows.filter((row) => !row.is_resolved && row.level === "critical").length;
    const warning = rows.filter((row) => !row.is_resolved && row.level === "warning").length;
    return { open, critical, warning };
  }, [rows]);

  async function resolveNotification(rowId: string) {
    const supabase = createClient();
    if (!supabase) {
      setError("Supabase baglantisi kurulamadi.");
      return;
    }

    setResolvingId(rowId);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error: updateError } = await supabase
      .from("admin_notifications")
      .update({
        is_resolved: true,
        resolved_at: new Date().toISOString(),
        resolved_by: user?.id ?? null,
      })
      .eq("id", rowId);

    if (updateError) {
      setError(updateError.message);
    } else {
      await load();
    }

    setResolvingId(null);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="text-base font-semibold text-foreground">Bildirim Merkezi</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Kritik sistem olaylari, AI maliyet uyarilari, guvenlik bildirimleri ve operasyonel alarmlari buradan yonetin.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center justify-center rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition hover:border-primary hover:text-primary"
          >
            Yenile
          </button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-border bg-background px-4 py-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Acik bildirim</div>
            <div className="mt-2 text-2xl font-semibold text-foreground">{stats.open}</div>
          </div>
          <div className="rounded-2xl border border-border bg-background px-4 py-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Kritik</div>
            <div className="mt-2 text-2xl font-semibold text-foreground">{stats.critical}</div>
          </div>
          <div className="rounded-2xl border border-border bg-background px-4 py-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Uyari</div>
            <div className="mt-2 text-2xl font-semibold text-foreground">{stats.warning}</div>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
            {error}
          </div>
        )}

        <div className="mt-5 space-y-3">
          {loading ? (
            <div className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
              Bildirimler yukleniyor...
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
              Kayitli admin bildirimi bulunmuyor.
            </div>
          ) : (
            rows.map((row) => (
              <article key={row.id} className="rounded-2xl border border-border bg-background/80 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${getSeverityTone(row.level)}`}>
                        {row.level}
                      </span>
                      <span className="rounded-full bg-secondary px-2.5 py-1 text-xs text-secondary-foreground">
                        {row.category}
                      </span>
                      {row.is_resolved && (
                        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                          Cozuldu
                        </span>
                      )}
                    </div>

                    <div className="mt-3 text-sm font-semibold text-foreground">{row.title}</div>
                    <p className="mt-2 text-sm text-muted-foreground">{row.message}</p>
                    <div className="mt-3 text-xs text-muted-foreground">
                      {formatDateTime(row.created_at)}
                      {row.resolved_at ? ` | Cozulme: ${formatDateTime(row.resolved_at)}` : ""}
                    </div>

                    {row.metadata && Object.keys(row.metadata).length > 0 && (
                      <details className="mt-3 rounded-xl border border-border/70 bg-card p-3">
                        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Meta veri
                        </summary>
                        <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap break-words text-xs text-muted-foreground">
                          {JSON.stringify(row.metadata, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 lg:w-[220px]">
                    {row.link && (
                      <a
                        href={row.link}
                        className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition hover:border-primary hover:text-primary"
                      >
                        Detaya git
                      </a>
                    )}
                    {!row.is_resolved && (
                      <button
                        type="button"
                        onClick={() => void resolveNotification(row.id)}
                        disabled={resolvingId === row.id}
                        className="rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {resolvingId === row.id ? "Kaydediliyor..." : "Cozuldu isaretle"}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
