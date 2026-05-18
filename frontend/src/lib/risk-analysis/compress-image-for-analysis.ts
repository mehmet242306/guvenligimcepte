/**
 * Saha analizi API'sine gönderilmeden önce görsel sıkıştırma.
 * Büyük telefon fotoğrafları zaman aşımının en sık nedenidir.
 */

const MAX_LONG_EDGE = 1280;
const JPEG_QUALITY = 0.78;

export type AnalysisImagePayload = {
  base64: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
  originalBytes: number;
  compressedBytes: number;
};

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Görsel önizlemesi yüklenemedi"));
    };
    img.src = url;
  });
}

function scaleDimensions(width: number, height: number): { width: number; height: number } {
  const longEdge = Math.max(width, height);
  if (longEdge <= MAX_LONG_EDGE) return { width, height };
  const scale = MAX_LONG_EDGE / longEdge;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export async function compressImageForAnalysis(file: File): Promise<AnalysisImagePayload> {
  const originalBytes = file.size;

  try {
    const img = await loadImageFromFile(file);
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (!w || !h) throw new Error("Geçersiz görsel boyutu");

    const { width, height } = scaleDimensions(w, h);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas oluşturulamadı");
    ctx.drawImage(img, 0, 0, width, height);

    const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
    const match = /^data:image\/jpeg;base64,(.+)$/i.exec(dataUrl);
    const base64 = match?.[1]?.replace(/\s/g, "") ?? "";
    if (!base64) throw new Error("Sıkıştırılmış görsel okunamadı");

    return {
      base64,
      mimeType: "image/jpeg",
      originalBytes,
      compressedBytes: Math.round((base64.length * 3) / 4),
    };
  } catch (err) {
    console.warn("[compress-image] fallback to raw file:", err);
    const raw = await readFileAsBase64(file);
    const mimeType =
      file.type === "image/png" || file.type === "image/webp" || file.type === "image/gif"
        ? file.type
        : "image/jpeg";
    return {
      base64: raw.base64,
      mimeType,
      originalBytes,
      compressedBytes: Math.round((raw.base64.length * 3) / 4),
    };
  }
}

function readFileAsBase64(file: File): Promise<{ base64: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const match = /^data:[^;]+;base64,(.+)$/i.exec(dataUrl);
      const base64 = match?.[1]?.replace(/\s/g, "") ?? "";
      if (!base64) {
        reject(new Error("Görsel base64 okunamadı"));
        return;
      }
      resolve({ base64 });
    };
    reader.onerror = () => reject(reader.error ?? new Error("Dosya okunamadı"));
    reader.readAsDataURL(file);
  });
}
