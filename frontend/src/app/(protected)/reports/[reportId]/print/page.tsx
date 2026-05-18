import { notFound } from "next/navigation";
import { loadRiskAnalysisReportJsonFromDb } from "@/lib/risk-analysis/report-data-server";

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

export default async function RiskReportPrintPage({ params }: Props) {
  const { reportId } = await params;
  const report = await loadRiskAnalysisReportJsonFromDb(reportId);
  if (!report) notFound();

  return (
    <main className="print-report">
      <style>{`
        @page { size: A4; margin: 14mm; }
        .print-report { color: #0f172a; background: white; font-family: Arial, sans-serif; }
        .cover { min-height: 255mm; display: flex; flex-direction: column; justify-content: space-between; border-top: 14mm solid #0f172a; }
        .brand { color: #b48e26; font-size: 12px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
        h1 { font-size: 32px; margin: 14mm 0 4mm; line-height: 1.1; }
        h2 { break-after: avoid; page-break-after: avoid; border-left: 4px solid #b48e26; padding-left: 8px; margin: 14mm 0 5mm; font-size: 18px; }
        h3 { break-after: avoid; page-break-after: avoid; margin: 0 0 3mm; font-size: 14px; }
        p { overflow-wrap: anywhere; white-space: normal; }
        table { width: 100%; border-collapse: collapse; table-layout: fixed; break-inside: avoid; page-break-inside: avoid; margin: 4mm 0; }
        th { background: #1e293b; color: white; font-size: 10px; text-align: left; padding: 6px; }
        td { border: 1px solid #e2e8f0; font-size: 10px; vertical-align: top; padding: 6px; overflow-wrap: anywhere; white-space: normal; }
        .meta td:nth-child(odd) { background: #fdf8ea; font-weight: 700; width: 22%; }
        .summary { display: grid; grid-template-columns: repeat(5, 1fr); gap: 3mm; margin: 6mm 0; }
        .metric { border: 1px solid #e2e8f0; border-radius: 4px; padding: 4mm; break-inside: avoid; page-break-inside: avoid; }
        .metric span { display: block; color: #64748b; font-size: 10px; }
        .metric strong { display: block; margin-top: 2mm; font-size: 22px; }
        .image-section, .risk-card, .approval, .note-card { break-inside: avoid; page-break-inside: avoid; border: 1px solid #e2e8f0; border-radius: 5px; padding: 5mm; margin: 5mm 0; }
        .image-preview { max-height: 120mm; width: 100%; object-fit: contain; border: 1px solid #e2e8f0; border-radius: 4px; margin: 4mm 0; }
        .badge { display: inline-block; border-radius: 4px; padding: 2px 6px; font-size: 9px; font-weight: 700; color: white; background: #64748b; }
        .critical { background: #b91c1c; }
        .high { background: #ea580c; }
        .medium { background: #d97706; }
        .low, .follow_up { background: #16a34a; }
        .actions li { margin-bottom: 2mm; break-inside: avoid; page-break-inside: avoid; }
        .toolbar { position: sticky; top: 0; background: white; border-bottom: 1px solid #e2e8f0; padding: 8px 0; margin-bottom: 8px; }
        .toolbar a, .toolbar span { border: 1px solid #cbd5e1; border-radius: 4px; background: white; color: #0f172a; padding: 7px 10px; font-size: 13px; text-decoration: none; display: inline-block; }
        @media print { .toolbar { display: none; } .print-report { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
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
          <table className="meta">
            <tbody>
              <tr><td>Firma</td><td>{report.reportMeta.companyName}</td><td>Tarih</td><td>{report.reportMeta.reportDate}</td></tr>
              <tr><td>Lokasyon</td><td>{report.reportMeta.locationName}</td><td>Departman</td><td>{report.reportMeta.departmentName}</td></tr>
              <tr><td>Yöntem</td><td>{report.reportMeta.method}</td><td>Durum</td><td>{report.reportMeta.status}</td></tr>
              <tr><td>Hazırlayan</td><td>{report.reportMeta.preparedBy}</td><td>Rapor ID</td><td>{report.reportMeta.reportId}</td></tr>
            </tbody>
          </table>
        </div>
        <p>Bu çıktı, kayıtlı risk analizi verilerinden oluşturulan sade print görünümüdür.</p>
      </section>

      <section>
        <h2>Amaç, Kapsam ve Rapor Esası</h2>
        <div className="note-card">
          <p>Sahada gözlenen İSG tehlikelerini karar verilebilir risk kayıtlarına dönüştürmek, önceliklendirmek ve aksiyon takibine uygun raporlamak.</p>
          <p>Bu rapor fotoğraf, kullanıcı girdileri ve kayıtlı risk bulgularına dayanır. Belge, eğitim, izin, ekipman sertifikası ve saha ölçümü gerektiren hususlar ayrıca doğrulanmalıdır.</p>
        </div>
      </section>

      <section>
        <h2>Yönetici Özeti</h2>
        <div className="summary">
          <div className="metric"><span>Görsel</span><strong>{report.summary.totalImages}</strong></div>
          <div className="metric"><span>Kapsam içi</span><strong>{report.summary.inScopeImages}</strong></div>
          <div className="metric"><span>Kapsam dışı</span><strong>{report.summary.outOfScopeImages}</strong></div>
          <div className="metric"><span>Kritik</span><strong>{report.summary.criticalCount}</strong></div>
          <div className="metric"><span>Yüksek</span><strong>{report.summary.highCount}</strong></div>
        </div>
      </section>

      <section>
        <h2>Görsel Kapsam Kontrol Tablosu</h2>
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
                <td>{image.scopeReason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2>Metodoloji ve Analiz Ekibi</h2>
        <div className="note-card">
          <p>Metot: {report.reportMeta.method}. Skor ve risk sınıfı, kayıtlı analiz metoduna göre değerlendirilmiştir.</p>
          <p>Hazırlayan: {report.reportMeta.preparedBy}</p>
        </div>
      </section>

      <section>
        <h2>Konsolide Risk Kayıt Tablosu</h2>
        <table>
          <thead><tr><th>Kod</th><th>Risk</th><th>Kategori</th><th>Skor</th><th>Sınıf</th><th>Aksiyon</th></tr></thead>
          <tbody>
            {report.images.flatMap((image) => image.findings).map((finding) => (
              <tr key={finding.findingCode}>
                <td>{finding.findingCode}</td>
                <td>{finding.title}</td>
                <td>{finding.category}</td>
                <td>{finding.score}</td>
                <td><span className={`badge ${finding.riskClass}`}>{riskLabel(finding.riskClass)}</span></td>
                <td>{finding.emergencyAction}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2>Görsel Bazlı Analiz ve Risk Detay Fişleri</h2>
        {report.images.map((image) => (
          <article className="image-section" key={image.imageCode}>
            <h3>{image.imageCode} - {image.fileName}</h3>
            <table className="meta">
              <tbody>
                <tr><td>Saha tanımı</td><td>{image.sceneDescription}</td><td>Sahne tipi</td><td>{image.sceneType}</td></tr>
                <tr><td>Kapsam kararı</td><td>{image.scopeStatus === "in_scope" ? "Kapsam içi" : "Kapsam dışı"}</td><td>Risk sayısı</td><td>{image.findings.length}</td></tr>
                <tr><td>Kapsam gerekçesi</td><td colSpan={3}>{image.scopeReason}</td></tr>
              </tbody>
            </table>
            {image.imageUrl ? (
              <img className="image-preview" src={image.imageUrl} alt={image.fileName} />
            ) : null}
            {image.scopeStatus === "out_of_scope" ? (
              <p>Bu görsel kapsam dışı değerlendirilmiştir; risk tablosu oluşturulmamıştır.</p>
            ) : (
              image.findings.map((finding) => (
                <div className="risk-card" key={finding.findingCode}>
                  <h3>{finding.findingCode} - {finding.title} <span className={`badge ${finding.riskClass}`}>{riskLabel(finding.riskClass)}</span></h3>
                  <table className="meta">
                    <tbody>
                      <tr><td>Kategori</td><td>{finding.category}</td><td>Skor</td><td>{finding.score}</td></tr>
                      <tr><td>P/F/S</td><td>{[finding.probability, finding.frequency, finding.severity].map((x) => x ?? "-").join(" / ")}</td><td>Güven</td><td>{finding.confidence}</td></tr>
                      <tr><td>Gözlemlenen kanıt</td><td colSpan={3}>{finding.observedEvidence}</td></tr>
                      <tr><td>Olası sonuç</td><td colSpan={3}>{finding.possibleConsequence}</td></tr>
                      <tr><td>Acil aksiyon</td><td colSpan={3}>{finding.emergencyAction}</td></tr>
                      <tr><td>Düzeltici faaliyet</td><td colSpan={3}>{finding.correctiveAction}</td></tr>
                      <tr><td>Önleyici faaliyet</td><td colSpan={3}>{finding.preventiveAction}</td></tr>
                      <tr><td>Doğrulama ihtiyacı</td><td colSpan={3}>{finding.verificationNeeds}</td></tr>
                      <tr><td>Mevzuat bağlamı</td><td colSpan={3}>{finding.legalContext}</td></tr>
                      <tr><td>Sorumlu / termin</td><td>{[finding.responsiblePerson, finding.deadline].filter(Boolean).join(" / ")}</td><td>Kanıt</td><td>{finding.completionEvidence}</td></tr>
                    </tbody>
                  </table>
                </div>
              ))
            )}
          </article>
        ))}
      </section>

      <section>
        <h2>Öncelikli Aksiyon Listesi</h2>
        <ol className="actions">{report.actions.map((action) => <li key={action}>{action}</li>)}</ol>
      </section>

      <section>
        <h2>Saha Doğrulama Kontrol Listesi</h2>
        <ol className="actions">{report.verificationChecklist.map((item) => <li key={item}>{item}</li>)}</ol>
      </section>

      <section>
        <h2>Mevzuat ve Standart Referansları</h2>
        <ol className="actions">{report.legalReferences.map((item) => <li key={item}>{item}</li>)}</ol>
      </section>

      <section>
        <h2>Onay, İmza ve QR Doğrulama</h2>
        <table>
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
