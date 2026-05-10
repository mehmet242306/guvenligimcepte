"use client";

import dynamic from "next/dynamic";

const RiskAnalysisClientNoSSR = dynamic(
  () => import("./RiskAnalysisClient").then((mod) => mod.RiskAnalysisClient),
  { ssr: false },
);

export function RiskAnalysisPageClient() {
  return <RiskAnalysisClientNoSSR />;
}
