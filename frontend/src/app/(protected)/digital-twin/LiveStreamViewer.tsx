"use client";

import { useEffect, useState, useRef } from "react";
import { createClient as supabase } from "@/lib/supabase/client";

/**
 * LiveStreamViewer — Canlı Saha Tarama İzleyicisi
 *
 * Mobil cihazdan broadcast edilen frame'leri real-time gösterir.
 * Supabase Realtime broadcast kanalına bağlanır.
 *
 * Özellikler:
 * - Aktif tarama oturumlarını listeler
 * - Seçilen oturumu canlı izler (frame stream)
 * - GPS konumu + yön gösterir
 * - Risk sayacı real-time güncellenir
 */

type ActiveSession = {
  id: string;
  location_name: string;
  user_id: string;
  total_risks_found: number;
  total_frames_analyzed: number;
  created_at: string;
  status: string;
};

type LiveFrame = {
  frame_number: number;
  thumbnail: string;
  gps?: { lat: number; lng: number };
  heading?: number;
  risk_count?: number;
  timestamp: number;
};

export default function LiveStreamViewer() {
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ActiveSession | null>(null);
  const [currentFrame, setCurrentFrame] = useState<LiveFrame | null>(null);
  const [frameCount, setFrameCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<any>(null);

  // Aktif oturumları bul
  useEffect(() => {
    const fetchActive = async () => {
      const sb = supabase();
      if (!sb) return;

      const { data } = await sb
        .from("scan_sessions")
        .select("id, location_name, user_id, total_risks_found, total_frames_analyzed, created_at, status")
        .eq("status", "active")
        .order("created_at", { ascending: false });

      setActiveSessions(data || []);
      setLoading(false);
    };

    fetchActive();

    // Realtime: yeni session başladığında listeye ekle
    const sb = supabase();
    if (!sb) return;

    const channel = sb
      .channel("active_sessions")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "scan_sessions" },
        (payload) => {
          if (payload.eventType === "INSERT" && payload.new.status === "active") {
            setActiveSessions((prev) => [payload.new as ActiveSession, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            if (payload.new.status !== "active") {
              setActiveSessions((prev) => prev.filter((s) => s.id !== payload.new.id));
              if (selectedSession?.id === payload.new.id) setSelectedSession(null);
            } else {
              setActiveSessions((prev) =>
                prev.map((s) => (s.id === payload.new.id ? { ...s, ...(payload.new as any) } : s))
              );
            }
          }
        }
      )
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  }, []);

  // Seçilen oturuma stream bağlantısı
  useEffect(() => {
    if (!selectedSession) {
      if (channelRef.current) {
        const sb = supabase();
        sb?.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setCurrentFrame(null);
      setFrameCount(0);
      return;
    }

    const sb = supabase();
    if (!sb) return;

    const channel = sb
      .channel(`stream:${selectedSession.id}`)
      .on("broadcast", { event: "frame" }, ({ payload }) => {
        setCurrentFrame(payload);
        setFrameCount((c) => c + 1);
      })
      .subscribe();

    channelRef.current = channel;

    // Ayrıca detection'ları dinle (anlık risk gelmesi için)
    const detChannel = sb
      .channel(`detections:${selectedSession.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "scan_detections",
          filter: `session_id=eq.${selectedSession.id}`,
        },
        (payload) => {
          // Trigger re-fetch of session stats
          setSelectedSession((prev) =>
            prev ? { ...prev, total_risks_found: (prev.total_risks_found || 0) + 1 } : prev
          );
        }
      )
      .subscribe();

    return () => {
      sb.removeChannel(channel);
      sb.removeChannel(detChannel);
    };
  }, [selectedSession]);

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <p className="text-xs text-muted-foreground">Aktif oturumlar yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
            </span>
            CANLI Saha Taramaları
          </h3>
          <p className="text-[10px] text-muted-foreground mt-1">
            {activeSessions.length === 0
              ? "Şu an aktif tarama yok"
              : `${activeSessions.length} aktif tarama`}
          </p>
        </div>
      </div>

      {/* Active sessions grid */}
      {activeSessions.length > 0 && !selectedSession && (
        <div className="grid gap-2 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {activeSessions.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSelectedSession(s)}
              className="group relative overflow-hidden rounded-xl border border-red-500/30 bg-gradient-to-br from-red-950/30 to-slate-950 p-4 text-left hover:border-red-500/60 transition-all"
            >
              <div className="absolute top-2 right-2 flex items-center gap-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
                <span className="text-[9px] font-bold text-red-400">LIVE</span>
              </div>

              <p className="text-sm font-bold text-white mb-1 pr-12">
                {s.location_name || "Saha Taraması"}
              </p>
              <div className="flex items-center gap-3 text-[10px] text-slate-400">
                <span>📷 {s.total_frames_analyzed || 0} kare</span>
                <span>⚠️ {s.total_risks_found || 0} risk</span>
              </div>
              <p className="text-[9px] text-slate-500 mt-2">
                İzlemek için tıkla →
              </p>
            </button>
          ))}
        </div>
      )}

      {/* Live viewer for selected session */}
      {selectedSession && (
        <div className="rounded-xl overflow-hidden border border-red-500/40 bg-black">
          {/* Header */}
          <div className="flex items-center justify-between p-3 bg-gradient-to-r from-red-950 to-slate-900 border-b border-red-500/30">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
              </span>
              <span className="text-xs font-bold text-white">LIVE</span>
              <span className="text-xs text-slate-300 ml-2">{selectedSession.location_name}</span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedSession(null)}
              className="text-xs text-slate-400 hover:text-white"
            >
              ✕ Kapat
            </button>
          </div>

          {/* Stream view */}
          <div className="relative aspect-video bg-slate-950 flex items-center justify-center">
            {currentFrame?.thumbnail ? (
              <img
                src={`data:image/jpeg;base64,${currentFrame.thumbnail}`}
                alt="Live frame"
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="text-center p-8">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 mb-3">
                  <div className="animate-pulse h-12 w-12 rounded-full bg-red-500/20" />
                </div>
                <p className="text-xs text-slate-400">Yayın bekleniyor...</p>
                <p className="text-[10px] text-slate-600 mt-1">
                  Mobil cihazdan frame gelmesi için tarama yapılıyor olması gerekir
                </p>
              </div>
            )}

            {/* HUD overlay */}
            {currentFrame && (
              <>
                {/* Top-left: frame info */}
                <div className="absolute top-3 left-3 rounded-lg bg-black/70 backdrop-blur px-3 py-1.5 text-[10px] text-white border border-red-500/30">
                  Kare #{currentFrame.frame_number} · {frameCount} alındı
                </div>

                {/* Top-right: risk count */}
                {currentFrame.risk_count !== undefined && currentFrame.risk_count > 0 && (
                  <div className="absolute top-3 right-3 rounded-lg bg-red-500/90 px-3 py-1.5 text-[11px] font-bold text-white">
                    ⚠️ {currentFrame.risk_count} risk
                  </div>
                )}

                {/* Bottom-left: GPS */}
                {currentFrame.gps && (
                  <div className="absolute bottom-3 left-3 rounded-lg bg-black/70 backdrop-blur px-3 py-1.5 text-[10px] text-white font-mono">
                    📍 {currentFrame.gps.lat.toFixed(5)}, {currentFrame.gps.lng.toFixed(5)}
                  </div>
                )}

                {/* Bottom-right: compass */}
                {currentFrame.heading !== undefined && (
                  <div className="absolute bottom-3 right-3 rounded-lg bg-black/70 backdrop-blur px-3 py-1.5 text-[10px] text-white">
                    🧭 {Math.round(currentFrame.heading)}°
                  </div>
                )}
              </>
            )}
          </div>

          {/* Stats footer */}
          <div className="flex items-center justify-between p-3 bg-slate-900 border-t border-slate-800">
            <div className="flex items-center gap-4 text-[10px]">
              <span className="text-slate-400">
                📷 <span className="text-white font-bold">{selectedSession.total_frames_analyzed || 0}</span> kare
              </span>
              <span className="text-slate-400">
                ⚠️ <span className="text-red-400 font-bold">{selectedSession.total_risks_found || 0}</span> risk
              </span>
              <span className="text-slate-400">
                📡 <span className="text-green-400 font-bold">{frameCount}</span> canlı
              </span>
            </div>
          </div>
        </div>
      )}

      {activeSessions.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">📭 Şu an aktif tarama yok</p>
          <p className="text-[10px] text-muted-foreground mt-2">
            Mobil uygulamadan bir tarama başlatıldığında burada canlı olarak izleyebilirsiniz.
          </p>
        </div>
      )}
    </div>
  );
}
