// =============================================================================
// Firma Analitiği — Collector çıktısından türeyen istatistikler
// =============================================================================
// collector.ts'in döndürdüğü CompanyFileCategory[] dizisini alır, KPI ve
// grafik veri yapılarını hesaplar. Ekstra DB çağrısı yapmaz — mevcut
// item'lerin meta alanlarını agrega eder.
// =============================================================================

import type { CompanyFileCategory, CompanyFileItem } from "./company-file-collector";

// -----------------------------------------------------------------------------
// Yardımcılar
// -----------------------------------------------------------------------------

function findCategory(
  categories: CompanyFileCategory[],
  id: CompanyFileCategory["id"],
): CompanyFileItem[] {
  return categories.find((c) => c.id === id)?.items ?? [];
}

function daysBetween(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / 86400_000);
}

function startOfWeek(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  const day = r.getDay(); // 0 = Sunday
  // Pazartesi başlangıçlı (0 = Pazartesi)
  const diff = (day + 6) % 7;
  r.setDate(r.getDate() - diff);
  return r;
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// -----------------------------------------------------------------------------
// KPI — üst karta çıkan 4 sayı
// -----------------------------------------------------------------------------

export type CompanyKpis = {
  openFindings: number;
  overdueDofs: number;
  incidentsThisMonth: number;
  avgReadiness: number | null; // son 5 denetim ortalaması
};

export function computeKpis(categories: CompanyFileCategory[]): CompanyKpis {
  const findings = findCategory(categories, "findings");
  const dofs = findCategory(categories, "corrective_actions");
  const incidents = findCategory(categories, "incidents");
  const runs = findCategory(categories, "inspection_runs");

  const openFindings = findings.filter(
    (f) => f.status && !["resolved", "closed", "archived"].includes(f.status),
  ).length;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdueDofs = dofs.filter((d) => {
    if (d.status === "completed" || d.status === "archived") return false;
    const deadline = d.meta?.deadline as string | undefined;
    if (!deadline) return false;
    const dt = new Date(deadline);
    return !Number.isNaN(dt.getTime()) && dt < today;
  }).length;

  const thisMonth = monthKey(today);
  const incidentsThisMonth = incidents.filter((i) => {
    const date = (i.meta?.incident_date as string | undefined) ?? i.createdAt;
    if (!date) return false;
    const d = new Date(date);
    return !Number.isNaN(d.getTime()) && monthKey(d) === thisMonth;
  }).length;

  const recentRuns = runs
    .filter((r) => {
      const score = r.meta?.readiness_score as number | undefined;
      return typeof score === "number" && score > 0;
    })
    .slice(0, 5);
  const avgReadiness =
    recentRuns.length > 0
      ? Math.round(
          recentRuns.reduce(
            (sum, r) => sum + (r.meta?.readiness_score as number),
            0,
          ) / recentRuns.length,
        )
      : null;

  return {
    openFindings,
    overdueDofs,
    incidentsThisMonth,
    avgReadiness,
  };
}

// -----------------------------------------------------------------------------
// Grafik 1: Risk şiddet dağılımı (donut)
// -----------------------------------------------------------------------------

export type SeverityDistribution = {
  labels: string[];
  counts: number[];
  colors: string[];
};

const SEVERITY_ORDER = ["low", "medium", "high", "critical"] as const;
const SEVERITY_LABEL: Record<string, string> = {
  low: "Düşük",
  medium: "Orta",
  high: "Yüksek",
  critical: "Kritik",
};
const SEVERITY_COLOR: Record<string, string> = {
  low: "#10b981",
  medium: "#f59e0b",
  high: "#ef4444",
  critical: "#7f1d1d",
};

export function computeFindingsBySeverity(
  categories: CompanyFileCategory[],
): SeverityDistribution {
  const findings = findCategory(categories, "findings");
  const buckets: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
  for (const f of findings) {
    const sev = String(f.meta?.severity ?? "medium").toLowerCase();
    if (sev in buckets) buckets[sev] += 1;
    else buckets.medium += 1;
  }
  return {
    labels: SEVERITY_ORDER.map((k) => SEVERITY_LABEL[k]),
    counts: SEVERITY_ORDER.map((k) => buckets[k]),
    colors: SEVERITY_ORDER.map((k) => SEVERITY_COLOR[k]),
  };
}

// -----------------------------------------------------------------------------
// Grafik 2: DÖF durum dağılımı (donut)
// -----------------------------------------------------------------------------

export type StatusDistribution = {
  labels: string[];
  counts: number[];
  colors: string[];
};

const DOF_STATUS_BUCKETS = [
  { key: "tracking", label: "Takipte", color: "#3b82f6" },
  { key: "in_progress", label: "Devam ediyor", color: "#f59e0b" },
  { key: "on_hold", label: "Beklemede", color: "#a3a3a3" },
  { key: "overdue", label: "Geciken", color: "#ef4444" },
  { key: "completed", label: "Tamamlandı", color: "#10b981" },
];

export function computeDofStatus(
  categories: CompanyFileCategory[],
): StatusDistribution {
  const dofs = findCategory(categories, "corrective_actions");
  const counts = DOF_STATUS_BUCKETS.map((b) =>
    dofs.filter((d) => (d.status ?? "").toLowerCase() === b.key).length,
  );
  return {
    labels: DOF_STATUS_BUCKETS.map((b) => b.label),
    counts,
    colors: DOF_STATUS_BUCKETS.map((b) => b.color),
  };
}

// -----------------------------------------------------------------------------
// Grafik 3: Tespit trend (son 12 hafta, line)
// -----------------------------------------------------------------------------

export type WeeklyTrend = {
  labels: string[];
  opened: number[];
};

export function computeFindingsTrend(
  categories: CompanyFileCategory[],
): WeeklyTrend {
  const findings = findCategory(categories, "findings");
  const weeks: Date[] = [];
  const thisWeekStart = startOfWeek(new Date());
  for (let i = 11; i >= 0; i--) {
    const d = new Date(thisWeekStart);
    d.setDate(d.getDate() - i * 7);
    weeks.push(d);
  }

  const weekKey = (d: Date) => d.toISOString().slice(0, 10);
  const weekMap = new Map<string, number>();
  for (const w of weeks) weekMap.set(weekKey(w), 0);

  for (const f of findings) {
    const dt = new Date(f.createdAt);
    if (Number.isNaN(dt.getTime())) continue;
    const wk = weekKey(startOfWeek(dt));
    if (weekMap.has(wk)) {
      weekMap.set(wk, (weekMap.get(wk) ?? 0) + 1);
    }
  }

  return {
    labels: weeks.map((w) => {
      const m = String(w.getMonth() + 1).padStart(2, "0");
      const d = String(w.getDate()).padStart(2, "0");
      return `${d}.${m}`;
    }),
    opened: weeks.map((w) => weekMap.get(weekKey(w)) ?? 0),
  };
}

// -----------------------------------------------------------------------------
// Grafik 4: Aylık olay sayıları (son 12 ay, bar)
// -----------------------------------------------------------------------------

export type MonthlyCount = {
  labels: string[];
  counts: number[];
};

const MONTH_SHORT = [
  "Oca",
  "Şub",
  "Mar",
  "Nis",
  "May",
  "Haz",
  "Tem",
  "Ağu",
  "Eyl",
  "Eki",
  "Kas",
  "Ara",
];

export function computeIncidentsMonthly(
  categories: CompanyFileCategory[],
): MonthlyCount {
  const incidents = findCategory(categories, "incidents");
  const today = new Date();
  const months: Date[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    months.push(d);
  }
  const map = new Map<string, number>();
  for (const m of months) map.set(monthKey(m), 0);

  for (const inc of incidents) {
    const date = (inc.meta?.incident_date as string | undefined) ?? inc.createdAt;
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) continue;
    const key = monthKey(d);
    if (map.has(key)) {
      map.set(key, (map.get(key) ?? 0) + 1);
    }
  }

  return {
    labels: months.map((m) => MONTH_SHORT[m.getMonth()]),
    counts: months.map((m) => map.get(monthKey(m)) ?? 0),
  };
}

