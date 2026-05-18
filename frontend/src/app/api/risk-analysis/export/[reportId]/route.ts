import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/api-auth";
import {
  loadRiskAnalysisExportDataFromDb,
  loadRiskAnalysisReportJsonFromDb,
} from "@/lib/risk-analysis/report-data-server";

export const maxDuration = 60;

function safeFilePart(value: unknown) {
  return String(value || "Rapor")
    .replace(/[^a-zA-Z0-9\u00C0-\u024F\u0400-\u04FF\u0600-\u06FF\u4E00-\u9FFF\u3040-\u30FF\s_-]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 80);
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ reportId: string }> },
) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const { reportId } = await context.params;
  const format = request.nextUrl.searchParams.get("format") || "pdf";

  if (format === "json") {
    const reportJson = await loadRiskAnalysisReportJsonFromDb(reportId);
    if (!reportJson) return NextResponse.json({ error: "Rapor bulunamadi." }, { status: 404 });
    return NextResponse.json(reportJson);
  }

  const data = await loadRiskAnalysisExportDataFromDb(reportId, { includeImageDataUrls: true });
  if (!data) return NextResponse.json({ error: "Rapor bulunamadi." }, { status: 404 });

  const { generateFieldRiskAnalysisPdfBytes } = await import("@/lib/risk-analysis/pdf-field-report");
  const pdfBytes = await generateFieldRiskAnalysisPdfBytes(data);
  const fileName = `Risk-Analizi-${safeFilePart(data.companyName)}-${safeFilePart(data.date)}.pdf`;

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    },
  });
}
