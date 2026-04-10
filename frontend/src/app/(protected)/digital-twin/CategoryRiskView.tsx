"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient as supabase } from "@/lib/supabase/client";

/**
 * CategoryRiskView — Kategorilere ayrılmış risk listesi
 *
 * Tüm scan_detections'ları kategorilerine göre ayırır ve gösterir.
 * Yangın, Elektrik, KKD, Düşme, Kimyasal, Mekanik, vs.
 */

type Detection = {
  id: string;
  session_id: string;
  risk_name: string;
  risk_level: string;
  risk_category: string;
  confidence: number;
  description: string;
  recommended_action: string;
  screenshot_url: string;
  created_at: string;
  gps_lat?: number;
  gps_lng?: number;
  transferred_to_assessment?: string;
};

type CategoryMeta = {
  key: string;
  label: string;
  icon: string;
  color: string;
  bg: string;
};

const CATEGORIES: CategoryMeta[] = [
  { key: "kkd", label: "KKD Eksikliği", icon: "🦺", color: "#8B5CF6", bg: "#8B5CF622" },
  { key: "dusme", label: "Düşme Riski", icon: "⚠️", color: "#F59E0B", bg: "#F59E0B22" },
  { key: "elektrik", label: "Elektrik Riski", icon: "⚡", color: "#3B82F6", bg: "#3B82F622" },
  { key: "yangin", label: "Yangın", icon: "🔥", color: "#EF4444", bg: "#EF444422" },
  { key: "mekanik", label: "Mekanik", icon: "⚙️", color: "#64748B", bg: "#64748B22" },
  { key: "kimyasal", label: "Kimyasal", icon: "🧪", color: "#10B981", bg: "#10B98122" },
  { key: "ergonomik", label: "Ergonomik", icon: "🧍", color: "#06B6D4", bg: "#06B6D422" },
  { key: "cevresel", label: "Çevresel", icon: "🌡️", color: "#84CC16", bg: "#84CC1622" },
  { key: "duzen", label: "Düzen/5S", icon: "📦", color: "#F97316", bg: "#F9731622" },
  { key: "trafik", label: "Araç Trafiği", icon: "🚜", color: "#DC2626", bg: "#DC262622" },
  { key: "diger", label: "Diğer", icon: "📍", color: "#6B7280", bg: "#6B728022" },
];

const LEVEL_COLORS: Record<string, string> = {
  critical: "#A855F7",
  high: "#EF4444",
  medium: "#F59E0B",
  low: "#10B981",
};

