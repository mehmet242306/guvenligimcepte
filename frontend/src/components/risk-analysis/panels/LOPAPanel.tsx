"use client";

import {
  type LOPAValues,
  type LOPAResult,
  type LOPALayer,
  calculateLOPA,
  LOPA_INIT_FREQ_OPTIONS,
  LOPA_PFD_OPTIONS,
} from "@/lib/risk-scoring";

type TrRisk = (key: string, values?: Record<string, string | number | Date>) => string;

interface LOPAPanelProps {
  lopaValues: LOPAValues;
  lopaResult: LOPAResult | null;
  onValuesChange: (values: LOPAValues) => void;
  tr: TrRisk;
}

const selectClass = "h-10 w-full rounded-xl border border-border bg-card px-3 text-sm text-foreground [&_option]:bg-white [&_option]:text-slate-900 dark:[&_option]:bg-[var(--navy-mid)] dark:[&_option]:text-white";
const inputClass = "h-9 w-full rounded-lg border border-border bg-card px-2 text-sm text-foreground placeholder:text-muted-foreground";

export function LOPAPanel({ lopaValues, lopaResult, onValuesChange, tr }: LOPAPanelProps) {
  const result = lopaResult ?? calculateLOPA(lopaValues);

  const updateLayer = (idx: number, field: keyof LOPALayer, value: string | number) => {
    const layers = [...lopaValues.layers];
    layers[idx] = { ...layers[idx], [field]: value };
    onValuesChange({ ...lopaValues, layers });
  };

  const addLayer = () => {
    onValuesChange({
      ...lopaValues,
      layers: [...lopaValues.layers, { id: crypto.randomUUID(), name: tr("panel.lopa.layerDefault", { n: lopaValues.layers.length + 1 }), pfd: 0.1 }],
    });
  };

  const removeLayer = (idx: number) => {
    if (lopaValues.layers.length <= 1) return;
    onValuesChange({ ...lopaValues, layers: lopaValues.layers.filter((_, i) => i !== idx) });
  };

  const consequenceLabel = (v: number) => tr(`panel.lopa.consequenceV${v}`);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl text-[10px] font-bold text-white leading-tight text-center" style={{ backgroundColor: result.color }}>
          {result.mitigatedFreq.toExponential(1)}
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{tr(result.labelKey)}</p>
          <p className="text-xs text-muted-foreground">{tr(result.actionKey)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-center text-xs">
        <div className="rounded-xl border border-border bg-card px-2 py-2">
          <p className="text-[10px] font-semibold uppercase text-muted-foreground">{tr("panel.lopa.riskReduction")}</p>
          <p className="font-bold text-foreground">{result.riskReductionFactor.toFixed(0)}x</p>
        </div>
        <div className={`rounded-xl border px-2 py-2 ${result.meetsTarget ? "border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950" : "border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-950"}`}>
          <p className="text-[10px] font-semibold uppercase text-muted-foreground">{tr("panel.lopa.target")}</p>
          <p className={`font-bold ${result.meetsTarget ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
            {result.meetsTarget ? tr("panel.lopa.targetMet") : tr("panel.lopa.targetNotMet")}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <div>
          <label className="text-xs font-semibold text-muted-foreground">{tr("panel.lopa.initFreq")}</label>
          <select value={lopaValues.initiatingEventFreq} onChange={(e) => onValuesChange({ ...lopaValues, initiatingEventFreq: Number(e.target.value) })} className={selectClass}>
            {LOPA_INIT_FREQ_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label} — {tr(o.descriptionKey)}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground">{tr("panel.lopa.consequence")}</label>
          <select value={lopaValues.consequenceSeverity} onChange={(e) => onValuesChange({ ...lopaValues, consequenceSeverity: Number(e.target.value) })} className={selectClass}>
            {[1,2,3,4,5].map((v) => <option key={v} value={v}>{v} — {consequenceLabel(v)}</option>)}
          </select>
        </div>
      </div>

      {/* Layers */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase text-muted-foreground">{tr("panel.lopa.layersHeading", { count: lopaValues.layers.length })}</span>
          <button type="button" onClick={addLayer} className="text-xs font-semibold text-[var(--accent)] hover:underline">{tr("panel.lopa.addLayer")}</button>
        </div>
        {lopaValues.layers.map((layer, idx) => (
          <div key={layer.id} className="flex items-center gap-2">
            <input type="text" value={layer.name} onChange={(e) => updateLayer(idx, "name", e.target.value)} className={`${inputClass} flex-1`} placeholder={tr("panel.lopa.layerNamePlaceholder")} />
            <select value={layer.pfd} onChange={(e) => updateLayer(idx, "pfd", Number(e.target.value))} className="h-9 w-28 rounded-lg border border-border bg-card px-1 text-xs text-foreground">
              {LOPA_PFD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label} — {tr(o.descriptionKey)}</option>)}
            </select>
            {lopaValues.layers.length > 1 && (
              <button type="button" onClick={() => removeLayer(idx)} className="text-red-500 hover:text-red-700 text-sm font-bold px-1" title={tr("panel.lopa.removeTitle")}>x</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
