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

async function extractPdfWithPdfParse(buffer: ArrayBuffer): Promise<string | null> {
  try {
    const pdfParse = (await import("pdf-parse")).default as (
      data: Buffer,
    ) => Promise<{ text: string; numpages: number }>;
    const result = await pdfParse(Buffer.from(buffer));
    const text = result.text?.replace(/\r\n/g, "\n").trim() ?? "";
    return text.length > 80 ? text.slice(0, 120_000) : null;
  } catch {
    return null;
  }
}

async function extractPdfWithAnthropic(buffer: ArrayBuffer): Promise<{
  text: string | null;
  method: string | null;
  error: string | null;
}> {
  const client = getAnthropicClient();
  if (!client) {
    return { text: null, method: null, error: null };
  }

  const base64 = Buffer.from(buffer).toString("base64");
  try {
    const response = await Promise.race([
      client.messages.create({
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
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("AI PDF okuma 25 saniye içinde tamamlanmadı.")), 25_000),
      ),
    ]);

    const text = response.content.find((block) => block.type === "text")?.text?.trim();
    if (text && text.length > 80) {
      return { text: text.slice(0, 120_000), method: "anthropic_pdf", error: null };
    }
    return { text: null, method: null, error: null };
  } catch (error) {
    return {
      text: null,
      method: null,
      error: error instanceof Error ? error.message : "Anthropic PDF okuma hatası",
    };
  }
}

export async function extractPdfTextFromBuffer(buffer: ArrayBuffer): Promise<{
  text: string | null;
  method: string | null;
  error: string | null;
}> {
  const parsed = await extractPdfWithPdfParse(buffer);
  if (parsed) {
    return { text: parsed, method: "pdf_parse", error: null };
  }

  const loose = extractLoosePdfText(buffer);
  if (loose) {
    return { text: loose, method: "loose_pdf_text", error: null };
  }

  const anthropic = await extractPdfWithAnthropic(buffer);
  if (anthropic.text) {
    return anthropic;
  }

  return {
    text: null,
    method: null,
    error:
      anthropic.error ??
      "PDF metni okunamadı. Word (.docx) olarak yüklemeyi deneyin veya taranmış PDF için ANTHROPIC_API_KEY tanımlayın.",
  };
}

export async function extractPdfTextFromUrl(pdfUrl: string) {
  const response = await fetch(pdfUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      Accept: "application/pdf,*/*",
      "Accept-Language": "tr-TR,tr;q=0.9",
    },
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    return {
      text: null,
      method: null,
      error: `PDF indirilemedi (HTTP ${response.status}). Dosyayı bilgisayarınızdan PDF/Word olarak yükleyin.`,
    };
  }

  const buffer = await response.arrayBuffer();
  if (buffer.byteLength < 500) {
    return { text: null, method: null, error: "PDF dosyası çok küçük veya boş." };
  }

  return extractPdfTextFromBuffer(buffer);
}
