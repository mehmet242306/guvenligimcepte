import {
  ClipboardCheck,
  Target,
  TriangleAlert,
  Sparkles,
  FileDown,
} from "lucide-react";
import type { ComponentType } from "react";

export type SurfaceCategoryId =
  | "checklists"
  | "inspection"
  | "findings"
  | "nova"
  | "closure";

export type CategoryDefinition = {
  key: SurfaceCategoryId;
  label: string;
  description: string;
  icon: ComponentType<{ size?: number }>;
};

export const CATEGORY_DEFINITIONS: CategoryDefinition[] = [
  {
    key: "checklists",
    label: "Checklistler",
    description: "Hazır checklist ve saha senaryoları",
    icon: ClipboardCheck,
  },
  {
    key: "inspection",
    label: "Aktif İnceleme",
    description: "Sahada doldurulan soru akışı",
    icon: Target,
  },
  {
    key: "findings",
    label: "Tespitler",
    description: "Bugünkü eksik ve risk havuzu",
    icon: TriangleAlert,
  },
  {
    key: "nova",
    label: "Nova",
    description: "Checklist stüdyosu ve akıllı öneriler",
    icon: Sparkles,
  },
  {
    key: "closure",
    label: "Kapanış",
    description: "Denetim kontrolü ve raporlama",
    icon: FileDown,
  },
];

export const RESPONSE_COPY = {
  uygun: {
    label: "Uygun",
    buttonClassName:
      "border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-700/40 dark:bg-emerald-950/20 dark:text-emerald-200 dark:hover:bg-emerald-950/30",
    badgeVariant: "success" as const,
  },
  uygunsuz: {
    label: "Uygunsuz",
    buttonClassName:
      "border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-700/40 dark:bg-amber-950/20 dark:text-amber-200 dark:hover:bg-amber-950/30",
    badgeVariant: "warning" as const,
  },
  kritik: {
    label: "Kritik",
    buttonClassName:
      "border border-red-200 bg-red-50 text-red-800 hover:bg-red-100 dark:border-red-700/40 dark:bg-red-950/20 dark:text-red-200 dark:hover:bg-red-950/30",
    badgeVariant: "danger" as const,
  },
  na: {
    label: "N/A",
    buttonClassName:
      "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10",
    badgeVariant: "neutral" as const,
  },
};

export const MODE_COPY = {
  quick: { label: "Hızlı kontrol", questionCount: 10, description: "8-12 soru ile sahada kısa tarama." },
  standard: { label: "Standart denetim", questionCount: 20, description: "15-30 soruluk dengeli saha denetimi." },
  detailed: { label: "Detaylı inceleme", questionCount: 30, description: "Kök neden ve tekrarları derinlemesine tarar." },
};

export const SOURCE_LABELS = {
  manual: "Manuel",
  nova: "Nova",
  library: "Kütüphane",
  risk_analysis: "Risk Analizi",
  imported: "İçe Aktarılan",
};

export function getSidebarBadgeClass(isActive: boolean): string {
  return isActive
    ? "border-white/20 bg-white/15 text-white"
    : "border-[#e3c58f] bg-white text-[#9b6f1b] dark:border-[#6f5320] dark:bg-white/10 dark:text-[#f0c36b]";
}

export const SIDEBAR_ITEM_BASE =
  "flex w-full items-center justify-between rounded-2xl border border-transparent px-4 py-3 text-left text-sm transition";

export const SIDEBAR_ITEM_ACTIVE =
  "bg-[var(--primary)] text-white shadow-[0_18px_35px_rgba(15,23,42,0.18)]";

export const SIDEBAR_ITEM_INACTIVE =
  "bg-white/70 text-[#6f4e12] hover:border-[#e3c58f] hover:bg-white dark:border-white/5 dark:bg-white/5 dark:text-[#f8ddb0] dark:hover:border-[#6f5320] dark:hover:bg-white/10";
