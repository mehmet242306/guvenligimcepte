"use client";

import {
  type JSAValues,
  type JSAResult,
  type JSAStep,
  calculateJSA,
} from "@/lib/risk-scoring";

type TrRisk = (key: string, values?: Record<string, string | number | Date>) => string;

interface JSAPanelProps {
  jsaValues: JSAValues;
  jsaResult: JSAResult | null;
  onValuesChange: (values: JSAValues) => void;
  tr: TrRisk;
}

const inputClass = "h-9 w-full rounded-lg border border-border bg-card px-2 text-sm text-foreground placeholder:text-muted-foreground";
const selectSmall = "h-8 w-full rounded-lg border border-border bg-card px-1 text-xs text-foreground text-center";

function stepRiskColor(score: number): string {
  if (score <= 1) return "#10B981";
  if (score <= 2) return "#F59E0B";
  if (score <= 5) return "#F97316";
  if (score <= 10) return "#DC2626";
  return "#7F1D1D";
}

export function JSAPanel({ jsaValues, jsaResult, onValuesChange, tr }: JSAPanelProps) {
  const result = jsaResult ?? calculateJSA(jsaValues);

  const updateStep = (idx: number, field: keyof JSAStep, value: string | number) => {
    const steps = [...jsaValues.steps];
    steps[idx] = { ...steps[idx], [field]: value };
    onValuesChange({ ...jsaValues, steps });
  };

  const addStep = () => {
    onValuesChange({
      ...jsaValues,
      steps: [...jsaValues.steps, {
        id: crypto.randomUUID(),
        stepDescription: tr("panel.jsa.stepDefault", { n: jsaValues.steps.length + 1 }),
        hazard: "", severity: 3, likelihood: 3, controlEffectiveness: 3, controlMeasures: "",
      }],
    });
  };

  const removeStep = (idx: number) => {
    if (jsaValues.steps.length <= 1) return;
    onValuesChange({ ...jsaValues, steps: jsaValues.steps.filter((_, i) => i !== idx) });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl text-base font-bold text-white" style={{ backgroundColor: result.color }}>
          {result.score.toFixed(1)}
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{tr(result.labelKey)}</p>
          <p className="text-xs text-muted-foreground">{tr(result.actionKey)}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-xl border border-border bg-card px-2 py-2">
          <p className="text-[10px] font-semibold uppercase text-muted-foreground">{tr("panel.jsa.max")}</p>
          <p className="font-bold text-foreground">{result.maxStepScore.toFixed(1)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card px-2 py-2">
          <p className="text-[10px] font-semibold uppercase text-muted-foreground">{tr("panel.jsa.avg")}</p>
          <p className="font-bold text-foreground">{result.avgStepScore.toFixed(1)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card px-2 py-2">
          <p className="text-[10px] font-semibold uppercase text-muted-foreground">{tr("panel.jsa.highRisk")}</p>
          <p className="font-bold text-red-500">{result.highRiskStepCount}</p>
        </div>
      </div>

      {/* Job title */}
      <div>
        <label className="text-xs font-semibold text-muted-foreground">{tr("panel.jsa.jobTitle")}</label>
        <input type="text" value={jsaValues.jobTitle} onChange={(e) => onValuesChange({ ...jsaValues, jobTitle: e.target.value })} className={inputClass} placeholder={tr("panel.jsa.jobPlaceholder")} />
      </div>

      {/* Steps */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase text-muted-foreground">{tr("panel.jsa.stepsHeading", { count: jsaValues.steps.length })}</span>
          <button type="button" onClick={addStep} className="text-xs font-semibold text-[var(--accent)] hover:underline">{tr("panel.jsa.add")}</button>
        </div>
        {jsaValues.steps.map((step, idx) => {
          const stepScore = result.stepScores.find(s => s.stepId === step.id);
          return (
            <div key={step.id} className="space-y-1.5 rounded-lg border border-border p-2">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: stepScore ? stepRiskColor(stepScore.score) : "#64748B" }}>
                  {idx + 1}
                </div>
                <input type="text" value={step.stepDescription} onChange={(e) => updateStep(idx, "stepDescription", e.target.value)} className={`${inputClass} flex-1`} placeholder={tr("panel.jsa.stepDescPlaceholder")} />
                {jsaValues.steps.length > 1 && (
                  <button type="button" onClick={() => removeStep(idx)} className="text-red-500 hover:text-red-700 text-sm font-bold px-1" title={tr("panel.jsa.removeTitle")}>x</button>
                )}
              </div>
              <input type="text" value={step.hazard} onChange={(e) => updateStep(idx, "hazard", e.target.value)} className={inputClass} placeholder={tr("panel.jsa.hazardPlaceholder")} />
              <div className="grid grid-cols-3 gap-1.5">
                <div>
                  <label className="text-[10px] text-muted-foreground">{tr("panel.jsa.severity")}</label>
                  <select value={step.severity} onChange={(e) => updateStep(idx, "severity", Number(e.target.value))} className={selectSmall}>
                    {[1,2,3,4,5].map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">{tr("panel.jsa.likelihood")}</label>
                  <select value={step.likelihood} onChange={(e) => updateStep(idx, "likelihood", Number(e.target.value))} className={selectSmall}>
                    {[1,2,3,4,5].map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">{tr("panel.jsa.control")}</label>
                  <select value={step.controlEffectiveness} onChange={(e) => updateStep(idx, "controlEffectiveness", Number(e.target.value))} className={selectSmall}>
                    {[1,2,3,4,5].map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              </div>
              <input type="text" value={step.controlMeasures} onChange={(e) => updateStep(idx, "controlMeasures", e.target.value)} className={inputClass} placeholder={tr("panel.jsa.controlsPlaceholder")} />
              {stepScore && (
                <div className="text-[10px] text-right">
                  <span className="text-muted-foreground">{tr("panel.jsa.stepScoreIntro")} </span>
                  <span className="font-bold" style={{ color: stepRiskColor(stepScore.score) }}>{stepScore.score.toFixed(2)}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
