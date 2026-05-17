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

async function generateRiskAnalysisPdfBytes(data: unknown) {
  const { generateFieldRiskAnalysisPdfBytes } = await import("@/lib/risk-analysis/pdf-field-report");
  return generateFieldRiskAnalysisPdfBytes(data as import("@/lib/risk-analysis-export").RiskAnalysisExportData);
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
      const pdfBytes = await generateRiskAnalysisPdfBytes(parsed.data.data);
      return new NextResponse(Buffer.from(pdfBytes), {
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
