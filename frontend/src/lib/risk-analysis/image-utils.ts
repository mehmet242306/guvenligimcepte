/**
 * Görsel yardımcıları — data URL'den boyut çıkarma (Node.js + tarayıcı uyumlu).
 */

/**
 * Base64 data URL'den PNG/JPEG görselin doğal boyutlarını parse eder.
 * Tarayıcı ve Node.js'te çalışır (atob veya Buffer fallback).
 */
export function parseImageDimensions(dataUrl: string): { w: number; h: number } | null {
  if (!dataUrl || typeof dataUrl !== "string") return null;
  const match = dataUrl.match(/^data:image\/([^;]+);base64,(.+)$/i);
  if (!match) return null;
  const type = match[1].toLowerCase();
  const base64 = match[2];

  // Yalnızca header için ilk 1024 byte yeter
  const headerBytes = decodeBase64Prefix(base64, 1024);
  if (!headerBytes) return null;

  if (type === "png") return parsePngDimensions(headerBytes);
  if (type === "jpeg" || type === "jpg") return parseJpegDimensions(headerBytes);
  if (type === "webp") return parseWebpDimensions(headerBytes);
  if (type === "gif") return parseGifDimensions(headerBytes);
  return null;
}

function decodeBase64Prefix(base64: string, byteCount: number): Uint8Array | null {
  // base64'te her 4 karakter 3 byte verir
  const charsNeeded = Math.min(base64.length, Math.ceil(byteCount / 3) * 4);
  const prefix = base64.slice(0, charsNeeded);
  try {
    if (typeof atob === "function") {
      const binary = atob(prefix);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return bytes;
    }
    // Node.js fallback
    const buf = Buffer.from(prefix, "base64");
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  } catch {
    return null;
  }
}

function parsePngDimensions(bytes: Uint8Array): { w: number; h: number } | null {
  // PNG: 8 byte signature + IHDR chunk
  // IHDR'da byte 16-19 width, 20-23 height (big-endian)
  if (bytes.length < 24) return null;
  if (bytes[0] !== 0x89 || bytes[1] !== 0x50) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const w = view.getUint32(16, false);
  const h = view.getUint32(20, false);
  if (!w || !h) return null;
  return { w, h };
}

function parseJpegDimensions(bytes: Uint8Array): { w: number; h: number } | null {
  // JPEG: SOI (FFD8), sonra segmentler (FFxx + uzunluk + data)
  // SOF0..SOF3 marker'ı yükseklik/genişlik içerir
  if (bytes.length < 4) return null;
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let i = 2;
  while (i < bytes.length - 8) {
    if (bytes[i] !== 0xff) return null;
    const marker = bytes[i + 1];
    // SOFn (Start of Frame)
    if (
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf)
    ) {
      const h = view.getUint16(i + 5, false);
      const w = view.getUint16(i + 7, false);
      if (!w || !h) return null;
      return { w, h };
    }
    const segLen = view.getUint16(i + 2, false);
    if (segLen < 2) return null;
    i += 2 + segLen;
  }
  return null;
}

function parseWebpDimensions(bytes: Uint8Array): { w: number; h: number } | null {
  if (bytes.length < 30) return null;
  // RIFF....WEBP
  if (bytes[0] !== 0x52 || bytes[1] !== 0x49 || bytes[2] !== 0x46 || bytes[3] !== 0x46) return null;
  if (bytes[8] !== 0x57 || bytes[9] !== 0x45 || bytes[10] !== 0x42 || bytes[11] !== 0x50) return null;
  // VP8L
  if (bytes[12] === 0x56 && bytes[13] === 0x50 && bytes[14] === 0x38 && bytes[15] === 0x4c) {
    const w = (((bytes[22] | (bytes[23] << 8)) & 0x3fff) >>> 0) + 1;
    const h = (((bytes[24] >> 6 | (bytes[25] << 2) | (bytes[26] << 10)) & 0x3fff) >>> 0) + 1;
    return { w, h };
  }
  // VP8 (lossy)
  if (bytes[12] === 0x56 && bytes[13] === 0x50 && bytes[14] === 0x38 && bytes[15] === 0x20) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const w = view.getUint16(26, true) & 0x3fff;
    const h = view.getUint16(28, true) & 0x3fff;
    return { w, h };
  }
  return null;
}

function parseGifDimensions(bytes: Uint8Array): { w: number; h: number } | null {
  if (bytes.length < 10) return null;
  // GIF87a veya GIF89a
  if (bytes[0] !== 0x47 || bytes[1] !== 0x49 || bytes[2] !== 0x46) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { w: view.getUint16(6, true), h: view.getUint16(8, true) };
}

/**
 * Görseli sabit boyutlu bir kutuya en-boy oranını koruyarak sığdır.
 * Dikey/yatay/kare fotoğraflar için uyumlu.
 */
export function fitImageInBox(
  imgW: number,
  imgH: number,
  boxW: number,
  boxH: number,
): { drawW: number; drawH: number; offsetX: number; offsetY: number } {
  const aspectImg = imgW / imgH;
  const aspectBox = boxW / boxH;

  let drawW: number;
  let drawH: number;
  if (aspectImg > aspectBox) {
    // Görsel kutuya göre daha geniş — genişliğe göre sığdır
    drawW = boxW;
    drawH = boxW / aspectImg;
  } else {
    // Görsel kutuya göre daha yüksek — yüksekliğe göre sığdır
    drawH = boxH;
    drawW = boxH * aspectImg;
  }
  const offsetX = (boxW - drawW) / 2;
  const offsetY = (boxH - drawH) / 2;
  return { drawW, drawH, offsetX, offsetY };
}
