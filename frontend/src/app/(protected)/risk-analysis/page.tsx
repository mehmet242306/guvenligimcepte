import { Suspense } from "react";
import { RiskAnalysisPageClient } from "./RiskAnalysisPageClient";

function RiskAnalysisFallback() {
  return (
    <div className="text-muted-foreground flex min-h-[50vh] w-full items-center justify-center p-6 text-sm">
      Yükleniyor…
    </div>
  );
}

/**
 * useSearchParams + büyük istemci paketi: Suspense sınırı olmadan bazı ortamlarda sayfa beyaz kalabiliyor.
 * RiskAnalysisPageClient içinde dynamic(..., { ssr: false }) ile ağır bağımlılıklar sunucuda çalıştırılmaz.
 */
export default function RiskAnalysisPage() {
  return (
    <Suspense fallback={<RiskAnalysisFallback />}>
      <RiskAnalysisPageClient />
    </Suspense>
  );
}
