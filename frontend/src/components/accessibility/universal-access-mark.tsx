import { cn } from "@/lib/utils";

/**
 * Evrensel erişim sembolü (tekerlekli sandalye değil): daire içinde stilize figür + uç noktalarda vurgu.
 * Referans: ISO benzeri “universal access” modern işaret.
 */
export function UniversalAccessMark({
  className,
  variant = "onDark",
}: {
  className?: string;
  /** onDark: açık çember/figür (FAB, koyu zemin); onLight: panel başlığı vb. */
  variant?: "onDark" | "onLight";
}) {
  const ring = variant === "onDark" ? "rgba(241,245,249,0.92)" : "rgba(15,23,42,0.88)";
  const limb = variant === "onDark" ? "rgba(241,245,249,0.95)" : "rgba(15,23,42,0.9)";
  const jointFill = variant === "onDark" ? "#5eead4" : "#0d9488";
  const jointStroke = variant === "onDark" ? "rgba(15,23,42,0.45)" : "rgba(255,255,255,0.5)";
  const headFill = variant === "onDark" ? "#99f6e4" : "#14b8a6";

  return (
    <svg
      className={cn("shrink-0", className)}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle cx="50" cy="50" r="44" stroke={ring} strokeWidth="5" />
      <circle cx="50" cy="30" r="9" fill={headFill} stroke={jointStroke} strokeWidth="2" />
      <path
        d="M50 44 L22 20 M50 44 L78 20 M50 44 L24 86 M50 44 L76 86"
        stroke={limb}
        strokeWidth="4.8"
        strokeLinecap="round"
      />
      <circle cx="22" cy="20" r="6.2" fill={jointFill} stroke={jointStroke} strokeWidth="2" />
      <circle cx="78" cy="20" r="6.2" fill={jointFill} stroke={jointStroke} strokeWidth="2" />
      <circle cx="24" cy="86" r="6.2" fill={jointFill} stroke={jointStroke} strokeWidth="2" />
      <circle cx="76" cy="86" r="6.2" fill={jointFill} stroke={jointStroke} strokeWidth="2" />
    </svg>
  );
}
