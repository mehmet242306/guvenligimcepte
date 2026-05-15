import JSZip from "jszip";

function decodeXmlEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

export async function extractDocxTextFromBuffer(buffer: ArrayBuffer): Promise<{
  text: string | null;
  method: string | null;
  error: string | null;
}> {
  try {
    const zip = await JSZip.loadAsync(buffer);
    const xml = await zip.file("word/document.xml")?.async("string");
    if (!xml) {
      return { text: null, method: null, error: "Word dosyasında document.xml bulunamadı." };
    }

    const parts: string[] = [];
    const paragraphRegex = /<w:p[\s\S]*?<\/w:p>/g;
    let paragraphMatch: RegExpExecArray | null;

    while ((paragraphMatch = paragraphRegex.exec(xml)) !== null) {
      const paragraph = paragraphMatch[0];
      const textNodes = [...paragraph.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)].map((m) =>
        decodeXmlEntities(m[1]),
      );
      const line = textNodes.join("").trim();
      if (line) parts.push(line);
    }

    const text = parts.join("\n").replace(/\n{3,}/g, "\n\n").trim();
    if (text.length < 80) {
      return {
        text: null,
        method: null,
        error: "Word dosyasından yeterli metin çıkarılamadı (dosya boş veya korumalı olabilir).",
      };
    }

    return { text: text.slice(0, 120_000), method: "docx_xml", error: null };
  } catch (error) {
    return {
      text: null,
      method: null,
      error: error instanceof Error ? error.message : "Word dosyası okunamadı.",
    };
  }
}
