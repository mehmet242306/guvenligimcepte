"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Grid, Html, Line, Text } from "@react-three/drei";
import { useMemo, useRef, useState, useEffect } from "react";
import { Mesh, Vector3 } from "three";
import type { TwinPoint } from "@/lib/supabase/digital-twin-api";

/**
 * TwinScene3D — Dünya sınıfı 3D dijital ikiz görüntüleyici
 *
 * 5 Mod:
 * 1. 🌐 Normal - standart nokta görünümü
 * 2. 📏 Ölçüm - 2 noktaya tıkla, mesafeyi gör
 * 3. 🔥 Heatmap - yarı saydam ısı küreleri
 * 4. ▶️ Replay - zaman tabanlı canlı animasyon
 * 5. 🎯 Hotspots - kritik riskleri otomatik vurgulama
 */

type Scene3DMode = "normal" | "measure" | "heatmap" | "replay" | "hotspots";

type TwinScene3DProps = {
  points: TwinPoint[];
  comparePoints?: TwinPoint[] | null;
  onPointClick?: (point: TwinPoint) => void;
};

const LEVEL_COLORS: Record<string, string> = {
  critical: "#A855F7",
  high: "#EF4444",
  medium: "#F59E0B",
  low: "#10B981",
  none: "#3B82F6",
};

function getPointLevel(point: TwinPoint): keyof typeof LEVEL_COLORS {
  const risks = (point.risksAtPoint as any[]) || [];
  if (risks.length === 0) return "none";
  if (risks.some((r) => r.risk_level === "critical")) return "critical";
  if (risks.some((r) => r.risk_level === "high")) return "high";
  if (risks.some((r) => r.risk_level === "medium")) return "medium";
  return "low";
}

