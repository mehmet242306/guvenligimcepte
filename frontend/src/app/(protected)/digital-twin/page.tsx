"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const LEVEL_COLORS: Record<string, string> = {
  critical: "#7C3AED",
  high: "#EF4444",
  medium: "#F59E0B",
  low: "#10B981",
};

interface TwinModel {
  id: string;
  session_id: string;
  model_name: string;
  location_name: string;
  center_lat: number;
  center_lng: number;
  total_points: number;
  total_risks: number;
  status: string;
  created_at: string;
}

interface TwinPoint {
  id: string;
  point_index: number;
  gps_lat: number;
  gps_lng: number;
  compass_heading: number;
  image_url: string | null;
  risks_at_point: Array<{ risk_name: string; risk_level: string }>;
  captured_at: string;
}

export default function DigitalTwinPage() {
  const [models, setModels] = useState<TwinModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<TwinModel | null>(null);
  const [points, setPoints] = useState<TwinPoint[]>([]);
  const supabase = createClient();

  useEffect(() => {
    if (!supabase) return;
    const load = async () => {
      const { data } = await supabase
        .from("digital_twin_models")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (data) setModels(data);
    };
    load();
  }, [supabase]);

  useEffect(() => {
    if (!supabase || !selectedModel) return;
    const loadPoints = async () => {
      const { data } = await supabase
        .from("digital_twin_points")
        .select("*")
        .eq("session_id", selectedModel.session_id)
        .order("point_index", { ascending: true });
      if (data) setPoints(data);
    };
    loadPoints();
  }, [supabase, selectedModel]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dijital İkiz</h1>
        <p className="text-gray-500 mt-1">
          Saha taramalarından oluşturulan mekansal risk haritaları
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Model list */}
        <div className="lg:col-span-1">
          <h3 className="font-semibold text-gray-900 mb-4">Tarama Modelleri</h3>
          <div className="space-y-3">
            {models.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">
                Henüz dijital ikiz modeli yok. Mobil uygulamadan saha taraması
                yapın.
              </p>
            )}
            {models.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelectedModel(m)}
                className={`w-full text-left p-4 rounded-xl border transition ${
                  selectedModel?.id === m.id
                    ? "border-orange-500 bg-orange-50"
                    : "border-gray-100 bg-white hover:border-orange-200"
                }`}
              >
                <p className="font-medium text-gray-900 text-sm">
                  {m.model_name || m.location_name || "Adsız Model"}
                </p>
                <div className="flex gap-3 mt-2 text-xs text-gray-500">
                  <span>{m.total_points} nokta</span>
                  <span>{m.total_risks} risk</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(m.created_at).toLocaleDateString("tr-TR")}
                </p>
                <span
                  className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full font-medium ${
                    m.status === "ready"
                      ? "bg-green-100 text-green-700"
                      : m.status === "processing"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {m.status === "ready"
                    ? "Hazır"
                    : m.status === "processing"
                    ? "İşleniyor"
                    : "Hata"}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 3D Viewer / Map area */}
        <div className="lg:col-span-3">
          {!selectedModel ? (
            <div className="flex items-center justify-center h-96 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
              <div className="text-center">
                <svg
                  className="w-16 h-16 text-gray-300 mx-auto mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9"
                  />
                </svg>
                <p className="text-gray-400 font-medium">
                  Görüntülemek için bir model seçin
                </p>
              </div>
            </div>
          ) : (
            <div>
              {/* Model info */}
              <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
                <h2 className="text-lg font-bold text-gray-900">
                  {selectedModel.model_name || selectedModel.location_name}
                </h2>
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-gray-900">
                      {selectedModel.total_points}
                    </p>
                    <p className="text-xs text-gray-500">Veri Noktası</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-orange-600">
                      {selectedModel.total_risks}
                    </p>
                    <p className="text-xs text-gray-500">Tespit Edilen Risk</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-gray-900">
                      {selectedModel.status === "ready" ? "✓" : "..."}
                    </p>
                    <p className="text-xs text-gray-500">Model Durumu</p>
                  </div>
                </div>
              </div>

              {/* Point cloud visualization placeholder */}
              <div className="bg-gray-900 rounded-2xl p-6 min-h-[400px] relative overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  {/* Grid */}
                  <div className="absolute inset-0 opacity-10">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div
                        key={`h-${i}`}
                        className="absolute w-full border-t border-orange-500"
                        style={{ top: `${(i + 1) * 10}%` }}
                      />
                    ))}
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div
                        key={`v-${i}`}
                        className="absolute h-full border-l border-orange-500"
                        style={{ left: `${(i + 1) * 10}%` }}
                      />
                    ))}
                  </div>

                  {/* Points */}
                  {points.map((p, i) => {
                    const x = 10 + (i / Math.max(points.length, 1)) * 80;
                    const y = 20 + Math.sin(i * 0.7) * 30 + 25;
                    const hasRisk =
                      p.risks_at_point && p.risks_at_point.length > 0;
                    const riskLevel = hasRisk
                      ? (p.risks_at_point[0] as { risk_level: string })
                          ?.risk_level
                      : null;
                    const color = riskLevel
                      ? LEVEL_COLORS[riskLevel]
                      : "#3B82F6";

                    return (
                      <div
                        key={p.id}
                        className="absolute w-3 h-3 rounded-full transition-all hover:scale-150"
                        style={{
                          left: `${x}%`,
                          top: `${y}%`,
                          backgroundColor: color,
                          boxShadow: hasRisk
                            ? `0 0 8px ${color}`
                            : "0 0 4px #3B82F6",
                        }}
                        title={`Nokta ${p.point_index}${
                          hasRisk
                            ? ` — ${(p.risks_at_point[0] as { risk_name: string })?.risk_name}`
                            : ""
                        }`}
                      />
                    );
                  })}

                  {points.length === 0 && (
                    <p className="text-gray-500 text-sm">
                      Bu model için veri noktası yükleniyor...
                    </p>
                  )}
                </div>

                {/* Legend */}
                <div className="absolute bottom-4 left-4 flex gap-3">
                  {Object.entries(LEVEL_COLORS).map(([level, color]) => (
                    <div key={level} className="flex items-center gap-1">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-xs text-gray-400 capitalize">
                        {level === "critical"
                          ? "Kritik"
                          : level === "high"
                          ? "Yüksek"
                          : level === "medium"
                          ? "Orta"
                          : "Düşük"}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <span className="text-xs text-gray-400">Güvenli</span>
                  </div>
                </div>
              </div>

              {/* Points list */}
              {points.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-semibold text-gray-900 mb-3">
                    Tarama Noktaları ({points.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {points.slice(0, 20).map((p) => {
                      const hasRisk =
                        p.risks_at_point && p.risks_at_point.length > 0;
                      return (
                        <div
                          key={p.id}
                          className="bg-white rounded-lg border border-gray-100 p-3 flex items-center gap-3"
                        >
                          {p.image_url && (
                            <img
                              src={p.image_url}
                              alt=""
                              className="w-12 h-12 rounded-lg object-cover"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">
                              Nokta #{p.point_index}
                            </p>
                            <p className="text-xs text-gray-400">
                              {new Date(p.captured_at).toLocaleTimeString(
                                "tr-TR"
                              )}
                            </p>
                          </div>
                          {hasRisk && (
                            <span className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded-full font-medium">
                              {p.risks_at_point.length} risk
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
