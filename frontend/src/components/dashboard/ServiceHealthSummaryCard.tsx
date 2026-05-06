"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";

type HealthStatus = "good" | "watch" | "issue";

export function ServiceHealthSummaryCard() {
  const t = useTranslations("dashboard.serviceHealth");
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<HealthStatus>("good");
  const [successRate, setSuccessRate] = useState<number>(100);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const supabase = createClient();
      if (!supabase) {
        if (!cancelled) setLoading(false);
        return;
      }

      const dayAgoIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const [queueResult, outboxResult] = await Promise.all([
        supabase.from("task_queue").select("status,scheduled_at").gte("scheduled_at", dayAgoIso).limit(200),
        supabase.from("nova_outbox").select("status,created_at").gte("created_at", dayAgoIso).limit(200),
      ]);

      if (cancelled) return;
      const queueRows = queueResult.data ?? [];
      const outboxRows = outboxResult.data ?? [];
      const statuses = [
        ...queueRows.map((r) => String(r.status || "")),
        ...outboxRows.map((r) => String(r.status || "")),
      ];

      const success = statuses.filter((s) => s === "completed" || s === "succeeded").length;
      const failed = statuses.filter((s) => s === "failed" || s === "dead_letter").length;
      const total = success + failed;
      const ratio = total > 0 ? Math.round((success / total) * 100) : 100;

      const nextStatus: HealthStatus = ratio < 85 ? "issue" : ratio < 95 ? "watch" : "good";
      setSuccessRate(ratio);
      setStatus(nextStatus);
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const statusLabel = useMemo(() => {
    if (status === "issue") return t("status.issue");
    if (status === "watch") return t("status.watch");
    return t("status.good");
  }, [status, t]);

  const badgeCls = status === "issue"
    ? "bg-rose-500/15 text-rose-700 dark:text-rose-300"
    : status === "watch"
      ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
      : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";

  return (
    <div className="surface-card">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-foreground">{t("title")}</h2>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${badgeCls}`}>{statusLabel}</span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
      <div className="mt-3 rounded-xl border border-border bg-background px-3 py-2.5">
        <div className="text-[11px] text-muted-foreground">{t("successRate")}</div>
        <div className="mt-1 text-2xl font-semibold text-foreground">
          {loading ? "..." : `%${successRate}`}
        </div>
      </div>
    </div>
  );
}
