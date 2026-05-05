import type { R2DDimension } from "@/lib/r2d-rca-engine";

/** Strings for R₂D-RCA PDF / print HTML (plus dimension labels). */
export type R2dRcaPdfI18n = {
  htmlLang: string;
  getDimension: (code: R2DDimension) => { name: string; source: string };
  defaultReportTitle: string;
  defaultReportSubtitle: string;
  scoreLabel: string;
  /** Short label under gauge (method name, often unchanged across locales). */
  gaugeBrand: string;
  calcModeOverride: string;
  calcModeBase: string;
  dualReportingBadge: string;
  statMaxDelta: string;
  statOverride: string;
  statTriggered: string;
  statNotTriggered: string;
  statBrokenStable: string;
  primaryRootsTitle: string;
  notDetermined: string;
  visualSummaryTitle: string;
  emptyStateWarning: string;
  chartGaugeTitle: string;
  chartGaugeSub: string;
  chartDeltaTitle: string;
  chartDeltaSub: string;
  chartRadarTitle: string;
  chartRadarSub: string;
  legendT0: string;
  legendT1: string;
  chartDonutTitle: string;
  chartDonutSub: string;
  legendOverride: string;
  legendMajor: string;
  legendSec: string;
  legendMinor: string;
  sectionHeatmapWaterfall: string;
  chartHeatmapTitle: string;
  chartHeatmapSub: string;
  chartWaterfallTitle: string;
  chartWaterfallSub: string;
  sectionPolarDelta: string;
  chartPolarTitle: string;
  chartPolarSub: string;
  chartDeltaRadarTitle: string;
  chartDeltaRadarSub: string;
  sectionRootChain: string;
  rootChainSub: string;
  sectionScoreTable: string;
  thDimension: string;
  thWeight: string;
  thPriority: string;
  tableFootnoteLegend: string;
  sectionRanking: string;
  thRank: string;
  sectionStableDims: string;
  sectionAiNarrative: string;
  donutEmpty: string;
  donutTotal: string;
  waterfallEmpty: string;
  waterfallFootnote: string;
  rootChainEmpty: string;
  rootChainEmptyAllZero: string;
  polarEmpty: string;
  popupBlocked: string;
  waterfallTotalSymbol: string;
};

type TrFn = (key: string, values?: Record<string, string | number | Date>) => string;

/**
 * Build PDF i18n from next-intl `useTranslations("incidents.r2dRca")`.
 */
export function buildR2dRcaPdfI18n(tr: TrFn, htmlLang: string): R2dRcaPdfI18n {
  const p = (key: string, values?: Record<string, string | number | Date>) => tr(`pdf.${key}`, values);
  return {
    htmlLang,
    getDimension: (code) => ({
      name: tr(`dimensions.${code}.name`),
      source: tr(`dimensions.${code}.source`),
    }),
    defaultReportTitle: p("defaultReportTitle"),
    defaultReportSubtitle: p("defaultReportSubtitle"),
    scoreLabel: p("scoreLabel"),
    gaugeBrand: p("gaugeBrand"),
    calcModeOverride: p("calcModeOverride"),
    calcModeBase: p("calcModeBase"),
    dualReportingBadge: p("dualReportingBadge"),
    statMaxDelta: p("statMaxDelta"),
    statOverride: p("statOverride"),
    statTriggered: p("statTriggered"),
    statNotTriggered: p("statNotTriggered"),
    statBrokenStable: p("statBrokenStable"),
    primaryRootsTitle: p("primaryRootsTitle"),
    notDetermined: p("notDetermined"),
    visualSummaryTitle: p("visualSummaryTitle"),
    emptyStateWarning: p("emptyStateWarning", { aiButton: tr("panel.aiAnalyze") }),
    chartGaugeTitle: p("chartGaugeTitle"),
    chartGaugeSub: p("chartGaugeSub"),
    chartDeltaTitle: p("chartDeltaTitle"),
    chartDeltaSub: p("chartDeltaSub"),
    chartRadarTitle: p("chartRadarTitle"),
    chartRadarSub: p("chartRadarSub"),
    legendT0: p("legendT0"),
    legendT1: p("legendT1"),
    chartDonutTitle: p("chartDonutTitle"),
    chartDonutSub: p("chartDonutSub"),
    legendOverride: p("legendOverride"),
    legendMajor: p("legendMajor"),
    legendSec: p("legendSec"),
    legendMinor: p("legendMinor"),
    sectionHeatmapWaterfall: p("sectionHeatmapWaterfall"),
    chartHeatmapTitle: p("chartHeatmapTitle"),
    chartHeatmapSub: p("chartHeatmapSub"),
    chartWaterfallTitle: p("chartWaterfallTitle"),
    chartWaterfallSub: p("chartWaterfallSub"),
    sectionPolarDelta: p("sectionPolarDelta"),
    chartPolarTitle: p("chartPolarTitle"),
    chartPolarSub: p("chartPolarSub"),
    chartDeltaRadarTitle: p("chartDeltaRadarTitle"),
    chartDeltaRadarSub: p("chartDeltaRadarSub"),
    sectionRootChain: p("sectionRootChain"),
    rootChainSub: p("rootChainSub"),
    sectionScoreTable: p("sectionScoreTable"),
    thDimension: p("thDimension"),
    thWeight: p("thWeight"),
    thPriority: p("thPriority"),
    tableFootnoteLegend: p("tableFootnoteLegend"),
    sectionRanking: p("sectionRanking"),
    thRank: p("thRank"),
    sectionStableDims: p("sectionStableDims"),
    sectionAiNarrative: p("sectionAiNarrative"),
    donutEmpty: p("donutEmpty"),
    donutTotal: p("donutTotal"),
    waterfallEmpty: p("waterfallEmpty"),
    waterfallFootnote: p("waterfallFootnote"),
    rootChainEmpty: p("rootChainEmpty"),
    rootChainEmptyAllZero: p("rootChainEmptyAllZero"),
    polarEmpty: p("polarEmpty"),
    popupBlocked: p("popupBlocked"),
    waterfallTotalSymbol: p("waterfallTotalSymbol"),
  };
}

