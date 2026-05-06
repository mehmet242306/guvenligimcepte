"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Camera, Loader2, ScanLine, Square, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  fetchLiveScanCompanyOptions,
  pickDefaultLiveScanCompanyId,
  type LiveScanCompanyOption,
} from "@/lib/supabase/live-scan-companies";
import {
  completeWebScanSessionWithPath,
  createWebScanSession,
  saveScanDetection,
  saveScanFrame,
  saveScanTwinPoint,
  uploadScanScreenshot,
  type ScanPathPoint,
} from "@/lib/supabase/web-scan-sync";
import { invokeNovaVisionScan } from "@/lib/vision/invoke-nova-vision-scan";
import {
  removeLiveScanChannel,
  sendLiveScanFrame,
  subscribeLiveScanBroadcastChannel,
} from "@/lib/realtime/web-live-scan-broadcast";
import type { RealtimeChannel } from "@supabase/supabase-js";

const SCAN_INTERVAL_MS = 3200;
const JPEG_QUALITY = 0.6;

const RISK_METHODS = [
  "r2d",
  "fine_kinney",
  "l_matrix",
  "fmea",
  "hazop",
  "bowtie",
  "fta",
  "checklist",
  "jsa",
  "lopa",
] as const;

function captureJpegBase64FromVideo(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  quality: number,
): string {
  const w = video.videoWidth;
  const h = video.videoHeight;
  if (!w || !h) {
    throw new Error("video_not_ready");
  }
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("no_canvas");
  }
  ctx.drawImage(video, 0, 0, w, h);
  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  const parts = dataUrl.split(",");
  const base64 = parts[1];
  if (!base64) {
    throw new Error("no_base64");
  }
  return base64;
}

type EnrichedRisk = Record<string, unknown> & { id: string; frame: number };

function enrichRisks(risks: Array<Record<string, unknown>>, frameNumber: number): EnrichedRisk[] {
  return risks.map((risk, index) => ({
    ...risk,
    id: (risk.id as string) || `${Date.now()}-${frameNumber}-${index}`,
    frame: frameNumber,
  }));
}

