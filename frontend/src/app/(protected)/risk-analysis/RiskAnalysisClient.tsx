"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import {
  type R2DValues,
  type FKValues,
  type MatrixValues,
  type R2DResult,
  type FKResult,
  type MatrixResult,
  R2D_PARAMS,
  FK_LIKELIHOOD,
  FK_SEVERITY,
  FK_EXPOSURE,
  MATRIX_LIKELIHOOD_LABELS,
  MATRIX_SEVERITY_LABELS,
  calculateR2D,
  calculateFK,
  calculateMatrix,
  getMatrixGrid,
} from "@/lib/risk-scoring";
import { cn } from "@/lib/utils";

/* ================================================================== */
/* Types                                                               */
/* ================================================================== */

type MethodTab = "r2d" | "fine_kinney" | "matrix";

const METHOD_TABS: { key: MethodTab; label: string; badge: string }[] = [
  { key: "r2d", label: "R-SKOR 2D", badge: "9 parametre" },
  { key: "fine_kinney", label: "Fine Kinney", badge: "3 parametre" },
  { key: "matrix", label: "5\u00D75 Matris", badge: "2 parametre" },
];

/* ================================================================== */
/* Severity badge helper                                               */
/* ================================================================== */

function riskBadge(riskClass: string, label: string, color: string) {
  const variant =
    riskClass === "critical" || riskClass === "high"
      ? "danger"
      : riskClass === "medium"
        ? "warning"
        : "success";
  return (
    <Badge variant={variant} className="text-xs" style={{ borderColor: `${color}40`, backgroundColor: `${color}15`, color }}>
      {label}
    </Badge>
  );
}

/* ================================================================== */
/* R-SKOR 2D Tab                                                       */
/* ================================================================== */

