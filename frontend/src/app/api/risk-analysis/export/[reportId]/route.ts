import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/api-auth";
import {
  loadRiskAnalysisExportDataFromDb,
  loadRiskAnalysisReportJsonFromDb,
} from "@/lib/risk-analysis/report-data-server";
import type { RiskAnalysisExportData } from "@/lib/risk-analysis-export";

export const maxDuration = 60;
export const runtime = "nodejs";

function safeFilePart(value: unknown) {
  return String(value || "Rapor")
    .replace(/[^a-zA-Z0-9\u00C0-\u024F\u0400-\u04FF\u0600-\u06FF\u4E00-\u9FFF\u3040-\u30FF\s_-]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 80);
}

async function generateFallbackJsPdf(data: RiskAnalysisExportData) {
  const { generateFieldRiskAnalysisPdfBytes } = await import("@/lib/risk-analysis/pdf-field-report");
  return generateFieldRiskAnalysisPdfBytes(data);
}

async function generatePrintRoutePdf(request: NextRequest, reportId: string) {
  const [{ default: chromium }, { default: puppeteer }] = await Promise.all([
    import("@sparticuz/chromium"),
    import("puppeteer-core"),
  ]);

  const executablePath =
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    process.env.CHROME_EXECUTABLE_PATH ||
    (await chromium.executablePath());

  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: { width: 1280, height: 1800 },
    executablePath,
    headless: true,
  });

  try {
    const page = await browser.newPage();
    const cookie = request.headers.get("cookie");
    if (cookie) await page.setExtraHTTPHeaders({ cookie });
    await page.emulateMediaType("print");
    const printUrl = new URL(`/reports/${encodeURIComponent(reportId)}/print`, request.nextUrl.origin);
    await page.goto(printUrl.toString(), { waitUntil: "networkidle0", timeout: 45_000 });
    return await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
    });
  } finally {
    await browser.close();
  }
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

  const engine = request.nextUrl.searchParams.get("engine") || "html";
  const data = await loadRiskAnalysisExportDataFromDb(reportId, { includeImageDataUrls: true });
  if (!data) return NextResponse.json({ error: "Rapor bulunamadi." }, { status: 404 });

  let pdfBytes: Uint8Array | Buffer;
  if (engine === "jspdf") {
    pdfBytes = await generateFallbackJsPdf(data);
  } else {
    try {
      pdfBytes = await generatePrintRoutePdf(request, reportId);
    } catch (error) {
      console.error("[risk-analysis.export.html-pdf] failed, falling back to jsPDF:", error);
      pdfBytes = await generateFallbackJsPdf(data);
    }
  }

  const fileName = `Risk-Analizi-${safeFilePart(data.companyName)}-${safeFilePart(data.date)}.pdf`;

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    },
  });
}
