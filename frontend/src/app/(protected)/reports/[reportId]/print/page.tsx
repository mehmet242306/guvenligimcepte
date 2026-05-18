import { notFound } from "next/navigation";
import { loadRiskAnalysisReportJsonFromDb } from "@/lib/risk-analysis/report-data-server";
import type { RiskReportFinding, RiskReportImage } from "@/lib/risk-analysis/report-json";

type Props = {
  params: Promise<{ reportId: string }>;
};

function riskLabel(level: string) {
  if (level === "critical") return "Kritik";
  if (level === "high") return "Yüksek";
  if (level === "medium") return "Orta";
  if (level === "low" || level === "follow_up") return "Düşük / İzleme";
  return level || "-";
}

function methodLabel(method: string) {
  if (method === "fine_kinney") return "Fine-Kinney";
  if (method === "l_matrix") return "L Tipi Matris";
  if (method === "r_skor_2d") return "R Skor 2D";
  return method || "-";
}

function cleanListItem(value: string) {
  return String(value || "").replace(/^\s*\d+[\.)]\s*/, "").trim();
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <div className="field-label">{label}</div>
      <div className="field-value">{children || "-"}</div>
    </div>
  );
}

function RiskBadge({ level }: { level: string }) {
  return <span className={`badge ${level}`}>{riskLabel(level)}</span>;
}

function RiskCard({ finding, method }: { finding: RiskReportFinding; method: string }) {
  return (
    <article className="risk-card">
      <div className="risk-card-head">
        <div>
          <p className="eyebrow">{finding.findingCode}</p>
          <h4>{finding.title}</h4>
        </div>
        <RiskBadge level={finding.riskClass} />
      </div>
      <div className="risk-grid">
        <Field label="Kategori">{finding.category}</Field>
        <Field label="Skor / yöntem">{finding.score} · {methodLabel(method)}</Field>
        <Field label="P/F/S">{[finding.probability, finding.frequency, finding.severity].map((x) => x ?? "-").join(" / ")}</Field>
        <Field label="Güven">{finding.confidence}</Field>
        <Field label="Gözlemlenen kanıt">{finding.observedEvidence}</Field>
        <Field label="Olası sonuç">{finding.possibleConsequence}</Field>
        <Field label="Acil aksiyon">{finding.emergencyAction}</Field>
        <Field label="Düzeltici faaliyet">{finding.correctiveAction}</Field>
        <Field label="Önleyici faaliyet">{finding.preventiveAction}</Field>
        <Field label="Doğrulama ihtiyacı">{finding.verificationNeeds}</Field>
        <Field label="Mevzuat bağlamı">{finding.legalContext}</Field>
        <Field label="Sorumlu / termin">{[finding.responsiblePerson, finding.deadline].filter(Boolean).join(" / ")}</Field>
        <Field label="Tamamlanma kanıtı">{finding.completionEvidence}</Field>
        <Field label="Artık risk">{finding.residualRisk}</Field>
      </div>
    </article>
  );
}

function ImageSummary({ image }: { image: RiskReportImage }) {
  return (
    <div className={`image-summary ${image.scopeStatus}`}>
      <Field label="Saha tanımı">{image.sceneDescription}</Field>
      <Field label="Sahne tipi">{image.sceneType}</Field>
      <Field label="Kapsam kararı">{image.scopeStatus === "in_scope" ? "Kapsam içi" : "Kapsam dışı"}</Field>
      <Field label="Risk sayısı">{image.scopeStatus === "in_scope" ? image.findings.length : "Risk tablosu oluşturulmadı"}</Field>
      <Field label="Kapsam gerekçesi">{image.scopeReason || "Saha doğrulaması önerilir."}</Field>
    </div>
  );
}

