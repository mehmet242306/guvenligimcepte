"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SOURCE_COLORS, type CategorizedDimension, type CategoryLevel } from "@/lib/r2d-rca-engine";
import { useR2dRcaDimensionMap, type R2dRcaTranslate } from "@/lib/r2d-rca-i18n";

interface RCARootCauseChainProps {
  categorized: CategorizedDimension[];
}

function num(n: number): string {
  return n.toFixed(3);
}

function SourceBadge({ sourceType, label }: { sourceType: CategorizedDimension["sourceType"]; label: string }) {
  const c = SOURCE_COLORS[sourceType];
  return (
    <span
      className="inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-medium"
      style={{ background: c.bg, color: c.fg }}
    >
      {label}
    </span>
  );
}

function StatusBadge({ category, t }: { category: CategoryLevel; t: R2dRcaTranslate }) {
  if (category === "override") {
    return <span className="inline-flex items-center rounded bg-red-500/20 px-1.5 py-0.5 text-[9px] font-bold text-red-700 dark:text-red-300">{t("rootChain.badgeOverride")}</span>;
  }
  if (category === "none") {
    return <span className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">{t("rootChain.badgeInactive")}</span>;
  }
  return null;
}

export function RCARootCauseChain({ categorized }: RCARootCauseChainProps) {
  const t = useTranslations("incidents.r2dRca");
  const dim = useR2dRcaDimensionMap(t);

  const groups = useMemo(
    () =>
      [
        {
          level: "override" as const,
          title: t("rootChain.overrideTitle"),
          titleColor: "#D85A30",
          accent: "#D85A30",
          description: t("rootChain.overrideDesc"),
        },
        {
          level: "major" as const,
          title: t("rootChain.majorTitle"),
          titleColor: "#EF9F27",
          accent: "#EF9F27",
          description: t("rootChain.majorDesc"),
        },
        {
          level: "minor" as const,
          title: t("rootChain.minorTitle"),
          titleColor: "#B4B2A9",
          accent: "#B4B2A9",
          description: t("rootChain.minorDesc"),
        },
        {
          level: "none" as const,
          title: t("rootChain.noneTitle"),
          titleColor: "#9A988F",
          accent: "#D3D1C7",
          description: t("rootChain.noneDesc"),
        },
      ] as const,
    [t],
  );

  const maxPriority = Math.max(...categorized.map((c) => c.priority), 0.001);

  return (
    <Card aria-label={t("rootChain.ariaLabel")}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">{t("rootChain.cardTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {groups.map((group, groupIdx) => {
          const items = categorized.filter((c) => c.category === group.level);
          if (items.length === 0) return null;
          return (
            <div key={group.level}>
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full" style={{ background: group.titleColor }} />
                  <span className="text-xs font-bold uppercase tracking-wide" style={{ color: group.titleColor }}>
                    {group.title}
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground">{group.description}</span>
              </div>
              <div className="space-y-1.5">
                {items.map((item) => {
                  const barPct = group.level === "none" ? 0 : (item.priority / maxPriority) * 100;
                  const isInactive = group.level === "none";
                  const d = dim[item.code];
                  return (
                    <div
                      key={item.code}
                      className={`flex items-center gap-2 rounded-md border border-border p-2 ${isInactive ? "opacity-40" : ""}`}
                    >
                      <span
                        className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                        style={{ background: group.accent, color: isInactive ? "#6b7280" : "#fff" }}
                      >
                        {item.rank ?? "—"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="shrink-0 font-mono text-[11px] font-bold text-foreground">{item.code}</span>
                          <span className="truncate text-xs text-foreground">{d.name}</span>
                          <SourceBadge sourceType={item.sourceType} label={d.source} />
                          <StatusBadge category={item.category} t={t} />
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full transition-all"
                            style={{ width: `${barPct}%`, background: group.accent }}
                          />
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="font-mono text-xs font-bold text-foreground">
                          {isInactive ? "—" : num(item.deltaHat)}
                        </div>
                        <div className="text-[9px] text-muted-foreground">Δ̂</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {groupIdx < groups.length - 1 && (
                <div className="mt-3 h-px bg-border" />
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
