"use client";

import { useMemo, useState } from "react";
import type { RiskReportFinding, RiskReportJson } from "@/lib/risk-analysis/report-json";

type Props = {
  report: RiskReportJson;
  reportId: string;
};

const LEVELS = [
  { key: "all", label: "Tümü" },
  { key: "critical", label: "Kritik" },
  { key: "high", label: "Yüksek" },
  { key: "medium", label: "Orta" },
  { key: "low", label: "Düşük" },
];

function riskLabel(level: string) {
  if (level === "critical") return "Kritik";
  if (level === "high") return "Yüksek";
  if (level === "medium") return "Orta";
  if (level === "low" || level === "follow_up") return "Düşük / İzleme";
  return level || "-";
}

function riskTone(level: string) {
  if (level === "critical") return "bg-red-700 text-white";
  if (level === "high") return "bg-orange-600 text-white";
  if (level === "medium") return "bg-amber-500 text-slate-950";
  return "bg-emerald-600 text-white";
}

function annotationStyle(annotation: RiskReportFinding["annotation"]) {
  if (!annotation) return null;
  if (annotation.type === "box") {
    return {
      left: `${annotation.x ?? 0}%`,
      top: `${annotation.y ?? 0}%`,
      width: `${annotation.width ?? 6}%`,
      height: `${annotation.height ?? 6}%`,
    };
  }
  if (annotation.type === "point") {
    return {
      left: `${annotation.x ?? 0}%`,
      top: `${annotation.y ?? 0}%`,
      width: "18px",
      height: "18px",
      transform: "translate(-50%, -50%)",
    };
  }
  return null;
}