export default function CategoryRiskView() {
  const [detections, setDetections] = useState<Detection[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeLevel, setActiveLevel] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const sb = supabase();
      if (!sb) return;

      const { data } = await sb
        .from("scan_detections")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      setDetections(data || []);
      setLoading(false);
    })();
  }, []);

  // Kategori bazlı gruplama + sayım
  const categoryStats = useMemo(() => {
    const stats: Record<string, { count: number; critical: number; high: number }> = {};
    for (const d of detections) {
      const cat = d.risk_category || "diger";
      if (!stats[cat]) stats[cat] = { count: 0, critical: 0, high: 0 };
      stats[cat].count++;
      if (d.risk_level === "critical") stats[cat].critical++;
      else if (d.risk_level === "high") stats[cat].high++;
    }
    return stats;
  }, [detections]);

  const filtered = useMemo(() => {
    let list = detections;
    if (activeCategory) list = list.filter((d) => (d.risk_category || "diger") === activeCategory);
    if (activeLevel) list = list.filter((d) => d.risk_level === activeLevel);
    return list;
  }, [detections, activeCategory, activeLevel]);

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-xs text-muted-foreground mt-3">Kategoriler yükleniyor...</p>
      </div>
    );
  }

  if (detections.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <div className="text-4xl mb-3">📂</div>
        <h3 className="text-sm font-bold text-foreground mb-1">Henüz kategorize edilmiş risk yok</h3>
        <p className="text-[11px] text-muted-foreground">
          Saha taraması yapılınca riskler otomatik kategorilere ayrılır.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-base font-bold text-foreground">🎯 Kategorilere Göre Riskler</h3>
        <p className="text-[11px] text-muted-foreground mt-1">
          Toplam {detections.length} risk · {Object.keys(categoryStats).length} kategori
        </p>
      </div>

      {/* Category Grid */}
      <div className="grid gap-2 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {CATEGORIES.map((cat) => {
          const stat = categoryStats[cat.key];
          if (!stat) return null;
          const isActive = activeCategory === cat.key;
          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => setActiveCategory(isActive ? null : cat.key)}
              className={`relative rounded-xl border p-3 text-left transition-all ${
                isActive
                  ? "border-primary bg-primary/10 shadow-md"
                  : "border-border bg-card hover:border-primary/40"
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className="h-9 w-9 rounded-lg flex items-center justify-center text-lg"
                  style={{ backgroundColor: cat.bg }}
                >
                  {cat.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-foreground truncate">{cat.label}</p>
                  <p className="text-[9px] text-muted-foreground">
                    {stat.count} risk
                    {stat.critical > 0 && (
                      <span className="text-red-500 font-bold"> · {stat.critical} kritik</span>
                    )}
                  </p>
                </div>
              </div>
              {stat.critical > 0 && (
                <div className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              )}
            </button>
          );
        })}
      </div>

      {/* Level filter */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-muted-foreground">Seviye:</span>
        <div className="flex gap-1">
          {["critical", "high", "medium", "low"].map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => setActiveLevel(activeLevel === lvl ? null : lvl)}
              className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-colors ${
                activeLevel === lvl ? "text-white" : "text-muted-foreground border border-border"
              }`}
              style={{
                backgroundColor: activeLevel === lvl ? LEVEL_COLORS[lvl] : "transparent",
              }}
            >
              {lvl === "critical" ? "Kritik" : lvl === "high" ? "Yüksek" : lvl === "medium" ? "Orta" : "Düşük"}
            </button>
          ))}
          {(activeCategory || activeLevel) && (
            <button
              type="button"
              onClick={() => {
                setActiveCategory(null);
                setActiveLevel(null);
              }}
              className="px-2.5 py-1 rounded-md text-[10px] text-muted-foreground hover:text-foreground"
            >
              ✕ Temizle
            </button>
          )}
        </div>
      </div>

      {/* Filtered detections list */}
      {(activeCategory || activeLevel) && (
        <div className="space-y-2">
          <p className="text-[10px] text-muted-foreground">
            {filtered.length} sonuç gösteriliyor
          </p>
          <div className="grid gap-2 max-h-[600px] overflow-y-auto">
            {filtered.map((d) => (
              <div
                key={d.id}
                className="flex items-start gap-3 rounded-xl border border-border bg-card p-3 hover:border-primary/40 transition-colors"
              >
                <div
                  className="w-1 rounded-full self-stretch"
                  style={{ backgroundColor: LEVEL_COLORS[d.risk_level] }}
                />
                {d.screenshot_url && (
                  <img
                    src={d.screenshot_url}
                    alt="Risk"
                    className="h-16 w-16 rounded-lg object-cover flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-xs font-bold text-foreground">{d.risk_name}</h4>
                    <span
                      className="text-[9px] font-bold px-2 py-0.5 rounded"
                      style={{
                        backgroundColor: LEVEL_COLORS[d.risk_level] + "22",
                        color: LEVEL_COLORS[d.risk_level],
                      }}
                    >
                      {d.risk_level === "critical" ? "KRİTİK" : d.risk_level === "high" ? "YÜKSEK" : d.risk_level === "medium" ? "ORTA" : "DÜŞÜK"}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1">{d.description}</p>
                  <div className="flex items-center gap-3 mt-2 text-[9px] text-muted-foreground">
                    <span>%{d.confidence} güven</span>
                    <span>{new Date(d.created_at).toLocaleDateString("tr-TR")}</span>
                    {d.gps_lat != null && <span>📍 GPS</span>}
                    {d.transferred_to_assessment && <span className="text-green-500">✓ Analize aktarıldı</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
