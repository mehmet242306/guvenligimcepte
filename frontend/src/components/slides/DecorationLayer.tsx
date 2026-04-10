/**
 * DecorationLayer — Slayt arkasına/üstüne dekoratif SVG şekiller render eder.
 *
 * Tüm koordinatlar yüzde (0-100) olarak parent'a göre ölçeklenir.
 * Absolute positioned — parent'ın relative olması gerekir.
 */

import React from "react";
import type { SlideDecoration } from "@/lib/supabase/slide-deck-api";

type DecorationLayerProps = {
  decorations?: SlideDecoration[];
  theme: { bg: string; text: string; accent: string };
  z?: "back" | "front";
};

function resolveColor(
  color: string | undefined,
  theme: { bg: string; text: string; accent: string },
  fallback = "transparent"
): string {
  if (!color) return fallback;
  if (color === "accent") return theme.accent;
  if (color === "accent-soft") return `${theme.accent}33`;
  if (color === "accent-fade") return `${theme.accent}11`;
  if (color === "text") return theme.text;
  if (color === "text-soft") return `${theme.text}22`;
  if (color === "bg") return theme.bg;
  if (color === "bg-soft") return `${theme.bg}dd`;
  return color;
}

export function DecorationLayer({ decorations, theme, z = "back" }: DecorationLayerProps) {
  if (!decorations || decorations.length === 0) return null;

  const filtered = decorations.filter((d) => (d.z || "back") === z);
  if (filtered.length === 0) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ zIndex: z === "back" ? 0 : 10 }}
    >
      {filtered.map((d, i) => (
        <Decoration key={i} deco={d} theme={theme} />
      ))}
    </div>
  );
}

function Decoration({
  deco,
  theme,
}: {
  deco: SlideDecoration;
  theme: { bg: string; text: string; accent: string };
}) {
  const x = deco.x ?? 0;
  const y = deco.y ?? 0;
  const w = deco.w ?? 20;
  const h = deco.h ?? 20;
  const opacity = deco.opacity ?? 1;
  const rotation = deco.rotation ?? 0;
  const color = resolveColor(deco.color, theme, theme.accent);
  const color2 = resolveColor(deco.color2, theme);

  const baseStyle: React.CSSProperties = {
    position: "absolute",
    left: `${x}%`,
    top: `${y}%`,
    width: `${w}%`,
    height: `${h}%`,
    opacity,
    transform: rotation ? `rotate(${rotation}deg)` : undefined,
    transformOrigin: "center center",
  };

  switch (deco.type) {
    case "gradient_bg":
      return (
        <div
          style={{
            ...baseStyle,
            left: 0, top: 0, width: "100%", height: "100%",
            background: `linear-gradient(135deg, ${color} 0%, ${color2 || theme.bg} 100%)`,
          }}
        />
      );

    case "circle":
      return (
        <div
          style={{
            ...baseStyle,
            borderRadius: "50%",
            background: deco.stroke_width ? "transparent" : color,
            border: deco.stroke_width ? `${deco.stroke_width}px solid ${resolveColor(deco.stroke_color, theme, color)}` : undefined,
          }}
        />
      );

    case "ring":
      return (
        <div
          style={{
            ...baseStyle,
            borderRadius: "50%",
            border: `${deco.stroke_width || 3}px solid ${color}`,
            background: "transparent",
          }}
        />
      );

    case "rect":
      return (
        <div
          style={{
            ...baseStyle,
            background: color,
            borderRadius: 4,
          }}
        />
      );

    case "accent_bar":
      return (
        <div
          style={{
            ...baseStyle,
            background: color,
            borderRadius: 999,
          }}
        />
      );

    case "triangle":
      return (
        <svg
          style={baseStyle}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <polygon points="50,0 100,100 0,100" fill={color} />
        </svg>
      );

    case "blob":
      return (
        <svg style={baseStyle} viewBox="0 0 200 200" preserveAspectRatio="none">
          <defs>
            <linearGradient id={`blob-${color.replace("#", "")}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={color} />
              <stop offset="100%" stopColor={color2 || color} stopOpacity={color2 ? 1 : 0.5} />
            </linearGradient>
          </defs>
          <path
            d="M45.7,-58.2C58.5,-47.7,67.9,-32.7,70.6,-17C73.3,-1.3,69.3,15.1,61.3,28.8C53.3,42.5,41.2,53.5,27.1,60.4C12.9,67.3,-3.2,70.1,-17.3,65.5C-31.4,60.9,-43.4,48.8,-54.2,35.1C-64.9,21.4,-74.4,6.1,-73.7,-8.9C-73,-23.9,-62.2,-38.6,-48.7,-48.9C-35.2,-59.2,-19.1,-65,-2,-62.6C15,-60.2,30.1,-49.6,45.7,-58.2Z"
            transform="translate(100 100)"
            fill={`url(#blob-${color.replace("#", "")})`}
          />
        </svg>
      );

    case "wave":
      return (
        <svg style={baseStyle} viewBox="0 0 1440 320" preserveAspectRatio="none">
          <path
            fill={color}
            d="M0,160L48,144C96,128,192,96,288,112C384,128,480,192,576,202.7C672,213,768,171,864,138.7C960,107,1056,85,1152,96C1248,107,1344,149,1392,170.7L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
          />
        </svg>
      );

    case "dots_grid":
      return (
        <div
          style={{
            ...baseStyle,
            backgroundImage: `radial-gradient(${color} 1.5px, transparent 1.5px)`,
            backgroundSize: "18px 18px",
          }}
        />
      );

    case "diagonal_stripe":
      return (
        <div
          style={{
            ...baseStyle,
            background: `repeating-linear-gradient(45deg, ${color}, ${color} 6px, transparent 6px, transparent 18px)`,
          }}
        />
      );

    case "icon":
      return (
        <div
          style={{
            ...baseStyle,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: `${deco.font_size || 4}rem`,
            color,
          }}
        >
          {deco.icon || "✨"}
        </div>
      );

    default:
      return null;
  }
}
