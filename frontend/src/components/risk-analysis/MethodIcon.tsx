"use client";

import type { AnalysisMethodId } from "@/lib/risk-scoring";

interface MethodIconProps {
  method: AnalysisMethodId;
  color?: string;
  size?: number;
  className?: string;
}

export function MethodIcon({ method, color = "currentColor", size = 24, className }: MethodIconProps) {
  const props = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, className };

  switch (method) {
    /* R-SKOR 2D — crosshair/target */
    case "r_skor":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="6" />
          <circle cx="12" cy="12" r="2" fill={color} />
          <line x1="12" y1="2" x2="12" y2="6" />
          <line x1="12" y1="18" x2="12" y2="22" />
          <line x1="2" y1="12" x2="6" y2="12" />
          <line x1="18" y1="12" x2="22" y2="12" />
        </svg>
      );

    /* Fine-Kinney — balance/scale */
    case "fine_kinney":
      return (
        <svg {...props}>
          <line x1="12" y1="3" x2="12" y2="21" />
          <polygon points="12,3 4,9 20,9" fill="none" stroke={color} />
          <path d="M4,9 Q4,13 7,13 L17,13 Q20,13 20,9" fill="none" />
          <path d="M3,9 C3,12 5.5,14 8,14" fill="none" />
          <path d="M21,9 C21,12 18.5,14 16,14" fill="none" />
          <rect x="8" y="19" width="8" height="2" rx="1" fill={color} stroke="none" />
        </svg>
      );

    /* L-Tipi Matris 5×5 — grid matrix */
    case "l_matrix":
      return (
        <svg {...props}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="3" y1="7.5" x2="21" y2="7.5" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="16.5" x2="21" y2="16.5" />
          <line x1="7.5" y1="3" x2="7.5" y2="21" />
          <line x1="12" y1="3" x2="12" y2="21" />
          <line x1="16.5" y1="3" x2="16.5" y2="21" />
          <rect x="12.5" y="3.5" width="3.5" height="3.5" rx="0.5" fill={color} opacity="0.3" stroke="none" />
          <rect x="16.8" y="7.8" width="3.5" height="3.5" rx="0.5" fill={color} opacity="0.5" stroke="none" />
          <rect x="16.8" y="12.3" width="3.5" height="3.5" rx="0.5" fill={color} opacity="0.8" stroke="none" />
        </svg>
      );

    /* FMEA — gear with exclamation */
    case "fmea":
      return (
        <svg {...props}>
          <path d="M12 2 L13.5 5.5 L17 4.5 L15.8 8 L19.5 9 L17 11.5 L19.5 14 L15.8 15 L17 18.5 L13.5 17.5 L12 21 L10.5 17.5 L7 18.5 L8.2 15 L4.5 14 L7 11.5 L4.5 9 L8.2 8 L7 4.5 L10.5 5.5 Z" />
          <circle cx="12" cy="11" r="1.2" fill={color} stroke="none" />
          <line x1="12" y1="13" x2="12" y2="15.5" strokeWidth="2" />
        </svg>
      );

    /* HAZOP — factory/process */
    case "hazop":
      return (
        <svg {...props}>
          <path d="M4 21 L4 11 L8 8 L8 21" />
          <path d="M8 21 L8 6 L12 3 L12 21" />
          <rect x="14" y="10" width="7" height="11" rx="1" />
          <line x1="14" y1="15" x2="21" y2="15" />
          <circle cx="17.5" cy="12.5" r="1" fill={color} stroke="none" />
          <circle cx="17.5" cy="17.5" r="1" fill={color} stroke="none" />
          <path d="M6 21 L6 18" strokeWidth="1.5" />
          <path d="M10 21 L10 16" strokeWidth="1.5" />
          <line x1="2" y1="21" x2="22" y2="21" />
        </svg>
      );

    /* Bow-Tie — bowtie shape */
    case "bow_tie":
      return (
        <svg {...props}>
          <polygon points="2,5 11,12 2,19" fill={color} opacity="0.15" />
          <polygon points="22,5 13,12 22,19" fill={color} opacity="0.15" />
          <polygon points="2,5 11,12 2,19" />
          <polygon points="22,5 13,12 22,19" />
          <circle cx="12" cy="12" r="2.5" fill={color} stroke={color} />
          <line x1="4" y1="8" x2="10" y2="12" strokeDasharray="2 2" opacity="0.5" />
          <line x1="4" y1="16" x2="10" y2="12" strokeDasharray="2 2" opacity="0.5" />
          <line x1="20" y1="8" x2="14" y2="12" strokeDasharray="2 2" opacity="0.5" />
          <line x1="20" y1="16" x2="14" y2="12" strokeDasharray="2 2" opacity="0.5" />
        </svg>
      );

    /* FTA — fault tree */
    case "fta":
      return (
        <svg {...props}>
          <rect x="7" y="2" width="10" height="5" rx="1.5" />
          <line x1="12" y1="7" x2="12" y2="10" />
          <path d="M6 10 L18 10 L18 13 Q12 16 6 13 Z" fill={color} opacity="0.15" />
          <path d="M6 10 L18 10 L18 13 Q12 16 6 13 Z" />
          <line x1="8" y1="14" x2="8" y2="17" />
          <line x1="16" y1="14" x2="16" y2="17" />
          <rect x="5" y="17" width="6" height="4" rx="1" />
          <rect x="13" y="17" width="6" height="4" rx="1" />
        </svg>
      );

    /* Checklist — clipboard check */
    case "checklist":
      return (
        <svg {...props}>
          <rect x="5" y="3" width="14" height="18" rx="2" />
          <path d="M9 1 L9 3 L15 3 L15 1" />
          <polyline points="8,10 10,12 14,8" strokeWidth="2" />
          <line x1="8" y1="16" x2="16" y2="16" />
        </svg>
      );

    /* JSA — hard hat / worker safety */
    case "jsa":
      return (
        <svg {...props}>
          <path d="M4 14 Q4 7 12 7 Q20 7 20 14" />
          <line x1="2" y1="14" x2="22" y2="14" strokeWidth="2.5" />
          <line x1="12" y1="4" x2="12" y2="7" />
          <circle cx="12" cy="3.5" r="1" fill={color} stroke="none" />
          <path d="M7 14 L7 17 Q7 19 9 19 L15 19 Q17 19 17 17 L17 14" fill="none" strokeDasharray="2 2" />
          <line x1="8" y1="21" x2="16" y2="21" />
        </svg>
      );

    /* LOPA — shield layers */
    case "lopa":
      return (
        <svg {...props}>
          <path d="M12 2 L20 6 L20 12 Q20 18 12 22 Q4 18 4 12 L4 6 Z" />
          <path d="M12 5 L17.5 7.5 L17.5 12 Q17.5 16.5 12 19.5 Q6.5 16.5 6.5 12 L6.5 7.5 Z" fill={color} opacity="0.1" />
          <path d="M12 8 L15 9.5 L15 12 Q15 15 12 17 Q9 15 9 12 L9 9.5 Z" fill={color} opacity="0.2" />
          <circle cx="12" cy="12.5" r="1.5" fill={color} stroke="none" />
        </svg>
      );

    default:
      return null;
  }
}
