"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { ArrowLeft, CheckCircle2, CloudOff, Loader2, Sparkles, UploadCloud } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { computeR2DRCA, DEMO_T0, DEMO_T1, type RCAResult } from "@/lib/r2d-rca-engine";
import { fetchAnalyses, createAnalysis, updateAnalysis } from "@/lib/analysis/api";
import type { R2dRcaData } from "@/lib/analysis/types";
import { RCAMetricCards } from "@/components/rca/RCAMetricCards";
import { RCARadarChart } from "@/components/rca/RCARadarChart";
import { RCARootCauseChain } from "@/components/rca/RCARootCauseChain";
import { RCAHeatmap } from "@/components/rca/RCAHeatmap";
import { RCAGauge } from "@/components/rca/RCAGauge";
import { RCAStatusCards } from "@/components/rca/RCAStatusCards";
import { RCADeltaBarChart } from "@/components/rca/RCADeltaBarChart";
import { RCAWaterfallChart } from "@/components/rca/RCAWaterfallChart";
import { RCATimeline, type TimelineEvent } from "@/components/rca/RCATimeline";
import { RCADoughnutChart } from "@/components/rca/RCADoughnutChart";
import { RCAPolarChart } from "@/components/rca/RCAPolarChart";
import { RCADeltaRadar } from "@/components/rca/RCADeltaRadar";
import { RCAAINarrative } from "@/components/rca/RCAAINarrative";

interface RcaResultsClientProps {
  incidentId: string;
  initialT0?: number[];
  initialT1?: number[];
  initialNarrative?: string;
  incidentTitle?: string;
  events?: TimelineEvent[];
}

/**
 * Sayfa içi bölüm başlığı — kullanıcı hangi grafik grubunda olduğunu
 * net görebilsin diye her section'ın başında render edilir.
 */
function RcaSectionHeader({
  id,
  title,
  subtitle,
}: {
  id: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-end justify-between border-b border-border/60 pb-2">
      <div>
        <h2 id={id} className="text-base font-semibold text-foreground">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

function formatRelative(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const sec = Math.max(0, Math.round(diffMs / 1000));
  if (sec < 5) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return date.toLocaleString("en-US");
}

/**
 * Yükleme + kayıt durumu rozeti. Kullanıcı sayfaya geri döndüğünde
 * verilerin kaldığı yerden devam ettiğini görsel olarak gösterir.
 */
function PersistenceBadge({
  loadStatus,
  saveStatus,
  lastSavedAt,
  onManualSave,
}: {
  loadStatus: "loading" | "loaded" | "empty" | "error";
  saveStatus: "idle" | "saving" | "saved" | "error";
  lastSavedAt: Date | null;
  onManualSave: () => void;
}) {
  // 30 sn'de bir relative time tazele (mounted iken)
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  if (loadStatus === "loading") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/50 px-2.5 py-1 text-xs text-muted-foreground">
        <Loader2 className="size-3 animate-spin" />
        Loading previous snapshot…
      </span>
    );
  }

  if (loadStatus === "error") {
    return (
      <button
        onClick={onManualSave}
        className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-1 text-xs text-amber-700 hover:bg-amber-500/25 dark:text-amber-300"
      >
        <CloudOff className="size-3" />
        Load failed — click to save now
      </button>
    );
  }

  if (saveStatus === "saving") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/15 px-2.5 py-1 text-xs text-blue-700 dark:text-blue-300">
        <Loader2 className="size-3 animate-spin" />
        Saving…
      </span>
    );
  }

  if (saveStatus === "error") {
    return (
      <button
        onClick={onManualSave}
        className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-2.5 py-1 text-xs text-red-700 hover:bg-red-500/25 dark:text-red-300"
      >
        <CloudOff className="size-3" />
        Save failed — retry
      </button>
    );
  }

  if (lastSavedAt) {
    return (
      <button
        onClick={onManualSave}
        className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs text-emerald-700 hover:bg-emerald-500/25 dark:text-emerald-300"
        title="Save again now"
      >
        <CheckCircle2 className="size-3" />
        Saved · {formatRelative(lastSavedAt)}
      </button>
    );
  }

  // loaded but never saved (empty initial)
  return (
    <button
      onClick={onManualSave}
      className="inline-flex items-center gap-1.5 rounded-full bg-muted/50 px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted"
    >
      <UploadCloud className="size-3" />
      Not saved yet — click to save
    </button>
  );
}

type LoadStatus = "loading" | "loaded" | "empty" | "error";
type SaveStatus = "idle" | "saving" | "saved" | "error";

