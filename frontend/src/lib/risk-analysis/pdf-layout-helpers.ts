/**
 * jsPDF + autotable ortak düzen yardımcıları (metin üst üste binmesini önler).
 */

export type PdfDoc = InstanceType<typeof import("jspdf").jsPDF>;

export function getTableFinalY(doc: PdfDoc): number | null {
  const finalY = (doc as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY;
  return typeof finalY === "number" && Number.isFinite(finalY) ? finalY : null;
}

/** autotable sonrası imleci güvenli konuma taşır */
export function syncYAfterTable(doc: PdfDoc, currentY: number, gap = 6): number {
  const finalY = getTableFinalY(doc);
  if (finalY === null) return currentY + gap;
  return Math.max(finalY, currentY) + gap;
}

export function measureWrappedTextHeight(
  doc: PdfDoc,
  text: string,
  maxWidth: number,
  fontSize: number,
  lineHeightFactor = 1.2,
): number {
  const wrapped = doc.splitTextToSize(text, maxWidth) as string[];
  const lineHeight = fontSize * 0.42 * lineHeightFactor;
  return wrapped.length * lineHeight + 3;
}

/** Çok satırlı metin — her satır ayrı Y ile çizilir (üst üste binme olmaz) */
export function writeParagraph(
  doc: PdfDoc,
  opts: {
    text: string;
    x: number;
    y: number;
    maxWidth: number;
    fontFamily: string;
    fontSize: number;
    style?: "normal" | "bold";
    color?: [number, number, number];
    lineHeightFactor?: number;
  },
): number {
  const {
    text,
    x,
    y: startY,
    maxWidth,
    fontFamily,
    fontSize,
    style = "normal",
    color = [15, 23, 42],
    lineHeightFactor = 1.2,
  } = opts;

  doc.setFont(fontFamily, style);
  doc.setFontSize(fontSize);
  doc.setTextColor(...color);

  const wrapped = doc.splitTextToSize(text, maxWidth) as string[];
  const lineHeight = fontSize * 0.42 * lineHeightFactor;
  let yPos = startY;

  for (const row of wrapped) {
    doc.text(row, x, yPos);
    yPos += lineHeight;
  }

  doc.setTextColor(15, 23, 42);
  doc.setFont(fontFamily, "normal");
  return yPos + 2;
}
