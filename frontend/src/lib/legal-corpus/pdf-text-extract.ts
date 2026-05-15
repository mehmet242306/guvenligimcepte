import Anthropic from "@anthropic-ai/sdk";
import { getAnthropicKey, getAnthropicModel } from "@/lib/ai/provider-keys";

let anthropicClient: Anthropic | null = null;

function getAnthropicClient() {
  const apiKey = getAnthropicKey();
  if (!apiKey) return null;
  anthropicClient ??= new Anthropic({ apiKey, maxRetries: 0 });
  return anthropicClient;
}

export function extractLoosePdfText(buffer: ArrayBuffer): string | null {
  const raw = new TextDecoder("latin1", { fatal: false }).decode(new Uint8Array(buffer));
  const parts = Array.from(raw.matchAll(/\(([^()\r\n]{3,500})\)\s*Tj/g), (match) => match[1])
    .concat(Array.from(raw.matchAll(/\(([^()\r\n]{3,500})\)\s*TJ/g), (match) => match[1]))
    .map((part) => part.replace(/\\([()\\])/g, "$1").trim())
    .filter((part) => /[A-Za-zÇĞİÖŞÜçğıöşü0-9]/.test(part));
  const text = parts.join(" ").replace(/\s+/g, " ").trim();
  return text.length > 80 ? text.slice(0, 120_000) : null;
}

export async function extractPdfTextFromBuffer(buffer: ArrayBuffer): Promise<{
  text: string | null;
  method: string | null;
  error: string | null;
}> {
  const client = getAnthropicClient();
  const fallbackText = extractLoosePdfText(buffer);

  if (!client) {
    return {
      text: fallbackText,
      method: fallbackText ? "loose_pdf_text" : null,
      error: fallbackText
        ? null
        : "ANTHROPIC_API_KEY tanımlı değil; taranmış PDF’ler için Vercel ortam değişkenine Anthropic anahtarı ekleyin.",
    };
  }

  const base64 = Buffer.from(buffer).toString("base64");
  try {
    const response = await client.messages.create({
      model: getAnthropicModel(),
      max_tokens: 8192,
      temperature: 0,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: base64,
              },
            },
            {
              type: "text",
              text: "Bu PDF mevzuat metnidir. Madde başlıkları ve numaralarını koruyarak düz metin çıkar. Yorum ekleme.",
            },
          ],
        },
      ],
    });

    const text = response.content.find((block) => block.type === "text")?.text?.trim();
    if (text && text.length > 80) {
      return { text: text.slice(0, 120_000), method: "anthropic_pdf", error: null };
    }
    return {
      text: fallbackText,
      method: fallbackText ? "loose_pdf_text" : null,
      error: "PDF metni AI ile çıkarılamadı; dosya taranmış/resim tabanlı olabilir.",
    };
  } catch (error) {
    return {
      text: fallbackText,
      method: fallbackText ? "loose_pdf_text" : null,
      error: error instanceof Error ? error.message : "PDF metni çıkarılamadı.",
    };
  }
}

export async function extractPdfTextFromUrl(pdfUrl: string) {
  const response = await fetch(pdfUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; RiskNova/1.0)",
      Accept: "application/pdf,*/*",
    },
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    return {
      text: null,
      method: null,
      error: `PDF indirilemedi (HTTP ${response.status})`,
    };
  }

  const buffer = await response.arrayBuffer();
  if (buffer.byteLength < 500) {
    return { text: null, method: null, error: "PDF dosyası çok küçük veya boş." };
  }

  return extractPdfTextFromBuffer(buffer);
}