/** English fallback when translations are not passed (e.g. tests). */
export const DEFAULT_R2D_RCA_PDF_I18N: R2dRcaPdfI18n = {
  htmlLang: "en",
  getDimension: (code) => ({
    name: ({ C1: "Hazard intensity", C2: "PPE non-conformance", C3: "Behavioral risk", C4: "Environmental stress", C5: "Chemical / atmospheric", C6: "Access / barrier risk", C7: "Machine / process risk", C8: "Vehicle / traffic risk", C9: "Organizational load / fatigue" }[code]),
    source: ({ C1: "Visual (YOLO)", C2: "Visual + records", C3: "Visual + zone", C4: "Sensor", C5: "Sensor + SCADA", C6: "Visual + sensor", C7: "Sensor + CMMS", C8: "Visual + RTLS", C9: "Records + sensor" }[code]),
  }),
  defaultReportTitle: "R₂D-RCA (C1–C9) analysis report",
  defaultReportSubtitle: "Nine-dimensional composite risk metric · delta-based root cause analysis",
  scoreLabel: "R₂D-RCA score",
  gaugeBrand: "R₂D-RCA",
  calcModeOverride: "Override mode (max Δ̂ ≥ 0.40)",
  calcModeBase: "Base score mode (weighted sum)",
  dualReportingBadge: "⚠ Dual reporting required",
  statMaxDelta: "Largest Δ̂",
  statOverride: "Override",
  statTriggered: "Triggered",
  statNotTriggered: "Not triggered",
  statBrokenStable: "Broken / stable",
  primaryRootsTitle: "Primary root cause(s)",
  notDetermined: "Not determined",
  visualSummaryTitle: "Visual summary",
  emptyStateWarning:
    "⚠ No analysis data yet. All dimensions have Δ̂ = 0 — pre-incident and at-incident scores are identical. For a meaningful report, first generate scores with {aiButton} or adjust the sliders, then create the PDF again.",
  chartGaugeTitle: "R₂D-RCA severity",
  chartGaugeSub: "Semi-circular gauge — 0 (green) → 1 (red)",
  chartDeltaTitle: "Deviation severity (Δ̂)",
  chartDeltaSub: "Deviation bars for 9 dimensions, ordered C1→C9",
  chartRadarTitle: "Risk profile (t₀ vs t₁)",
  chartRadarSub: "9-axis radar — pre-incident vs at-incident",
  legendT0: "t₀ (before)",
  legendT1: "t₁ (at incident)",
  chartDonutTitle: "Priority contribution share",
  chartDonutSub: "P(C_i) = w_i · Δ̂_i — broken dimensions only",
  legendOverride: "Override",
  legendMajor: "Major",
  legendSec: "Sec.",
  legendMinor: "Minor",
  sectionHeatmapWaterfall: "Dimension detail · heat map and priority accumulation",
  chartHeatmapTitle: "9-dimension heat map",
  chartHeatmapSub: "t₀ · t₁ · Δ̂ colour scale (green→red)",
  chartWaterfallTitle: "Priority accumulation (waterfall)",
  chartWaterfallSub: "Ordered priority contributions + total score",
  sectionPolarDelta: "Priority polar distribution + Δ̂ radar profile",
  chartPolarTitle: "Polar area — priority distribution",
  chartPolarSub: "Equal angle per dimension, radius = Δ̂ magnitude",
  chartDeltaRadarTitle: "Δ̂ radar profile (9 axes)",
  chartDeltaRadarSub: "Deviation magnitudes only — where risk increased",
  sectionRootChain: "Root cause chain (categorised + ranked)",
  rootChainSub: "Broken dimensions in priority order — Override / Major / Sec. categories",
  sectionScoreTable: "Nine-dimensional score comparison",
  thDimension: "Dimension",
  thWeight: "Weight",
  thPriority: "Priority",
  tableFootnoteLegend:
    "Δ̂_i = max(0, t₁ − t₀) · Priority P(C_i) = w_i · Δ̂_i · Scores on [0,1] continuous scale · Higher = higher risk",
  sectionRanking: "Priority ranking",
  thRank: "#",
  sectionStableDims: "Stable dimensions (Δ̂ = 0)",
  sectionAiNarrative: "AI assessment",
  donutEmpty: "No broken dimensions",
  donutTotal: "Total",
  waterfallEmpty: "No broken dimensions",
  waterfallFootnote: "Priority accumulation: C₁→Cₙ → Σ (total R_RCA)",
  rootChainEmpty: "No broken dimensions",
  rootChainEmptyAllZero: "No broken dimensions — all Δ̂ = 0",
  polarEmpty: "No broken dimensions",
  popupBlocked: "Could not open the print window. Please check your pop-up blocker.",
  waterfallTotalSymbol: "Σ",
};
