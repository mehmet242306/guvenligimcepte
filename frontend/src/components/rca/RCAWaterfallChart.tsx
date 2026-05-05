"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Bar } from "react-chartjs-2";
import type { ChartOptions } from "chart.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type PriorityItem } from "@/lib/r2d-rca-engine";
import { registerRcaChartDependencies } from "./chart-register";

registerRcaChartDependencies();

interface RCAWaterfallChartProps {
  priorityRanking: PriorityItem[];
  rRcaScore: number;
}

export function RCAWaterfallChart({ priorityRanking, rRcaScore }: RCAWaterfallChartProps) {
  const tr = useTranslations("incidents.r2dRca");

  const { data, options } = useMemo(() => {
    const totalLabel = tr("waterfall.total");
    const labels = [...priorityRanking.map((p) => p.code), totalLabel];

    const invisibleData: number[] = [];
    const visibleData: number[] = [];
    const colors: string[] = [];

    let running = 0;
    priorityRanking.forEach((p) => {
      invisibleData.push(running);
      visibleData.push(p.priority);
      running += p.priority;
      if (p.deltaHat >= 0.40) colors.push("#D85A30");
      else if (p.deltaHat >= 0.20) colors.push("#EF9F27");
      else colors.push("#B4B2A9");
    });
    invisibleData.push(0);
    visibleData.push(rRcaScore);
    colors.push("#1E2761");

    const dataInner = {
      labels,
      datasets: [
        {
          label: "base",
          data: invisibleData,
          backgroundColor: "transparent",
          borderWidth: 0,
          stack: "stack1",
        },
        {
          label: "contribution",
          data: visibleData,
          backgroundColor: colors,
          borderWidth: 0,
          borderRadius: 4,
          stack: "stack1",
        },
      ],
    };

    const optionsInner: ChartOptions<"bar"> = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          filter: (ctx) => ctx.datasetIndex === 1,
          callbacks: {
            label: (ctx) => tr("waterfall.tooltipContribution", { value: (ctx.parsed.y as number).toFixed(3) }),
          },
        },
      },
      scales: {
        x: { ticks: { font: { size: 10 } }, grid: { display: false }, stacked: true },
        y: {
          beginAtZero: true,
          ticks: { font: { size: 10 } },
          grid: { color: "rgba(156,163,175,0.15)" },
          stacked: true,
        },
      },
    };
    return { data: dataInner, options: optionsInner };
  }, [priorityRanking, rRcaScore, tr]);

  return (
    <Card aria-label={tr("waterfall.ariaLabel")}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">{tr("waterfall.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[260px]">
          {priorityRanking.length > 0 ? (
            <Bar data={data} options={options} />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              {tr("waterfall.empty")}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