function PulsingSphere({
  position,
  color,
  radius,
  onClick,
  onHover,
  hasRisk,
  highlighted,
  selected,
  dimmed,
}: {
  position: [number, number, number];
  color: string;
  radius: number;
  onClick: () => void;
  onHover: (hover: boolean) => void;
  hasRisk: boolean;
  highlighted?: boolean;
  selected?: boolean;
  dimmed?: boolean;
}) {
  const meshRef = useRef<Mesh>(null);
  const glowRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame(({ clock }) => {
    if (glowRef.current && (hasRisk || highlighted)) {
      const pulse = 1 + Math.sin(clock.getElapsedTime() * 3) * 0.2;
      glowRef.current.scale.set(pulse, pulse, pulse);
    }
  });

  const scale = selected ? 1.6 : hovered ? 1.3 : 1;

  return (
    <group position={position}>
      {(hasRisk || highlighted) && (
        <mesh ref={glowRef}>
          <sphereGeometry args={[radius * 2.2, 16, 16]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={dimmed ? 0.05 : highlighted ? 0.3 : 0.15}
          />
        </mesh>
      )}
      <mesh
        ref={meshRef}
        scale={scale}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          onHover(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          onHover(false);
          document.body.style.cursor = "default";
        }}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        <sphereGeometry args={[radius, 24, 24]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={selected ? 1.0 : hasRisk ? 0.6 : 0.2}
          metalness={0.3}
          roughness={0.4}
          transparent={dimmed}
          opacity={dimmed ? 0.2 : 1}
        />
      </mesh>
    </group>
  );
}

function HeatBubble({ position, intensity }: { position: [number, number, number]; intensity: number }) {
  const color = intensity > 0.7 ? "#EF4444" : intensity > 0.4 ? "#F59E0B" : "#10B981";
  const radius = 0.8 + intensity * 1.5;
  return (
    <mesh position={position}>
      <sphereGeometry args={[radius, 16, 16]} />
      <meshBasicMaterial color={color} transparent opacity={0.12 + intensity * 0.25} />
    </mesh>
  );
}

function Scene({
  points,
  comparePoints,
  mode,
  onPointClick,
  measurePoints,
  setMeasurePoints,
  replayIndex,
}: TwinScene3DProps & {
  mode: Scene3DMode;
  measurePoints: TwinPoint[];
  setMeasurePoints: (p: TwinPoint[]) => void;
  replayIndex: number;
}) {
  const [hoveredPoint, setHoveredPoint] = useState<TwinPoint | null>(null);

  const { normalized, bounds } = useMemo(() => {
    const gpsPoints = points.filter((p) => p.gpsLat != null && p.gpsLng != null);

    if (gpsPoints.length === 0) {
      return {
        normalized: points.map((p, i) => {
          const angle = (i / points.length) * Math.PI * 4;
          const radius = 2 + (i / points.length) * 8;
          return {
            point: p,
            position: [Math.cos(angle) * radius, 0, Math.sin(angle) * radius] as [number, number, number],
          };
        }),
        bounds: null,
      };
    }

    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
    let minAlt = Infinity, maxAlt = -Infinity;

    for (const p of gpsPoints) {
      if (p.gpsLat! < minLat) minLat = p.gpsLat!;
      if (p.gpsLat! > maxLat) maxLat = p.gpsLat!;
      if (p.gpsLng! < minLng) minLng = p.gpsLng!;
      if (p.gpsLng! > maxLng) maxLng = p.gpsLng!;
      if (p.gpsAltitude != null) {
        if (p.gpsAltitude < minAlt) minAlt = p.gpsAltitude;
        if (p.gpsAltitude > maxAlt) maxAlt = p.gpsAltitude;
      }
    }

    const latRange = maxLat - minLat || 0.0001;
    const lngRange = maxLng - minLng || 0.0001;
    const altRange = maxAlt - minAlt || 1;
    const scale = 20;

    return {
      bounds: { minLat, maxLat, minLng, maxLng },
      normalized: points.map((p) => {
        if (p.gpsLat == null || p.gpsLng == null) {
          return { point: p, position: [0, 0, 0] as [number, number, number] };
        }
        const x = ((p.gpsLng - minLng) / lngRange - 0.5) * scale;
        const z = ((p.gpsLat - minLat) / latRange - 0.5) * scale;
        const y = p.gpsAltitude != null ? ((p.gpsAltitude - minAlt) / altRange) * 3 : 0;
        return { point: p, position: [x, y, z] as [number, number, number] };
      }),
    };
  }, [points]);

  // Compare points - ayni bounds'a normalize et
  const compareNormalized = useMemo(() => {
    if (!comparePoints || comparePoints.length === 0 || !bounds) return [];
    const { minLat, maxLat, minLng, maxLng } = bounds;
    const latRange = maxLat - minLat || 0.0001;
    const lngRange = maxLng - minLng || 0.0001;
    const scale = 20;
    return comparePoints
      .filter((p) => p.gpsLat != null && p.gpsLng != null)
      .map((p) => ({
        point: p,
        position: [
          ((p.gpsLng! - minLng) / lngRange - 0.5) * scale,
          0.5, // Biraz yukari
          ((p.gpsLat! - minLat) / latRange - 0.5) * scale,
        ] as [number, number, number],
      }));
  }, [comparePoints, bounds]);

  const pathLine = useMemo(() => {
    const gpsNormalized = normalized.filter(
      (n) => n.point.gpsLat != null && n.point.gpsLng != null
    );
    return gpsNormalized.map((n) => new Vector3(...n.position));
  }, [normalized]);

  // Replay visible points
  const visibleNormalized = useMemo(() => {
    if (mode === "replay") {
      return normalized.slice(0, replayIndex + 1);
    }
    return normalized;
  }, [mode, normalized, replayIndex]);

  // Heat bubbles data
  const heatBubbles = useMemo(() => {
    if (mode !== "heatmap") return [];
    const gridSize = 2;
    const clusters: Record<string, { sum: number; count: number; pos: [number, number, number] }> = {};

    for (const n of normalized) {
      const risks = (n.point.risksAtPoint as any[]) || [];
      if (risks.length === 0) continue;
      const weight =
        risks.reduce((acc, r) => {
          if (r.risk_level === "critical") return acc + 4;
          if (r.risk_level === "high") return acc + 3;
          if (r.risk_level === "medium") return acc + 2;
          return acc + 1;
        }, 0);

      const key = `${Math.round(n.position[0] / gridSize)},${Math.round(n.position[2] / gridSize)}`;
      if (!clusters[key]) {
        clusters[key] = { sum: 0, count: 0, pos: [...n.position] };
      }
      clusters[key].sum += weight;
      clusters[key].count += 1;
    }

    const max = Math.max(...Object.values(clusters).map((c) => c.sum), 1);
    return Object.values(clusters).map((c) => ({
      position: c.pos,
      intensity: c.sum / max,
    }));
  }, [mode, normalized]);

  // Measurement line
  const measureLine = useMemo(() => {
    if (mode !== "measure" || measurePoints.length !== 2) return null;
    const p1 = normalized.find((n) => n.point.id === measurePoints[0].id);
    const p2 = normalized.find((n) => n.point.id === measurePoints[1].id);
    if (!p1 || !p2) return null;
    return {
      start: p1.position,
      end: p2.position,
      midpoint: [
        (p1.position[0] + p2.position[0]) / 2,
        (p1.position[1] + p2.position[1]) / 2 + 0.5,
        (p1.position[2] + p2.position[2]) / 2,
      ] as [number, number, number],
    };
  }, [mode, measurePoints, normalized]);

  // Measurement distance (real-world meters)
  const measureDistance = useMemo(() => {
    if (mode !== "measure" || measurePoints.length !== 2) return null;
    const p1 = measurePoints[0];
    const p2 = measurePoints[1];
    if (p1.gpsLat == null || p2.gpsLat == null) return null;
    // Haversine
    const R = 6371000;
    const φ1 = (p1.gpsLat * Math.PI) / 180;
    const φ2 = (p2.gpsLat * Math.PI) / 180;
    const Δφ = ((p2.gpsLat - p1.gpsLat) * Math.PI) / 180;
    const Δλ = ((p2.gpsLng! - p1.gpsLng!) * Math.PI) / 180;
    const a =
      Math.sin(Δφ / 2) ** 2 +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }, [mode, measurePoints]);

  const handlePointClick = (point: TwinPoint) => {
    if (mode === "measure") {
      const next = [...measurePoints, point];
      if (next.length > 2) setMeasurePoints([point]);
      else setMeasurePoints(next);
    } else {
      onPointClick?.(point);
    }
  };

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={0.8} castShadow />
      <pointLight position={[-10, 10, -10]} intensity={0.4} color="#F97316" />

      <Grid
        args={[30, 30]}
        cellSize={1}
        cellColor="#334155"
        sectionSize={5}
        sectionColor="#64748B"
        fadeDistance={40}
        position={[0, -0.01, 0]}
        infiniteGrid
      />

      {pathLine.length > 1 && mode !== "heatmap" && (
        <Line
          points={mode === "replay" ? pathLine.slice(0, replayIndex + 1) : pathLine}
          color="#F97316"
          lineWidth={3}
          transparent
          opacity={0.7}
        />
      )}

      {/* Heat bubbles */}
      {mode === "heatmap" && heatBubbles.map((hb, i) => (
        <HeatBubble key={`hb-${i}`} position={hb.position} intensity={hb.intensity} />
      ))}

      {/* Points */}
      {visibleNormalized.map(({ point, position }, i) => {
        const level = getPointLevel(point);
        const color = LEVEL_COLORS[level];
        const hasRisk = level !== "none";
        const radius = hasRisk ? 0.25 : 0.15;
        const isMeasured = measurePoints.some((mp) => mp.id === point.id);
        const isHotspot = mode === "hotspots" && (level === "critical" || level === "high");
        const isReplayLast = mode === "replay" && i === visibleNormalized.length - 1;
        const dimmed = mode === "hotspots" && !isHotspot;

        return (
          <PulsingSphere
            key={point.id || i}
            position={position}
            color={color}
            radius={radius}
            hasRisk={hasRisk}
            selected={isMeasured || isReplayLast}
            highlighted={isHotspot}
            dimmed={dimmed}
            onClick={() => handlePointClick(point)}
            onHover={(h) => setHoveredPoint(h ? point : null)}
          />
        );
      })}

      {/* Compare points - yukarda, yarı saydam */}
      {compareNormalized.map(({ point, position }, i) => {
        const level = getPointLevel(point);
        const color = LEVEL_COLORS[level];
        return (
          <mesh key={`cmp-${point.id || i}`} position={position}>
            <sphereGeometry args={[0.18, 16, 16]} />
            <meshBasicMaterial color={color} transparent opacity={0.5} wireframe />
          </mesh>
        );
      })}

      {/* Measurement line */}
      {measureLine && (
        <>
          <Line
            points={[measureLine.start, measureLine.end]}
            color="#10B981"
            lineWidth={4}
            dashed
            dashSize={0.3}
            gapSize={0.15}
          />
          {measureDistance != null && (
            <Html position={measureLine.midpoint}>
              <div
                style={{
                  background: "#10B981",
                  color: "#fff",
                  padding: "6px 12px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                  transform: "translate(-50%, -50%)",
                  boxShadow: "0 4px 12px rgba(16,185,129,0.5)",
                }}
              >
                📏 {measureDistance.toFixed(2)}m
              </div>
            </Html>
          )}
        </>
      )}

      {hoveredPoint && (
        <Html
          position={
            normalized.find((n) => n.point.id === hoveredPoint.id)?.position || [0, 1, 0]
          }
          style={{ pointerEvents: "none" }}
        >
          <div
            style={{
              background: "rgba(15,23,42,0.95)",
              color: "#fff",
              padding: "8px 12px",
              borderRadius: 8,
              fontSize: 11,
              whiteSpace: "nowrap",
              borderLeft: `3px solid ${LEVEL_COLORS[getPointLevel(hoveredPoint)]}`,
              transform: "translate(-50%, -150%)",
            }}
          >
            <div style={{ fontWeight: 700 }}>Nokta #{hoveredPoint.pointIndex}</div>
            <div style={{ opacity: 0.7, fontSize: 10, marginTop: 2 }}>
              {((hoveredPoint.risksAtPoint as any[]) || []).length} risk
            </div>
            {hoveredPoint.gpsLat != null && (
              <div style={{ opacity: 0.6, fontSize: 10 }}>
                {hoveredPoint.gpsLat.toFixed(5)}, {hoveredPoint.gpsLng?.toFixed(5)}
              </div>
            )}
          </div>
        </Html>
      )}

      <OrbitControls
        enablePan
        enableZoom
        enableRotate
        minDistance={2}
        maxDistance={60}
        target={[0, 0, 0]}
      />
    </>
  );
}

