"use client";

import dynamic from "next/dynamic";

const RiskAnalysisClientNoSSR = dynamic(
  () => import("./RiskAnalysisWorkbenchClient").then((mod) => mod.RiskAnalysisWorkbenchClient),
  { ssr: false },
);

export function RiskAnalysisPageClient() {
  return <RiskAnalysisClientNoSSR />;
}