export default async function RiskReportPrintPage({ params }: Props) {
  const { reportId } = await params;
  const report = await loadRiskAnalysisReportJsonFromDb(reportId);
  if (!report) notFound();

  const findings = report.images.flatMap((image) => image.findings.map((finding) => ({ ...finding, imageCode: image.imageCode })));
  const inScopeImages = report.images.filter((image) => image.scopeStatus === "in_scope");
  const outOfScopeImages = report.images.filter((image) => image.scopeStatus === "out_of_scope");

  return (
    <main className="print-report">
      <style>{`
        @page { size: A4; margin: 13mm; }
        * { box-sizing: border-box; }
        body { background: white; }
        .print-report { color: #0f172a; background: white; font-family: Arial, Helvetica, sans-serif; font-size: 10.5px; line-height: 1.45; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .toolbar { position: sticky; top: 0; z-index: 10; background: white; border-bottom: 1px solid #e2e8f0; padding: 8px 0; margin-bottom: 8px; }
        .toolbar a, .toolbar span { border: 1px solid #cbd5e1; border-radius: 6px; background: white; color: #0f172a; padding: 7px 10px; font-size: 13px; text-decoration: none; display: inline-block; }
        .cover { min-height: 255mm; display: flex; flex-direction: column; justify-content: space-between; border-top: 18mm solid #0f172a; padding-top: 8mm; page-break-after: always; }
        .brand { color: #b48e26; font-size: 12px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
        h1 { font-size: 34px; margin: 14mm 0 4mm; line-height: 1.08; color: #0f172a; }
        h2 { break-after: avoid; page-break-after: avoid; border-left: 4px solid #b48e26; padding-left: 8px; margin: 11mm 0 4mm; font-size: 18px; color: #0f172a; }
        h3 { break-after: avoid; page-break-after: avoid; margin: 0 0 3mm; font-size: 14px; color: #0f172a; }
        h4 { margin: 0; font-size: 12px; color: #0f172a; }
        p, td, th, .field-value { overflow-wrap: anywhere; white-space: normal; }
        table { width: 100%; border-collapse: collapse; table-layout: fixed; margin: 3mm 0; }
        thead { display: table-header-group; }
        tr { break-inside: avoid; page-break-inside: avoid; }
        th { background: #1e293b; color: white; font-size: 9px; text-align: left; padding: 5px; }
        td { border: 1px solid #e2e8f0; font-size: 9px; vertical-align: top; padding: 5px; }
        .section { break-inside: avoid; page-break-inside: avoid; }
        .card, .note-card, .risk-card, .image-section, .approval-table, .image-summary { break-inside: avoid; page-break-inside: avoid; }
        .note-card, .card, .image-section { border: 1px solid #e2e8f0; border-radius: 8px; padding: 5mm; margin: 4mm 0; background: #fff; }
        .summary { display: grid; grid-template-columns: repeat(5, 1fr); gap: 3mm; margin: 5mm 0; }
        .metric { border: 1px solid #e2e8f0; border-radius: 7px; padding: 4mm; background: #f8fafc; break-inside: avoid; page-break-inside: avoid; }
        .metric span { display: block; color: #64748b; font-size: 9px; font-weight: 700; text-transform: uppercase; }
        .metric strong { display: block; margin-top: 1.5mm; font-size: 20px; }
        .meta-grid, .image-summary, .risk-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 2mm; }
        .field { border: 1px solid #e2e8f0; border-radius: 6px; padding: 2.5mm; background: #fff; }
        .field-label { color: #64748b; font-size: 8px; font-weight: 800; text-transform: uppercase; margin-bottom: 1mm; }
        .field-value { color: #0f172a; font-size: 9.5px; font-weight: 600; }
        .image-section { page-break-before: auto; }
        .image-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 3mm; }
        .image-preview-wrap { position: relative; border: 1px solid #e2e8f0; border-radius: 7px; background: #f8fafc; padding: 2mm; margin: 4mm 0; break-inside: avoid; page-break-inside: avoid; }
        .image-preview { display: block; max-height: 110mm; width: 100%; object-fit: contain; border-radius: 5px; }
        .out-note { border: 1px solid #fde68a; background: #fffbeb; border-radius: 7px; padding: 4mm; color: #92400e; font-weight: 700; }
        .risk-mini-table th:nth-child(1) { width: 16%; }
        .risk-mini-table th:nth-child(3) { width: 16%; }
        .risk-mini-table th:nth-child(4) { width: 14%; }
        .risk-card { border: 1px solid #dbe3ef; border-radius: 8px; padding: 4mm; margin: 4mm 0; background: #ffffff; }
        .risk-card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 3mm; }
        .eyebrow { color: #b48e26; font-size: 8px; font-weight: 900; letter-spacing: .08em; margin: 0 0 1mm; }
        .badge { display: inline-flex; align-items: center; border-radius: 999px; padding: 2px 7px; font-size: 8px; font-weight: 900; color: white; background: #64748b; white-space: nowrap; }
        .critical { background: #b91c1c; }
        .high { background: #ea580c; }
        .medium { background: #d97706; color: #111827; }
        .low, .follow_up { background: #16a34a; }
        .actions { padding-left: 0; list-style-position: inside; }
        .actions li { margin-bottom: 2mm; break-inside: avoid; page-break-inside: avoid; border: 1px solid #e2e8f0; border-radius: 6px; padding: 2.5mm; list-style-position: inside; }
        .footer-note { color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 4mm; font-size: 9px; }
        @media print {
          .toolbar { display: none; }
          a { color: inherit; text-decoration: none; }
        }
      `}</style>

      <div className="toolbar">
        <span>Tarayıcıdan yazdırmak için Ctrl+P kullanın</span>{" "}
        <a href={`/api/risk-analysis/export/${reportId}`}>PDF indir</a>{" "}
        <a href={`/reports/${reportId}/interactive`}>Etkileşimli görünüm</a>
      </div>

      <section className="cover">
        <div>
          <p className="brand">RiskNova</p>
          <h1>Risk Değerlendirme Raporu</h1>
          <p>{report.reportMeta.title}</p>
          <div className="meta-grid">
            <Field label="Firma">{report.reportMeta.companyName}</Field>
            <Field label="Tarih">{report.reportMeta.reportDate}</Field>
            <Field label="Lokasyon">{report.reportMeta.locationName}</Field>
            <Field label="Departman">{report.reportMeta.departmentName}</Field>
            <Field label="Yöntem">{methodLabel(report.reportMeta.method)}</Field>
            <Field label="Durum">{report.reportMeta.status}</Field>
            <Field label="Hazırlayan">{report.reportMeta.preparedBy}</Field>
            <Field label="Rapor ID">{report.reportMeta.reportId}</Field>
          </div>
        </div>
        <p className="footer-note">Bu rapor, kayıtlı risk analizi verilerinden oluşturulan kurumsal teslim çıktısıdır. Bulgular saha doğrulaması ve yetkili imza süreciyle birlikte değerlendirilmelidir.</p>
      </section>

      <section>
        <h2>1. Amaç, Kapsam ve Rapor Esası</h2>
        <div className="note-card">
          <p>Sahada gözlenen İSG tehlikelerini karar verilebilir risk kayıtlarına dönüştürmek, önceliklendirmek ve aksiyon takibine uygun raporlamak.</p>
          <p>Bu rapor fotoğraf, kullanıcı girdileri ve kayıtlı risk bulgularına dayanır. Belge, eğitim, izin, ekipman sertifikası ve saha ölçümü gerektiren hususlar ayrıca doğrulanmalıdır.</p>
        </div>
      </section>

      <section>
        <h2>2. Yönetici Özeti</h2>
        <div className="summary">
          <div className="metric"><span>Görsel</span><strong>{report.summary.totalImages}</strong></div>
          <div className="metric"><span>Kapsam içi</span><strong>{report.summary.inScopeImages}</strong></div>
          <div className="metric"><span>Kapsam dışı</span><strong>{report.summary.outOfScopeImages}</strong></div>
          <div className="metric"><span>Kritik</span><strong>{report.summary.criticalCount}</strong></div>
          <div className="metric"><span>Yüksek</span><strong>{report.summary.highCount}</strong></div>
        </div>
      </section>

      <section>
        <h2>3. Görsel Kapsam Kontrol Tablosu</h2>
        <table>
          <thead><tr><th>Kod</th><th>Dosya</th><th>Sahne</th><th>Kapsam</th><th>Durum</th><th>Gerekçe</th></tr></thead>
          <tbody>
            {report.images.map((image) => (
              <tr key={image.imageCode}>
                <td>{image.imageCode}</td>
                <td>{image.fileName}</td>
                <td>{image.sceneType}</td>
                <td>{image.scopeStatus === "in_scope" ? "Kapsam içi" : "Kapsam dışı"}</td>
                <td>{image.analysisStatus}</td>
                <td>{image.scopeReason || "Saha doğrulaması önerilir."}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2>4. Metodoloji</h2>
        <div className="note-card">
          <p>Metot: {methodLabel(report.reportMeta.method)}. Skor ve risk sınıfı, kayıtlı analiz metoduna göre değerlendirilmiştir.</p>
          <p>Uzun açıklamalar tablo hücrelerinde sıkıştırılmaz; detaylar risk fişlerinde kart formatında verilir.</p>
        </div>
      </section>

      <section>
        <h2>5. Analiz Ekibi</h2>
        <div className="note-card">
          <p>Hazırlayan: {report.reportMeta.preparedBy || "-"}</p>
        </div>
      </section>

      <section>
        <h2>6. Konsolide Risk Kayıt Tablosu</h2>
        <table>
          <thead><tr><th>Görsel</th><th>Kod</th><th>Risk</th><th>Skor</th><th>Sınıf</th><th>Acil aksiyon</th></tr></thead>
          <tbody>
            {findings.map((finding) => (
              <tr key={finding.findingCode}>
                <td>{finding.imageCode}</td>
                <td>{finding.findingCode}</td>
                <td>{finding.title}</td>
                <td>{finding.score}</td>
                <td><RiskBadge level={finding.riskClass} /></td>
                <td>{finding.emergencyAction}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2>7. Görsel Bazlı Analiz</h2>
        {inScopeImages.map((image) => (
          <article className="image-section" key={image.imageCode}>
            <div className="image-head">
              <div>
                <p className="eyebrow">{image.imageCode}</p>
                <h3>{image.imageCode} - {image.fileName}</h3>
              </div>
              <span className="badge low">{image.findings.length} risk</span>
            </div>
            <ImageSummary image={image} />
            {image.optimizedImageUrl || image.imageUrl ? (
              <div className="image-preview-wrap">
                <img className="image-preview" src={image.optimizedImageUrl || image.imageUrl} alt={image.fileName} />
              </div>
            ) : null}
            {image.findings.length > 0 ? (
              <table className="risk-mini-table">
                <thead><tr><th>Kod</th><th>Risk</th><th>Sınıf</th><th>Skor</th><th>Acil aksiyon</th></tr></thead>
                <tbody>
                  {image.findings.map((finding) => (
                    <tr key={finding.findingCode}>
                      <td>{finding.findingCode}</td>
                      <td>{finding.title}</td>
                      <td><RiskBadge level={finding.riskClass} /></td>
                      <td>{finding.score}</td>
                      <td>{finding.emergencyAction}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="out-note">Bu görselde kayıtlı risk bulgusu bulunmuyor; saha doğrulaması önerilir.</p>
            )}
          </article>
        ))}
      </section>

      <section>
        <h2>8. Kapsam Dışı Görseller</h2>
        {outOfScopeImages.length === 0 ? (
          <div className="note-card">Kapsam dışı görsel bulunmuyor.</div>
        ) : (
          outOfScopeImages.map((image) => (
            <div className="note-card" key={image.imageCode}>
              <h3>{image.imageCode} - {image.fileName}</h3>
              <p>{image.scopeReason || "Bu görsel kapsam dışı değerlendirilmiştir."}</p>
              <p>Bu görsel için risk tablosu oluşturulmamıştır.</p>
            </div>
          ))
        )}
      </section>

      <section>
        <h2>9. Risk Detay Fişleri</h2>
        {inScopeImages.map((image) => (
          <div key={`cards-${image.imageCode}`}>
            <h3>{image.imageCode} - {image.fileName}</h3>
            {image.findings.map((finding) => <RiskCard key={finding.findingCode} finding={finding} method={report.reportMeta.method} />)}
          </div>
        ))}
      </section>

      <section>
        <h2>10. Öncelikli Aksiyon Listesi</h2>
        <ol className="actions">{report.actions.map((action) => <li key={action}>{cleanListItem(action)}</li>)}</ol>
      </section>

      <section>
        <h2>11. Saha Doğrulama Kontrol Listesi</h2>
        <ol className="actions">{report.verificationChecklist.map((item) => <li key={item}>{cleanListItem(item)}</li>)}</ol>
      </section>

      <section>
        <h2>12. Mevzuat ve Standart Referansları</h2>
        <ol className="actions">{report.legalReferences.map((item) => <li key={item}>{cleanListItem(item)}</li>)}</ol>
      </section>

      <section>
        <h2>13. Onay, İmza ve QR Doğrulama</h2>
        <table className="approval-table">
          <thead><tr><th>Rol</th><th>Ad Soyad</th><th>Unvan</th><th>Tarih</th><th>İmza</th></tr></thead>
          <tbody>
            {report.approvals.map((approval) => (
              <tr key={approval.role}><td>{approval.role}</td><td>{approval.fullName}</td><td>{approval.title}</td><td>{approval.date}</td><td>{approval.signature}</td></tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
