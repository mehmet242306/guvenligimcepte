"use client";

import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import { createClient as supabase } from "@/lib/supabase/client";
import { getActiveWorkspace } from "@/lib/supabase/workspace-api";
import { useLiveFieldScanAccess } from "@/lib/hooks/use-live-field-scan-access";

/**
 * Summary: category distribution for scan_detections (read-only).
 * Finding text and scoring stay in Risk Analysis — no duplicate list.
 */

type CategoryMeta = {
  key: string;
  label: string;
  icon: string;
  color: string;
  bg: string;
};

const CATEGORIES: CategoryMeta[] = [
  { key: "kkd", label: "Missing PPE", icon: "🦺", color: "#8B5CF6", bg: "#8B5CF622" },
  { key: "dusme", label: "Fall Risk", icon: "⚠️", color: "#F59E0B", bg: "#F59E0B22" },
  { key: "elektrik", label: "Electrical Risk", icon: "⚡", color: "#3B82F6", bg: "#3B82F622" },
  { key: "yangin", label: "Fire", icon: "🔥", color: "#EF4444", bg: "#EF444422" },
  { key: "mekanik", label: "Mechanical", icon: "⚙️", color: "#64748B", bg: "#64748B22" },
  { key: "kimyasal", label: "Chemical", icon: "🧪", color: "#10B981", bg: "#10B98122" },
  { key: "ergonomik", label: "Ergonomic", icon: "🧍", color: "#06B6D4", bg: "#06B6D422" },
  { key: "cevresel", label: "Environmental", icon: "🌡️", color: "#84CC16", bg: "#84CC1622" },
  { key: "duzen", label: "Order/5S", icon: "📦", color: "#F97316", bg: "#F9731622" },
  { key: "trafik", label: "Vehicle Traffic", icon: "🚜", color: "#DC2626", bg: "#DC262622" },
  { key: "diger", label: "Other", icon: "📍", color: "#6B7280", bg: "#6B728022" },
];

export default function CategoryRiskView() {
  const canLiveFieldScan = useLiveFieldScanAccess();
  const [categoryStats, setCategoryStats] = useState<Record<string, { count: number; critical: number; high: number }>>(
    {},
  );
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [riskAnalysisHref, setRiskAnalysisHref] = useState("/risk-analysis");

  useEffect(() => {
    void getActiveWorkspace().then((w) => {
      if (w?.id) {
        setRiskAnalysisHref(`/risk-analysis?companyId=${encodeURIComponent(w.id)}`);
      }
    });
  }, []);

  useEffect(() => {
    (async () => {
      const sb = supabase();
      if (!sb) {
        setLoading(false);
        return;
      }

      const { data } = await sb
        .from("scan_detections")
        .select("risk_category, risk_level")
        .order("created_at", { ascending: false })
        .limit(2000);

      const rows = data ?? [];
      setTotal(rows.length);
      const stats: Record<string, { count: number; critical: number; high: number }> = {};
      for (const d of rows) {
        const cat = (d.risk_category as string) || "diger";
        if (!stats[cat]) stats[cat] = { count: 0, critical: 0, high: 0 };
        stats[cat].count++;
        if (d.risk_level === "critical") stats[cat].critical++;
        else if (d.risk_level === "high") stats[cat].high++;
      }
      setCategoryStats(stats);
      setLoading(false);
    })();
  }, []);

  const catCount = useMemo(() => Object.keys(categoryStats).length, [categoryStats]);

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="mt-3 text-xs text-muted-foreground">Loading summary…</p>
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="text-sm font-bold text-foreground">Field scan summary</h3>
        <p className="mt-2 text-xs text-muted-foreground">
          No detections recorded yet. When live scan ends, findings are automatically copied into a Risk Analysis record.
        </p>
        {canLiveFieldScan ? (
          <Link
            href="/live-scan"
            className="mt-3 inline-block text-xs font-semibold text-primary underline-offset-4 hover:underline"
          >
            Live field scan →
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-foreground">Field scan — category summary</h3>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Total {total} raw detections · {catCount} categories. Detailed findings and scoring are available only in
            Risk Analysis (no duplicate list).
          </p>
        </div>
        <Link
          href={riskAnalysisHref}
          className="shrink-0 rounded-xl border border-border bg-primary/10 px-4 py-2 text-xs font-semibold text-primary hover:bg-primary/15"
        >
          Risk Analysis →
        </Link>
      </div>

      <div className="grid gap-2 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {CATEGORIES.map((cat) => {
          const stat = categoryStats[cat.key];
          if (!stat) return null;
          return (
            <div
              key={cat.key}
              className="relative rounded-xl border border-border bg-secondary/20 p-3 text-left"
            >
              <div className="flex items-center gap-2">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-lg"
                  style={{ backgroundColor: cat.bg }}
                >
                  {cat.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-bold text-foreground">{cat.label}</p>
                  <p className="text-[9px] text-muted-foreground">
                    {stat.count} records
                    {stat.critical > 0 ? <span className="font-bold text-red-500"> · {stat.critical} critical</span> : null}
                  </p>
                </div>
              </div>
              {stat.critical > 0 ? (
                <div className="absolute right-2 top-2 h-2 w-2 animate-pulse rounded-full bg-red-500" />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
