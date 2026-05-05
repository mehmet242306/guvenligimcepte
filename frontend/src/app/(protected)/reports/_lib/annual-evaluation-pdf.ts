"use client";

import type { jsPDF as JsPDFType } from "jspdf";

type JsPDF = JsPDFType;

let JsPDFCtor: typeof JsPDFType | null = null;

async function ensureJsPdf(): Promise<void> {
  if (!JsPDFCtor) {
    const mod = await import("jspdf");
    JsPDFCtor = mod.jsPDF;
  }
}

function wrapLines(doc: JsPDF, text: string, maxWidth: number): string[] {
  return doc.splitTextToSize(text.replace(/\r\n/g, "\n"), maxWidth) as string[];
}

/** Basit çok sayfalı metin PDF — Markdown düz metin olarak yazılır */
export async function downloadAnnualEvaluationPdf(options: {
  markdown: string;
  title: string;
  subtitle: string;
  filenameBase: string;
}): Promise<void> {
  await ensureJsPdf();
  const doc = new JsPDFCtor!({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageW = 210;
  const margin = 15;
  const maxW = pageW - margin * 2;
  let y = 18;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(options.title, margin, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(90);
  const subLines = wrapLines(doc, options.subtitle, maxW);
  for (const line of subLines) {
    if (y > 285) {
      doc.addPage();
      y = 18;
    }
    doc.text(line, margin, y);
    y += 5;
  }
  doc.setTextColor(0);
  y += 4;
  doc.setDrawColor(200);
  doc.line(margin, y, pageW - margin, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const body = options.markdown.replace(/\r\n/g, "\n");
  const paragraphs = body.split(/\n\n+/);
  for (const para of paragraphs) {
    const lines = wrapLines(doc, para.trim(), maxW);
    for (const line of lines) {
      if (y > 285) {
        doc.addPage();
        y = 18;
      }
      doc.text(line, margin, y);
      y += 4.2;
    }
    y += 2;
  }

  const { saveAs } = await import("file-saver");
  const blob = doc.output("blob");
  saveAs(blob, `${options.filenameBase}.pdf`);
}
