"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCompactNumber, formatCurrencyUsd } from "./admin-monitoring-utils";

type AiUsageRow = {
  id: string;
  user_id: string | null;
  organization_id: string | null;
  model: string;
  endpoint: string;
  prompt_tokens: number;
  completion_tokens: number;
  cached_tokens: number;
  cost_usd: number;
  success: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type UserProfileMini = {
  auth_user_id: string;
  full_name: string | null;
  email: string | null;
};

const periodOptions = [
  { value: "1", label: "Son 24 saat" },
  { value: "7", label: "Son 7 gun" },
  { value: "30", label: "Son 30 gun" },
];

export function AIUsageTab() {
  const [rows, setRows] = useState<AiUsageRow[]>([]);
  const [userMap, setUserMap] = useState<Map<string, UserProfileMini>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodDays, setPeriodDays] = useState("7");

  const load = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) {
      setError("Supabase baglantisi kurulamadi.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const since = new Date(Date.now() - Number(periodDays) * 24 * 60 * 60 * 1000).toISOString();

    const [{ data: usageRows, error: usageError }, { data: profiles, error: profileError }] = await Promise.all([
      supabase.from("ai_usage_logs").select("*").gte("created_at", since).order("created_at", { ascending: false }).limit(500),
      supabase.from("user_profiles").select("auth_user_id, full_name, email"),
    ]);

    if (usageError || profileError) {
      setRows([]);
      setError(usageError?.message ?? profileError?.message ?? "AI kullanim verileri alinamadi.");
    } else {
      setRows((usageRows ?? []) as AiUsageRow[]);
      setUserMap(
        new Map(
          ((profiles ?? []) as UserProfileMini[]).map((row) => [
            row.auth_user_id,
            row,
          ]),
        ),
      );
    }

    setLoading(false);
  }, [periodDays]);

  useEffect(() => {
    // Period changes intentionally trigger a fresh client-side load.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const stats = useMemo(() => {
    const totalCalls = rows.length;
    const successCalls = rows.filter((row) => row.success).length;
    const totalCost = rows.reduce((sum, row) => sum + Number(row.cost_usd ?? 0), 0);
    const totalPrompt = rows.reduce((sum, row) => sum + (row.prompt_tokens ?? 0), 0);
    const totalCompletion = rows.reduce((sum, row) => sum + (row.completion_tokens ?? 0), 0);
    const totalCached = rows.reduce((sum, row) => sum + (row.cached_tokens ?? 0), 0);

    const modelBreakdown = Array.from(
      rows.reduce((map, row) => {
        const current = map.get(row.model) ?? { calls: 0, cost: 0, prompt: 0, completion: 0 };
        current.calls += 1;
        current.cost += Number(row.cost_usd ?? 0);
        current.prompt += row.prompt_tokens ?? 0;
        current.completion += row.completion_tokens ?? 0;
        map.set(row.model, current);
        return map;
      }, new Map<string, { calls: number; cost: number; prompt: number; completion: number }>()),
    )
      .map(([model, value]) => ({ model, ...value }))
      .sort((a, b) => b.calls - a.calls);

    const endpointBreakdown = Array.from(
      rows.reduce((map, row) => {
        const current = map.get(row.endpoint) ?? 0;
        map.set(row.endpoint, current + 1);
        return map;
      }, new Map<string, number>()),
    )
      .map(([endpoint, calls]) => ({ endpoint, calls }))
      .sort((a, b) => b.calls - a.calls)
      .slice(0, 5);

    const userBreakdown = Array.from(
      rows.reduce((map, row) => {
        const key = row.user_id ?? "anon";
        const current = map.get(key) ?? { calls: 0, cost: 0 };
        current.calls += 1;
        current.cost += Number(row.cost_usd ?? 0);
        map.set(key, current);
        return map;
      }, new Map<string, { calls: number; cost: number }>()),
    )
      .map(([userId, value]) => ({ userId, ...value }))
      .sort((a, b) => b.calls - a.calls)
      .slice(0, 8);

    const haikuCalls = rows.filter((row) => row.model.toLowerCase().includes("haiku")).length;
    const sonnetCalls = rows.filter((row) => row.model.toLowerCase().includes("sonnet")).length;

    return {
      totalCalls,
      successRate: totalCalls === 0 ? 100 : Math.round((successCalls / totalCalls) * 100),
      totalCost,
      cacheHitRatio: totalPrompt === 0 ? 0 : Math.round((totalCached / totalPrompt) * 100),
      totalPrompt,
      totalCompletion,
      modelBreakdown,
      endpointBreakdown,
      userBreakdown,
      cascadeRatio: totalCalls === 0 ? 0 : Math.round((haikuCalls / Math.max(haikuCalls + sonnetCalls, 1)) * 100),
    };
  }, [rows]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="text-base font-semibold text-foreground">AI Kullanim ve Maliyet</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Model dagilimi, cache verimliligi, endpoint kullanimi ve tahmini maliyet akisini izleyin.
            </p>
          </div>
          <select
            value={periodDays}
            onChange={(event) => setPeriodDays(event.target.value)}
            className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none transition focus:border-primary"
          >
            {periodOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
            {error}
          </div>
        )}

        <div className="mt-5 grid gap-3 xl:grid-cols-5">
          <div className="rounded-2xl border border-border bg-background px-4 py-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Toplam cagri</div>
            <div className="mt-2 text-2xl font-semibold text-foreground">{formatCompactNumber(stats.totalCalls)}</div>
          </div>
          <div className="rounded-2xl border border-border bg-background px-4 py-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Tahmini maliyet</div>
            <div className="mt-2 text-2xl font-semibold text-foreground">{formatCurrencyUsd(stats.totalCost)}</div>
          </div>
          <div className="rounded-2xl border border-border bg-background px-4 py-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Basari orani</div>
            <div className="mt-2 text-2xl font-semibold text-foreground">%{stats.successRate}</div>
          </div>
          <div className="rounded-2xl border border-border bg-background px-4 py-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Cache hit</div>
            <div className="mt-2 text-2xl font-semibold text-foreground">%{stats.cacheHitRatio}</div>
          </div>
          <div className="rounded-2xl border border-border bg-background px-4 py-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Haiku kapanis</div>
            <div className="mt-2 text-2xl font-semibold text-foreground">%{stats.cascadeRatio}</div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,0.9fr)]">
          <section className="rounded-2xl border border-border bg-background p-4">
            <h4 className="text-sm font-semibold text-foreground">Model dagilimi</h4>
            <div className="mt-3 space-y-3">
              {loading ? (
                <div className="text-sm text-muted-foreground">Yukleniyor...</div>
              ) : stats.modelBreakdown.length === 0 ? (
                <div className="text-sm text-muted-foreground">Veri yok.</div>
              ) : (
                stats.modelBreakdown.map((item) => (
                  <div key={item.model} className="rounded-xl border border-border/70 px-3 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-medium text-foreground">{item.model}</div>
                      <div className="text-xs text-muted-foreground">{item.calls} cagri</div>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {formatCurrencyUsd(item.cost)} - {formatCompactNumber(item.prompt + item.completion)} token
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-background p-4">
            <h4 className="text-sm font-semibold text-foreground">En aktif endpoint</h4>
            <div className="mt-3 space-y-2">
              {stats.endpointBreakdown.length === 0 ? (
                <div className="text-sm text-muted-foreground">Veri yok.</div>
              ) : (
                stats.endpointBreakdown.map((item) => (
                  <div key={item.endpoint} className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate text-muted-foreground">{item.endpoint}</span>
                    <span className="font-semibold text-foreground">{item.calls}</span>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-background p-4">
            <h4 className="text-sm font-semibold text-foreground">Kullanici bazli kullanim</h4>
            <div className="mt-3 space-y-3">
              {stats.userBreakdown.length === 0 ? (
                <div className="text-sm text-muted-foreground">Veri yok.</div>
              ) : (
                stats.userBreakdown.map((item) => {
                  const profile = item.userId ? userMap.get(item.userId) : null;
                  return (
                    <div key={item.userId} className="rounded-xl border border-border/70 px-3 py-3">
                      <div className="text-sm font-medium text-foreground">
                        {profile?.full_name || profile?.email || item.userId || "Bilinmeyen kullanici"}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {item.calls} cagri - {formatCurrencyUsd(item.cost)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
