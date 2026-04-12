"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatBytes, formatCompactNumber } from "./admin-monitoring-utils";

type RuntimeStatsRow = {
  database_size_bytes: number;
  total_connections: number;
  active_connections: number;
  waiting_connections: number;
  slow_query_count: number;
};

type TableStatsRow = {
  table_name: string;
  row_estimate: number;
  total_size_bytes: number;
};

type SlowQueryRow = {
  query_id: string;
  call_count: number;
  mean_exec_time_ms: number;
  total_exec_time_ms: number;
  query_text: string;
};

export function DatabaseHealthTab() {
  const [runtime, setRuntime] = useState<RuntimeStatsRow | null>(null);
  const [tables, setTables] = useState<TableStatsRow[]>([]);
  const [slowQueries, setSlowQueries] = useState<SlowQueryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const supabase = createClient();
    if (!supabase) {
      setError("Supabase baglantisi kurulamadi.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const [runtimeResult, tableResult, queryResult] = await Promise.all([
      supabase.rpc("list_database_runtime_stats"),
      supabase.rpc("list_database_table_stats"),
      supabase.rpc("list_database_slow_queries"),
    ]);

    const firstError = runtimeResult.error || tableResult.error || queryResult.error;
    if (firstError) {
      setError(firstError.message);
    }

    setRuntime(((runtimeResult.data ?? []) as RuntimeStatsRow[])[0] ?? null);
    setTables((tableResult.data ?? []) as TableStatsRow[]);
    setSlowQueries((queryResult.data ?? []) as SlowQueryRow[]);
    setLoading(false);
  }

  useEffect(() => {
    // Initial database health fetch intentionally runs once on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="text-base font-semibold text-foreground">Veritabani Sagligi</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Tablo boyutlari, baglanti havuzu, yavas sorgular ve genel kullanim baskisini bu ekranda izleyin.
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

        {error && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
            {error}
          </div>
        )}

        <div className="mt-5 grid gap-3 lg:grid-cols-5">
          <div className="rounded-2xl border border-border bg-background px-4 py-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">DB boyutu</div>
            <div className="mt-2 text-2xl font-semibold text-foreground">
              {loading ? "..." : formatBytes(runtime?.database_size_bytes)}
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-background px-4 py-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Toplam baglanti</div>
            <div className="mt-2 text-2xl font-semibold text-foreground">
              {loading ? "..." : formatCompactNumber(runtime?.total_connections)}
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-background px-4 py-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Aktif baglanti</div>
            <div className="mt-2 text-2xl font-semibold text-foreground">
              {loading ? "..." : formatCompactNumber(runtime?.active_connections)}
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-background px-4 py-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Bekleyen baglanti</div>
            <div className="mt-2 text-2xl font-semibold text-foreground">
              {loading ? "..." : formatCompactNumber(runtime?.waiting_connections)}
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-background px-4 py-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Yavas sorgu</div>
            <div className="mt-2 text-2xl font-semibold text-foreground">
              {loading ? "..." : formatCompactNumber(runtime?.slow_query_count)}
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <section className="rounded-2xl border border-border bg-background p-4">
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-sm font-semibold text-foreground">Tablo boyutlari</h4>
              <div className="text-xs text-muted-foreground">En buyuk kayitli tablolar</div>
            </div>
            <div className="mt-3 space-y-2">
              {loading ? (
                <div className="text-sm text-muted-foreground">Yukleniyor...</div>
              ) : tables.length === 0 ? (
                <div className="text-sm text-muted-foreground">Veri yok.</div>
              ) : (
                tables.map((row) => (
                  <div key={row.table_name} className="flex items-center justify-between gap-3 rounded-xl border border-border/70 px-3 py-3 text-sm">
                    <div>
                      <div className="font-medium text-foreground">{row.table_name}</div>
                      <div className="text-xs text-muted-foreground">{formatCompactNumber(row.row_estimate)} satir</div>
                    </div>
                    <div className="text-right font-semibold text-foreground">{formatBytes(row.total_size_bytes)}</div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-background p-4">
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-sm font-semibold text-foreground">Yavas sorgular</h4>
              <div className="text-xs text-muted-foreground">pg_stat_statements</div>
            </div>
            <div className="mt-3 space-y-3">
              {loading ? (
                <div className="text-sm text-muted-foreground">Yukleniyor...</div>
              ) : slowQueries.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border px-3 py-6 text-sm text-muted-foreground">
                  Bu ortamda pg_stat_statements verisi yok veya yavas sorgu kaydi bulunmadi.
                </div>
              ) : (
                slowQueries.map((row) => (
                  <article key={row.query_id} className="rounded-xl border border-border/70 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs text-muted-foreground">{formatCompactNumber(row.call_count)} cagri</div>
                      <div className="text-xs font-semibold text-foreground">{row.mean_exec_time_ms} ms ort.</div>
                    </div>
                    <pre className="mt-2 overflow-auto whitespace-pre-wrap break-words text-xs text-muted-foreground">
                      {row.query_text}
                    </pre>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