export function InteractiveRiskReportClient({ report, reportId }: Props) {
  const allFindings = useMemo(
    () => report.images.flatMap((image) => image.findings.map((finding) => ({ ...finding, imageCode: image.imageCode }))),
    [report.images],
  );
  const categories = useMemo(() => Array.from(new Set(allFindings.map((finding) => finding.category).filter(Boolean))), [allFindings]);
  const [level, setLevel] = useState("all");
  const [category, setCategory] = useState("all");
  const [active, setActive] = useState<(RiskReportFinding & { imageCode: string }) | null>(allFindings[0] ?? null);

  const filteredImages = report.images.map((image) => ({
    ...image,
    findings: image.findings.filter((finding) => {
      const levelOk = level === "all" || finding.riskClass === level || (level === "low" && finding.riskClass === "follow_up");
      const categoryOk = category === "all" || finding.category === category;
      return levelOk && categoryOk;
    }),
  }));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">RiskNova Etkileşimli Rapor</p>
            <h1 className="mt-1 text-2xl font-semibold">{report.reportMeta.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {report.reportMeta.companyName} · {report.reportMeta.reportDate} · {report.summary.totalFindings} bulgu
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-secondary" href={`/reports/${reportId}/print`}>
              Print görünüm
            </a>
            <a className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90" href={`/api/risk-analysis/export/${reportId}`}>
              PDF indir
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-6 py-6 lg:grid-cols-[1fr_360px]">
        <section className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              ["Görsel", report.summary.totalImages],
              ["Kapsam içi", report.summary.inScopeImages],
              ["Kapsam dışı", report.summary.outOfScopeImages],
              ["Kritik", report.summary.criticalCount],
              ["Yüksek", report.summary.highCount],
            ].map(([label, value]) => (
              <div key={label} className="rounded-md border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-1 text-2xl font-semibold">{value}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 rounded-md border border-border bg-card p-3">
            {LEVELS.map((item) => (
              <button
                key={item.key}
                className={`rounded-md px-3 py-1.5 text-sm ${level === item.key ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
                onClick={() => setLevel(item.key)}
                type="button"
              >
                {item.label}
              </button>
            ))}
            <select
              className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
              onChange={(event) => setCategory(event.target.value)}
              value={category}
            >
              <option value="all">Tüm kategoriler</option>
              {categories.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>

          {filteredImages.map((image) => (
            <article key={image.imageCode} className="rounded-md border border-border bg-card">
              <div className="border-b border-border p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">{image.imageCode} - {image.fileName}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{image.sceneDescription}</p>
                  </div>
                  <span className="rounded-md bg-secondary px-2.5 py-1 text-xs font-medium">
                    {image.scopeStatus === "in_scope" ? "Kapsam içi" : "Kapsam dışı"}
                  </span>
                </div>
              </div>

              <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_360px]">
                <div className="relative overflow-hidden rounded-md border border-border bg-muted">
                  {image.imageUrl ? (
                    <img src={image.imageUrl} alt={image.fileName} className="max-h-[520px] w-full object-contain" />
                  ) : (
                    <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">Görsel önizlemesi yok</div>
                  )}
                  {image.findings.map((finding, index) => {
                    const annotation = finding.annotation;
                    const style = annotationStyle(annotation);
                    if (!annotation || !style) return null;
                    return (
                      <button
                        key={finding.findingCode}
                        className={`absolute border-2 border-red-500 bg-red-500/10 ${annotation.type === "point" ? "rounded-full" : ""}`}
                        onClick={() => setActive({ ...finding, imageCode: image.imageCode })}
                        style={style}
                        title={finding.title}
                        type="button"
                      >
                        <span className="absolute -top-6 left-0 rounded bg-red-600 px-1.5 py-0.5 text-xs text-white">{index + 1}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="space-y-2">
                  {image.scopeStatus === "out_of_scope" ? (
                    <div className="rounded-md border border-border bg-secondary p-3 text-sm text-muted-foreground">
                      {image.scopeReason || "Bu görsel kapsam dışı değerlendirilmiştir."}
                    </div>
                  ) : image.findings.length === 0 ? (
                    <div className="rounded-md border border-border bg-secondary p-3 text-sm text-muted-foreground">
                      Bu filtrede gösterilecek risk yok.
                    </div>
                  ) : (
                    image.findings.map((finding) => (
                      <button
                        key={finding.findingCode}
                        className="w-full rounded-md border border-border p-3 text-left hover:bg-secondary"
                        onClick={() => setActive({ ...finding, imageCode: image.imageCode })}
                        type="button"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold">{finding.findingCode} · {finding.title}</p>
                          <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-semibold ${riskTone(finding.riskClass)}`}>
                            {riskLabel(finding.riskClass)}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">{finding.emergencyAction}</p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </article>
          ))}
        </section>

        <aside className="sticky top-4 h-fit rounded-md border border-border bg-card p-4">
          <h2 className="text-base font-semibold">Risk Detayı</h2>
          {active ? (
            <div className="mt-4 space-y-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">{active.imageCode} · {active.findingCode}</p>
                <h3 className="mt-1 font-semibold">{active.title}</h3>
                <span className={`mt-2 inline-flex rounded px-2 py-1 text-xs font-semibold ${riskTone(active.riskClass)}`}>
                  {riskLabel(active.riskClass)} · Skor {active.score}
                </span>
              </div>
              {[
                ["Kategori", active.category],
                ["Gözlemlenen kanıt", active.observedEvidence],
                ["Olası sonuç", active.possibleConsequence],
                ["Acil aksiyon", active.emergencyAction],
                ["Düzeltici faaliyet", active.correctiveAction],
                ["Önleyici faaliyet", active.preventiveAction],
                ["Doğrulama ihtiyacı", active.verificationNeeds],
                ["Mevzuat bağlamı", active.legalContext],
                ["Sorumlu / termin", [active.responsiblePerson, active.deadline].filter(Boolean).join(" / ")],
                ["Tamamlanma kanıtı", active.completionEvidence],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
                  <p className="mt-1 text-sm">{value || "-"}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">Bir risk seçin.</p>
          )}
        </aside>
      </main>
    </div>
  );
}