// -----------------------------------------------------------------------------
// Export: bundle
// -----------------------------------------------------------------------------

export type CompanyAnalytics = {
  kpis: CompanyKpis;
  severity: SeverityDistribution;
  dofStatus: StatusDistribution;
  findingsTrend: WeeklyTrend;
  incidentsMonthly: MonthlyCount;
  totals: {
    risks: number;
    findings: number;
    dofs: number;
    incidents: number;
    docs: number;
    runs: number;
    tasks: number;
  };
};

export function computeAnalytics(
  categories: CompanyFileCategory[],
): CompanyAnalytics {
  const countFor = (id: CompanyFileCategory["id"]) =>
    categories.find((c) => c.id === id)?.count ?? 0;

  return {
    kpis: computeKpis(categories),
    severity: computeFindingsBySeverity(categories),
    dofStatus: computeDofStatus(categories),
    findingsTrend: computeFindingsTrend(categories),
    incidentsMonthly: computeIncidentsMonthly(categories),
    totals: {
      risks: countFor("risk_assessments"),
      findings: countFor("findings"),
      dofs: countFor("corrective_actions"),
      incidents: countFor("incidents"),
      docs: countFor("documents"),
      runs: countFor("inspection_runs"),
      tasks: countFor("isg_tasks"),
    },
  };
}
