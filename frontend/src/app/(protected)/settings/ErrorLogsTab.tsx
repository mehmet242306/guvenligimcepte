"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { formatDateTime, getSeverityTone } from "./admin-monitoring-utils";

type ErrorLogRow = {
  id: string;
  level: "info" | "warn" | "error" | "critical";
  source: string;
  endpoint: string | null;
  message: string;
  stack_trace: string | null;
  context: Record<string, unknown> | null;
  user_id: string | null;
  request_id: string | null;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
};

export function ErrorLogsTab() {
  const [rows, setRows] = useState<ErrorLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("all");
  const [resolution, setResolution] = useState("open");
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

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
      .from("error_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(250);

    if (queryError) {
      setRows([]);
      setError(queryError.message);
    } else {
      setRows((data ?? []) as ErrorLogRow[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    // Initial log fetch intentionally runs once on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (level !== "all" && row.level !== level) return false;
      if (resolution === "open" && row.resolved_at) return false;
      if (resolution === "resolved" && !row.resolved_at) return false;
      if (!deferredQuery) return true;

      return [row.source, row.endpoint ?? "", row.message, row.request_id ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(deferredQuery);
    });
  }, [deferredQuery, level, resolution, rows]);

  const grouped = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of rows) {
      const key = `${row.source}::${row.message}`;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [rows]);

  const topEndpoints = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of rows) {
      const key = row.endpoint ?? "endpoint_yok";
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [rows]);

  async function resolveRow(rowId: string) {
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
      .from("error_logs")
      .update({
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
            <h3 className="text-base font-semibold text-foreground">Hata ve Olay Loglari</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Uygulamada yakalanan hatalari, stack trace detaylarini ve tekrar eden sorun gruplarini izleyin.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
            <div className="rounded-xl border border-border bg-background px-3 py-2">
              <div className="text-muted-foreground">Toplam</div>
              <div className="mt-1 text-lg font-semibold text-foreground">{rows.length}</div>
            </div>
            <div className="rounded-xl border border-border bg-background px-3 py-2">
              <div className="text-muted-foreground">Acil</div>
              <div className="mt-1 text-lg font-semibold text-foreground">
                {rows.filter((row) => row.level === "critical").length}
              </div>
            </div>
            <div className="rounded-xl border border-border bg-background px-3 py-2">
              <div className="text-muted-foreground">Acik</div>
              <div className="mt-1 text-lg font-semibold text-foreground">
                {rows.filter((row) => !row.resolved_at).length}
              </div>
            </div>
            <div className="rounded-xl border border-border bg-background px-3 py-2">
              <div className="text-muted-foreground">Kaynak</div>
              <div className="mt-1 text-lg font-semibold text-foreground">{new Set(rows.map((row) => row.source)).size}</div>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1.2fr)_180px_180px]">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Mesaj, kaynak veya endpoint ara"
            className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none transition focus:border-primary"
          />
          <select
            value={level}
            onChange={(event) => setLevel(event.target.value)}
            className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none transition focus:border-primary"
          >
            <option value="all">Tum seviyeler</option>
            <option value="info">Info</option>
            <option value="warn">Warn</option>
            <option value="error">Error</option>
            <option value="critical">Critical</option>
          </select>
          <select
            value={resolution}
            onChange={(event) => setResolution(event.target.value)}
            className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none transition focus:border-primary"
          >
            <option value="open">Acik sorunlar</option>
            <option value="resolved">Cozulenler</option>
            <option value="all">Tumu</option>
          </select>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
            {error}
          </div>
        )}

        <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,2fr)_360px]">
          <div className="space-y-3">
            {loading ? (
              <div className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
                Hata kayitlari yukleniyor...
              </div>
            ) : filteredRows.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
                Secilen filtrelerle eslesen hata kaydi bulunmadi.
              </div>
            ) : (
              filteredRows.map((row) => {
                const groupCount = grouped.get(`${row.source}::${row.message}`) ?? 1;
                return (
                  <article key={row.id} className="rounded-2xl border border-border bg-background/80 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={cn("rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide", getSeverityTone(row.level))}>
                            {row.level}
                          </span>
                          <span className="rounded-full bg-secondary px-2.5 py-1 text-xs text-secondary-foreground">
                            {row.source}
                          </span>
                          {row.endpoint && (
                            <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                              {row.endpoint}
                            </span>
                          )}
                          {groupCount > 1 && (
                            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                              {groupCount} tekrar
                            </span>
                          )}
                        </div>
                        <div className="mt-3 text-sm font-semibold text-foreground">{row.message}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {formatDateTime(row.created_at)} - request {row.request_id || "yok"}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-1 text-xs font-medium",
                            row.resolved_at
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
                          )}
                        >
                          {row.resolved_at ? "Cozuldu" : "Acik"}
                        </span>
                        {!row.resolved_at && (
                          <button
                            type="button"
                            onClick={() => void resolveRow(row.id)}
                            disabled={resolvingId === row.id}
                            className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {resolvingId === row.id ? "Kaydediliyor..." : "Cozuldu isaretle"}
                          </button>
                        )}
                      </div>
                    </div>

                    <details className="mt-4 rounded-xl border border-border/70 bg-card p-3">
                      <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Stack trace ve context
                      </summary>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <pre className="max-h-56 overflow-auto rounded-xl border border-border/70 bg-background p-3 text-xs text-muted-foreground">
                          {row.stack_trace || "Stack trace yok"}
                        </pre>
                        <pre className="max-h-56 overflow-auto rounded-xl border border-border/70 bg-background p-3 text-xs text-muted-foreground">
                          {JSON.stringify(row.context ?? {}, null, 2)}
                        </pre>
                      </div>
                    </details>
                  </article>
                );
              })
            )}
          </div>

          <aside className="space-y-3">
            <div className="rounded-2xl border border-border bg-background p-4">
              <h4 className="text-sm font-semibold text-foreground">En cok hata veren endpoint</h4>
              <div className="mt-3 space-y-2">
                {topEndpoints.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Kayit yok.</div>
                ) : (
                  topEndpoints.map(([endpoint, count]) => (
                    <div key={endpoint} className="flex items-center justify-between gap-3 text-sm">
                      <span className="truncate text-muted-foreground">{endpoint}</span>
                      <span className="font-semibold text-foreground">{count}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
