"use client";

import { useState } from "react";
import { useLocale } from "next-intl";

type ImportedEmployee = {
  sourceRow: number;
  fullName: string;
  title: string;
  unit: string;
  startDate: string;
  shift: string;
  specialPolicy: boolean;
  note: string;
};

type ImportResponse = {
  fileName: string;
  totalRows: number;
  specialPolicyCount: number;
  rows: ImportedEmployee[];
  error?: string;
};

export default function EmployeeImportPanel({ companyName }: { companyName: string }) {
  const locale = useLocale();
  const isTr = locale === "tr";
  const copy = isTr
    ? {
        selectFile: "Lütfen bir Excel veya CSV dosyası seçin.",
        importFailed: "İçe aktarma başarısız oldu.",
        connectionFailed: "Sunucuya bağlanırken hata oluştu.",
        title: "Excel / CSV Personel İçe Aktarma",
        description: `${companyName} için personel listesini Excel veya CSV olarak yükleyebilirsin. Bu aşamada yüklenen veri önizleme olarak gösterilir; kalıcı kayıt daha sonra eklenecek.`,
        loading: "Yükleniyor...",
        import: "İçe Aktar",
        expectedColumns: "Beklenen kolonlar",
        columns: "Ad Soyad, Görev, Birim, İşe Giriş, Vardiya, Özel Politika Durumu, Not",
        file: "Dosya",
        importedRows: "Aktarılan Satır",
        specialPolicyRequired: "Özel Politika Gerektiren",
        row: "Satır",
        fullName: "Ad Soyad",
        titleColumn: "Görev",
        unit: "Birim",
        startDate: "İşe Giriş",
        shift: "Vardiya",
        specialPolicy: "Özel Politika",
        note: "Not",
        yes: "Evet",
        no: "Hayır",
      }
    : {
        selectFile: "Please select an Excel or CSV file.",
        importFailed: "Import failed.",
        connectionFailed: "Could not connect to the server.",
        title: "Excel / CSV Personnel Import",
        description: `Upload the personnel list for ${companyName} as an Excel or CSV file. Imported data is shown as a preview at this stage; permanent records will be added later.`,
        loading: "Uploading...",
        import: "Import",
        expectedColumns: "Expected columns",
        columns: "Full Name, Role, Unit, Start Date, Shift, Special Policy Status, Notes",
        file: "File",
        importedRows: "Imported Rows",
        specialPolicyRequired: "Requiring Special Policy",
        row: "Row",
        fullName: "Full Name",
        titleColumn: "Role",
        unit: "Unit",
        startDate: "Start Date",
        shift: "Shift",
        specialPolicy: "Special Policy",
        note: "Notes",
        yes: "Yes",
        no: "No",
      };
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ImportResponse | null>(null);
  const [error, setError] = useState("");

  async function handleImport() {
    if (!file) {
      setError(copy.selectFile);
      return;
    }

    setLoading(true);
    setError("");
    setData(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/import-employees", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error || copy.importFailed);
      } else {
        setData(result);
      }
    } catch {
      setError(copy.connectionFailed);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        border: "1px solid #eee",
        borderRadius: 16,
        padding: 16,
        background: "#fff",
        marginBottom: 18,
      }}
    >
      <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>
        {copy.title}
      </div>

      <div style={{ opacity: 0.8, lineHeight: 1.7, marginBottom: 14 }}>
        {copy.description}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: 12,
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        <input
          type="file"
          accept=".xlsx,.csv"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          style={{
            padding: 10,
            border: "1px solid #eee",
            borderRadius: 12,
          }}
        />

        <button
          onClick={handleImport}
          disabled={loading}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid #ddd",
            background: "#fafafa",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {loading ? copy.loading : copy.import}
        </button>
      </div>

      <div
        style={{
          border: "1px dashed #ddd",
          borderRadius: 12,
          padding: 12,
          marginBottom: 14,
          background: "#fcfcfc",
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 6 }}>{copy.expectedColumns}</div>
        <div style={{ opacity: 0.75, lineHeight: 1.8 }}>
          {copy.columns}
        </div>
      </div>

      {error ? (
        <div
          style={{
            marginBottom: 14,
            padding: 12,
            borderRadius: 12,
            background: "#fff4f4",
            border: "1px solid #f2d3d3",
            color: "#8b1e1e",
            fontWeight: 600,
          }}
        >
          {error}
        </div>
      ) : null}

      {data ? (
        <div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
              <div style={{ opacity: 0.7, marginBottom: 4 }}>{copy.file}</div>
              <div style={{ fontWeight: 800 }}>{data.fileName}</div>
            </div>

            <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
              <div style={{ opacity: 0.7, marginBottom: 4 }}>{copy.importedRows}</div>
              <div style={{ fontWeight: 800 }}>{data.totalRows}</div>
            </div>

            <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
              <div style={{ opacity: 0.7, marginBottom: 4 }}>{copy.specialPolicyRequired}</div>
              <div style={{ fontWeight: 800 }}>{data.specialPolicyCount}</div>
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid #eee" }}>
                  <th style={{ padding: "10px 8px" }}>{copy.row}</th>
                  <th style={{ padding: "10px 8px" }}>{copy.fullName}</th>
                  <th style={{ padding: "10px 8px" }}>{copy.titleColumn}</th>
                  <th style={{ padding: "10px 8px" }}>{copy.unit}</th>
                  <th style={{ padding: "10px 8px" }}>{copy.startDate}</th>
                  <th style={{ padding: "10px 8px" }}>{copy.shift}</th>
                  <th style={{ padding: "10px 8px" }}>{copy.specialPolicy}</th>
                  <th style={{ padding: "10px 8px" }}>{copy.note}</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row, index) => (
                  <tr key={index} style={{ borderBottom: "1px solid #f3f3f3" }}>
                    <td style={{ padding: "10px 8px" }}>{row.sourceRow}</td>
                    <td style={{ padding: "10px 8px", fontWeight: 700 }}>{row.fullName}</td>
                    <td style={{ padding: "10px 8px" }}>{row.title}</td>
                    <td style={{ padding: "10px 8px" }}>{row.unit}</td>
                    <td style={{ padding: "10px 8px" }}>{row.startDate}</td>
                    <td style={{ padding: "10px 8px" }}>{row.shift}</td>
                    <td style={{ padding: "10px 8px" }}>{row.specialPolicy ? copy.yes : copy.no}</td>
                    <td style={{ padding: "10px 8px" }}>{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