export function RcaResultsClient({
  incidentId,
  initialT0,
  initialT1,
  initialNarrative,
  incidentTitle = "",
  events = [],
}: RcaResultsClientProps) {
  const locale = useLocale();
  const [t0, setT0] = useState<number[]>(initialT0 ?? DEMO_T0);
  const [t1, setT1] = useState<number[]>(initialT1 ?? DEMO_T1);
  const [narrative, setNarrative] = useState<string>(initialNarrative ?? "");
  const [narrativeLoading, setNarrativeLoading] = useState(false);
  const [aiScoreLoading, setAiScoreLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Persistance state — Supabase root_cause_analyses
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [loadStatus, setLoadStatus] = useState<LoadStatus>("loading");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  // Önce yükleme yapıldı mı? Yüklenmeden auto-save yapma.
  const hydratedRef = useRef(false);

  // Client-side preview computation (UX için; authoritative kayıt için /api/rca/compute)
  const result: RCAResult = useMemo(() => computeR2DRCA(t0, t1), [t0, t1]);

  /* ---------------------------------------------------------------- */
  /*  Persistans — Supabase'den yükle, anlamlı olaylarda kaydet        */
  /* ---------------------------------------------------------------- */

  // Mount: incident'a bağlı en son R2D-RCA kaydını yükle
  useEffect(() => {
    let cancelled = false;
    setLoadStatus("loading");
    fetchAnalyses({ method: "r2d_rca", incidentId })
      .then((rows) => {
        if (cancelled) return;
        if (rows.length === 0) {
          setLoadStatus("empty");
          hydratedRef.current = true;
          return;
        }
        const latest = rows[0]; // desc by created_at
        const data = latest.data as R2dRcaData;
        if (Array.isArray(data?.t0) && data.t0.length === 9) setT0(data.t0);
        if (Array.isArray(data?.t1) && data.t1.length === 9) setT1(data.t1);
        if (typeof data?.narrative === "string" && data.narrative) setNarrative(data.narrative);
        setAnalysisId(latest.id);
        setLastSavedAt(new Date(latest.updatedAt));
        setLoadStatus("loaded");
        hydratedRef.current = true;
      })
      .catch(() => {
        if (cancelled) return;
        setLoadStatus("error");
        hydratedRef.current = true;
      });
    return () => {
      cancelled = true;
    };
  }, [incidentId]);

  // Anlamlı olaylarda (AI skor / narrative geldikten sonra) kaydet
  const saveSnapshot = useCallback(
    async (nextT0: number[], nextT1: number[], nextNarrative: string) => {
      if (!hydratedRef.current) return;
      setSaveStatus("saving");
      try {
        const payload: R2dRcaData = { t0: nextT0, t1: nextT1, narrative: nextNarrative };
        if (analysisId) {
          const ok = await updateAnalysis(analysisId, payload);
          if (!ok) throw new Error("update failed");
        } else {
          const created = await createAnalysis({
            incidentId,
          incidentTitle: incidentTitle || `Incident ${incidentId}`,
            method: "r2d_rca",
            data: payload,
          });
          if (!created) throw new Error("create failed");
          setAnalysisId(created.id);
        }
        setSaveStatus("saved");
        setLastSavedAt(new Date());
      } catch (e) {
        console.warn("RcaResultsClient saveSnapshot:", e);
        setSaveStatus("error");
      }
    },
    [analysisId, incidentId, incidentTitle],
  );

  // İlk yüklemede narrative yoksa oluştur
  const fetchNarrative = useCallback(async () => {
    setNarrativeLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/rca/narrative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          t0, t1,
          deltaHat: result.deltaHat,
          rRcaScore: result.rRcaScore,
          calculationMode: result.calculationMode,
          overrideTriggered: result.overrideTriggered,
          dualReportingRequired: result.dualReportingRequired,
          maxDeltaHatIndex: result.maxDeltaHatIndex,
          maxWeightedIndex: result.maxWeightedIndex,
          incidentTitle,
          locale,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || "AI error");
      }
      const data = await res.json();
      if (data?.narrative) {
        setNarrative(data.narrative);
        // Anlamlı olay: narrative geldi → otomatik kaydet
        await saveSnapshot(t0, t1, data.narrative);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI error");
    } finally {
      setNarrativeLoading(false);
    }
  }, [t0, t1, result, incidentTitle, saveSnapshot, locale]);

  // AI ile skor oluştur (t0 + t1 değerlerini AI tahminle)
  const generateScores = useCallback(async () => {
    setAiScoreLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: "r2d_rca",
          incidentTitle,
          incidentDescription: incidentTitle,
          locale,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || "AI error");
      }
      const data = await res.json();
      const nextT0 = Array.isArray(data?.t0) && data.t0.length === 9 ? data.t0 : t0;
      const nextT1 = Array.isArray(data?.t1) && data.t1.length === 9 ? data.t1 : t1;
      const nextNarrative = typeof data?.narrative === "string" ? data.narrative : narrative;
      setT0(nextT0);
      setT1(nextT1);
      if (data?.narrative) setNarrative(data.narrative);
      // Anlamlı olay: AI skor üretildi → otomatik kaydet
      await saveSnapshot(nextT0, nextT1, nextNarrative);
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI error");
    } finally {
      setAiScoreLoading(false);
    }
  }, [incidentTitle, t0, t1, narrative, saveSnapshot, locale]);

  // İlk kayıt yokken & propslarda skor varsa → narrative çek
  useEffect(() => {
    if (loadStatus !== "empty") return;
    if (!initialNarrative && initialT0 && initialT1) {
      void fetchNarrative();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadStatus]);

  return (
    <div className="page-stack">
      <PageHeader
        title="R₂D-RCA Results Analysis"
        description="Root-cause analysis based on the 9-dimension (C1-C9) composite risk metric"
        meta={
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Link href={`/incidents/${incidentId}`} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="mr-1 inline size-4" /> Back to Incident Details
            </Link>
            <PersistenceBadge
              loadStatus={loadStatus}
              saveStatus={saveStatus}
              lastSavedAt={lastSavedAt}
              onManualSave={() => void saveSnapshot(t0, t1, narrative)}
            />
          </div>
        }
        actions={
          <Button onClick={generateScores} disabled={aiScoreLoading} variant="accent">
            {aiScoreLoading ? <Loader2 className="mr-1 size-4 animate-spin" /> : <Sparkles className="mr-1 size-4" />}
            {aiScoreLoading ? "AI is scoring..." : "Re-score with AI"}
          </Button>
        }
      />

      {error && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-200">
          {error}
        </div>
      )}

      {/* ============================================================ */}
      {/* SECTION 0 — Görsel Özet (PDF'deki 4'lü grid ile birebir) */}
      {/* Gauge · DeltaBar · Radar · Donut — sayfa açılışında hemen görünür */}
      {/* ============================================================ */}
      <section aria-labelledby="rca-section-visual" className="space-y-3">
        <RcaSectionHeader
          id="rca-section-visual"
          title="Visual summary"
          subtitle="Risk severity · deviation distribution · t₀↔t₁ profile · priority contribution"
        />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <RCAGauge score={result.rRcaScore} />
          <RCADeltaBarChart deltaHat={result.deltaHat} />
          <RCARadarChart t0={t0} t1={t1} />
          <RCADoughnutChart priorityRanking={result.priorityRanking} />
        </div>
      </section>

      {/* ============================================================ */}
      {/* SECTION 1 — Üst Düzey Özet */}
      {/* ============================================================ */}
      <section aria-labelledby="rca-section-summary" className="space-y-3">
        <RcaSectionHeader
          id="rca-section-summary"
          title="High-level summary"
          subtitle="Score, deviation, theorem status — at a glance"
        />
        <RCAMetricCards result={result} />
        <RCARootCauseChain categorized={result.categorized} />
      </section>

      {/* ============================================================ */}
      {/* SECTION 2 — Durum Kartları + Delta Radar */}
      {/* Gauge yukarıda (Görsel Özet) — burada yalnızca ek göstergeler */}
      {/* ============================================================ */}
      <section aria-labelledby="rca-section-severity" className="space-y-3">
        <RcaSectionHeader
          id="rca-section-severity"
          title="Status and delta profile"
          subtitle="Override status · degraded/stable counts · 9-axis Δ̂ profile"
        />
        <div className="grid gap-3 md:grid-cols-2">
          <RCAStatusCards
            overrideActive={result.overrideTriggered}
            bozulanCount={result.bozulanCount}
            stabilCount={result.stabilCount}
          />
          <RCADeltaRadar deltaHat={result.deltaHat} />
        </div>
      </section>

      {/* ============================================================ */}
      {/* SECTION 3 — Boyut Detayı (Heatmap + Polar) */}
      {/* DeltaBar ve Doughnut yukarıda (Görsel Özet) */}
      {/* ============================================================ */}
      <section aria-labelledby="rca-section-dimensions" className="space-y-3">
        <RcaSectionHeader
          id="rca-section-dimensions"
          title="Dimension detail"
          subtitle="Heatmap (t₀→t₁→Δ) · delta polar distribution"
        />
        <RCAHeatmap t0={t0} t1={t1} deltaHat={result.deltaHat} />
        <RCAPolarChart priorityRanking={result.priorityRanking} />
      </section>

      {/* ============================================================ */}
      {/* SECTION 4 — Olay Akışı */}
      {/* ============================================================ */}
      <section aria-labelledby="rca-section-flow" className="space-y-3">
        <RcaSectionHeader
          id="rca-section-flow"
          title="Incident flow"
          subtitle="Waterfall contribution analysis · timeline"
        />
        <div className="grid gap-3 lg:grid-cols-2">
          <RCAWaterfallChart priorityRanking={result.priorityRanking} rRcaScore={result.rRcaScore} />
          <RCATimeline events={events} />
        </div>
      </section>

      {/* ============================================================ */}
      {/* SECTION 5 — AI Yorumu */}
      {/* ============================================================ */}
      <section aria-labelledby="rca-section-ai" className="space-y-3">
        <RcaSectionHeader
          id="rca-section-ai"
          title="AI assessment"
          subtitle="Claude · technical analysis · legal process · prevention plan"
        />
        <RCAAINarrative
          narrative={narrative}
          calculationMode={result.calculationMode}
          loading={narrativeLoading}
          onTechnicalAnalysis={() => void fetchNarrative()}
          onLegalProcess={() => alert("Law 6331 reference output coming soon.")}
          onPreventionPlan={() => alert("Prevention plan detailed output coming soon.")}
          onExportPdf={() => alert("PDF report coming soon (with r2d-rca-pdf-template).")}
        />
      </section>
    </div>
  );
}
