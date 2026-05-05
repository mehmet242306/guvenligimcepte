"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Radar } from "react-chartjs-2";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { R2D_DIMENSIONS } from "@/lib/r2d-rca-engine";
import { useR2dRcaDimensionMap } from "@/lib/r2d-rca-i18n";
import { registerRcaChartDependencies } from "./chart-register";

registerRcaChartDependencies();

interface RCARadarChartProps {
  t0: number[];
  t1: number[];
}

function shortLabel(code: string, fullName: string): string {
  const firstWord = fullName.split(/[\s/]+/)[0] ?? "";
  if (firstWord.length > 10) return `${code} ${firstWord.slice(0, 10)}…`;
  return `${code} ${firstWord}`;
}

export function RCARadarChart({ t0, t1 }: RCARadarChartProps) {
  const tr = useTranslations("incidents.r2dRca");
  const dim = useR2dRcaDimensionMap(tr);

  const { data, options } = useMemo(() => {
    const labels = R2D_DIMENSIONS.map((code) => shortLabel(code, dim[code].name));
    const fullLabels = R2D_DIMENSIONS.map((code) => `${code} ${dim[code].name}`);
    const dataInner = {
      labels,
      datasets: [
        {
          label: tr("radar.datasetT0"),
          data: t0,
          backgroundColor: "rgba(30, 39, 97, 0.08)",
          borderColor: "rgba(30, 39, 97, 0.8)",
          borderWidth: 2,
          pointBackgroundColor: "rgba(30, 39, 97, 0.9)",
          pointRadius: 3,
        },
        {
          label: tr("radar.datasetT1"),
          data: t1,
          backgroundColor: "rgba(216, 90, 48, 0.08)",
          borderColor: "rgba(216, 90, 48, 0.8)",
          borderWidth: 2,
          borderDash: [5, 3],
          pointBackgroundColor: "rgba(216, 90, 48, 1)",
          pointRadius: 3,
        },
      ],
    };
    const optionsInner = {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 10, right: 20, bottom: 10, left: 20 } },
      plugins: {
        legend: {
          position: "bottom" as const,
          labels: { font: { size: 11 }, usePointStyle: true, padding: 14 },
        },
        tooltip: {
          callbacks: {
            title: (items: Array<{ dataIndex: number }>) =>
              items[0] ? fullLabels[items[0].dataIndex] : "",
            label: (ctx: { dataset: { label?: string }; parsed: { r: number } }) =>
              `${ctx.dataset.label ?? ""}: ${ctx.parsed.r.toFixed(3)}`,
          },
        },
      },
      scales: {
        r: {
          min: 0,
          max: 1,
          ticks: { stepSize: 0.2, font: { size: 9 }, backdropColor: "transparent" },
          pointLabels: { font: { size: 9 }, padding: 2 },
          grid: { color: "rgba(156,163,175,0.25)" },
          angleLines: { color: "rgba(156,163,175,0.25)" },
        },
      },
    };
    return { data: dataInner, options: optionsInner };
  }, [dim, t0, t1, tr]);

  return (
    <Card aria-label={tr("radar.ariaLabel")}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">{tr("radar.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[320px]">
          <Radar data={data} options={options} />
        </div>
      </CardContent>
    </Card>
  );
}
