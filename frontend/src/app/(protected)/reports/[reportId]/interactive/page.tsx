import { notFound } from "next/navigation";
import { loadRiskAnalysisReportJsonFromDb } from "@/lib/risk-analysis/report-data-server";
import { InteractiveRiskReportClient } from "./InteractiveRiskReportClient";

type Props = {
  params: Promise<{ reportId: string }>;
};

export default async function InteractiveRiskReportPage({ params }: Props) {
  const { reportId } = await params;
  const report = await loadRiskAnalysisReportJsonFromDb(reportId);
  if (!report) notFound();
  return <InteractiveRiskReportClient report={report} reportId={reportId} />;
}
