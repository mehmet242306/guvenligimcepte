"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Doughnut } from "react-chartjs-2";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type PriorityItem, TAU_PRIMARY, TAU_SECONDARY } from "@/lib/r2d-rca-engine";
import { useR2dRcaDimensionMap } from "@/lib/r2d-rca-i18n";
import { registerRcaChartDependencies } from "./chart-register";

registerRcaChartDependencies();

interface RCADoughnutChartProps {
  priorityRanking: PriorityItem[];
}

function itemColor(d: number): string {
  if (d >= TAU_PRIMARY) return "#D85A30";
  if (d >= TAU_SECONDARY) return "#EF9F27";
  return "#B4B2A9";
}

export function RCADoughnutChart({ priorityRanking }: RCADoughnutChartProps) {
  const tr = useTranslations("incidents.r2dRca");
  const dim = useR2dRcaDimensionMap(tr);

  const { data, options } = useMemo(() => {
    const labels = priorityRanking.map((p) => `${p.code} ${dim[p.code].name}`);
    const values = priorityRanking.map((p) => p.priority);
    const colors = priorityRanking.map((p) => itemColor(p.deltaHat));
    const dataInner = {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: colors,
          borderColor: "rgba(255,255,255,0.6)",
          borderWidth: 2,
        },
      ],
    };
    const optionsInner = {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "55%",
      plugins: {
        legend: { position: "bottom" as const, labels: { font: { size: 10 }, padding: 10, usePointStyle: true } },
        tooltip: {
          callbacks: {
            label: (ctx: { label: string; parsed: number }) => `${ctx.label}: ${ctx.parsed.toFixed(4)}`,
          },
        },
      },
    };
    return { data: dataInner, options: optionsInner };
  }, [dim, priorityRanking, tr]);

  return (
    <Card aria-label={tr("doughnut.ariaLabel")}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">{tr("doughnut.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[260px]">
          {priorityRanking.length > 0 ? (
            <Doughnut data={data} options={options} />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              {tr("doughnut.empty")}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
