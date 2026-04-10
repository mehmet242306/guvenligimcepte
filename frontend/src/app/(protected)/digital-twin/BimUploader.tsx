"use client";

import { useState, useRef } from "react";
import { createClient as supabase } from "@/lib/supabase/client";

/**
 * BIM Model Uploader
 *
 * .ifc dosyası yükler, metadata çıkarır, Supabase'e kaydeder.
 * Yüklenen modeller saha taramalarıyla ilişkilendirilebilir.
 */

type BimUploaderProps = {
  companyId?: string;
  onUploaded?: (model: any) => void;
};

export default function BimUploader({ companyId, onUploaded }: BimUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // .ifc dosya headerinden basit metadata çıkar
  async function extractIfcMetadata(file: File): Promise<{ schema?: string; description?: string }> {
    try {
      const text = await file.slice(0, 4096).text();
      const schemaMatch = text.match(/FILE_SCHEMA\s*\(\s*\(\s*'([^']+)'/);
      const descMatch = text.match(/FILE_DESCRIPTION\s*\(\s*\(\s*'([^']+)'/);
      return {
        schema: schemaMatch?.[1],
        description: descMatch?.[1],
      };
    } catch {
      return {};
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccess(null);
    setUploading(true);
    setProgress(0);

    try {
      // Validate
      if (file.size > 100 * 1024 * 1024) {
        throw new Error("Dosya 100MB'tan büyük olamaz");
      }
      if (!file.name.toLowerCase().endsWith(".ifc")) {
        throw new Error("Sadece .ifc dosyaları desteklenir");
      }

      const sb = supabase();
      if (!sb) throw new Error("Supabase bağlantısı yok");

      // Metadata extract
      const meta = await extractIfcMetadata(file);
      setProgress(15);

      // Storage upload
      const fileName = `${companyId || "general"}/${Date.now()}_${file.name}`;
      const { error: uploadErr } = await sb.storage
        .from("bim-models")
        .upload(fileName, file, { contentType: "model/ifc", upsert: false });

      if (uploadErr) throw uploadErr;
      setProgress(70);

      const { data: urlData } = sb.storage.from("bim-models").getPublicUrl(fileName);

      // DB insert
      const { data: { user } } = await sb.auth.getUser();
      const { data: insertData, error: insertErr } = await sb
        .from("bim_models")
        .insert({
          company_id: companyId || null,
          user_id: user?.id,
          name: file.name.replace(/\.ifc$/i, ""),
          file_name: file.name,
          file_url: urlData?.publicUrl,
          file_size: file.size,
          ifc_schema: meta.schema,
          metadata: { description: meta.description },
        })
        .select()
        .single();

      if (insertErr) throw insertErr;

      setProgress(100);
      setSuccess(`✓ ${file.name} başarıyla yüklendi`);
      onUploaded?.(insertData);

      // Reset
      setTimeout(() => {
        setProgress(0);
        setSuccess(null);
      }, 3000);
    } catch (e: any) {
      setError(e.message || "Yükleme hatası");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div
      style={{
        background: "rgba(15,23,42,0.6)",
        border: "1px dashed rgba(249,115,22,0.4)",
        borderRadius: 14,
        padding: 20,
        textAlign: "center",
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".ifc"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />

      {!uploading && !success && (
        <>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🏗️</div>
          <h4 style={{ color: "#fff", fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
            BIM Modeli Yükle
          </h4>
          <p style={{ color: "#94A3B8", fontSize: 11, marginBottom: 12 }}>
            .ifc dosyanızı seçin (max 100MB) — sahanın 3D modeli dijital ikize entegre edilir
          </p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              background: "#F97316",
              color: "#fff",
              border: "none",
              padding: "10px 20px",
              borderRadius: 10,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            📂 .ifc Dosyası Seç
          </button>
        </>
      )}

      {uploading && (
        <div>
          <div style={{ color: "#F97316", fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
            Yükleniyor... {progress}%
          </div>
          <div
            style={{
              width: "100%",
              height: 8,
              background: "rgba(255,255,255,0.1)",
              borderRadius: 4,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: "100%",
                background: "#F97316",
                transition: "width 0.2s",
              }}
            />
          </div>
        </div>
      )}

      {success && (
        <div style={{ color: "#34D399", fontSize: 13, fontWeight: 700 }}>{success}</div>
      )}

      {error && (
        <div style={{ color: "#F87171", fontSize: 12, marginTop: 8 }}>⚠️ {error}</div>
      )}
    </div>
  );
}