function R2DTab() {
  const [values, setValues] = useState<R2DValues>(() => {
    const init: R2DValues = {};
    R2D_PARAMS.forEach((p) => { init[p.key] = 0; });
    return init;
  });
  const [result, setResult] = useState<R2DResult | null>(null);

  function updateParam(key: string, val: number) {
    setValues((prev) => ({ ...prev, [key]: val }));
    setResult(null);
  }

  function handleCalculate() {
    setResult(calculateR2D(values));
  }

  function handleReset() {
    const init: R2DValues = {};
    R2D_PARAMS.forEach((p) => { init[p.key] = 0; });
    setValues(init);
    setResult(null);
  }

  return (
    <div className="space-y-5">
      {/* Method description */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
        <h3 className="section-title text-base">R-SKOR 2D Nedir?</h3>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">
          R-SKOR 2D, 9 farkli risk kaynagini es zamanli degerlendiren, surekli bir skor ureten (0.00 - 1.00)
          ve tek bir kritik tehlikenin diger dusuk degerler tarafindan maskelenmesini override mekanizmasiyla engelleyen
          cok boyutlu risk degerlendirme yontemidir. Fine-Kinney&apos;in 3 ve 5\u00D75 matrisin 2 parametresine karsi
          R-SKOR 2D 9 bagimsiz parametre kullanir.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant="default" className="text-[10px]">9 Parametre</Badge>
          <Badge variant="accent" className="text-[10px]">Surekli Skor [0, 1]</Badge>
          <Badge variant="warning" className="text-[10px]">Override Mekanizmasi</Badge>
        </div>
      </div>

      {/* Formula card */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h4 className="text-sm font-semibold text-foreground">Formul</h4>
        <div className="mt-3 space-y-2 rounded-lg bg-secondary/50 p-4 font-mono text-sm text-foreground">
          <p><span className="text-muted-foreground">s_base =</span> 0.16\u00B7C1 + 0.12\u00B7C2 + 0.12\u00B7C3 + 0.10\u00B7C4 + 0.12\u00B7C5 + 0.10\u00B7C6 + 0.14\u00B7C7 + 0.10\u00B7C8 + 0.08\u00B7C9</p>
          <p><span className="text-muted-foreground">s_peak =</span> 0.15 \u00D7 max(1.40\u00B7C3, 1.60\u00B7C5, 1.50\u00B7C7, 1.30\u00B7C8)</p>
          <p><span className="text-primary font-bold">R\u2082D =</span> min(1, s_base + s_peak)</p>
        </div>
      </div>

      {/* 9 parameter sliders */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h4 className="text-sm font-semibold text-foreground">Parametre Degerleri</h4>
        <p className="mt-1 text-xs text-muted-foreground">Her parametreyi 0 (risk yok) ile 1 (maksimum risk) arasinda ayarlayin.</p>
        <div className="mt-4 space-y-4">
          {R2D_PARAMS.map((p) => {
            const v = values[p.key] ?? 0;
            const barColor = v < 0.3 ? "#10B981" : v < 0.6 ? "#F59E0B" : v < 0.8 ? "#F97316" : "#DC2626";
            return (
              <div key={p.key} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-6 w-8 items-center justify-center rounded-md bg-secondary text-[10px] font-bold text-muted-foreground">{p.code}</span>
                    <span className="text-sm font-medium text-foreground">{p.label}</span>
                    {p.overrideCoeff && <Badge variant="warning" className="text-[9px]">Override \u00D7{p.overrideCoeff}</Badge>}
                  </div>
                  <span className="min-w-[3rem] text-right font-mono text-sm font-semibold" style={{ color: barColor }}>{v.toFixed(2)}</span>
                </div>
                <p className="text-[11px] text-muted-foreground">{p.description}</p>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={v}
                    onChange={(e) => updateParam(p.key, parseFloat(e.target.value))}
                    className="h-2 w-full cursor-pointer appearance-none rounded-full bg-secondary [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md"
                    style={{
                      background: `linear-gradient(90deg, ${barColor} ${v * 100}%, var(--secondary) ${v * 100}%)`,
                      // @ts-expect-error -- webkit slider thumb color
                      "--thumb-color": barColor,
                    }}
                  />
                  <span className="text-[10px] text-muted-foreground">w={p.weight}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 flex gap-3">
          <Button onClick={handleCalculate} variant="primary">Hesapla</Button>
          <Button onClick={handleReset} variant="outline">Sifirla</Button>
        </div>
      </div>

      {/* Result */}
      {result && <R2DResultCard result={result} />}
    </div>
  );
}

function R2DResultCard({ result }: { result: R2DResult }) {
  return (
    <div className="rounded-xl border-2 bg-card p-5" style={{ borderColor: result.color }}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">R-SKOR 2D Sonucu</p>
          <p className="mt-1 text-4xl font-bold tabular-nums" style={{ color: result.color }}>{result.score.toFixed(3)}</p>
        </div>
        <div className="text-right">
          {riskBadge(result.riskClass, result.label, result.color)}
          <p className="mt-2 text-sm font-medium text-foreground">{result.action}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-secondary/50 p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Taban Skor (s_base)</p>
          <p className="mt-1 font-mono text-lg font-semibold text-foreground">{result.sBase.toFixed(4)}</p>
        </div>
        <div className="rounded-lg bg-secondary/50 p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Override (s_peak)</p>
          <p className="mt-1 font-mono text-lg font-semibold text-foreground">{result.sPeak.toFixed(4)}</p>
        </div>
        <div className="rounded-lg bg-secondary/50 p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Dominant Parametre</p>
          <p className="mt-1 font-mono text-lg font-semibold text-primary">{result.dominantParam}</p>
        </div>
      </div>

      {/* Param contributions bar chart */}
      <div className="mt-4">
        <p className="text-xs font-medium text-muted-foreground">Parametre Katkilari</p>
        <div className="mt-2 space-y-1.5">
          {result.paramContributions.map((c) => {
            const pct = Math.min(100, (c.contribution / (result.sBase || 0.01)) * 100);
            return (
              <div key={c.code} className="flex items-center gap-2">
                <span className="w-7 text-[10px] font-bold text-muted-foreground">{c.code}</span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: result.color }} />
                </div>
                <span className="w-12 text-right font-mono text-[10px] text-muted-foreground">{c.contribution.toFixed(4)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Score scale */}
      <div className="mt-4">
        <p className="text-xs font-medium text-muted-foreground">Skor Olcegi</p>
        <div className="mt-2 flex h-4 w-full overflow-hidden rounded-full">
          <div className="flex-1 bg-emerald-500" title="Follow-up [0-0.20)" />
          <div className="flex-1 bg-amber-500" title="Dusuk [0.20-0.40)" />
          <div className="flex-1 bg-orange-500" title="Orta [0.40-0.60)" />
          <div className="flex-1 bg-red-600" title="Yuksek [0.60-0.80)" />
          <div className="flex-1 bg-red-900" title="Kritik [0.80-1.00]" />
        </div>
        <div className="relative mt-1 h-3">
          <div className="absolute h-3 w-0.5 bg-foreground transition-all" style={{ left: `${result.score * 100}%` }} />
          <div className="absolute -top-0 transition-all" style={{ left: `${result.score * 100}%`, transform: "translateX(-50%)" }}>
            <span className="text-[9px] font-bold text-foreground">\u25BC</span>
          </div>
        </div>
        <div className="mt-1 flex justify-between text-[9px] text-muted-foreground">
          <span>0.00</span><span>0.20</span><span>0.40</span><span>0.60</span><span>0.80</span><span>1.00</span>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/* Fine Kinney Tab                                                     */
/* ================================================================== */

function FineKinneyTab() {
  const [values, setValues] = useState<FKValues>({ likelihood: 1, severity: 1, exposure: 1 });
  const [result, setResult] = useState<FKResult | null>(null);

  function handleCalculate() {
    setResult(calculateFK(values));
  }

  return (
    <div className="space-y-5">
      {/* Method description */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
        <h3 className="section-title text-base">Fine Kinney Yontemi</h3>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">
          Fine-Kinney yontemi, riskin buyuklugunu Olasilik (L) \u00D7 Siddet (S) \u00D7 Maruziyet (F) formuluyle hesaplar.
          Sonuc 0.05 ile 10.000 arasinda bir deger alir. Basit ve yaygin kullanilan bir yontemdir ancak
          3 parametreyle sinirlidir ve uzman bagimliliginin yuksek olmasi dezavantajidir.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant="default" className="text-[10px]">3 Parametre</Badge>
          <Badge variant="accent" className="text-[10px]">R = L \u00D7 S \u00D7 F</Badge>
        </div>
      </div>

      {/* Parameter selection */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h4 className="text-sm font-semibold text-foreground">Parametre Secimi</h4>
        <div className="mt-4 space-y-5">
          {/* Likelihood */}
          <div>
            <label className="text-sm font-medium text-foreground">Olasilik (L)</label>
            <p className="text-xs text-muted-foreground">Tehlikeli olayin meydana gelme ihtimali</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {FK_LIKELIHOOD.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { setValues((p) => ({ ...p, likelihood: opt.value })); setResult(null); }}
                  className={cn(
                    "rounded-xl border px-4 py-3 text-left text-sm transition-all",
                    values.likelihood === opt.value
                      ? "border-primary bg-primary/10 text-foreground shadow-sm"
                      : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:bg-secondary",
                  )}
                >
                  <span className="font-bold text-foreground">{opt.label}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{opt.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Severity */}
          <div>
            <label className="text-sm font-medium text-foreground">Siddet (S)</label>
            <p className="text-xs text-muted-foreground">Olasi sonucun ciddiyeti</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {FK_SEVERITY.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { setValues((p) => ({ ...p, severity: opt.value })); setResult(null); }}
                  className={cn(
                    "rounded-xl border px-4 py-3 text-left text-sm transition-all",
                    values.severity === opt.value
                      ? "border-primary bg-primary/10 text-foreground shadow-sm"
                      : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:bg-secondary",
                  )}
                >
                  <span className="font-bold text-foreground">{opt.label}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{opt.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Exposure */}
          <div>
            <label className="text-sm font-medium text-foreground">Maruziyet / Frekans (F)</label>
            <p className="text-xs text-muted-foreground">Tehlikeye maruz kalma sikligi</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {FK_EXPOSURE.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { setValues((p) => ({ ...p, exposure: opt.value })); setResult(null); }}
                  className={cn(
                    "rounded-xl border px-4 py-3 text-left text-sm transition-all",
                    values.exposure === opt.value
                      ? "border-primary bg-primary/10 text-foreground shadow-sm"
                      : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:bg-secondary",
                  )}
                >
                  <span className="font-bold text-foreground">{opt.label}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{opt.description}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-4">
          <Button onClick={handleCalculate} variant="primary">Hesapla</Button>
          <div className="rounded-lg bg-secondary/50 px-4 py-2 font-mono text-sm">
            R = {values.likelihood} \u00D7 {values.severity} \u00D7 {values.exposure} = <span className="font-bold text-primary">{(values.likelihood * values.severity * values.exposure).toFixed(1)}</span>
          </div>
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className="rounded-xl border-2 bg-card p-5" style={{ borderColor: result.color }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Fine Kinney Sonucu</p>
              <p className="mt-1 text-4xl font-bold tabular-nums" style={{ color: result.color }}>{result.score.toFixed(1)}</p>
            </div>
            <div className="text-right">
              {riskBadge(result.riskClass, result.label, result.color)}
              <p className="mt-2 text-sm font-medium text-foreground">{result.action}</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-secondary/50 p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Olasilik (L)</p>
              <p className="mt-1 font-mono text-lg font-semibold text-foreground">{result.likelihood}</p>
            </div>
            <div className="rounded-lg bg-secondary/50 p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Siddet (S)</p>
              <p className="mt-1 font-mono text-lg font-semibold text-foreground">{result.severity}</p>
            </div>
            <div className="rounded-lg bg-secondary/50 p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Maruziyet (F)</p>
              <p className="mt-1 font-mono text-lg font-semibold text-foreground">{result.exposure}</p>
            </div>
          </div>
          {/* FK Scale */}
          <div className="mt-4">
            <p className="text-xs font-medium text-muted-foreground">Risk Skalasi</p>
            <div className="mt-2 grid grid-cols-5 gap-1">
              {[
                { label: "Kabul Edilebilir", range: "<20", color: "#10B981" },
                { label: "Dikkate Deger", range: "20-70", color: "#F59E0B" },
                { label: "Onemli", range: "70-200", color: "#F97316" },
                { label: "Yuksek", range: "200-400", color: "#DC2626" },
                { label: "Cok Yuksek", range: ">400", color: "#7F1D1D" },
              ].map((s) => (
                <div key={s.label} className="rounded-lg p-2 text-center" style={{ backgroundColor: `${s.color}20`, borderLeft: `3px solid ${s.color}` }}>
                  <p className="text-[10px] font-bold" style={{ color: s.color }}>{s.range}</p>
                  <p className="text-[9px] text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/* 5x5 Matrix Tab                                                      */
/* ================================================================== */

function MatrixTab() {
  const [values, setValues] = useState<MatrixValues>({ likelihood: 0, severity: 0 });
  const [result, setResult] = useState<MatrixResult | null>(null);
  const grid = useMemo(() => getMatrixGrid(), []);

  function selectCell(l: number, s: number) {
    setValues({ likelihood: l, severity: s });
    setResult(calculateMatrix({ likelihood: l, severity: s }));
  }

  return (
    <div className="space-y-5">
      {/* Method description */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
        <h3 className="section-title text-base">5\u00D75 L-Tipi Matris</h3>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">
          L-Tipi Matris, Olasilik (1-5) ve Siddet (1-5) parametrelerinin carpimi ile 25 hucreli bir risk tablosu olusturur.
          Gorsel ve anlasilir olmasi en buyuk avantajidir. Kagit-kalem ile sahada hizlica uygulanabilir.
          Ancak sadece 2 boyut kullanmasi ve ayni hucredeki farkli riskleri ayirt edememesi dezavantajlaridir.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant="default" className="text-[10px]">2 Parametre</Badge>
          <Badge variant="accent" className="text-[10px]">Risk = O \u00D7 S</Badge>
          <Badge variant="neutral" className="text-[10px]">25 Hucre</Badge>
        </div>
      </div>

      {/* Interactive 5x5 grid */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h4 className="text-sm font-semibold text-foreground">Risk Matrisi</h4>
        <p className="mt-1 text-xs text-muted-foreground">Olasilik ve siddet kesisimini secmek icin hucreye tiklayin.</p>

        <div className="mt-4 overflow-x-auto">
          <div className="min-w-[480px]">
            {/* Header row */}
            <div className="mb-1 grid grid-cols-[120px_repeat(5,1fr)] gap-1">
              <div className="flex items-end justify-center p-1 text-[10px] font-medium text-muted-foreground">
                Olasilik \\ Siddet
              </div>
              {MATRIX_SEVERITY_LABELS.map((label, i) => (
                <div key={i} className="p-1 text-center">
                  <p className="text-xs font-bold text-foreground">{i + 1}</p>
                  <p className="text-[9px] leading-tight text-muted-foreground">{label.split("(")[0].trim()}</p>
                </div>
              ))}
            </div>

            {/* Grid rows (5 to 1) */}
            {[5, 4, 3, 2, 1].map((l) => (
              <div key={l} className="grid grid-cols-[120px_repeat(5,1fr)] gap-1">
                <div className="flex items-center p-1">
                  <p className="text-xs font-bold text-foreground">{l}</p>
                  <p className="ml-1 text-[9px] text-muted-foreground">{MATRIX_LIKELIHOOD_LABELS[l - 1].split("(")[0].trim()}</p>
                </div>
                {[1, 2, 3, 4, 5].map((s) => {
                  const cell = grid.find((c) => c.likelihood === l && c.severity === s);
                  const isSelected = values.likelihood === l && values.severity === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => selectCell(l, s)}
                      className={cn(
                        "flex h-14 items-center justify-center rounded-lg text-sm font-bold text-white transition-all hover:scale-105 hover:shadow-lg",
                        isSelected && "ring-2 ring-foreground ring-offset-2 ring-offset-card",
                      )}
                      style={{ backgroundColor: cell?.color ?? "#64748B" }}
                    >
                      {l * s}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-3">
          {[
            { color: "#10B981", label: "Kabul Edilebilir (1-2)" },
            { color: "#F59E0B", label: "Dusuk (3-4)" },
            { color: "#F97316", label: "Orta (5-9)" },
            { color: "#DC2626", label: "Yuksek (10-15)" },
            { color: "#7F1D1D", label: "Tolere Edilemez (16-25)" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded" style={{ backgroundColor: item.color }} />
              <span className="text-[11px] text-muted-foreground">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className="rounded-xl border-2 bg-card p-5" style={{ borderColor: result.cellColor }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Matris Sonucu</p>
              <p className="mt-1 text-4xl font-bold tabular-nums" style={{ color: result.cellColor }}>{result.score}</p>
            </div>
            <div className="text-right">
              {riskBadge(result.riskClass, result.label, result.cellColor)}
              <p className="mt-2 text-sm font-medium text-foreground">{result.action}</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-secondary/50 p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Olasilik</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{result.likelihood} - {MATRIX_LIKELIHOOD_LABELS[result.likelihood - 1]}</p>
            </div>
            <div className="rounded-lg bg-secondary/50 p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Siddet</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{result.severity} - {MATRIX_SEVERITY_LABELS[result.severity - 1]}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/* Comparison Table                                                    */
/* ================================================================== */

function ComparisonSection() {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="section-title text-base">Yontem Karsilastirmasi</h3>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[600px] text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="px-3 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Kriter</th>
              <th className="px-3 py-2 text-center text-[10px] font-medium uppercase tracking-wider text-primary">R-SKOR 2D</th>
              <th className="px-3 py-2 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Fine Kinney</th>
              <th className="px-3 py-2 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground">5\u00D75 Matris</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {[
              ["Parametre sayisi", "9", "3", "2"],
              ["Cikti turu", "Surekli [0, 1]", "Kesikli (20-1500)", "Kesikli (5 renk)"],
              ["Cozunurluk", "Yuksek", "Dusuk", "Cok dusuk"],
              ["Seyreltme korumasi", "Override mekanizmasi", "Yok", "Yok"],
              ["Uzman bagimliligi", "Dusuk (veri gudumlu)", "Yuksek (oznel)", "Yuksek (oznel)"],
              ["Aksiyon onerisi", "Otomatik (C bazli)", "Manuel", "Manuel"],
            ].map((row, i) => (
              <tr key={i} className="transition-colors hover:bg-secondary/30">
                <td className="px-3 py-2.5 font-medium text-foreground">{row[0]}</td>
                <td className="px-3 py-2.5 text-center font-medium text-primary">{row[1]}</td>
                <td className="px-3 py-2.5 text-center text-muted-foreground">{row[2]}</td>
                <td className="px-3 py-2.5 text-center text-muted-foreground">{row[3]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ================================================================== */
/* Main Page                                                           */
/* ================================================================== */

export function RiskAnalysisClient() {
  const [activeTab, setActiveTab] = useState<MethodTab>("r2d");

  return (
    <>
      <PageHeader
        eyebrow="Risk Yonetimi"
        title="Risk Analizi"
        description="Firma bazli risk degerlendirmesi olusturun. R-SKOR 2D, Fine-Kinney veya L-Tipi Matris yontemiyle analiz yapin."
      />

      {/* Method tabs */}
      <nav className="flex gap-1 rounded-2xl border border-border bg-card p-1.5 shadow-[var(--shadow-soft)]">
        {METHOD_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors",
              activeTab === tab.key
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            {tab.label}
            <span className={cn(
              "rounded-full px-1.5 py-0.5 text-[10px]",
              activeTab === tab.key ? "bg-white/20" : "bg-secondary text-muted-foreground",
            )}>
              {tab.badge}
            </span>
          </button>
        ))}
      </nav>

      {/* Tab content */}
      <div className="mt-1">
        {activeTab === "r2d" && <R2DTab />}
        {activeTab === "fine_kinney" && <FineKinneyTab />}
        {activeTab === "matrix" && <MatrixTab />}
      </div>

      {/* Comparison section */}
      <ComparisonSection />
    </>
  );
}
