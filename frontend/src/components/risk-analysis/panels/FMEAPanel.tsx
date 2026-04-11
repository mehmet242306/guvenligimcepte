"use client";

import {
  type FMEAValues,
  type FMEAResult,
  calculateFMEA,
  FMEA_SEVERITY_OPTIONS,
  FMEA_OCCURRENCE_OPTIONS,
  FMEA_DETECTION_OPTIONS,
} from "@/lib/risk-scoring";

interface FMEAPanelProps {
  fmeaValues: FMEAValues;
  fmeaResult: FMEAResult | null;
  onValuesChange: (values: FMEAValues) => void;
}

const selectClass = "h-10 w-full rounded-xl border border-border bg-card px-3 text-sm text-foreground [&_option]:bg-white [&_option]:text-slate-900 dark:[&_option]:bg-[var(--navy-mid)] dark:[&_option]:text-white";

export function FMEAPanel({ fmeaValues, fmeaResult, onValuesChange }: FMEAPanelProps) {
  const result = fmeaResult ?? calculateFMEA(fmeaValues);

  const update = (field: keyof FMEAValues, value: number) => {
    onValuesChange({ ...fmeaValues, [field]: value });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl text-base font-bold text-white" style={{ backgroundColor: result.color }}>
          {Math.round(result.rpn)}
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{result.label}</p>
          <p className="text-xs text-muted-foreground">{result.action}</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-3 text-center text-xs text-muted-foreground">
        S({fmeaValues.severity}) x O({fmeaValues.occurrence}) x D({fmeaValues.detection}) = <span className="font-bold text-foreground">RPN {Math.round(result.rpn)}</span>
      </div>

      <div className="space-y-2">
        <div>
          <label className="text-xs font-semibold text-muted-foreground">Ciddiyet (S)</label>
          <select value={fmeaValues.severity} onChange={(e) => update("severity", Number(e.target.value))} className={selectClass}>
            {FMEA_SEVERITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label} — {o.description}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground">Oluşma Olasılığı (O)</label>
          <select value={fmeaValues.occurrence} onChange={(e) => update("occurrence", Number(e.target.value))} className={selectClass}>
            {FMEA_OCCURRENCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label} — {o.description}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground">Tespit Edilebilirlik (D)</label>
          <select value={fmeaValues.detection} onChange={(e) => update("detection", Number(e.target.value))} className={selectClass}>
            {FMEA_DETECTION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label} — {o.description}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}
