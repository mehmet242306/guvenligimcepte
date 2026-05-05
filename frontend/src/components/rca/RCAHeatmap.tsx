"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { R2D_DIMENSIONS, DIMENSION_META, SOURCE_COLORS } from "@/lib/r2d-rca-engine";
import { useR2dRcaDimensionMap } from "@/lib/r2d-rca-i18n";

interface RCAHeatmapProps {
  t0: number[];
  t1: number[];
  deltaHat: number[];
}

function num(n: number): string {
  return n.toFixed(3);
}

function riskCellStyle(value: number): { bg: string; fg: string; darkBg: string; darkFg: string } {
  if (value <= 0.2) return { bg: "#E1F5EE", fg: "#085041", darkBg: "rgba(5,80,65,0.25)", darkFg: "#6ee7b7" };
  if (value <= 0.4) return { bg: "#EAF3DE", fg: "#27500A", darkBg: "rgba(39,80,10,0.3)", darkFg: "#bef264" };
  if (value <= 0.6) return { bg: "#FAEEDA", fg: "#854F0B", darkBg: "rgba(133,79,11,0.35)", darkFg: "#fcd34d" };
  if (value <= 0.8) return { bg: "#FAECE7", fg: "#712B13", darkBg: "rgba(113,43,19,0.35)", darkFg: "#fdba74" };
  return { bg: "#FCEBEB", fg: "#791F1F", darkBg: "rgba(121,31,31,0.35)", darkFg: "#fca5a5" };
}

function deltaCellStyle(delta: number): { bg: string; fg: string; darkBg: string; darkFg: string } | null {
  if (delta === 0) return null;
  return riskCellStyle(delta);
}

export function RCAHeatmap({ t0, t1, deltaHat }: RCAHeatmapProps) {
  const tr = useTranslations("incidents.r2dRca");
  const dim = useR2dRcaDimensionMap(tr);

  const rows = useMemo(
    () =>
      R2D_DIMENSIONS.map((code, i) => {
        const meta = dim[code];
        const v0 = t0[i] ?? 0;
        const v1 = t1[i] ?? 0;
        const d = deltaHat[i] ?? 0;
        const engineMeta = DIMENSION_META[code];
        const srcColor = SOURCE_COLORS[engineMeta.sourceType];
        return { code, meta, v0, v1, d, srcColor };
      }),
    [dim, t0, t1, deltaHat],
  );

  return (
    <Card aria-label={tr("heatmap.ariaLabel")}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">{tr("heatmap.title")}</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="min-w-[180px] border border-border bg-muted/50 px-3 py-2 text-left font-semibold text-foreground">{tr("heatmap.colDimension")}</th>
              <th className="min-w-[110px] border border-border bg-muted/50 px-3 py-2 text-center font-semibold text-foreground">{tr("heatmap.colT0")}</th>
              <th className="min-w-[110px] border border-border bg-muted/50 px-3 py-2 text-center font-semibold text-foreground">{tr("heatmap.colT1")}</th>
              <th className="min-w-[110px] border border-border bg-muted/50 px-3 py-2 text-center font-semibold text-foreground">{tr("heatmap.colDelta")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ code, meta, v0, v1, d, srcColor }) => (
              <tr key={code}>
                <td className="border border-border px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="shrink-0 font-mono text-xs font-bold text-foreground">{code}</span>
                    <span className="truncate text-xs text-foreground">{meta.name}</span>
                    <span
                      className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-medium"
                      style={{ background: srcColor.bg, color: srcColor.fg }}
                    >
                      {meta.source}
                    </span>
                  </div>
                </td>
                <td className="border border-border text-center" style={{ background: riskCellStyle(v0).bg, color: riskCellStyle(v0).fg }}>
                  <div className="relative py-2">
                    <div className="absolute inset-0" style={{ background: `linear-gradient(to right, rgba(0,0,0,0.08) ${v0 * 100}%, transparent ${v0 * 100}%)` }} />
                    <span className="relative font-mono font-bold">{num(v0)}</span>
                  </div>
                </td>
                <td className="border border-border text-center" style={{ background: riskCellStyle(v1).bg, color: riskCellStyle(v1).fg }}>
                  <div className="relative py-2">
                    <div className="absolute inset-0" style={{ background: `linear-gradient(to right, rgba(0,0,0,0.08) ${v1 * 100}%, transparent ${v1 * 100}%)` }} />
                    <span className="relative font-mono font-bold">{num(v1)}</span>
                  </div>
                </td>
                <td
                  className="border border-border text-center"
                  style={deltaCellStyle(d) ? { background: deltaCellStyle(d)!.bg, color: deltaCellStyle(d)!.fg } : { background: "transparent" }}
                >
                  <div className="relative py-2">
                    {d > 0 && (
                      <div className="absolute inset-0" style={{ background: `linear-gradient(to right, rgba(0,0,0,0.08) ${d * 100}%, transparent ${d * 100}%)` }} />
                    )}
                    <span className="relative font-mono font-bold">{d === 0 ? <span className="text-muted-foreground">—</span> : num(d)}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
