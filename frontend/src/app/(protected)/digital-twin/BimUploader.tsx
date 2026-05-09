"use client";

import { useRef, useState } from "react";
import { useLocale } from "next-intl";
import { createClient as supabase } from "@/lib/supabase/client";

type BimUploaderProps = {
  companyId?: string;
  onUploaded?: (model: any) => void;
};

export default function BimUploader({ companyId, onUploaded }: BimUploaderProps) {
  const locale = useLocale();
  const isTr = locale === "tr";
  const copy = {
    title: isTr ? "BIM Modeli Yukle" : "Upload BIM model",
    description: isTr
      ? ".ifc dosyanizi secin (max 100MB) - sahanin 3D modeli dijital ikize entegre edilir"
      : "Select your .ifc file (max 100MB) to integrate the site's 3D model into the digital twin",
    selectFile: isTr ? ".ifc Dosyasi Sec" : "Select .ifc file",
    uploading: isTr ? "Yukleniyor..." : "Uploading...",
    fileTooLarge: isTr ? "Dosya 100MB'tan buyuk olamaz" : "File cannot be larger than 100MB",
    invalidFile: isTr ? "Sadece .ifc dosyalari desteklenir" : "Only .ifc files are supported",
    supabaseUnavailable: isTr ? "Supabase baglantisi yok" : "Supabase connection is not available",
    success: (fileName: string) => isTr ? `${fileName} basariyla yuklendi` : `${fileName} uploaded successfully`,
    uploadError: isTr ? "Yukleme hatasi" : "Upload failed",
  };
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccess(null);
    setUploading(true);
    setProgress(0);

    try {
      if (file.size > 100 * 1024 * 1024) {
        throw new Error(copy.fileTooLarge);
      }
      if (!file.name.toLowerCase().endsWith(".ifc")) {
        throw new Error(copy.invalidFile);
      }

      const sb = supabase();
      if (!sb) throw new Error(copy.supabaseUnavailable);

      const meta = await extractIfcMetadata(file);
      setProgress(15);

      const fileName = `${companyId || "general"}/${Date.now()}_${file.name}`;
      const { error: uploadErr } = await sb.storage
        .from("bim-models")
        .upload(fileName, file, { contentType: "model/ifc", upsert: false });

      if (uploadErr) throw uploadErr;
      setProgress(70);

      const { data: urlData } = sb.storage.from("bim-models").getPublicUrl(fileName);

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
      setSuccess(copy.success(file.name));
      onUploaded?.(insertData);

      setTimeout(() => {
        setProgress(0);
        setSuccess(null);
      }, 3000);
    } catch (caughtError: any) {
      setError(caughtError.message || copy.uploadError);
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
          <div style={{ fontSize: 32, marginBottom: 8 }}>BIM</div>
          <h4 style={{ color: "#fff", fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
            {copy.title}
          </h4>
          <p style={{ color: "#94A3B8", fontSize: 11, marginBottom: 12 }}>
            {copy.description}
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
            {copy.selectFile}
          </button>
        </>
      )}

      {uploading && (
        <div>
          <div style={{ color: "#F97316", fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
            {copy.uploading} {progress}%
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
        <div style={{ color: "#F87171", fontSize: 12, marginTop: 8 }}>{error}</div>
      )}
    </div>
  );
}
