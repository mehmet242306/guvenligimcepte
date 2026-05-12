import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { consumeEntitlement } from "@/lib/billing/entitlements";
import { requireAuth } from "@/lib/supabase/api-auth";

export const maxDuration = 60;

const exportSchema = z.object({
  format: z.enum(["pdf", "word", "excel"]),
  data: z.unknown(),
});

function safeFilePart(value: unknown) {
  return String(value || "Rapor")
    .replace(/[^a-zA-Z0-9\u00C0-\u024F\u0400-\u04FF\u0600-\u06FF\u4E00-\u9FFF\u3040-\u30FF\s_-]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 80);
}

async function blobToUint8Array(blob: Blob) {
  return new Uint8Array(await blob.arrayBuffer());
}

function asText(value: unknown, fallback = "-") {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function asArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => !!item && typeof item === "object") : [];
}

async function generateRiskAnalysisPdfBytes(data: unknown) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const report = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
  const findings = asArray(report.findings);
  const participants = asArray(report.participants);
  const images = asArray(report.images);
  const margin = 14;
  const width = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = margin;

  const ensureSpace = (height = 12) => {
    if (y + height <= pageHeight - margin) return;
    doc.addPage();
    y = margin;
  };
  const line = (text: string, size = 10, style: "normal" | "bold" = "normal", color: [number, number, number] = [15, 23, 42]) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const wrapped = doc.splitTextToSize(text, width - margin * 2) as string[];
    ensureSpace(wrapped.length * (size * 0.42) + 3);
    doc.text(wrapped, margin, y);
    y += wrapped.length * (size * 0.42) + 3;
  };
  const label = (name: string, value: unknown) => line(`${name}: ${asText(value)}`, 9);
  const section = (title: string) => {
    ensureSpace(12);
    y += y === margin ? 0 : 3;
    doc.setDrawColor(212, 160, 23);
    doc.line(margin, y, width - margin, y);
    y += 6;
    line(title, 12, "bold", [15, 23, 42]);
  };

  line(asText(report.analysisTitle, "Risk Analizi Raporu"), 18, "bold", [15, 23, 42]);
  line("RiskNova", 10, "bold", [212, 160, 23]);
  label("Firma", report.companyName);
  label("Tarih", report.date);
  label("Yontem", report.methodLabel);
  label("Lokasyon", report.location);
  label("Bolum", report.department);
  label("Toplam bulgu", report.totalFindings);
  label("Kritik/yuksek bulgu", report.criticalCount);

  if (participants.length > 0) {
    section("Ekip");
    participants.forEach((participant, index) => {
      line(
        `${index + 1}. ${asText(participant.fullName)} - ${asText(participant.role)}${
          participant.title ? ` / ${asText(participant.title)}` : ""
        }`,
        9,
      );
    });
  }

  section("Bulgular");
  if (findings.length === 0) {
    line("Kayitli bulgu bulunmuyor.", 10);
  }
  findings.forEach((finding, index) => {
    ensureSpace(34);
    line(`${index + 1}. ${asText(finding.title, "Bulgu")}`, 12, "bold");
    label("Kategori", finding.category);
    label("Risk sinifi", finding.riskClass ?? finding.severity);
    label("Skor", finding.scoreLabel ?? finding.score);
    if (finding.recommendation) line(`Oneri: ${asText(finding.recommendation)}`, 9);
    if (finding.action) line(`Aksiyon: ${asText(finding.action)}`, 9);
    if (Array.isArray(finding.legalReferences) && finding.legalReferences.length > 0) {
      line(
        `Mevzuat: ${finding.legalReferences
          .map((ref) => {
            const item = ref as Record<string, unknown>;
            return [item.law, item.article, item.description].map((part) => asText(part, "")).filter(Boolean).join(" - ");
          })
          .filter(Boolean)
          .join("; ")}`,
        8,
      );
    }
  });

  if (images.length > 0) {
    section("Gorseller");
    for (const [index, image] of images.entries()) {
      const dataUrl = asText(image.dataUrl, "");
      if (!dataUrl.startsWith("data:image/")) continue;
      try {
        ensureSpace(60);
        line(`${index + 1}. ${asText(image.fileName ?? image.name, "Gorsel")}`, 9, "bold");
        const format = dataUrl.includes("image/png") ? "PNG" : "JPEG";
        doc.addImage(dataUrl, format, margin, y, 58, 44, undefined, "FAST");
        y += 50;
      } catch (error) {
        console.warn("[risk-analysis.export] image skipped:", error);
      }
    }
  }

  if (report.shareUrl || report.shareQrDataUrl) {
    section("Dogrulama");
    if (report.shareUrl) line(`Paylasim baglantisi: ${asText(report.shareUrl)}`, 8);
    const qr = asText(report.shareQrDataUrl, "");
    if (qr.startsWith("data:image/")) {
      try {
        ensureSpace(36);
        doc.addImage(qr, "PNG", margin, y, 28, 28, undefined, "FAST");
        y += 32;
      } catch (error) {
        console.warn("[risk-analysis.export] qr skipped:", error);
      }
    }
  }

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
    const exportData = parsed.data.data as { companyName?: string; date?: string };
    if (parsed.data.format === "pdf") {
      const fileName = `Risk-Analizi-${safeFilePart(exportData.companyName)}-${safeFilePart(
        exportData.date || new Date().toISOString().split("T")[0],
      )}.pdf`;
      return new NextResponse(await generateRiskAnalysisPdfBytes(parsed.data.data), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        },
      });
    }

    const { generateRiskAnalysisExcelBlob, generateRiskAnalysisWordBlob } = await import(
      "@/lib/risk-analysis-export"
    );
    const blob =
      parsed.data.format === "word"
        ? await generateRiskAnalysisWordBlob(parsed.data.data as never)
        : await generateRiskAnalysisExcelBlob(parsed.data.data as never);
    const ext = parsed.data.format === "word" ? "docx" : "xlsx";
    const contentType =
      parsed.data.format === "word"
        ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    const fileName = `Risk-Analizi-${safeFilePart(exportData.companyName)}-${safeFilePart(
      exportData.date || new Date().toISOString().split("T")[0],
    )}.${ext}`;

    return new NextResponse(await blobToUint8Array(blob), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      },
    });
  } catch (error) {
    console.error("[risk-analysis.export] failed:", error);
    return NextResponse.json({ error: "Export hazirlanamadi." }, { status: 500 });
  }
}
