"use client";

/* eslint-disable @next/next/no-img-element */

interface Props {
  assessment: Record<string, unknown>;
  rows: Record<string, unknown>[];
  findings: Record<string, unknown>[];
  images: Record<string, unknown>[];
  imageUrls: Record<string, string>;
  companyName: string;
  companySector: string;
  companyHazardClass: string;
}

function sevLabel(s: string) {
  return s === "critical" ? "Kritik" : s === "high" ? "Yuksek" : s === "medium" ? "Orta" : "Dusuk";
}
function sevColor(s: string) {
  return s === "critical" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
    : s === "high" ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
    : s === "medium" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
    : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
}
function methodLabel(m: string) {
  return m === "r_skor" ? "R-SKOR 2D" : m === "fine_kinney" ? "Fine-Kinney" : m === "l_matrix" ? "L-Matris" : m === "fmea" ? "FMEA" : m === "hazop" ? "HAZOP" : (m || "").toUpperCase();
}

export function SharedRiskAnalysisView({ assessment, rows, findings, images, imageUrls, companyName, companySector, companyHazardClass }: Props) {
  const title = assessment.title as string || "Risk Analizi Raporu";
  const method = assessment.method as string || "";
  const date = assessment.assessment_date as string || "";
  const location = assessment.location_text as string || "";
  const department = assessment.department_name as string || "";
  const note = assessment.analysis_note as string || "";
  const participants = (assessment.participants as Record<string, string>[]) || [];

  const totalFindings = findings.length;
  const criticalCount = findings.filter((f) => f.severity === "critical").length;
  const highCount = findings.filter((f) => f.severity === "high").length;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--gold)]">Risk Analizi Raporu</p>
            <h1 className="mt-1 text-2xl font-bold text-foreground">{title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {companyName}{companySector ? ` · ${companySector}` : ""}{companyHazardClass ? ` · ${companyHazardClass}` : ""}
            </p>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <p className="font-semibold">RiskNova ISG Platformu</p>
            <p>{methodLabel(method)}</p>
            {date && <p>{new Date(date).toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" })}</p>}
            {location && <p>Lokasyon: {location}</p>}
            {department && <p>Bolum: {department}</p>}
          </div>
        </div>

        {/* Stats */}
        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-border p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{totalFindings}</p>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Toplam Tespit</p>
          </div>
          <div className="rounded-xl border border-border p-3 text-center">
            <p className={`text-2xl font-bold ${criticalCount > 0 ? "text-red-600" : "text-muted-foreground"}`}>{criticalCount}</p>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Kritik</p>
          </div>
          <div className="rounded-xl border border-border p-3 text-center">
            <p className={`text-2xl font-bold ${highCount > 0 ? "text-orange-500" : "text-muted-foreground"}`}>{highCount}</p>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Yuksek</p>
          </div>
        </div>
      </div>

      {/* Katılımcılar */}
      {participants.length > 0 && (
        <div className="mt-4 rounded-2xl border border-border bg-card p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Analiz Ekibi</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {participants.map((p, i) => (
              <span key={i} className="rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs font-medium text-foreground">
                {p.fullName || p.full_name} — {p.title}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Analiz Notu */}
      {note && (
        <div className="mt-4 rounded-2xl border border-border bg-card p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Analiz Notu</h2>
          <p className="mt-2 text-sm text-foreground">{note}</p>
        </div>
      )}

      {/* Satır Bazlı Tespitler */}
      <div className="mt-6 space-y-5">
        <h2 className="text-lg font-bold text-foreground">Satir Bazli Risk Tespitleri</h2>
        {rows.map((row, ri) => {
          const rowId = row.id as string;
          const rowTitle = row.title as string || `Satir ${ri + 1}`;
          const rowImages = images.filter((img) => img.row_id === rowId);
          const rowFindings = findings.filter((f) => f.row_id === rowId);

          return (
            <div key={rowId} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-foreground">
                  <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{ri + 1}</span>
                  {rowTitle}
                </h3>
                <span className="text-xs text-muted-foreground">{rowFindings.length} tespit · {rowImages.length} gorsel</span>
              </div>

              {/* Görseller */}
              {rowImages.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-3">
                  {rowImages.map((img) => {
                    const url = imageUrls[img.id as string];
                    return url ? (
                      <div key={img.id as string} className="overflow-hidden rounded-xl border border-border shadow-sm">
                        <img src={url} alt={img.file_name as string} className="h-48 w-auto object-cover" />
                      </div>
                    ) : null;
                  })}
                </div>
              )}

              {/* Tespitler */}
              {rowFindings.length > 0 && (
                <div className="mt-4 space-y-3">
                  {rowFindings.map((f, fi) => (
                    <div key={f.id as string} className="rounded-xl border border-border bg-secondary/20 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-muted-foreground">#{fi + 1}</span>
                            <h4 className="text-sm font-semibold text-foreground">{f.title as string}</h4>
                          </div>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${sevColor(f.severity as string)}`}>{sevLabel(f.severity as string)}</span>
                            <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{f.category as string}</span>
                          </div>
                        </div>
                      </div>
                      {(f.recommendation as string) && (
                        <div className="mt-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Oneri</p>
                          <p className="mt-0.5 text-sm text-foreground">{f.recommendation as string}</p>
                        </div>
                      )}
                      {Array.isArray(f.legal_references) && f.legal_references.length > 0 && (
                        <div className="mt-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Mevzuat Dayanagi</p>
                          <div className="mt-1 space-y-1">
                            {(f.legal_references as { law: string; article: string; description: string }[]).map((ref, ri2) => (
                              <p key={ri2} className="text-xs text-muted-foreground">
                                <span className="font-semibold text-foreground">{ref.law}</span> — {ref.article}: {ref.description}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {rowFindings.length === 0 && (
                <p className="mt-3 text-xs text-muted-foreground">Bu satirda tespit yok.</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-8 border-t border-border pt-4 text-center text-xs text-muted-foreground">
        <p>Bu rapor <span className="font-semibold text-foreground">RiskNova ISG Platformu</span> tarafindan olusturulmustur.</p>
        <p className="mt-0.5">Rapor icerigi {methodLabel(method)} yontemi ile degerlendirilmistir.</p>
      </div>
    </div>
  );
}
