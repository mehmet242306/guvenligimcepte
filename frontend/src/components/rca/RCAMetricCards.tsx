"use client";

import { Gauge, TrendingUp, Shield, CheckCircle2, AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { DIMENSION_META, type RCAResult } from "@/lib/r2d-rca-engine";

interface RCAMetricCardsProps {
  result: RCAResult;
}

function num(n: number): string {
  return n.toFixed(3);
}

function getScoreColor(score: number): string {
  if (score >= 0.6) return "text-red-600 dark:text-red-400";
  if (score >= 0.4) return "text-orange-600 dark:text-orange-400";
  if (score >= 0.2) return "text-amber-600 dark:text-amber-400";
  return "text-emerald-600 dark:text-emerald-400";
}

export function RCAMetricCards({ result }: RCAMetricCardsProps) {
  const t = useTranslations("incidents.r2dRca");
  const maxDim = DIMENSION_META[`C${result.maxDeltaHatIndex + 1}` as keyof typeof DIMENSION_META];
  const maxDimName = maxDim ? t(`dimensions.${maxDim.code}.name`) : "";

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <Card aria-label={t("metricCards.scoreCardAria")}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t("metricCards.scoreLabel")}</span>
            <Gauge className="size-4 text-muted-foreground" />
          </div>
          <div className={`mt-2 font-mono text-3xl font-bold ${getScoreColor(result.rRcaScore)}`}>
            {num(result.rRcaScore)}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {result.calculationMode === "override" ? t("panel.calculationOverride") : t("panel.calculationBase")}
          </div>
        </CardContent>
      </Card>

      <Card aria-label={t("metricCards.maxDeltaCardAria")}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t("metricCards.maxDeltaLabel")}</span>
            <TrendingUp className="size-4 text-muted-foreground" />
          </div>
          <div className={`mt-2 font-mono text-3xl font-bold ${getScoreColor(result.maxDeltaHat)}`}>
            {num(result.maxDeltaHat)}
          </div>
          <div className="mt-1 truncate text-xs text-muted-foreground">
            {maxDim?.code} · {maxDimName}
          </div>
        </CardContent>
      </Card>

      <Card aria-label={t("metricCards.modeCardAria")}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t("metricCards.modeLabel")}</span>
            <Shield className="size-4 text-muted-foreground" />
          </div>
          <div className="mt-2">
            {result.overrideTriggered ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/15 px-2.5 py-1.5 text-sm font-bold text-red-600 dark:text-red-400">
                <AlertTriangle className="size-3.5" /> {t("metricCards.overrideBadge")}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/15 px-2.5 py-1.5 text-sm font-bold text-amber-700 dark:text-amber-300">
                {t("metricCards.baseScoreBadge")}
              </span>
            )}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {result.overrideTriggered ? t("metricCards.tauExceeded") : t("metricCards.tauNotExceeded")}
          </div>
        </CardContent>
      </Card>

      <Card aria-label={t("metricCards.stabilityCardAria")}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t("metricCards.stabilityLabel")}</span>
            {result.isStable ? (
              <CheckCircle2 className="size-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="size-4 text-amber-500" />
            )}
          </div>
          <div className="mt-2">
            {result.isStable ? (
              <span className="inline-flex items-center rounded-lg bg-emerald-500/15 px-2.5 py-1.5 text-sm font-bold text-emerald-700 dark:text-emerald-300">
                {t("metricCards.stableBadge")}
              </span>
            ) : (
              <span className="inline-flex items-center rounded-lg bg-amber-500/15 px-2.5 py-1.5 text-sm font-bold text-amber-700 dark:text-amber-300">
                {t("metricCards.dualReportingBadge")}
              </span>
            )}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {result.isStable ? t("metricCards.stableHint") : t("metricCards.dualHint")}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
