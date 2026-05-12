import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { consumeEntitlement } from "@/lib/billing/entitlements";
import { requireAuth } from "@/lib/supabase/api-auth";

export const maxDuration = 60;

const exportSchema = z.object({
  title: z.string().min(1).max(200),
  json: z.unknown(),
  companyData: z.record(z.string(), z.unknown()).optional(),
  companyName: z.string().max(200).optional(),
});

function safeFilePart(value: string) {
  return value
    .replace(/[^a-zA-Z0-9\u00C0-\u024F\u0400-\u04FF\u0600-\u06FF\u4E00-\u9FFF\u3040-\u30FF\s_-]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 100);
}

function text(value: unknown, fallback = "") {
  if (value === null || value === undefined) return fallback;
  return String(value).trim() || fallback;
}

function resolveVariables(value: string, companyData: Record<string, unknown>) {
  const today = new Date().toLocaleDateString("tr-TR");
  const replacements: Record<string, string> = {
    firma_adi: text(companyData.official_name),
    firma_adresi: text(companyData.address),
    il: text(companyData.city),
    ilce: text(companyData.district),
    vergi_no: text(companyData.tax_number),
    mersis_no: text(companyData.mersis_number),
    sektor: text(companyData.sector),
    nace_kodu: text(companyData.nace_code),
    tehlike_sinifi: text(companyData.hazard_class),
    calisan_sayisi: text(companyData.employee_count),
    isg_uzmani: text(companyData.specialist_name),
    tarih: today,
    bugun: today,
  };

  return value.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key: string) => replacements[key] || match);
}

function extractTipTapBlocks(node: unknown, companyData: Record<string, unknown>, output: string[] = []) {
  if (!node || typeof node !== "object") return output;
  const item = node as Record<string, unknown>;
  const type = text(item.type);

  if (type === "text") {
    const value = resolveVariables(text(item.text), companyData);
    if (value) output.push(value);
    return output;
  }

  const children = Array.isArray(item.content) ? item.content : [];
  if (type === "paragraph" || type === "heading" || type === "listItem" || type === "tableCell" || type === "tableHeader") {
    const parts: string[] = [];
    children.forEach((child) => {
      const before = output.length;
      extractTipTapBlocks(child, companyData, output);
      parts.push(...output.splice(before));
    });
    const line = parts.join(" ").replace(/\s+/g, " ").trim();
    if (line) output.push(type === "listItem" ? `- ${line}` : line);
    return output;
  }

  if (type === "horizontalRule") {
    output.push("---");
    return output;
  }

  children.forEach((child) => extractTipTapBlocks(child, companyData, output));
  return output;
}

async function generateDocumentPdfBytes({
  title,
  json,
  companyData,
  companyName,
}: {
  title: string;
  json: unknown;
  companyData: Record<string, unknown>;
  companyName?: string;
}) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 16;
  const width = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = margin;

  const ensureSpace = (height = 10) => {
    if (y + height <= pageHeight - margin) return;
    doc.addPage();
    y = margin;
  };
  const write = (value: string, size = 10, style: "normal" | "bold" = "normal") => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.setTextColor(15, 23, 42);
    const lines = doc.splitTextToSize(value, width - margin * 2) as string[];
    ensureSpace(lines.length * (size * 0.42) + 4);
    doc.text(lines, margin, y);
    y += lines.length * (size * 0.42) + 4;
  };

  write(title, 18, "bold");
  if (companyName) write(companyName, 10, "bold");
  write(new Date().toLocaleDateString("tr-TR"), 9);
  y += 4;
  doc.setDrawColor(212, 160, 23);
  doc.line(margin, y, width - margin, y);
  y += 8;

  const blocks = extractTipTapBlocks(json, companyData);
  if (blocks.length === 0) {
    write("Dokuman icerigi bulunmuyor.", 10);
  }
  blocks.forEach((block) => {
    if (block === "---") {
      ensureSpace(8);
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y, width - margin, y);
      y += 8;
      return;
    }
    write(block, block.length < 80 ? 10 : 9);
  });

  return new Uint8Array(doc.output("arraybuffer"));
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const quota = await consumeEntitlement(auth, "export");
  if (quota) return quota;

  const parsed = exportSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Gecersiz export istegi." }, { status: 400 });
  }

  try {
    const fileName = `${safeFilePart(parsed.data.title)}.pdf`;
    return new NextResponse(
      await generateDocumentPdfBytes({
        title: parsed.data.title,
        json: parsed.data.json,
        companyData: parsed.data.companyData || {},
        companyName: parsed.data.companyName,
      }),
      {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        },
      },
    );
  } catch (error) {
    console.error("[documents.pdf-export] failed:", error);
    return NextResponse.json({ error: "Export hazirlanamadi." }, { status: 500 });
  }
}