export default function TwinScene3D(props: TwinScene3DProps) {
  const [mode, setMode] = useState<Scene3DMode>("normal");
  const [measurePoints, setMeasurePoints] = useState<TwinPoint[]>([]);
  const [replayIndex, setReplayIndex] = useState(0);
  const [replayPlaying, setReplayPlaying] = useState(false);

  // Reset measure when mode changes
  useEffect(() => {
    setMeasurePoints([]);
  }, [mode]);

  // Replay animation
  useEffect(() => {
    if (mode !== "replay" || !replayPlaying) return;
    const interval = setInterval(() => {
      setReplayIndex((i) => {
        if (i >= props.points.length - 1) {
          setReplayPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, 250);
    return () => clearInterval(interval);
  }, [mode, replayPlaying, props.points.length]);

  if (!props.points || props.points.length === 0) {
    return (
      <div
        style={{
          height: 520,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0F172A",
          borderRadius: 16,
          color: "#64748B",
        }}
      >
        3D görüntülemek için veri yok
      </div>
    );
  }

  return (
    <div
      style={{
        height: 560,
        borderRadius: 16,
        overflow: "hidden",
        background: "linear-gradient(180deg, #0B1222 0%, #020617 100%)",
        border: "1px solid #1E293B",
        position: "relative",
      }}
    >
      <Canvas camera={{ position: [15, 15, 15], fov: 50 }} shadows gl={{ antialias: true }}>
        <Scene
          {...props}
          mode={mode}
          measurePoints={measurePoints}
          setMeasurePoints={setMeasurePoints}
          replayIndex={replayIndex}
        />
      </Canvas>

      {/* Mode selector */}
      <div
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          display: "flex",
          flexDirection: "column",
          gap: 4,
          background: "rgba(15,23,42,0.88)",
          backdropFilter: "blur(8px)",
          padding: 8,
          borderRadius: 10,
          border: "1px solid rgba(249,115,22,0.3)",
        }}
      >
        <div style={{ color: "#F97316", fontSize: 10, fontWeight: 700, marginBottom: 4, paddingLeft: 4 }}>
          🎮 3D MOD
        </div>
        {[
          { key: "normal", label: "🌐 Normal", desc: "Standart görünüm" },
          { key: "hotspots", label: "🎯 Hotspots", desc: "Kritik risk odağı" },
          { key: "heatmap", label: "🔥 Heatmap", desc: "Yoğunluk haritası" },
          { key: "measure", label: "📏 Ölçüm", desc: "2 noktaya tıkla" },
          { key: "replay", label: "▶️ Replay", desc: "Zaman animasyonu" },
        ].map((m) => (
          <button
            key={m.key}
            onClick={() => setMode(m.key as Scene3DMode)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: 1,
              padding: "6px 10px",
              borderRadius: 6,
              border: "none",
              background: mode === m.key ? "#F97316" : "transparent",
              color: mode === m.key ? "#fff" : "rgba(255,255,255,0.7)",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              textAlign: "left",
              minWidth: 140,
            }}
          >
            <span>{m.label}</span>
            <span style={{ fontSize: 9, opacity: 0.7 }}>{m.desc}</span>
          </button>
        ))}
      </div>

      {/* Replay controls */}
      {mode === "replay" && (
        <div
          style={{
            position: "absolute",
            bottom: 16,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "rgba(15,23,42,0.92)",
            backdropFilter: "blur(8px)",
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid rgba(249,115,22,0.3)",
          }}
        >
          <button
            onClick={() => setReplayPlaying(!replayPlaying)}
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              border: "none",
              background: "#F97316",
              color: "#fff",
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            {replayPlaying ? "⏸" : "▶"}
          </button>
          <button
            onClick={() => {
              setReplayIndex(0);
              setReplayPlaying(false);
            }}
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              border: "none",
              background: "rgba(255,255,255,0.1)",
              color: "#fff",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            ↻
          </button>
          <div
            style={{
              width: 200,
              height: 6,
              background: "rgba(255,255,255,0.1)",
              borderRadius: 3,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${props.points.length > 0 ? (replayIndex / Math.max(1, props.points.length - 1)) * 100 : 0}%`,
                height: "100%",
                background: "#F97316",
                transition: "width 0.2s",
              }}
            />
          </div>
          <div style={{ color: "#fff", fontSize: 11, minWidth: 60, textAlign: "right" }}>
            {replayIndex + 1}/{props.points.length}
          </div>
        </div>
      )}

      {/* Measurement info */}
      {mode === "measure" && (
        <div
          style={{
            position: "absolute",
            bottom: 16,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(16,185,129,0.15)",
            border: "1px solid rgba(16,185,129,0.4)",
            color: "#34D399",
            padding: "10px 16px",
            borderRadius: 10,
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {measurePoints.length === 0 && "📏 İlk noktaya tıkla"}
          {measurePoints.length === 1 && "📏 İkinci noktaya tıkla"}
          {measurePoints.length === 2 && "📏 Ölçüm tamamlandı - başka noktaya tıkla veya modu değiştir"}
        </div>
      )}

      {/* Legend */}
      <div
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          background: "rgba(15,23,42,0.88)",
          backdropFilter: "blur(8px)",
          padding: "8px 12px",
          borderRadius: 10,
          color: "#fff",
          fontSize: 10,
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 6, color: "#F97316" }}>RİSK SEVİYELERİ</div>
        {Object.entries(LEVEL_COLORS).map(([lvl, color]) => (
          <div
            key={lvl}
            style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                background: color,
                boxShadow: `0 0 6px ${color}`,
              }}
            />
            <span style={{ opacity: 0.9 }}>
              {lvl === "critical" ? "Kritik" : lvl === "high" ? "Yüksek" : lvl === "medium" ? "Orta" : lvl === "low" ? "Düşük" : "Temiz"}
            </span>
          </div>
        ))}
        {props.comparePoints && props.comparePoints.length > 0 && (
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
            <div style={{ opacity: 0.6, fontSize: 9 }}>
              🔲 Wireframe: Karşılaştırma
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
