"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient as supabase } from "@/lib/supabase/client";
import { useIsAdmin } from "@/lib/hooks/use-is-admin";
import { useLiveFieldScanAccess } from "@/lib/hooks/use-live-field-scan-access";

/**
 * CompanyScanData — Firma detay sayfası için canlı saha taraması + risk analizi özeti
 *
 * Bu firma için yapılan:
 * - scan_sessions (canlı taramalar)
 * - risk_assessments (otomatik + manuel; bulgu detayı tek yerde)
 */

type ScanSession = {
  id: string;
  location_name: string;
  status: string;
  total_risks_found: number;
  total_frames_analyzed: number;
  duration_seconds: number;
  created_at: string;
};

type RiskAssessment = {
  id: string;
  title: string;
  status: string;
  method: string;
  overall_risk_level: string;
  item_count: number;
  created_at: string;
  metadata?: any;
};

export default function CompanyScanData({ companyId }: { companyId: string }) {
  const isAdmin = useIsAdmin();
  const canLiveFieldScan = useLiveFieldScanAccess();
  const [scans, setScans] = useState<ScanSession[]>([]);
  const [assessments, setAssessments] = useState<RiskAssessment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const sb = supabase();
      if (!sb) return;

      const [scansRes, assessRes] = await Promise.all([
        sb
          .from("scan_sessions")
          .select("id, location_name, status, total_risks_found, total_frames_analyzed, duration_seconds, created_at")
          .eq("company_id", companyId)
          .order("created_at", { ascending: false })
          .limit(20),
        sb
          .from("risk_assessments")
          .select("id, title, status, method, overall_risk_level, item_count, created_at, metadata")
          .eq("company_workspace_id", companyId)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);

      setScans(scansRes.data || []);
      setAssessments(assessRes.data || []);

      setLoading(false);
    })();
  }, [companyId]);

  // Dijital İkiz verileri şu an sadece admin'e açık (geliştirme aşaması)
  if (isAdmin !== true) return null;

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const totalRisks = scans.reduce((a, s) => a + (s.total_risks_found || 0), 0);
  const totalFrames = scans.reduce((a, s) => a + (s.total_frames_analyzed || 0), 0);
  const activeScan = scans.find((s) => s.status === "active");

  return (
    <div className="space-y-4">
      {/* Active scan banner */}
      {activeScan && (
        <Link
          href="/digital-twin"
          className="block rounded-xl border border-red-500/40 bg-gradient-to-r from-red-950/30 to-slate-900 p-3 transition-colors hover:border-red-500/60"
        >
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
            </span>
            <div className="flex-1">
              <p className="text-xs font-bold text-red-400">🔴 CANLI TARAMA DEVAM EDİYOR</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {activeScan.location_name} · {activeScan.total_frames_analyzed || 0} kare · {activeScan.total_risks_found || 0} risk
              </p>
            </div>
            <span className="text-[10px] text-slate-500">İzle →</span>
          </div>
        </Link>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <p className="text-[9px] text-muted-foreground uppercase font-medium">Canlı Tarama</p>
          <p className="text-2xl font-bold text-foreground mt-1">{scans.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <p className="text-[9px] text-muted-foreground uppercase font-medium">Risk Analizi</p>
          <p className="text-2xl font-bold text-foreground mt-1">{assessments.length}</p>
        </div>
        <Link
          href={`/risk-analysis?companyId=${encodeURIComponent(companyId)}`}
          className="rounded-xl border border-border bg-card p-3 text-center transition-colors hover:border-primary/40"
        >
          <p className="text-[9px] font-medium uppercase text-muted-foreground">Toplam Risk (analiz)</p>
          <p className="mt-1 text-2xl font-bold text-amber-500">{totalRisks}</p>
          <p className="mt-1 text-[9px] text-primary">Risk Analizi →</p>
        </Link>
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <p className="text-[9px] text-muted-foreground uppercase font-medium">Analiz Kare</p>
          <p className="text-2xl font-bold text-foreground mt-1">{totalFrames}</p>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Saha taraması bulgularının tam listesi ve skorlama tek yerde:{" "}
        <Link href={`/risk-analysis?companyId=${encodeURIComponent(companyId)}`} className="font-medium text-primary hover:underline">
          Risk Analizi
        </Link>
        .
      </p>

      {/* Recent scans */}
      {scans.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-foreground">📹 Son Canlı Taramalar</h4>
            <div className="flex gap-2">
              {canLiveFieldScan ? (
                <Link href="/live-scan" className="text-[10px] text-primary hover:underline">
                  Canlı tarama →
                </Link>
              ) : null}
              <Link href="/digital-twin" className="text-[10px] text-muted-foreground hover:underline">
                İzleme →
              </Link>
            </div>
          </div>
          <div className="space-y-2">
            {scans.slice(0, 5).map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border border-border p-2.5">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="h-7 w-7 rounded-lg bg-orange-500/15 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs">📹</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-foreground truncate">
                      {s.location_name || "Saha Taraması"}
                    </p>
                    <p className="text-[9px] text-muted-foreground">
                      {s.total_frames_analyzed || 0} kare · {s.total_risks_found || 0} risk
                    </p>
                  </div>
                </div>
                <span className="text-[9px] text-muted-foreground">
                  {new Date(s.created_at).toLocaleDateString("tr-TR")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent assessments */}
      {assessments.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-foreground">📋 Risk Analizleri</h4>
            <Link
              href={`/risk-analysis?companyId=${encodeURIComponent(companyId)}`}
              className="text-[10px] text-primary hover:underline"
            >
              Tümünü gör →
            </Link>
          </div>
          <div className="space-y-2">
            {assessments.slice(0, 5).map((a) => {
              const isAuto = a.metadata?.source === "auto_from_scan";
              return (
                <div key={a.id} className="flex items-center justify-between rounded-lg border border-border p-2.5">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="h-7 w-7 rounded-lg bg-blue-500/15 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs">{isAuto ? "🤖" : "📋"}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-foreground truncate">
                        {a.title || "Risk Analizi"}
                      </p>
                      <p className="text-[9px] text-muted-foreground">
                        {a.method?.toUpperCase()} · {a.item_count || 0} bulgu
                        {isAuto && <span className="text-green-500"> · Otomatik</span>}
                      </p>
                    </div>
                  </div>
                  <span className="text-[9px] text-muted-foreground">
                    {new Date(a.created_at).toLocaleDateString("tr-TR")}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