export function LiveScanClient() {
  const t = useTranslations("liveScan");
  const locale = useLocale();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const pathPointsRef = useRef<ScanPathPoint[]>([]);
  const frameRef = useRef(0);
  const geoWatchRef = useRef<number | null>(null);
  const lastGpsRef = useRef<{ lat: number; lng: number; accuracy: number | null } | null>(null);
  const elapsedTimerRef = useRef<number | null>(null);

  const [companies, setCompanies] = useState<LiveScanCompanyOption[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [riskMethod, setRiskMethod] = useState<string>("r2d");
  const [cameraReady, setCameraReady] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [frameCount, setFrameCount] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [sessionRiskTally, setSessionRiskTally] = useState(0);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [transferBanner, setTransferBanner] = useState<{
    riskCount: number;
    assessmentId: string | null;
    companyWorkspaceId: string;
  } | null>(null);

  const companyName = companies.find((c) => c.id === companyId)?.displayName ?? "";

  useEffect(() => {
    let canceled = false;
    void (async () => {
      const list = await fetchLiveScanCompanyOptions();
      if (canceled) return;
      setCompanies(list);
      const def = await pickDefaultLiveScanCompanyId(list);
      if (!canceled) setCompanyId(def);
    })();
    return () => {
      canceled = true;
    };
  }, []);

  useEffect(() => {
    if (!isScanning) return;
    elapsedTimerRef.current = window.setInterval(() => {
      setElapsed((s) => s + 1);
    }, 1000);
    return () => {
      if (elapsedTimerRef.current) {
        window.clearInterval(elapsedTimerRef.current);
        elapsedTimerRef.current = null;
      }
    };
  }, [isScanning]);

  useEffect(() => {
    if (!isScanning || !navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = pos.coords.accuracy;
        lastGpsRef.current = { lat, lng, accuracy };
        pathPointsRef.current.push({
          lat,
          lng,
          timestamp: new Date().toISOString(),
        });
      },
      () => {
        /* GPS reddedildi — sessiz */
      },
      { enableHighAccuracy: true, maximumAge: 4000 },
    );
    geoWatchRef.current = id;
    return () => {
      if (geoWatchRef.current != null) {
        navigator.geolocation.clearWatch(geoWatchRef.current);
        geoWatchRef.current = null;
      }
    };
  }, [isScanning]);

  const stopMedia = useCallback(() => {
    for (const track of streamRef.current?.getTracks() ?? []) {
      track.stop();
    }
    streamRef.current = null;
    setCameraReady(false);
  }, []);

  const teardownSession = useCallback(
    async (frames: number, seconds: number): Promise<{
      riskCount: number;
      assessmentId: string | null;
    } | null> => {
      const sid = sessionIdRef.current;
      let result: { riskCount: number; assessmentId: string | null } | null = null;
      if (sid && !sid.startsWith("local-")) {
        result = await completeWebScanSessionWithPath(sid, {
          totalFrames: frames,
          durationSeconds: seconds,
          pathPoints: pathPointsRef.current,
        });
      }
      removeLiveScanChannel(channelRef.current);
      channelRef.current = null;
      sessionIdRef.current = null;
      pathPointsRef.current = [];
      stopMedia();
      return result;
    },
    [stopMedia],
  );

  const handleStopScan = useCallback(async () => {
    setIsScanning(false);
    setIsAnalyzing(false);
    const frames = frameRef.current;
    const secs = elapsed;
    const wsId = companyId;
    const transfer = await teardownSession(frames, secs);
    if (transfer && wsId && transfer.riskCount > 0) {
      setTransferBanner({
        riskCount: transfer.riskCount,
        assessmentId: transfer.assessmentId,
        companyWorkspaceId: wsId,
      });
    } else {
      setTransferBanner(null);
    }
    setElapsed(0);
    frameRef.current = 0;
    setFrameCount(0);
    setSessionRiskTally(0);
  }, [companyId, elapsed, teardownSession]);

  useEffect(() => {
    return () => {
      void (async () => {
        removeLiveScanChannel(channelRef.current);
        channelRef.current = null;
        stopMedia();
      })();
    };
  }, [stopMedia]);

  const ensureCamera = useCallback(async () => {
    setPermissionError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setPermissionError(t("errors.noMediaApi"));
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      const v = videoRef.current;
      if (v) {
        v.srcObject = stream;
        await v.play();
      }
      setCameraReady(true);
      return true;
    } catch {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        streamRef.current = stream;
        const v = videoRef.current;
        if (v) {
          v.srcObject = stream;
          await v.play();
        }
        setCameraReady(true);
        return true;
      } catch (e) {
        setPermissionError(
          e instanceof Error && e.name === "NotAllowedError" ? t("errors.cameraDenied") : t("errors.cameraFailed"),
        );
        return false;
      }
    }
  }, [t]);

  const persistScanResults = useCallback(
    async (
      frameNumber: number,
      base64: string,
      risks: EnrichedRisk[],
      rawRisks: Array<Record<string, unknown>>,
      fullResult: Record<string, unknown>,
    ) => {
      const sid = sessionIdRef.current;
      const ws = companyId;
      if (!sid || sid.startsWith("local-") || !ws) return;

      const gps = lastGpsRef.current;
      let screenshotUrl: string | null = null;

      if (risks.length > 0) {
        screenshotUrl = await uploadScanScreenshot(sid, frameNumber, base64);
        await saveScanFrame({
          sessionId: sid,
          frameNumber,
          imageUrl: screenshotUrl,
          risksInFrame: risks.length,
          facesDetected: Array.isArray(fullResult.faces) ? fullResult.faces.length : 0,
          analysisResult: fullResult,
          gpsLat: gps?.lat,
          gpsLng: gps?.lng,
        });
        for (const risk of risks) {
          await saveScanDetection({
            sessionId: sid,
            companyWorkspaceId: ws,
            frameNumber,
            risk,
            screenshotUrl,
            gpsLat: gps?.lat,
            gpsLng: gps?.lng,
          });
        }
      }

      await saveScanTwinPoint({
        sessionId: sid,
        companyWorkspaceId: ws,
        pointIndex: frameNumber,
        imageUrl: screenshotUrl,
        risksAtPoint: rawRisks,
        gpsLat: gps?.lat,
        gpsLng: gps?.lng,
        gpsAccuracy: gps?.accuracy ?? null,
      });
    },
    [companyId],
  );

  const runCapture = useCallback(async () => {
    if (!isScanning || isAnalyzing) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !cameraReady) return;
    if (!companyId) {
      setFatalError(t("errors.pickCompany"));
      setIsScanning(false);
      return;
    }

    setIsAnalyzing(true);
    frameRef.current += 1;
    const currentFrame = frameRef.current;

    try {
      const base64 = captureJpegBase64FromVideo(video, canvas, JPEG_QUALITY);
      setFrameCount(currentFrame);

      const lang = locale.length >= 2 ? locale.slice(0, 2) : "tr";
      const result = await invokeNovaVisionScan({
        imageBase64: base64,
        riskMethod,
        language: lang,
        companyWorkspaceId: companyId,
        source: "web_live_scan",
      });

      const rawRisks = Array.isArray(result.risks) ? (result.risks as Array<Record<string, unknown>>) : [];
      const risks = enrichRisks(rawRisks, currentFrame);

      void sendLiveScanFrame(channelRef.current, {
        frameNumber: currentFrame,
        thumbnailBase64: base64,
        gpsLat: lastGpsRef.current?.lat,
        gpsLng: lastGpsRef.current?.lng,
        riskCount: risks.length,
      }).catch(() => {});

      if (risks.length > 0) {
        setSessionRiskTally((n) => n + risks.length);
      }

      void persistScanResults(currentFrame, base64, risks, rawRisks, result as Record<string, unknown>);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("NOVA_AUTH") || msg.includes("auth") || msg.includes("401")) {
        setFatalError(t("errors.auth"));
        setIsScanning(false);
      } else {
        console.warn("live scan frame:", msg);
      }
    } finally {
      setIsAnalyzing(false);
    }
  }, [
    cameraReady,
    companyId,
    isAnalyzing,
    isScanning,
    locale,
    riskMethod,
    persistScanResults,
    t,
  ]);

  useEffect(() => {
    if (!isScanning || isAnalyzing) return;
    const tmr = window.setTimeout(() => {
      void runCapture();
    }, SCAN_INTERVAL_MS);
    return () => window.clearTimeout(tmr);
  }, [isScanning, isAnalyzing, frameCount, runCapture]);

  const handleStartScan = useCallback(async () => {
    setFatalError(null);
    if (!companyId) {
      setFatalError(t("errors.pickCompany"));
      return;
    }
    const ok = await ensureCamera();
    if (!ok) return;

    setTransferBanner(null);
    setSessionRiskTally(0);
    setElapsed(0);
    frameRef.current = 0;
    setFrameCount(0);
    pathPointsRef.current = [];
    lastGpsRef.current = null;

    try {
      const session = await createWebScanSession({
        companyWorkspaceId: companyId,
        riskMethod,
        locationName: companyName || t("defaultLocationName"),
        gpsStartLat: null,
        gpsStartLng: null,
      });
      sessionIdRef.current = session.id;

      const sb = createClient();
      const { data: u } = (await sb?.auth.getUser()) ?? { data: { user: null } };
      const uid = u.user?.id ?? "web-broadcaster";

      const ch = await subscribeLiveScanBroadcastChannel(session.id, uid, companyName || t("defaultLocationName"));
      channelRef.current = ch;
    } catch (e) {
      console.warn("session / broadcast:", e);
      sessionIdRef.current = `local-${Date.now()}`;
    }

    setIsScanning(true);
  }, [companyId, companyName, ensureCamera, riskMethod, t]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
      .toString()
      .padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-3 py-6 sm:px-6">
      <PageHeader title={t("title")} description={t("subtitle")} />

      {fatalError ? (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{fatalError}</span>
        </div>
      ) : null}

      {transferBanner ? (
        <div className="rounded-xl border border-primary/35 bg-primary/5 px-4 py-4 text-sm">
          <p className="font-semibold text-foreground">{t("transfer.title")}</p>
          <p className="mt-1 text-muted-foreground">
            {t("transfer.body", { count: transferBanner.riskCount })}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {transferBanner.assessmentId ? (
              <Link
                href={`/risk-analysis?companyId=${encodeURIComponent(transferBanner.companyWorkspaceId)}&loadId=${encodeURIComponent(transferBanner.assessmentId)}`}
                className={cn(
                  "inline-flex h-11 items-center justify-center rounded-2xl border border-amber-500/20 px-6 text-sm font-semibold text-white no-underline",
                  "bg-[linear-gradient(135deg,#B8860B_0%,#D4A017_50%,#FBBF24_100%)] shadow-[0_16px_34px_rgba(184,134,11,0.28)] hover:brightness-[1.05]",
                )}
              >
                {t("transfer.openAnalysis")}
              </Link>
            ) : (
              <Link
                href={`/risk-analysis?companyId=${encodeURIComponent(transferBanner.companyWorkspaceId)}`}
                className={cn(
                  "inline-flex h-11 items-center justify-center rounded-2xl border border-border bg-card px-6 text-sm font-medium text-primary no-underline shadow-[var(--shadow-soft)] hover:bg-secondary",
                )}
              >
                {t("transfer.openAnalysisFallback")}
              </Link>
            )}
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3 rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-semibold text-muted-foreground">{t("controls.heading")}</p>
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">{t("controls.company")}</label>
            <select
              className="flex h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:opacity-60"
              value={companyId ?? ""}
              onChange={(e) => setCompanyId(e.target.value || null)}
              disabled={isScanning || companies.length === 0}
            >
              <option value="">{t("controls.companyPlaceholder")}</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.displayName}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">{t("controls.method")}</label>
            <select
              className="flex h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:opacity-60"
              value={riskMethod}
              onChange={(e) => setRiskMethod(e.target.value)}
              disabled={isScanning}
            >
              {RISK_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {!isScanning ? (
              <Button type="button" onClick={() => void handleStartScan()} className="gap-2">
                <ScanLine className="h-4 w-4" />
                {t("controls.start")}
              </Button>
            ) : (
              <Button type="button" variant="danger" onClick={() => void handleStopScan()} className="gap-2">
                <Square className="h-4 w-4" />
                {t("controls.stop")}
              </Button>
            )}
            {!cameraReady && !isScanning ? (
              <Button type="button" variant="outline" onClick={() => void ensureCamera()} className="gap-2">
                <Camera className="h-4 w-4" />
                {t("controls.allowCamera")}
              </Button>
            ) : null}
          </div>

          {permissionError ? <p className="text-xs text-amber-600 dark:text-amber-400">{permissionError}</p> : null}

          <p className="text-[11px] leading-relaxed text-muted-foreground">{t("hintViewer")}</p>
          <Link
            href="/digital-twin"
            className="text-xs font-medium text-primary underline-offset-4 hover:underline"
          >
            {t("linkDigitalTwin")}
          </Link>
        </div>

        <div className="relative overflow-hidden rounded-xl border border-border bg-black/90 aspect-[4/3] md:aspect-auto md:min-h-[280px]">
          <video ref={videoRef} className="h-full w-full object-cover" playsInline muted autoPlay />
          <canvas ref={canvasRef} className="hidden" />

          {isScanning ? (
            <div className="pointer-events-none absolute inset-0 flex flex-col justify-between bg-gradient-to-t from-black/70 via-transparent to-black/50 p-3">
              <div className="flex items-center justify-between text-xs text-white">
                <span className="font-semibold">{companyName || t("title")}</span>
                <span className="tabular-nums opacity-90">{formatTime(elapsed)}</span>
              </div>
              <div className="flex items-center justify-between gap-2 text-[11px] text-white/80">
                <span>
                  {t("hud.frame", { n: frameCount })}
                  {sessionRiskTally > 0 ? ` · ${t("hud.risksQueued", { count: sessionRiskTally })}` : ""}
                </span>
                {isAnalyzing ? (
                  <span className="flex shrink-0 items-center gap-1 text-teal-300">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {t("hud.analyzing")}
                  </span>
                ) : (
                  <span className="shrink-0 text-white/50">{t("hud.waiting")}</span>
                )}
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/80 text-center text-sm text-muted-foreground">
              <Camera className="h-8 w-8 opacity-50" />
              <p className="max-w-[240px] px-4">{t("cameraIdle")}</p>
            </div>
          )}

        </div>
      </div>

      <p className="text-[11px] text-muted-foreground">{t("disclaimer")}</p>
    </div>
  );
}
