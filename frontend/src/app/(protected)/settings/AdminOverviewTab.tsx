"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  formatBytes,
  formatCompactNumber,
  formatCurrencyUsd,
  formatDateTime,
  getHealthTone,
} from "./admin-monitoring-utils";

type OverviewCardKey =
  | "self_healing"
  | "error_logs"
  | "users"
  | "ai_usage"
  | "database_health"
  | "admin_notifications"
  | "kvkk_center";

type HealthCheckRow = {
  component_key: string;
  status: "healthy" | "degraded" | "down";
  checked_at: string;
};

type RuntimeStatsRow = {
  database_size_bytes: number;
  total_connections: number;
  active_connections: number;
  waiting_connections: number;
  slow_query_count: number;
};

type DeploymentLogRow = {
  status: string;
  smoke_test_status: string;
  commit_sha: string | null;
  started_at: string;
};

type OverviewStats = {
  overallStatus: "healthy" | "degraded" | "down";
  last24hErrors: number;
  activeUsers: number;
  aiCalls: number;
  aiCostUsd: number;
  dbSizeBytes: number;
  pendingQueue: number;
  lastDeployment: DeploymentLogRow | null;
  criticalAlerts: number;
  unresolvedDeletionRequests: number;
};

const emptyStats: OverviewStats = {
  overallStatus: "healthy",
  last24hErrors: 0,
  activeUsers: 0,
  aiCalls: 0,
  aiCostUsd: 0,
  dbSizeBytes: 0,
  pendingQueue: 0,
  lastDeployment: null,
  criticalAlerts: 0,
  unresolvedDeletionRequests: 0,
};

