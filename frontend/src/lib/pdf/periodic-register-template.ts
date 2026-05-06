export const PERIODIC_PDF_TEMPLATE = {
  page: {
    unit: "pt" as const,
    format: "a4" as const,
    orientation: "landscape" as const,
    margin: 36,
  },
  header: {
    height: 62,
    bgColor: [16, 24, 40] as [number, number, number],
    textColor: [255, 255, 255] as [number, number, number],
  },
  body: {
    textColor: [45, 55, 72] as [number, number, number],
    dividerColor: [226, 232, 240] as [number, number, number],
  },
  table: {
    fontSize: 8,
    cellPadding: 4,
    lineColor: [226, 232, 240] as [number, number, number],
    lineWidth: 0.7,
    textColor: [30, 41, 59] as [number, number, number],
    headFillColor: [15, 23, 42] as [number, number, number],
    headTextColor: [255, 255, 255] as [number, number, number],
    alternateFillColor: [248, 250, 252] as [number, number, number],
    // Baseline ratios for 9 columns:
    // #, title, status, planned, done, note, regulation, period, source
    columnRatios: [24, 150, 60, 58, 58, 90, 170, 75, 50] as const,
  },
  logo: {
    boxXOffset: 10,
    boxYOffset: -8,
    boxSize: 42,
    radius: 6,
    imageXOffset: 12,
    imageYOffset: -6,
    imageBox: 38,
  },
  qr: {
    margin: 1,
    width: 132,
    renderSize: 42,
    xFromRight: 54,
    yOffset: -8,
  },
} as const;

export function scaleColumnWidths(contentWidth: number): number[] {
  const totalBaseWidth = PERIODIC_PDF_TEMPLATE.table.columnRatios.reduce((acc, w) => acc + w, 0);
  const widthScale = Math.min(1, contentWidth / totalBaseWidth);
  return PERIODIC_PDF_TEMPLATE.table.columnRatios.map((w) => Math.max(1, Math.floor(w * widthScale)));
}

export function normalizePdfText(value?: string | null): string {
  return (value ?? "—")
    .trim()
    .normalize("NFC")
    .replace(/\s+/g, " ");
}
