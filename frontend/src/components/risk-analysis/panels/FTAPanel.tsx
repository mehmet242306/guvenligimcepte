"use client";

import {
  type FTAValues,
  type FTAResult,
  calculateFTA,
} from "@/lib/risk-scoring";

type TrRisk = (key: string, values?: Record<string, string | number | Date>) => string;

interface FTAPanelProps {
  ftaValues: FTAValues;
  ftaResult: FTAResult | null;
  onValuesChange: (values: FTAValues) => void;
  tr: TrRisk;
}

const inputClass = "h-9 w-full rounded-lg border border-border bg-card px-2 text-sm text-foreground placeholder:text-muted-foreground";

export function FTAPanel({ ftaValues, ftaResult, onValuesChange, tr }: FTAPanelProps) {
  const result = ftaResult ?? calculateFTA(ftaValues);

  const updateComponent = (idx: number, field: "name" | "failureRate", value: string | number) => {
    const comps = [...ftaValues.components];
    comps[idx] = { ...comps[idx], [field]: value };
    onValuesChange({ ...ftaValues, components: comps });
  };

  const addComponent = () => {
    onValuesChange({
      ...ftaValues,
      components: [...ftaValues.components, { name: tr("panel.fta.componentDefault", { n: ftaValues.components.length + 1 }), failureRate: 0.1 }],
    });
  };

  const removeComponent = (idx: number) => {
    if (ftaValues.components.length <= 1) return;
    onValuesChange({ ...ftaValues, components: ftaValues.components.filter((_, i) => i !== idx) });
  };

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

      <div className="grid grid-cols-2 gap-2 text-center text-xs">
        <div className="rounded-xl border border-border bg-card px-2 py-2">
          <p className="text-[10px] font-semibold uppercase text-muted-foreground">{tr("panel.fta.systemProb")}</p>
          <p className="font-bold text-foreground">{result.systemProbability.toExponential(2)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card px-2 py-2">
          <p className="text-[10px] font-semibold uppercase text-muted-foreground">{tr("panel.fta.gate")}</p>
          <p className="font-bold text-foreground">{result.gateType}</p>
        </div>
      </div>

      {/* Gate Type toggle */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-muted-foreground">{tr("panel.fta.gateType")}</span>
        <div className="flex rounded-lg border border-border overflow-hidden">
          {(["OR", "AND"] as const).map((gt) => (
            <button
              key={gt}
              type="button"
              onClick={() => onValuesChange({ ...ftaValues, gateType: gt })}
              className={`px-3 py-1.5 text-xs font-semibold transition-colors ${ftaValues.gateType === gt ? "bg-[var(--accent)] text-white" : "bg-card text-muted-foreground hover:bg-muted"}`}
            >
              {gt}
            </button>
          ))}
        </div>
      </div>

      {/* System Criticality */}
      <div>
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="font-medium text-foreground">{tr("panel.fta.systemCriticality")}</span>
          <span className="tabular-nums text-muted-foreground">{ftaValues.systemCriticality}/5</span>
        </div>
        <input
          type="range" min={1} max={5} value={ftaValues.systemCriticality}
          onChange={(e) => onValuesChange({ ...ftaValues, systemCriticality: Number(e.target.value) })}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-[var(--accent)] dark:bg-neutral-800"
        />
      </div>

      {/* Components */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase text-muted-foreground">{tr("panel.fta.componentsHeading", { count: ftaValues.components.length })}</span>
          <button type="button" onClick={addComponent} className="text-xs font-semibold text-[var(--accent)] hover:underline">{tr("panel.fta.add")}</button>
        </div>
        {ftaValues.components.map((comp, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <input type="text" value={comp.name} onChange={(e) => updateComponent(idx, "name", e.target.value)} className={`${inputClass} flex-1`} placeholder={tr("panel.fta.componentPlaceholder")} />
            <input
              type="number" min={0} max={1} step={0.01} value={comp.failureRate}
              onChange={(e) => updateComponent(idx, "failureRate", Math.min(1, Math.max(0, Number(e.target.value))))}
              className={`${inputClass} w-20 text-center`} title={tr("panel.fta.failureRateTitle")}
            />
            {ftaValues.components.length > 1 && (
              <button type="button" onClick={() => removeComponent(idx)} className="text-red-500 hover:text-red-700 text-sm font-bold px-1" title={tr("panel.fta.removeTitle")}>x</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
