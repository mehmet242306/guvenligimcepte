import { extractDocxTextFromBuffer } from "@/lib/legal-corpus/docx-text-extract";
import { extractPdfTextFromBuffer } from "@/lib/legal-corpus/pdf-text-extract";

export type LegalUploadKind = "pdf" | "docx";

export function detectLegalUploadKind(file: File): LegalUploadKind | null {
  const name = file.name.toLowerCase();
  if (file.type === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    name.endsWith(".docx")
  ) {
    return "docx";
  }
  return null;
}

export async function extractLegalDocumentText(
  buffer: ArrayBuffer,
  kind: LegalUploadKind,
): Promise<{ text: string | null; method: string | null; error: string | null }> {
  if (kind === "docx") {
    return extractDocxTextFromBuffer(buffer);
  }
  return extractPdfTextFromBuffer(buffer);
}