export function AdminOverviewTab({
  onNavigate,
}: {
  onNavigate: (tab: OverviewCardKey) => void;
}) {
  const [stats, setStats] = useState<OverviewStats>(emptyStats);
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

    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [
      healthResult,
      errorResult,
      usersResult,
      aiResult,
      queueResult,
      alertsResult,
      kvkkResult,
      deploymentResult,
      runtimeResult,
    ] = await Promise.all([
      supabase.from("health_checks").select("component_key,status,checked_at").order("checked_at", { ascending: false }).limit(40),
      supabase.from("error_logs").select("id", { count: "exact", head: true }).gte("created_at", since24h),
      supabase.from("user_profiles").select("id", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("ai_usage_logs").select("cost_usd,created_at").gte("created_at", since24h),
      supabase.from("task_queue").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase
        .from("admin_notifications")
        .select("id", { count: "exact", head: true })
        .eq("is_resolved", false)
        .eq("level", "critical"),
      supabase
        .from("data_deletion_requests")
        .select("id", { count: "exact", head: true })
        .in("status", ["pending", "scheduled", "approved"]),
      supabase
        .from("deployment_logs")
        .select("status,smoke_test_status,commit_sha,started_at")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.rpc("list_database_runtime_stats"),
    ]);

    const firstError =
      healthResult.error ||
      errorResult.error ||
      usersResult.error ||
      aiResult.error ||
      queueResult.error ||
      alertsResult.error ||
      kvkkResult.error ||
      deploymentResult.error ||
      runtimeResult.error;

    if (firstError) {
      setError(firstError.message);
    }

    const latestHealth = new Map<string, HealthCheckRow>();
    for (const row of (healthResult.data ?? []) as HealthCheckRow[]) {
      if (!latestHealth.has(row.component_key)) {
        latestHealth.set(row.component_key, row);
      }
    }

    const overallStatus =
      Array.from(latestHealth.values()).some((row) => row.status === "down")
        ? "down"
        : Array.from(latestHealth.values()).some((row) => row.status === "degraded")
          ? "degraded"
          : "healthy";

    const aiRows = (aiResult.data ?? []) as Array<{ cost_usd: number | null }>;
    const runtimeRow = ((runtimeResult.data ?? []) as RuntimeStatsRow[])[0] ?? null;

    setStats({
      overallStatus,
      last24hErrors: errorResult.count ?? 0,
      activeUsers: usersResult.count ?? 0,
      aiCalls: aiRows.length,
      aiCostUsd: aiRows.reduce((sum, row) => sum + Number(row.cost_usd ?? 0), 0),
      dbSizeBytes: runtimeRow?.database_size_bytes ?? 0,
      pendingQueue: queueResult.count ?? 0,
      lastDeployment: (deploymentResult.data as DeploymentLogRow | null) ?? null,
      criticalAlerts: alertsResult.count ?? 0,
      unresolvedDeletionRequests: kvkkResult.count ?? 0,
    });
    setLoading(false);
  }

  useEffect(() => {
    // Initial admin dashboard fetch intentionally runs once on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);

  const cards = useMemo(
    () => [
      {
        key: "self_healing" as const,
        title: "Sistem durumu",
        value: stats.overallStatus.toUpperCase(),
        description: "Health check, queue ve servis dayanikliligi",
        tone: getHealthTone(stats.overallStatus),
      },
      {
        key: "error_logs" as const,
        title: "Son 24 saat hata",
        value: formatCompactNumber(stats.last24hErrors),
        description: "Global error loglar ve endpoint dagilimi",
        tone: stats.last24hErrors > 0 ? getHealthTone("degraded") : getHealthTone("healthy"),
      },
      {
        key: "users" as const,
        title: "Aktif kullanici",
        value: formatCompactNumber(stats.activeUsers),
        description: "Rol, MFA ve son aktivite takibi",
        tone: "border-border bg-background text-foreground",
      },
      {
        key: "ai_usage" as const,
        title: "AI kullanim / maliyet",
        value: `${formatCompactNumber(stats.aiCalls)} / ${formatCurrencyUsd(stats.aiCostUsd)}`,
        description: "Son 24 saatte cagrilar ve tahmini maliyet",
        tone: stats.aiCostUsd > 5 ? getHealthTone("degraded") : "border-border bg-background text-foreground",
      },
      {
        key: "database_health" as const,
        title: "Veritabani boyutu",
        value: formatBytes(stats.dbSizeBytes),
        description: "Tablo buyuklukleri, baglanti ve yavas sorgular",
        tone: "border-border bg-background text-foreground",
      },
      {
        key: "self_healing" as const,
        title: "Bekleyen kuyruk",
        value: formatCompactNumber(stats.pendingQueue),
        description: "Retry bekleyen kritik isler ve worker durumu",
        tone: stats.pendingQueue > 0 ? getHealthTone("degraded") : "border-border bg-background text-foreground",
      },
      {
        key: "self_healing" as const,
        title: "Son deployment",
        value: stats.lastDeployment?.status?.toUpperCase() ?? "-",
        description: stats.lastDeployment
          ? `${formatDateTime(stats.lastDeployment.started_at)} - ${stats.lastDeployment.commit_sha?.slice(0, 7) ?? "sha yok"}`
          : "Heniz deployment kaydi yok",
        tone: getHealthTone(stats.lastDeployment?.status ?? "down"),
      },
      {
        key: "admin_notifications" as const,
        title: "Kritik uyari",
        value: formatCompactNumber(stats.criticalAlerts),
        description: `${formatCompactNumber(stats.unresolvedDeletionRequests)} aktif KVKK islemi ile birlikte`,
        tone: stats.criticalAlerts > 0 ? getHealthTone("down") : "border-border bg-background text-foreground",
      },
    ],
    [stats],
  );

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="text-base font-semibold text-foreground">Admin Dashboard</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Sistem sagligi, kullanici aktivitesi, AI maliyeti ve kritik operasyon uyarilarini tek bakista izleyin.
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

        <div className="mt-5 grid gap-3 lg:grid-cols-4">
          {cards.map((card) => (
            <button
              key={`${card.key}-${card.title}`}
              type="button"
              onClick={() => onNavigate(card.key)}
              className={cn(
                "rounded-2xl border px-4 py-4 text-left transition hover:-translate-y-0.5 hover:border-primary/50",
                card.tone,
              )}
            >
              <div className="text-xs font-semibold uppercase tracking-[0.2em]">{card.title}</div>
              <div className="mt-3 text-2xl font-semibold">{loading ? "..." : card.value}</div>
              <p className="mt-3 text-sm opacity-90">{card.description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
