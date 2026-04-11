"use client";

import {
  type HAZOPValues,
  type HAZOPResult,
  calculateHAZOP,
  HAZOP_GUIDE_WORDS,
  HAZOP_PARAMETERS,
} from "@/lib/risk-scoring";

interface HAZOPPanelProps {
  hazopValues: HAZOPValues;
  hazopResult: HAZOPResult | null;
  onValuesChange: (values: HAZOPValues) => void;
}

const selectClass = "h-10 w-full rounded-xl border border-border bg-card px-3 text-sm text-foreground [&_option]:bg-white [&_option]:text-slate-900 dark:[&_option]:bg-[var(--navy-mid)] dark:[&_option]:text-white";
const inputClass = "h-10 w-full rounded-xl border border-border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground";

export function HAZOPPanel({ hazopValues, hazopResult, onValuesChange }: HAZOPPanelProps) {
  const result = hazopResult ?? calculateHAZOP(hazopValues);

  const update = <K extends keyof HAZOPValues>(field: K, value: HAZOPValues[K]) => {
    onValuesChange({ ...hazopValues, [field]: value });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl text-base font-bold text-white" style={{ backgroundColor: result.color }}>
          {Math.round(result.score)}
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{result.label}</p>
          <p className="text-xs text-muted-foreground">{result.action}</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-3 text-center text-xs text-muted-foreground">
        S({hazopValues.severity}) x L({hazopValues.likelihood}) x (6-D)({6 - hazopValues.detectability}) = <span className="font-bold text-foreground">{Math.round(result.score)}</span>
      </div>

      <div className="space-y-2">
        <div>
          <label className="text-xs font-semibold text-muted-foreground">Kılavuz Kelime</label>
          <select value={hazopValues.guideWord} onChange={(e) => update("guideWord", e.target.value)} className={selectClass}>
            {HAZOP_GUIDE_WORDS.map((w) => <option key={w} value={w}>{w}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground">Proses Parametresi</label>
          <select value={hazopValues.parameter} onChange={(e) => update("parameter", e.target.value)} className={selectClass}>
            {HAZOP_PARAMETERS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground">Sapma Açıklaması</label>
          <input type="text" value={hazopValues.deviation} onChange={(e) => update("deviation", e.target.value)} placeholder="Sapma tanımı..." className={inputClass} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Şiddet</label>
            <select value={hazopValues.severity} onChange={(e) => update("severity", Number(e.target.value))} className={selectClass}>
              {[1,2,3,4,5].map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Olasılık</label>
            <select value={hazopValues.likelihood} onChange={(e) => update("likelihood", Number(e.target.value))} className={selectClass}>
              {[1,2,3,4,5].map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Tespit</label>
            <select value={hazopValues.detectability} onChange={(e) => update("detectability", Number(e.target.value))} className={selectClass}>
              {[1,2,3,4,5].map((v) => <option key={v} value={v}>{v} — {v === 1 ? "Kolay" : v === 5 ? "Zor" : ""}</option>)}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
