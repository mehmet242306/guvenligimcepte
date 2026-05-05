"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { AlertOctagon, TrendingUp, CheckCircle2 } from "lucide-react";

interface RCAStatusCardsProps {
  overrideActive: boolean;
  bozulanCount: number;
  stabilCount: number;
}

export function RCAStatusCards({ overrideActive, bozulanCount, stabilCount }: RCAStatusCardsProps) {
  const t = useTranslations("incidents.r2dRca");

  return (
    <div className="grid h-full grid-rows-3 gap-2">
      <Card
        aria-label={t("statusCards.overrideAria")}
        className={overrideActive ? "border-red-500/40 bg-red-500/10" : "border-emerald-500/40 bg-emerald-500/10"}
      >
        <CardContent className="flex items-center gap-3 p-3">
          <span className={`inline-flex size-9 shrink-0 items-center justify-center rounded-full ${overrideActive ? "bg-red-500" : "bg-emerald-500"}`}>
            <AlertOctagon className="size-4 text-white" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{t("statusCards.overrideLabel")}</div>
            <div className={`text-sm font-bold ${overrideActive ? "text-red-700 dark:text-red-300" : "text-emerald-700 dark:text-emerald-300"}`}>
              {overrideActive ? t("statusCards.overrideActive") : t("statusCards.overrideInactive")}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card aria-label={t("statusCards.brokenAria")} className="border-amber-500/40 bg-amber-500/10">
        <CardContent className="flex items-center gap-3 p-3">
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-500">
            <TrendingUp className="size-4 text-white" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{t("statusCards.brokenLabel")}</div>
            <div className="text-sm font-bold text-amber-700 dark:text-amber-300">
              {t("statusCards.brokenOfNine", { count: bozulanCount })}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card aria-label={t("statusCards.stableAria")} className="border-emerald-500/40 bg-emerald-500/10">
        <CardContent className="flex items-center gap-3 p-3">
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-500">
            <CheckCircle2 className="size-4 text-white" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{t("statusCards.stableLabel")}</div>
            <div className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
              {t("statusCards.stableOfNine", { count: stabilCount })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
