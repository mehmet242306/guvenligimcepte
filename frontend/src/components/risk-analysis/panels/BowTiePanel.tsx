"use client";

import {
  type BowTieValues,
  type BowTieResult,
  calculateBowTie,
} from "@/lib/risk-scoring";

type TrRisk = (key: string, values?: Record<string, string | number | Date>) => string;

interface BowTiePanelProps {
  bowTieValues: BowTieValues;
  bowTieResult: BowTieResult | null;
  onValuesChange: (values: BowTieValues) => void;
  tr: TrRisk;
}

export function BowTiePanel({ bowTieValues, bowTieResult, onValuesChange, tr }: BowTiePanelProps) {
  const result = bowTieResult ?? calculateBowTie(bowTieValues);

  const update = (field: keyof BowTieValues, value: number) => {
    onValuesChange({ ...bowTieValues, [field]: value });
  };

  const rawRisk = bowTieValues.threatProbability * bowTieValues.consequenceSeverity;
  const maxBar = 25; // max raw risk

  const fields = [
    { key: "threatProbability" as const, labelKey: "panel.bowtie.threat", max: 5 },
    { key: "consequenceSeverity" as const, labelKey: "panel.bowtie.consequence", max: 5 },
    { key: "preventionBarriers" as const, labelKey: "panel.bowtie.prevention", max: 5 },
    { key: "mitigationBarriers" as const, labelKey: "panel.bowtie.mitigation", max: 5 },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-bold text-white" style={{ backgroundColor: result.color }}>
          {(result.score * 100).toFixed(0)}%
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{tr(result.labelKey)}</p>
          <p className="text-xs text-muted-foreground">{tr(result.actionKey)}</p>
        </div>
      </div>

      {/* Raw vs Residual risk bars */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-xs">
          <span className="w-24 shrink-0 text-muted-foreground">{tr("panel.bowtie.rawRisk")}</span>
          <div className="flex-1 h-3 rounded-full bg-slate-200 dark:bg-neutral-800 overflow-hidden">
            <div className="h-full rounded-full bg-red-500 transition-all" style={{ width: `${(rawRisk / maxBar) * 100}%` }} />
          </div>
          <span className="w-8 text-right font-semibold text-foreground">{rawRisk}</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="w-24 shrink-0 text-muted-foreground">{tr("panel.bowtie.residualRisk")}</span>
          <div className="flex-1 h-3 rounded-full bg-slate-200 dark:bg-neutral-800 overflow-hidden">
            <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${(result.residualRisk / maxBar) * 100}%` }} />
          </div>
          <span className="w-8 text-right font-semibold text-foreground">{result.residualRisk.toFixed(1)}</span>
        </div>
      </div>

      <div className="space-y-2">
        {fields.map(({ key, labelKey, max }) => (
          <div key={key}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-medium text-foreground">{tr(labelKey)}</span>
              <span className="tabular-nums text-muted-foreground">{bowTieValues[key]}</span>
            </div>
            <input
              type="range"
              min={key.includes("Barriers") ? 0 : 1}
              max={max}
              value={bowTieValues[key]}
              onChange={(e) => update(key, Number(e.target.value))}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-[var(--accent)] dark:bg-neutral-800"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
