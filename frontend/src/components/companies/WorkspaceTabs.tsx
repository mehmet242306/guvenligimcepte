"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { MapPin, Building2, Zap, FlaskConical, Bug, PersonStanding, Brain, Cog, Plug, Flame, Truck, Leaf, Plus, FileSearch, Archive, Pencil, Trash2, ChevronDown, ClipboardList, Share2, Copy, Check, MessageCircle } from "lucide-react";
import type { PremiumIconTone } from "@/components/ui/premium-icon-badge";
import { PremiumIconBadge } from "@/components/ui/premium-icon-badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { CompanyRecord } from "@/lib/company-directory";
import { listRiskAssessments, deleteRiskAssessment, loadRiskAssessment, listFindingsByCategory, updateFindingStatus, archiveRiskAssessment, toggleRiskSharing, type SavedAssessment, type FullAssessment, type FindingWithContext } from "@/lib/supabase/risk-assessment-api";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/client";
import {
  getTrackingSummary, listTrainings, createTraining, updateTraining, deleteTraining,
  listPeriodicControls, createPeriodicControl, updatePeriodicControl, deletePeriodicControl,
  listOpenActions,
  listCommitteeMeetings, createCommitteeMeeting, updateCommitteeMeeting, deleteCommitteeMeeting, getCommitteePeriodMonths,
  type TrainingRecord, type PeriodicControlRecord, type OpenAction, type TrackingSummary, type CommitteeMeeting,
} from "@/lib/supabase/tracking-api";

export type WTab = "structure" | "risk" | "people" | "personnel" | "planner" | "tracking" | "ohs_file" | "organization" | "history";

function fmtDateLocale(d: string, locale: string) {
  try {
    return new Date(d).toLocaleDateString(locale, { day: "2-digit", month: "long", year: "numeric" });
  } catch {
    return d;
  }
}

function fmtDateShortLocale(d: string | null, locale: string) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return d;
  }
}

function isoDateAfterDays(days = 0) {
  return new Date(Date.now() + days * 86400000).toISOString().split("T")[0];
}

function Sec({ title, desc, children, icon, tone }: { title: string; desc?: string; children: React.ReactNode; icon?: React.ElementType; tone?: PremiumIconTone }) {
  return (
    <section className="rounded-[1.7rem] border border-border/80 bg-card p-6 shadow-[var(--shadow-card)]">
      <div className="flex items-start gap-3">
        {icon && <PremiumIconBadge icon={icon} tone={tone || "cobalt"} size="md" />}
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold text-foreground">{title}</h2>
          {desc && <p className="mt-1 text-sm text-muted-foreground">{desc}</p>}
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

/* ── STRUCTURE ── */
export function StructureTab({ company, upd }: { company: CompanyRecord; upd: (p: Partial<CompanyRecord>) => void }) {
  const ts = useTranslations("companyWorkspace.structure");
  const locCount = company.locations.filter(Boolean).length;
  const depCount = company.departments.filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Yerleşke: fiziki yapı (lokasyon + bölüm). Firma kimlik/iletişim bilgileri
          (ad, sektör, NACE, SGK, vs.) üstteki hero şeridi ve aktif firma barında
          zaten görüntüleniyor; workspace onboarding akışından düzenleniyor. */}

      {/* Üst özet kartları */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-[1.25rem] border border-border/80 bg-card p-5 text-center shadow-[var(--shadow-card)]">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{ts("summaryLocation")}</p>
          <p className="mt-1.5 text-3xl font-bold text-foreground">{locCount}</p>
        </div>
        <div className="rounded-[1.25rem] border border-border/80 bg-card p-5 text-center shadow-[var(--shadow-card)]">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{ts("summaryDepartment")}</p>
          <p className="mt-1.5 text-3xl font-bold text-foreground">{depCount}</p>
        </div>
        <div className="rounded-[1.25rem] border border-border/80 bg-card p-5 text-center shadow-[var(--shadow-card)]">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{ts("summaryEmployee")}</p>
          <p className="mt-1.5 text-3xl font-bold text-foreground">{company.employeeCount}</p>
        </div>
      </div>

      {/* Lokasyonlar ve Bölümler — yan yana */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Lokasyonlar */}
        <section className="rounded-[1.5rem] border border-border/80 bg-card p-5 shadow-[var(--shadow-card)]">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <PremiumIconBadge icon={MapPin} tone="amber" size="md" />
              <div>
                <h3 className="text-sm font-semibold text-foreground">{ts("locationsTitle")}</h3>
                <p className="text-[11px] text-muted-foreground">{ts("locationsSubtitle")}</p>
              </div>
            </div>
            <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">{locCount}</span>
          </div>
          <div className="space-y-2">
            {company.locations.map((loc, i) => (
              <div key={i} className="group flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-secondary/40">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-amber-500/10 text-[10px] font-bold text-amber-600 dark:text-amber-400">{i + 1}</span>
                <Input
                  value={loc}
                  onChange={(e) => { const n = [...company.locations]; n[i] = e.target.value; upd({ locations: n }); }}
                  className="flex-1 !border-0 !bg-transparent !shadow-none !ring-0 text-sm"
                  placeholder={ts("locationPlaceholder")}
                />
                <button
                  type="button"
                  onClick={() => upd({ locations: company.locations.filter((_, j) => j !== i) })}
                  className="shrink-0 rounded-md p-1 text-muted-foreground/40 opacity-0 transition-all hover:bg-red-100 hover:text-red-600 group-hover:opacity-100 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => upd({ locations: [...company.locations, ""] })}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            {ts("addLocation")}
          </button>
        </section>

        {/* Bölümler */}
        <section className="rounded-[1.5rem] border border-border/80 bg-card p-5 shadow-[var(--shadow-card)]">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <PremiumIconBadge icon={Building2} tone="cobalt" size="md" />
              <div>
                <h3 className="text-sm font-semibold text-foreground">{ts("departmentsTitle")}</h3>
                <p className="text-[11px] text-muted-foreground">{ts("departmentsSubtitle")}</p>
              </div>
            </div>
            <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-300">{depCount}</span>
          </div>
          <div className="space-y-2">
            {company.departments.map((dep, i) => (
              <div key={i} className="group flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-secondary/40">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-blue-500/10 text-[10px] font-bold text-blue-600 dark:text-blue-400">{i + 1}</span>
                <Input
                  value={dep}
                  onChange={(e) => { const n = [...company.departments]; n[i] = e.target.value; upd({ departments: n }); }}
                  className="flex-1 !border-0 !bg-transparent !shadow-none !ring-0 text-sm"
                  placeholder={ts("departmentPlaceholder")}
                />
                <button
                  type="button"
                  onClick={() => upd({ departments: company.departments.filter((_, j) => j !== i) })}
                  className="shrink-0 rounded-md p-1 text-muted-foreground/40 opacity-0 transition-all hover:bg-red-100 hover:text-red-600 group-hover:opacity-100 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => upd({ departments: [...company.departments, ""] })}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            {ts("addDepartment")}
          </button>
        </section>
      </div>
    </div>
  );
}

/* ── RISK ── */
/* Risk kategori meta — etiketler messages/companyWorkspace.risk.categories.* altında */
const RISK_CATEGORY_META = [
  { key: "fiziksel", icon: "⚡", lucideIcon: Zap, tone: "cobalt" as PremiumIconTone, color: "#3B82F6" },
  { key: "kimyasal", icon: "🧪", lucideIcon: FlaskConical, tone: "violet" as PremiumIconTone, color: "#8B5CF6" },
  { key: "biyolojik", icon: "🦠", lucideIcon: Bug, tone: "emerald" as PremiumIconTone, color: "#10B981" },
  { key: "ergonomik", icon: "🧍", lucideIcon: PersonStanding, tone: "amber" as PremiumIconTone, color: "#F59E0B" },
  { key: "psikososyal", icon: "🧠", lucideIcon: Brain, tone: "plum" as PremiumIconTone, color: "#EC4899" },
  { key: "mekanik", icon: "⚙️", lucideIcon: Cog, tone: "orange" as PremiumIconTone, color: "#F97316" },
  { key: "elektrik", icon: "🔌", lucideIcon: Plug, tone: "risk" as PremiumIconTone, color: "#EF4444" },
  { key: "yangin", icon: "🔥", lucideIcon: Flame, tone: "danger" as PremiumIconTone, color: "#DC2626" },
  { key: "trafik", icon: "🚛", lucideIcon: Truck, tone: "indigo" as PremiumIconTone, color: "#6366F1" },
  { key: "cevre", icon: "🌿", lucideIcon: Leaf, tone: "success" as PremiumIconTone, color: "#059669" },
] as const;

type CategoryStats = { key: string; total: number; critical: number; high: number; medium: number; low: number };

export function RiskTab({ company }: { company: CompanyRecord }) {
  const t = useTranslations("companyWorkspace.risk");
  const locale = useLocale();
  const [analyses, setAnalyses] = useState<SavedAssessment[]>([]);
  const [catStats, setCatStats] = useState<CategoryStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<"overview" | "analyses">("overview");

  // Kategori detay state
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categoryFindings, setCategoryFindings] = useState<FindingWithContext[]>([]);
  const [catDetailLoading, setCatDetailLoading] = useState(false);

  // Analiz detay state
  const [selectedAnalysis, setSelectedAnalysis] = useState<FullAssessment | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [expandedAnalysisId, setExpandedAnalysisId] = useState<string | null>(null);

  // Inline edit state
  const [editingFinding, setEditingFinding] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<"open" | "in_progress" | "resolved" | "archived">("open");
  const [editNotes, setEditNotes] = useState("");
  const [savingFinding, setSavingFinding] = useState(false);

  // Auto-scroll refs
  const catDetailRef = useRef<HTMLDivElement>(null);
  const analysisDetailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const [list] = await Promise.all([listRiskAssessments(company.id)]);
      setAnalyses(list);

      const supabase = createClient();
      if (supabase) {
        const assessmentIds = list.map((a) => a.id);
        if (assessmentIds.length > 0) {
          const { data: findings } = await supabase
            .from("risk_assessment_findings")
            .select("category, category_key, severity")
            .in("assessment_id", assessmentIds)
            .is("deleted_at", null);

          if (findings) {
            const stats: Record<string, CategoryStats> = {};
            for (const cat of RISK_CATEGORY_META) stats[cat.key] = { key: cat.key, total: 0, critical: 0, high: 0, medium: 0, low: 0 };

            for (const f of findings) {
              const catKey = (f as Record<string, string>).category_key || mapCategoryToKey(f.category);
              if (!stats[catKey]) stats[catKey] = { key: catKey, total: 0, critical: 0, high: 0, medium: 0, low: 0 };
              stats[catKey].total++;
              if (f.severity === "critical") stats[catKey].critical++;
              else if (f.severity === "high") stats[catKey].high++;
              else if (f.severity === "medium") stats[catKey].medium++;
              else stats[catKey].low++;
            }
            setCatStats(Object.values(stats));
          }
        }
      }
      setLoading(false);
    })();
  }, [company.id]);

  // Auto-scroll: kategori detay
  useEffect(() => {
    if (selectedCategory && catDetailRef.current) {
      setTimeout(() => catDetailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    }
  }, [selectedCategory, catDetailLoading]);

  // Auto-scroll: analiz detay
  useEffect(() => {
    if (selectedAnalysis && analysisDetailRef.current) {
      setTimeout(() => analysisDetailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    }
  }, [selectedAnalysis]);

  async function openCategoryDetail(catKey: string) {
    if (selectedCategory === catKey) { setSelectedCategory(null); return; }
    setSelectedCategory(catKey);
    setCatDetailLoading(true);
    const findings = await listFindingsByCategory(company.id, catKey);
    setCategoryFindings(findings);
    setCatDetailLoading(false);
  }

  async function openAnalysisDetail(assessmentId: string) {
    if (expandedAnalysisId === assessmentId) { setExpandedAnalysisId(null); setSelectedAnalysis(null); return; }
    setExpandedAnalysisId(assessmentId);
    setAnalysisLoading(true);
    const full = await loadRiskAssessment(assessmentId);
    setSelectedAnalysis(full);
    setAnalysisLoading(false);
  }

  async function saveFindingStatus(findingId: string) {
    setSavingFinding(true);
    const ok = await updateFindingStatus(findingId, editStatus, editNotes);
    if (ok) {
      setCategoryFindings((prev) => prev.map((f) =>
        f.id === findingId ? { ...f, trackingStatus: editStatus, trackingNotes: editNotes, statusUpdatedAt: new Date().toISOString() } : f
      ));
    }
    setSavingFinding(false);
    setEditingFinding(null);
  }

  async function handleDelete(id: string) {
    const ok = await deleteRiskAssessment(id);
    if (ok) {
      const remaining = analyses.filter((a) => a.id !== id);
      setAnalyses(remaining);
      if (selectedAnalysis?.id === id) setSelectedAnalysis(null);
      if (selectedCategory) {
        setCategoryFindings((prev) => prev.filter((f) => f.assessmentId !== id));
      }
      // Kategori istatistiklerini yeniden hesapla
      const supabase = createClient();
      if (supabase && remaining.length > 0) {
        const remainingIds = remaining.map((a) => a.id);
        const { data: updatedFindings } = await supabase
          .from("risk_assessment_findings")
          .select("category, severity")
          .in("assessment_id", remainingIds);
        if (updatedFindings) {
          const stats: Record<string, CategoryStats> = {};
          for (const cat of RISK_CATEGORY_META) stats[cat.key] = { key: cat.key, total: 0, critical: 0, high: 0, medium: 0, low: 0 };
          for (const f of updatedFindings) {
            const catKey = mapCategoryToKey(f.category);
            if (!stats[catKey]) stats[catKey] = { key: catKey, total: 0, critical: 0, high: 0, medium: 0, low: 0 };
            stats[catKey].total++;
            if (f.severity === "critical") stats[catKey].critical++;
            else if (f.severity === "high") stats[catKey].high++;
            else if (f.severity === "medium") stats[catKey].medium++;
            else stats[catKey].low++;
          }
          setCatStats(Object.values(stats));
        }
      } else if (remaining.length === 0) {
        setCatStats([]);
      }
    }
    setConfirmDeleteId(null);
  }

  async function handleArchive(id: string) {
    const ok = await archiveRiskAssessment(id);
    if (ok) {
      setAnalyses((prev) => prev.map((a) => a.id === id ? { ...a, status: "archived" as const } : a));
      if (selectedAnalysis?.id === id) setSelectedAnalysis(null);
    }
  }

  function fmtDate(d: string) {
    return fmtDateLocale(d, locale);
  }
  function methodLabel(m: string) {
    switch (m) {
      case "r_skor": return t("method.r_skor");
      case "fine_kinney": return t("method.fine_kinney");
      case "l_matrix": return t("method.l_matrix");
      case "fmea": return t("method.fmea");
      case "hazop": return t("method.hazop");
      default: return m;
    }
  }
  function statusBadge(s: string) {
    if (s === "completed") return { label: t("analysisStatus.completed"), cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" };
    if (s === "archived") return { label: t("analysisStatus.archived"), cls: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400" };
    return { label: t("analysisStatus.draft"), cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" };
  }

  function riskCategoryText(key: (typeof RISK_CATEGORY_META)[number]["key"], field: "label" | "examples") {
    return (t as (path: string) => string)(`categories.${key}.${field}`);
  }

  const totalFindings = catStats.reduce((s, c) => s + c.total, 0);
  const totalCritical = catStats.reduce((s, c) => s + c.critical, 0);
  const totalHigh = catStats.reduce((s, c) => s + c.high, 0);

  return (
    <div className="space-y-5">
      {/* Başlık + Sekme seçici + Buton */}
      <div className="rounded-[1.7rem] border border-border/80 bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="section-title text-base">{t("pageTitle")}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{t("pageSubtitle")}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex rounded-xl border border-border/60 bg-secondary/20 p-1 shadow-sm">
              <button type="button" onClick={() => { setActiveSection("overview"); setSelectedAnalysis(null); setExpandedAnalysisId(null); }}
                className={`rounded-[0.6rem] px-4 py-2 text-sm font-semibold transition-all ${activeSection === "overview" ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
                {t("tabMap")}
              </button>
              <button type="button" onClick={() => { setActiveSection("analyses"); setSelectedCategory(null); }}
                className={`rounded-[0.6rem] px-4 py-2 text-sm font-semibold transition-all ${activeSection === "analyses" ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
                {t("tabAnalyses", { count: analyses.length })}
              </button>
            </div>
            <Link href={`/risk-analysis?companyId=${company.id}`} className="inline-flex items-center gap-2 rounded-xl bg-[var(--gold)] px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:brightness-110 hover:shadow-lg">
              <Plus size={16} strokeWidth={2.5} />
              {t("newAnalysis")}
            </Link>
          </div>
        </div>

        {/* Üst metriler */}
        <div className="mt-4 grid gap-3 grid-cols-2 sm:grid-cols-4">
          <div className="rounded-[1.25rem] border border-border/60 bg-gradient-to-br from-blue-500/5 to-transparent p-4 text-center shadow-sm dark:from-blue-500/8">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{t("metricTotalFindings")}</p>
            <p className="mt-1.5 text-2xl font-bold text-foreground">{totalFindings}</p>
          </div>
          <div className="rounded-[1.25rem] border border-border/60 bg-gradient-to-br from-red-500/5 to-transparent p-4 text-center shadow-sm dark:from-red-500/8">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{t("metricCritical")}</p>
            <p className={`mt-1.5 text-2xl font-bold ${totalCritical > 0 ? "text-red-600" : "text-muted-foreground"}`}>{totalCritical}</p>
          </div>
          <div className="rounded-[1.25rem] border border-border/60 bg-gradient-to-br from-orange-500/5 to-transparent p-4 text-center shadow-sm dark:from-orange-500/8">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{t("metricHigh")}</p>
            <p className={`mt-1.5 text-2xl font-bold ${totalHigh > 0 ? "text-orange-500" : "text-muted-foreground"}`}>{totalHigh}</p>
          </div>
          <div className="rounded-[1.25rem] border border-border/60 bg-gradient-to-br from-emerald-500/5 to-transparent p-4 text-center shadow-sm dark:from-emerald-500/8">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{t("metricAnalysisCount")}</p>
            <p className="mt-1.5 text-2xl font-bold text-foreground">{analyses.length}</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
      ) : activeSection === "overview" ? (
        <>
          {/* Risk Haritası — Premium kategori kartları */}
          <div className="grid gap-4 sm:grid-cols-2">
            {RISK_CATEGORY_META.map((cat) => {
              const stat = catStats.find((s) => s.key === cat.key);
              const total = stat?.total ?? 0;
              const hasCritical = (stat?.critical ?? 0) > 0;
              const hasHigh = (stat?.high ?? 0) > 0;
              const isSelected = selectedCategory === cat.key;

              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => openCategoryDetail(cat.key)}
                  className={`rounded-[1.7rem] border p-5 text-left transition-all hover:-translate-y-0.5 ${
                    isSelected ? "border-primary ring-2 ring-primary/20 bg-card shadow-[var(--shadow-elevated)]"
                    : hasCritical ? "border-red-400/40 bg-gradient-to-br from-red-500/5 to-transparent shadow-[var(--shadow-card)] hover:border-red-400/60 dark:from-red-500/8"
                    : hasHigh ? "border-orange-400/30 bg-gradient-to-br from-orange-500/5 to-transparent shadow-[var(--shadow-card)] hover:border-orange-400/50 dark:from-orange-500/8"
                    : total > 0 ? "border-border/80 bg-card shadow-[var(--shadow-card)] hover:border-[var(--gold)]/30"
                    : "border-border/50 bg-card shadow-sm hover:border-border hover:shadow-[var(--shadow-card)]"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3.5">
                      <PremiumIconBadge icon={cat.lucideIcon} tone={cat.tone} size="md" />
                      <div>
                        <h4 className="text-base font-semibold text-foreground">{riskCategoryText(cat.key, "label")}</h4>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{riskCategoryText(cat.key, "examples")}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {total > 0 && (
                        <span className="rounded-full px-2.5 py-1 text-xs font-bold" style={{ backgroundColor: cat.color + "18", color: cat.color }}>
                          {total}
                        </span>
                      )}
                      <svg className={`h-4 w-4 text-muted-foreground transition-transform ${isSelected ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </div>
                  {total > 0 && (
                    <div className="mt-3.5 flex flex-wrap gap-2">
                      {(stat?.critical ?? 0) > 0 && <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-900/30 dark:text-red-400">{t("badgeCritical", { count: stat!.critical })}</span>}
                      {(stat?.high ?? 0) > 0 && <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-[10px] font-bold text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">{t("badgeHigh", { count: stat!.high })}</span>}
                      {(stat?.medium ?? 0) > 0 && <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">{t("badgeMedium", { count: stat!.medium })}</span>}
                      {(stat?.low ?? 0) > 0 && <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-[10px] font-bold text-green-700 dark:bg-green-900/30 dark:text-green-400">{t("badgeLow", { count: stat!.low })}</span>}
                    </div>
                  )}
                  {total === 0 && (
                    <p className="mt-3 text-xs text-muted-foreground/50">{t("noFindingsCategory")}</p>
                  )}
                </button>
              );
            })}
            {/* + Yeni Kategori Ekle */}
            <button
              type="button"
              className="flex flex-col items-center justify-center gap-3 rounded-[1.7rem] border-2 border-dashed border-border/50 bg-card/50 p-8 text-center transition-all hover:-translate-y-0.5 hover:border-[var(--gold)]/30 hover:shadow-[var(--shadow-card)]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary">
                <Plus size={20} className="text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold text-muted-foreground">{t("addCategoryTitle")}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground/60">{t("addCategoryHint")}</p>
              </div>
            </button>
          </div>

          {/* Kategori Detay Paneli */}
          {selectedCategory && (
            <div ref={catDetailRef}>
              <CategoryDetailPanel
                categoryKey={selectedCategory}
                category={RISK_CATEGORY_META.find((c) => c.key === selectedCategory)!}
                findings={categoryFindings}
                loading={catDetailLoading}
                editingFinding={editingFinding}
                editStatus={editStatus}
                editNotes={editNotes}
                savingFinding={savingFinding}
                onStartEdit={(f) => { setEditingFinding(f.id); setEditStatus(f.trackingStatus); setEditNotes(f.trackingNotes); }}
                onCancelEdit={() => setEditingFinding(null)}
                onChangeStatus={setEditStatus}
                onChangeNotes={setEditNotes}
                onSave={saveFindingStatus}
                onClose={() => setSelectedCategory(null)}
              />
            </div>
          )}
        </>
      ) : (
        <>
          {/* Analizler listesi — premium kartlar */}
          <div className="space-y-3">
            {analyses.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-[1.7rem] border-2 border-dashed border-border/50 bg-card/50 p-10 text-center">
                <PremiumIconBadge icon={ClipboardList} tone="gold" size="lg" />
                <div>
                  <p className="text-sm font-semibold text-foreground">{t("emptyAnalysesTitle")}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{t("emptyAnalysesDescription")}</p>
                </div>
              </div>
            ) : analyses.map((a) => {
              const sb = statusBadge(a.status);
              const isSelected = expandedAnalysisId === a.id;
              return (
                <div key={a.id}>
                <div className={`rounded-[1.5rem] border bg-card transition-all ${isSelected ? "border-primary ring-2 ring-primary/20 shadow-[var(--shadow-elevated)]" : "border-border/80 shadow-[var(--shadow-card)] hover:-translate-y-0.5 hover:border-[var(--gold)]/30"}`}>
                  <div className="flex items-center justify-between p-5">
                    {/* Tıklanabilir alan — detay aç */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => openAnalysisDetail(a.id)}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") openAnalysisDetail(a.id); }}
                      className="min-w-0 flex-1 cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <PremiumIconBadge icon={FileSearch} tone={a.status === "completed" ? "emerald" : a.status === "archived" ? "neutral" : "amber"} size="sm" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-base font-semibold text-foreground">{a.title}</h4>
                            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${sb.cls}`}>{sb.label}</span>
                            <span className="rounded-full border border-border/60 bg-secondary/50 px-2.5 py-0.5 text-[10px] font-semibold text-muted-foreground">{methodLabel(a.method)}</span>
                          </div>
                          <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
                            <span>{fmtDate(a.assessmentDate)}</span>
                            <span className="font-semibold text-foreground">{t("findingsInRow", { count: a.itemCount })}</span>
                            {a.locationText && <span>{a.locationText}</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* İşlem butonları */}
                    <div className="flex items-center gap-1 ml-4">
                      {a.status !== "archived" && (
                        <button type="button" className="rounded-xl p-2.5 text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/20 transition-colors" onClick={() => handleArchive(a.id)} title={t("archiveTitle")}>
                          <Archive size={18} strokeWidth={2} />
                        </button>
                      )}
                      <Link href={`/risk-analysis?companyId=${company.id}&loadId=${a.id}`} className="rounded-xl p-2.5 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 transition-colors" title={t("editTitle")}>
                        <Pencil size={18} strokeWidth={2} />
                      </Link>
                      {confirmDeleteId === a.id ? (
                        <div className="flex items-center gap-1.5 rounded-xl border border-red-400/40 bg-red-50 px-3 py-1.5 dark:border-red-600/40 dark:bg-red-950/30">
                          <span className="text-[11px] font-semibold text-red-600 dark:text-red-400">{t("confirmDelete")}</span>
                          <button type="button" className="rounded-lg px-2 py-0.5 text-[11px] font-bold text-red-600 hover:bg-red-100 dark:text-red-400" onClick={() => handleDelete(a.id)}>{t("yes")}</button>
                          <button type="button" className="rounded-lg px-2 py-0.5 text-[11px] font-medium text-muted-foreground hover:bg-secondary" onClick={() => setConfirmDeleteId(null)}>{t("no")}</button>
                        </div>
                      ) : (
                        <button type="button" className="rounded-xl p-2.5 text-red-500 hover:bg-red-50 hover:text-red-600 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors" onClick={() => setConfirmDeleteId(a.id)} title={t("deleteTitle")}>
                          <Trash2 size={18} strokeWidth={2} />
                        </button>
                      )}
                      {/* Chevron */}
                      <div role="button" tabIndex={0} onClick={() => openAnalysisDetail(a.id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") openAnalysisDetail(a.id); }} className="cursor-pointer rounded-xl p-2.5 text-foreground/60 hover:bg-secondary hover:text-foreground transition-colors">
                        <ChevronDown size={18} strokeWidth={2} className={`transition-transform ${isSelected ? "rotate-180" : ""}`} />
                      </div>
                    </div>
                  </div>
                </div>
                {/* Detay paneli — kartın hemen altında */}
                {isSelected && analysisLoading && (
                  <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
                )}
                {isSelected && selectedAnalysis && !analysisLoading && (
                  <div ref={analysisDetailRef}>
                    <AnalysisDetailPanel
                      analysis={selectedAnalysis}
                      company={company}
                      onClose={() => { setSelectedAnalysis(null); setExpandedAnalysisId(null); }}
                    />
                  </div>
                )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/* ── Kategori Detay Paneli ── */
type RiskCategoryMetaRow = (typeof RISK_CATEGORY_META)[number];

function CategoryDetailPanel({
  categoryKey, category, findings, loading,
  editingFinding, editStatus, editNotes, savingFinding,
  onStartEdit, onCancelEdit, onChangeStatus, onChangeNotes, onSave, onClose,
}: {
  categoryKey: string;
  category: RiskCategoryMetaRow;
  findings: FindingWithContext[];
  loading: boolean;
  editingFinding: string | null;
  editStatus: "open" | "in_progress" | "resolved" | "archived";
  editNotes: string;
  savingFinding: boolean;
  onStartEdit: (f: FindingWithContext) => void;
  onCancelEdit: () => void;
  onChangeStatus: (s: "open" | "in_progress" | "resolved" | "archived") => void;
  onChangeNotes: (n: string) => void;
  onSave: (id: string) => void;
  onClose: () => void;
}) {
  const t = useTranslations("companyWorkspace.risk");
  const trackingRows = [
    { value: "open" as const, label: t("trackingStatus.open"), cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
    { value: "in_progress" as const, label: t("trackingStatus.in_progress"), cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
    { value: "resolved" as const, label: t("trackingStatus.resolved"), cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
    { value: "archived" as const, label: t("trackingStatus.archived"), cls: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400" },
  ];
  function severityRow(s: string) {
    if (s === "critical") return { label: t("severity.critical"), cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" };
    if (s === "high") return { label: t("severity.high"), cls: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" };
    if (s === "medium") return { label: t("severity.medium"), cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" };
    return { label: t("severity.low"), cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" };
  }
  const catLabel = (t as (path: string) => string)(`categories.${categoryKey}.label`);

  return (
    <div className="rounded-[1.7rem] border-2 border-primary/30 bg-card p-5 shadow-[var(--shadow-elevated)]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <PremiumIconBadge icon={category.lucideIcon} tone={category.tone} size="md" />
          <div>
            <h3 className="text-base font-bold text-foreground">{t("categoryRisksTitle", { label: catLabel })}</h3>
            <p className="text-xs text-muted-foreground">{t("findingsCountLabel", { count: findings.length })}</p>
          </div>
        </div>
        <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
      ) : findings.length === 0 ? (
        <p className="mt-4 text-center text-sm text-muted-foreground">{t("noFindingsInCategory")}</p>
      ) : (
        <div className="mt-4 space-y-3">
          {findings.map((f) => {
            const sev = severityRow(f.severity);
            const trk = trackingRows.find((row) => row.value === f.trackingStatus) ?? trackingRows[0];
            const isEditing = editingFinding === f.id;

            return (
              <div key={f.id} className="rounded-lg border border-border bg-secondary/20 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-semibold text-foreground">{f.title}</h4>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${sev.cls}`}>{sev.label}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${trk.cls}`}>{trk.label}</span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{t("analysisPrefix")} {f.assessmentTitle}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => isEditing ? onCancelEdit() : onStartEdit(f)}
                    className="shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-medium text-primary hover:bg-primary/10 transition-colors"
                  >
                    {isEditing ? t("cancel") : t("edit")}
                  </button>
                </div>

                {f.recommendation && (
                  <div className="mt-2 rounded-lg bg-amber-50/50 p-2.5 dark:bg-amber-900/10">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-amber-600 dark:text-amber-400">{t("recommendation")}</p>
                    <p className="mt-0.5 text-xs text-foreground leading-5">{f.recommendation}</p>
                  </div>
                )}
                {f.actionText && (
                  <div className="mt-2 rounded-lg bg-blue-50/50 p-2.5 dark:bg-blue-900/10">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-blue-600 dark:text-blue-400">{t("action")}</p>
                    <p className="mt-0.5 text-xs text-foreground leading-5">{f.actionText}</p>
                  </div>
                )}

                {f.legalReferences.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {f.legalReferences.map((ref, i) => (
                      <span key={i} className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground" title={ref.description}>
                        {ref.law} md.{ref.article}
                      </span>
                    ))}
                  </div>
                )}

                {!isEditing && f.trackingNotes && (
                  <div className="mt-2 rounded-lg bg-secondary/50 p-2.5">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{t("notes")}</p>
                    <p className="mt-0.5 text-xs text-foreground leading-5 whitespace-pre-wrap">{f.trackingNotes}</p>
                  </div>
                )}

                {isEditing && (
                  <div className="mt-3 space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                    <div>
                      <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{t("status")}</label>
                      <select
                        value={editStatus}
                        onChange={(e) => onChangeStatus(e.target.value as typeof editStatus)}
                        className="mt-1 h-9 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground"
                      >
                        {trackingRows.map((row) => (
                          <option key={row.value} value={row.value}>{row.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{t("note")}</label>
                      <textarea
                        value={editNotes}
                        onChange={(e) => onChangeNotes(e.target.value)}
                        rows={3}
                        placeholder={t("notePlaceholder")}
                        className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 resize-none"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => onSave(f.id)} disabled={savingFinding}
                        className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary-hover transition-colors disabled:opacity-50">
                        {savingFinding ? t("saving") : t("save")}
                      </button>
                      <button type="button" onClick={onCancelEdit}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary transition-colors">
                        {t("discard")}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Analiz Detay Paneli ── */
function AnalysisDetailPanel({ analysis, onClose, company }: { analysis: FullAssessment; onClose: () => void; company?: CompanyRecord }) {
  const t = useTranslations("companyWorkspace.risk");
  const locale = useLocale();
  function fmtDate(d: string) {
    return fmtDateLocale(d, locale);
  }
  function methodLabel(m: string) {
    switch (m) {
      case "r_skor": return t("method.r_skor");
      case "fine_kinney": return t("method.fine_kinney");
      case "l_matrix": return t("method.l_matrix");
      case "fmea": return t("method.fmea");
      case "hazop": return t("method.hazop");
      default: return m;
    }
  }
  function sevLabel(s: string) {
    if (s === "critical") return t("severity.critical");
    if (s === "high") return t("severity.high");
    if (s === "medium") return t("severity.medium");
    return t("severity.low");
  }
  function severityRow(s: string) {
    if (s === "critical") return { label: t("severity.critical"), cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" };
    if (s === "high") return { label: t("severity.high"), cls: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" };
    if (s === "medium") return { label: t("severity.medium"), cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" };
    return { label: t("severity.low"), cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" };
  }
  const [exporting, setExporting] = useState<string | null>(null);
  const [showShare, setShowShare] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [sharingToggle, setSharingToggle] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const shareUrl = shareToken ? `${typeof window !== "undefined" ? window.location.origin : ""}/share/risk/${shareToken}` : "";

  async function handleShareToggle() {
    setSharingToggle(true);
    const result = await toggleRiskSharing(analysis.id, !shareToken);
    if (result.ok && result.shareToken) {
      setShareToken(result.shareToken);
      void QRCode.toDataURL(
        `${window.location.origin}/share/risk/${result.shareToken}`,
        { width: 200, margin: 2, color: { dark: "#0F172A", light: "#FFFFFF" } }
      ).then(setQrDataUrl);
    } else if (result.ok && !result.shareToken) {
      setShareToken(null);
      setQrDataUrl(null);
    }
    setSharingToggle(false);
  }

  function copyShareLink() {
    if (shareUrl) { void navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  }

  function shareWhatsApp() {
    const text = t("shareWhatsappBody", { title: analysis.title, url: shareUrl });
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  const totalFindings = analysis.rows.reduce((s, r) => s + r.findings.length, 0);

  async function fetchImageAsDataUrl(url: string): Promise<string | null> {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const blob = await res.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch { return null; }
  }

  async function handleExport(format: "pdf" | "word" | "excel") {
    setExporting(format);
    try {
      const { exportRiskAnalysisPDF, exportRiskAnalysisWord, exportRiskAnalysisExcel } = await import("@/lib/risk-analysis-export");
      const allFindings = analysis.rows.flatMap((r) => r.findings);

      // Görselleri signed URL'den base64'e çevir
      const exportImages = [];
      for (const row of analysis.rows) {
        for (const img of row.images) {
          if (img.signedUrl) {
            const dataUrl = await fetchImageAsDataUrl(img.signedUrl);
            if (dataUrl) {
              const imgFindings = row.findings.filter((f) => f.imageId === img.id);
              exportImages.push({
                imageId: img.id,
                rowTitle: row.title,
                dataUrl,
                fileName: img.fileName,
                findingCount: imgFindings.length,
              });
            }
          }
        }
      }

      const exportData = {
        analysisTitle: analysis.title,
        analysisNote: analysis.analysisNote || "",
        companyName: company?.name ?? "",
        companyKind: company?.kind ?? "",
        companySector: company?.sector ?? "",
        companyHazardClass: company?.hazardClass ?? "",
        companyAddress: company ? `${company.address || ""} ${company.city || ""}`.trim() : "",
        companyLogoUrl: company?.logo_url ?? "",
        location: analysis.locationText || "",
        department: analysis.departmentName || "",
        method: analysis.method,
        methodLabel: methodLabel(analysis.method),
        participants: ((analysis.participants || []) as Record<string, string>[]).map((p) => ({
          fullName: p.fullName || p.full_name || "",
          role: p.roleCode || p.role_code || "",
          title: p.title || "",
          certificateNo: p.certificateNo || p.certificate_no || "",
        })),
        findings: allFindings.map((f) => ({
          rowTitle: analysis.rows.find((r) => r.findings.some((ff) => ff.id === f.id))?.title ?? "",
          imageId: f.imageId,
          title: f.title,
          category: f.category,
          severity: f.severity,
          severityLabel: sevLabel(f.severity),
          score: 0,
          scoreLabel: "",
          riskClass: f.severity,
          action: (f as Record<string, unknown>).action as string || "",
          recommendation: f.recommendation || "",
          confidence: f.confidence,
          isManual: f.isManual,
          correctiveActionRequired: f.correctiveActionRequired,
          method: analysis.method,
          methodLabel: methodLabel(analysis.method),
          legalReferences: f.legalReferences?.length > 0 ? f.legalReferences : undefined,
        })),
        images: exportImages,
        totalFindings: allFindings.length,
        criticalCount: allFindings.filter((f) => f.severity === "critical" || f.severity === "high").length,
        dofCandidateCount: 0,
        date: fmtDate(analysis.assessmentDate),
        shareQrDataUrl: qrDataUrl || undefined,
        shareUrl: shareUrl || undefined,
      };
      if (format === "pdf") exportRiskAnalysisPDF(exportData);
      else if (format === "word") await exportRiskAnalysisWord(exportData);
      else await exportRiskAnalysisExcel(exportData);
    } catch (err) {
      console.warn("Export failed:", err);
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="rounded-[1.5rem] border-2 border-primary/30 bg-card shadow-[var(--shadow-elevated)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border p-5">
        <div>
          <h3 className="text-base font-bold text-foreground">{analysis.title}</h3>
          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
            <span>{fmtDate(analysis.assessmentDate)}</span>
            <span>{methodLabel(analysis.method)}</span>
            <span className="font-semibold text-foreground">{t("findingsInRow", { count: totalFindings })}</span>
            {analysis.locationText && <span>{analysis.locationText}</span>}
            {analysis.departmentName && <span>{analysis.departmentName}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl border border-border/60 bg-secondary/30 p-1">
            <button type="button" onClick={() => void handleExport("pdf")} disabled={exporting !== null} className="rounded-lg px-3 py-1.5 text-[11px] font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-900/20" title={t("exportPdfTitle")}>
              {exporting === "pdf" ? "..." : "PDF"}
            </button>
            <button type="button" onClick={() => void handleExport("word")} disabled={exporting !== null} className="rounded-lg px-3 py-1.5 text-[11px] font-semibold text-blue-600 transition-colors hover:bg-blue-50 disabled:opacity-50 dark:text-blue-400 dark:hover:bg-blue-900/20" title={t("exportWordTitle")}>
              {exporting === "word" ? "..." : "Word"}
            </button>
            <button type="button" onClick={() => void handleExport("excel")} disabled={exporting !== null} className="rounded-lg px-3 py-1.5 text-[11px] font-semibold text-emerald-600 transition-colors hover:bg-emerald-50 disabled:opacity-50 dark:text-emerald-400 dark:hover:bg-emerald-900/20" title={t("exportExcelTitle")}>
              {exporting === "excel" ? "..." : "Excel"}
            </button>
          </div>
          <button type="button" onClick={() => setShowShare(!showShare)} className={`rounded-xl p-2 transition-colors ${showShare ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`} title={t("shareButtonTitle")}>
            <Share2 size={18} strokeWidth={2} />
          </button>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>

      {/* Paylaşım Paneli */}
      {showShare && (
        <div className="border-b border-border bg-gradient-to-r from-emerald-50/50 to-transparent px-5 py-4 dark:from-emerald-950/20">
          <div className="flex flex-wrap items-start gap-5">
            <div className="flex-1 min-w-[200px]">
              <h4 className="text-base font-bold text-foreground">{t("shareTitle")}</h4>
              <p className="mt-1 text-sm text-muted-foreground">{t("shareDescription")}</p>
              <div className="mt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => void handleShareToggle()}
                  disabled={sharingToggle}
                  className={`h-11 rounded-xl px-6 text-sm font-bold shadow-md transition-all hover:shadow-lg ${shareToken ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-[var(--gold)] text-white hover:brightness-110"}`}
                >
                  {sharingToggle ? "..." : shareToken ? t("shareActive") : t("shareEnable")}
                </button>
                {shareToken && (
                  <>
                    <button type="button" onClick={copyShareLink} className="inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground shadow-sm transition-all hover:bg-secondary hover:shadow-md" title={t("shareCopyTitle")}>
                      {copied ? <><Check size={16} className="text-emerald-600" /> {t("shareCopied")}</> : <><Copy size={16} /> {t("shareCopyTitle")}</>}
                    </button>
                    <button type="button" onClick={shareWhatsApp} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#25D366] px-5 text-sm font-bold text-white shadow-md transition-all hover:brightness-110 hover:shadow-lg" title={t("shareWhatsappTitle")}>
                      <MessageCircle size={18} /> WhatsApp
                    </button>
                  </>
                )}
              </div>
              {shareToken && shareUrl && (
                <div className="mt-2 rounded-lg bg-card/80 border border-border/40 px-3 py-2">
                  <p className="truncate text-[11px] text-muted-foreground">{shareUrl}</p>
                </div>
              )}
            </div>
            {shareToken && qrDataUrl && (
              <div className="flex flex-col items-center gap-2">
                <div className="rounded-xl border border-border bg-white p-2 shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrDataUrl} alt={t("qrAlt")} width={120} height={120} />
                </div>
                <p className="text-[10px] text-muted-foreground">{t("qrCaption")}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Katılımcılar */}
      {Array.isArray(analysis.participants) && analysis.participants.length > 0 && (
        <div className="border-b border-border px-5 py-3">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{t("participantsHeading")}</p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {(analysis.participants as { fullName: string; title: string }[]).map((p, i) => (
              <span key={i} className="rounded-full border border-border px-2.5 py-0.5 text-xs text-foreground">
                {p.fullName}{p.title ? ` — ${p.title}` : ""}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Analiz notu */}
      {analysis.analysisNote && (
        <div className="border-b border-border px-5 py-3">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{t("analysisNoteHeading")}</p>
          <p className="mt-1 text-sm text-foreground leading-6">{analysis.analysisNote}</p>
        </div>
      )}

      {/* Satırlar — görseller ve tespitler */}
      <div className="p-5 space-y-6">
        {analysis.rows.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">{t("emptyAnalysisRows")}</p>
        ) : analysis.rows.map((row, ri) => (
          <div key={row.id} className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{ri + 1}</span>
              <h4 className="text-sm font-semibold text-foreground">{row.title}</h4>
              <span className="text-xs text-muted-foreground">{t("rowFindingCount", { count: row.findings.length })}</span>
            </div>
            {row.description && <p className="text-xs text-muted-foreground ml-8">{row.description}</p>}

            {row.images.length > 0 && (
              <div className="ml-8 flex gap-3 overflow-x-auto pb-2">
                {row.images.map((img) => (
                  <div key={img.id} className="shrink-0">
                    {img.signedUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <Image
                        src={img.signedUrl}
                        alt={img.fileName}
                        width={300}
                        height={160}
                        unoptimized
                        className="h-40 w-auto rounded-lg border border-border object-cover shadow-sm"
                      />
                    ) : (
                      <div className="flex h-40 w-48 items-center justify-center rounded-lg border border-border bg-secondary text-xs text-muted-foreground">{img.fileName}</div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {row.findings.length > 0 && (
              <div className="ml-8 space-y-2">
                {row.findings.map((f) => {
                  const sev = severityRow(f.severity);
                  return (
                    <div key={f.id} className="rounded-lg border border-border bg-secondary/20 p-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-foreground">{f.title}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${sev.cls}`}>{sev.label}</span>
                        <span className="text-[10px] text-muted-foreground">{f.category}</span>
                      </div>
                      {f.recommendation && (
                        <p className="mt-1.5 text-xs text-muted-foreground leading-5"><span className="font-medium text-foreground">{t("recommendationInline")}</span> {f.recommendation}</p>
                      )}
                      {f.actionText && (
                        <p className="mt-1 text-xs text-muted-foreground leading-5"><span className="font-medium text-foreground">{t("actionInline")}</span> {f.actionText}</p>
                      )}
                      {f.legalReferences.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {f.legalReferences.map((ref, i) => (
                            <span key={i} className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground" title={ref.description}>{ref.law} md.{ref.article}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {ri < analysis.rows.length - 1 && <hr className="ml-8 border-border/50" />}
          </div>
        ))}
      </div>
    </div>
  );
}

/** AI kategori adını risk sınıfı key'ine dönüştür */
function mapCategoryToKey(category: string): string {
  const lower = (category || "").toLowerCase().trim();
  if (lower.includes("elektrik")) return "elektrik";
  if (lower.includes("yangın") || lower.includes("patlama") || lower.includes("yangin")) return "yangin";
  if (lower.includes("kimyasal") || lower.includes("kimya")) return "kimyasal";
  if (lower.includes("makine") || lower.includes("mekanik")) return "mekanik";
  if (lower.includes("ergonomi")) return "ergonomik";
  if (lower.includes("trafik") || lower.includes("araç")) return "trafik";
  if (lower.includes("çevre") || lower.includes("cevre")) return "cevre";
  if (lower.includes("biyolojik")) return "biyolojik";
  if (lower.includes("psikososyal") || lower.includes("stres")) return "psikososyal";
  // Fiziksel: KKD, düşme, düzen, depolama, yüksekte çalışma, iskele, acil durum
  return "fiziksel";
}

/* ── PEOPLE ── */
export function PeopleTab({ company, upd }: { company: CompanyRecord; upd: (p: Partial<CompanyRecord>) => void }) {
  return (
    <Sec title="Ekip ve Temsil Yapısı" desc="İSG profesyonelleri, çalışan temsilcileri ve destek personeli.">
      <div className="grid gap-4 sm:grid-cols-3">
        <div><label className="text-xs font-medium text-muted-foreground">Aktif Profesyonel</label><Input type="number" value={company.activeProfessionals} onChange={(e) => upd({ activeProfessionals: Number(e.target.value) || 0 })} className="mt-1" /></div>
        <div><label className="text-xs font-medium text-muted-foreground">Çalışan Temsilcisi</label><Input type="number" value={company.employeeRepresentativeCount} onChange={(e) => upd({ employeeRepresentativeCount: Number(e.target.value) || 0 })} className="mt-1" /></div>
        <div><label className="text-xs font-medium text-muted-foreground">Destek Personeli</label><Input type="number" value={company.supportStaffCount} onChange={(e) => upd({ supportStaffCount: Number(e.target.value) || 0 })} className="mt-1" /></div>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div><label className="text-xs font-medium text-muted-foreground">İşveren Adı</label><Input value={company.employerName} onChange={(e) => upd({ employerName: e.target.value })} className="mt-1" /></div>
        <div><label className="text-xs font-medium text-muted-foreground">İşveren Vekili</label><Input value={company.employerRepresentative} onChange={(e) => upd({ employerRepresentative: e.target.value })} className="mt-1" /></div>
      </div>
    </Sec>
  );
}

/* ── TRACKING ── */
type TrackingSection = "actions" | "trainings" | "controls" | "committee";

export function TrackingTab({ company }: { company: CompanyRecord }) {
  const tt = useTranslations("companyWorkspace.tracking");
  const tr = useTranslations("companyWorkspace.risk");
  const locale = useLocale();
  const [section, setSection] = useState<TrackingSection>("actions");
  const [, setSummary] = useState<TrackingSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Data states
  const [actions, setActions] = useState<OpenAction[]>([]);
  const [trainings, setTrainings] = useState<TrainingRecord[]>([]);
  const [controls, setControls] = useState<PeriodicControlRecord[]>([]);
  const [meetings, setMeetings] = useState<CommitteeMeeting[]>([]);

  // Form states
  const [showTrainingForm, setShowTrainingForm] = useState(false);
  const [editingTraining, setEditingTraining] = useState<TrainingRecord | null>(null);
  const [showControlForm, setShowControlForm] = useState(false);
  const [editingControl, setEditingControl] = useState<PeriodicControlRecord | null>(null);
  const [showMeetingForm, setShowMeetingForm] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<CommitteeMeeting | null>(null);

  // Inline action status edit (risk findings only)
  const [editingActionId, setEditingActionId] = useState<string | null>(null);
  const [actionNewStatus, setActionNewStatus] = useState<"open" | "in_progress" | "resolved">("open");
  const [savingAction, setSavingAction] = useState(false);

  useEffect(() => {
    (async () => {
      const [s, a, t, c, m] = await Promise.all([
        getTrackingSummary(company.id),
        listOpenActions(company.id),
        listTrainings(company.id),
        listPeriodicControls(company.id),
        listCommitteeMeetings(company.id),
      ]);
      setSummary(s);
      setActions(a);
      setTrainings(t);
      setControls(c);
      setMeetings(m);
      setLoading(false);
    })();
  }, [company.id]);

  function fmtDate(d: string | null) {
    return fmtDateShortLocale(d, locale);
  }

  const [today] = useState(() => isoDateAfterDays());
  const [soonThreshold] = useState(() => isoDateAfterDays(30));

  const SECTIONS: { k: TrackingSection; l: string; count: number }[] = [
    { k: "actions", l: tt("sectionActions"), count: actions.length },
    { k: "trainings", l: tt("sectionTrainings"), count: trainings.length },
    { k: "controls", l: tt("sectionControls"), count: controls.length },
    { k: "committee", l: tt("sectionCommittee"), count: meetings.length },
  ];

  return (
    <div className="space-y-5">
      {/* Sekme Seçici — Segmented control */}
      <div className="flex flex-wrap rounded-[1.25rem] border border-border/60 bg-secondary/20 p-1 shadow-sm">
        {SECTIONS.map((s) => (
          <button key={s.k} type="button" onClick={() => setSection(s.k)}
            className={`inline-flex flex-1 min-w-[140px] h-10 items-center justify-center gap-2 rounded-[0.8rem] px-4 text-sm font-semibold transition-all ${section === s.k ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
            {s.l}
            {s.count > 0 && <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${section === s.k ? "bg-white/20" : "bg-muted"}`}>{s.count}</span>}
          </button>
        ))}
      </div>

      {/* İçerik */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
      ) : (
        <>
          {/* Açık Aksiyonlar */}
          {section === "actions" && (
            <Sec title={tt("actionsTitle")} desc={tt("actionsDesc")}>
              {actions.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-6">{tt("noActions")}</p>
              ) : (
                <>
                {/* Severity breakdown */}
                <div className="mb-4 flex flex-wrap gap-2">
                  {(() => {
                    const cr = actions.filter((a) => a.severity === "critical").length;
                    const hi = actions.filter((a) => a.severity === "high").length;
                    const md = actions.filter((a) => a.severity === "medium").length;
                    const lo = actions.filter((a) => a.severity === "low").length;
                    const risk = actions.filter((a) => a.source === "risk").length;
                    const dof = actions.filter((a) => a.source === "dof").length;
                    const task = actions.filter((a) => a.source === "isg_task").length;
                    return (
                      <>
                        <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold text-foreground">{tt("badgeTotal", { count: actions.length })}</span>
                        {cr > 0 && <span className="rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-bold text-red-700 dark:bg-red-900/30 dark:text-red-400">{tr("badgeCritical", { count: cr })}</span>}
                        {hi > 0 && <span className="rounded-full bg-orange-100 px-2.5 py-1 text-[11px] font-bold text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">{tr("badgeHigh", { count: hi })}</span>}
                        {md > 0 && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">{tr("badgeMedium", { count: md })}</span>}
                        {lo > 0 && <span className="rounded-full bg-green-100 px-2.5 py-1 text-[11px] font-bold text-green-700 dark:bg-green-900/30 dark:text-green-400">{tr("badgeLow", { count: lo })}</span>}
                        <span className="ml-auto" />
                        {risk > 0 && <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-medium text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">{tt("sourceRisk")}: {risk}</span>}
                        {dof > 0 && <span className="rounded-full bg-purple-50 px-2 py-1 text-[10px] font-medium text-purple-600 dark:bg-purple-900/20 dark:text-purple-400">{tt("sourceDof")}: {dof}</span>}
                        {task > 0 && <span className="rounded-full bg-cyan-50 px-2 py-1 text-[10px] font-medium text-cyan-600 dark:bg-cyan-900/20 dark:text-cyan-400">{tt("sourceTask")}: {task}</span>}
                      </>
                    );
                  })()}
                </div>
                <div className="space-y-2">
                  {actions.map((a) => {
                    const sevCls = a.severity === "critical" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      : a.severity === "high" ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                      : a.severity === "medium" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                      : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
                    const srcCls = a.source === "risk" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                      : a.source === "dof" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                      : "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400";
                    const srcLabel = a.source === "risk" ? tt("sourceRisk") : a.source === "dof" ? tt("sourceDof") : tt("sourceTask");
                    const isEditingThis = editingActionId === a.id && a.source === "risk";
                    return (
                      <div key={a.id} className="rounded-lg border border-border bg-secondary/20 p-3">
                        <div className="flex items-center justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-foreground">{a.title}</span>
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${sevCls}`}>{a.severity === "critical" ? tr("severity.critical") : a.severity === "high" ? tr("severity.high") : a.severity === "medium" ? tr("severity.medium") : tr("severity.low")}</span>
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${srcCls}`}>{srcLabel}</span>
                              {a.status === "in_progress" && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">{tr("trackingStatus.in_progress")}</span>}
                            </div>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">{a.sourceLabel}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {a.deadline && (
                              <span className={`text-xs font-medium ${a.deadline < today ? "text-red-500" : "text-muted-foreground"}`}>{fmtDate(a.deadline)}</span>
                            )}
                            {a.source === "risk" && !isEditingThis && (
                              <button type="button" onClick={() => { setEditingActionId(a.id); setActionNewStatus(a.status === "in_progress" ? "in_progress" : "open"); }}
                                className="rounded-lg px-2 py-1 text-[11px] font-medium text-primary hover:bg-primary/10 transition-colors">{tt("statusButton")}</button>
                            )}
                          </div>
                        </div>
                        {isEditingThis && (
                          <div className="mt-2 flex items-center gap-2 rounded-lg bg-primary/5 p-2">
                            <select value={actionNewStatus} onChange={(e) => setActionNewStatus(e.target.value as typeof actionNewStatus)}
                              className="h-8 rounded-lg border border-border bg-card px-2 text-xs text-foreground">
                              <option value="open">{tr("trackingStatus.open")}</option>
                              <option value="in_progress">{tr("trackingStatus.in_progress")}</option>
                              <option value="resolved">{tr("trackingStatus.resolved")}</option>
                            </select>
                            <button type="button" disabled={savingAction} onClick={async () => {
                              setSavingAction(true);
                              const ok = await updateFindingStatus(a.id, actionNewStatus, "");
                              if (ok) {
                                if (actionNewStatus === "resolved") {
                                  setActions((prev) => prev.filter((x) => x.id !== a.id));
                                } else {
                                  setActions((prev) => prev.map((x) => x.id === a.id ? { ...x, status: actionNewStatus } : x));
                                }
                                setSummary(await getTrackingSummary(company.id));
                              }
                              setSavingAction(false);
                              setEditingActionId(null);
                            }} className="rounded-lg bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50">
                              {savingAction ? "..." : tr("save")}
                            </button>
                            <button type="button" onClick={() => setEditingActionId(null)}
                              className="rounded-lg border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-secondary">{tr("discard")}</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                </>
              )}
            </Sec>
          )}

          {/* Eğitimler */}
          {section === "trainings" && (
            <Sec title={tt("trainingsTitle")} desc={tt("trainingsDesc")}>
              <div className="flex justify-end mb-3">
                <button type="button" onClick={() => { setEditingTraining(null); setShowTrainingForm(!showTrainingForm); }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary-hover transition-colors">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                  {tt("newTraining")}
                </button>
              </div>

              {showTrainingForm && (
                <TrainingForm companyId={company.id} editing={editingTraining} onSaved={async () => {
                  setShowTrainingForm(false); setEditingTraining(null);
                  setTrainings(await listTrainings(company.id));
                  setSummary(await getTrackingSummary(company.id));
                }} onCancel={() => { setShowTrainingForm(false); setEditingTraining(null); }} />
              )}

              {trainings.length === 0 && !showTrainingForm ? (
                <p className="text-center text-sm text-muted-foreground py-6">{tt("noTrainings")}</p>
              ) : (
                <div className="space-y-2">
                  {trainings.map((t) => {
                    const stCls = t.status === "completed" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : t.status === "cancelled" ? "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                      : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
                    const stLabel = t.status === "completed" ? tt("status.completed") : t.status === "cancelled" ? tt("status.cancelled") : tt("status.planned");
                    const typLabel = t.trainingType === "zorunlu" ? tt("trainingTypes.zorunlu") : t.trainingType === "yenileme" ? tt("trainingTypes.yenileme") : tt("trainingTypes.istege_bagli");
                    return (
                      <div key={t.id} className="flex items-center justify-between rounded-lg border border-border bg-secondary/20 p-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-foreground">{t.title}</span>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${stCls}`}>{stLabel}</span>
                            <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{typLabel}</span>
                          </div>
                          <div className="mt-0.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                            {t.trainingDate && <span>{fmtDate(t.trainingDate)}</span>}
                            {t.durationHours > 0 && <span>{tt("hours", { count: t.durationHours })}</span>}
                            {t.trainerName && <span>{t.trainerName}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => { setEditingTraining(t); setShowTrainingForm(true); }} className="rounded-lg p-1 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" title={tt("edit")}>
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" /></svg>
                          </button>
                          <button type="button" onClick={async () => {
                            if (await deleteTraining(t.id)) {
                              setTrainings((prev) => prev.filter((x) => x.id !== t.id));
                              setSummary(await getTrackingSummary(company.id));
                            }
                          }} className="rounded-lg p-1 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title={tt("delete")}>
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Sec>
          )}

          {/* Periyodik Kontroller */}
          {section === "controls" && (
            <Sec title={tt("controlsTitle")} desc={tt("controlsDesc")}>
              <div className="flex justify-end mb-3">
                <button type="button" onClick={() => { setEditingControl(null); setShowControlForm(!showControlForm); }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary-hover transition-colors">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                  {tt("newControl")}
                </button>
              </div>

              {showControlForm && (
                <PeriodicControlForm companyId={company.id} editing={editingControl} onSaved={async () => {
                  setShowControlForm(false); setEditingControl(null);
                  setControls(await listPeriodicControls(company.id));
                  setSummary(await getTrackingSummary(company.id));
                }} onCancel={() => { setShowControlForm(false); setEditingControl(null); }} />
              )}

              {controls.length === 0 && !showControlForm ? (
                <p className="text-center text-sm text-muted-foreground py-6">{tt("noControls")}</p>
              ) : (
                <div className="space-y-2">
                  {controls.map((c) => {
                    const isOverdue = c.nextInspectionDate && c.nextInspectionDate < today;
                    const isSoon = c.nextInspectionDate && !isOverdue && c.nextInspectionDate <= soonThreshold;
                    const resCls = c.result === "uygun" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : c.result === "uygun_degil" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
                    const resLabel = c.result === "uygun" ? tt("results.uygun") : c.result === "uygun_degil" ? tt("results.uygun_degil") : tt("results.sartli_uygun");
                    return (
                      <div key={c.id} className={`flex items-center justify-between rounded-lg border p-3 ${isOverdue ? "border-red-400/40 bg-red-50/5 dark:bg-red-950/10" : isSoon ? "border-amber-400/30 bg-amber-50/5 dark:bg-amber-950/10" : "border-border bg-secondary/20"}`}>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-foreground">{c.title}</span>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${resCls}`}>{resLabel}</span>
                            <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{tt(`controlTypes.${c.controlType}`) ?? c.controlType}</span>
                            {isOverdue && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-900/30 dark:text-red-400">{tt("overdue")}</span>}
                          </div>
                          <div className="mt-0.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                            {c.inspectionDate && <span>{tt("last")}: {fmtDate(c.inspectionDate)}</span>}
                            {c.nextInspectionDate && <span className={isOverdue ? "text-red-500 font-medium" : ""}>{tt("next")}: {fmtDate(c.nextInspectionDate)}</span>}
                            {c.inspectorName && <span>{c.inspectorName}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => { setEditingControl(c); setShowControlForm(true); }} className="rounded-lg p-1 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" title={tt("edit")}>
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" /></svg>
                          </button>
                        <button type="button" onClick={async () => {
                          if (await deletePeriodicControl(c.id)) {
                            setControls((prev) => prev.filter((x) => x.id !== c.id));
                            setSummary(await getTrackingSummary(company.id));
                          }
                        }} className="rounded-lg p-1 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title={tt("delete")}>
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                        </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Sec>
          )}

          {/* İSG Kurul */}
          {section === "committee" && (
            <Sec title={tt("committeeTitle")} desc={tt("committeeDesc", { hazardClass: company.hazardClass || tt("hazardUnknown"), months: getCommitteePeriodMonths(company.hazardClass) })}>
              <div className="flex justify-end mb-3">
                <button type="button" onClick={() => { setEditingMeeting(null); setShowMeetingForm(!showMeetingForm); }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary-hover transition-colors">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                  {tt("newMeeting")}
                </button>
              </div>

              {showMeetingForm && (
                <CommitteeMeetingForm
                  companyId={company.id}
                  nextNumber={(meetings[0]?.meetingNumber ?? 0) + 1}
                  periodMonths={getCommitteePeriodMonths(company.hazardClass)}
                  editing={editingMeeting}
                  onSaved={async () => {
                    setShowMeetingForm(false); setEditingMeeting(null);
                    setMeetings(await listCommitteeMeetings(company.id));
                    setSummary(await getTrackingSummary(company.id));
                  }}
                  onCancel={() => { setShowMeetingForm(false); setEditingMeeting(null); }}
                />
              )}

              {meetings.length === 0 && !showMeetingForm ? (
                <p className="text-center text-sm text-muted-foreground py-6">{tt("noMeetings")}</p>
              ) : (
                <div className="space-y-3">
                  {meetings.map((m) => {
                    const stCls = m.status === "completed" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : m.status === "cancelled" ? "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                      : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
                    const stLabel = m.status === "completed" ? tt("status.completed") : m.status === "cancelled" ? tt("status.cancelled") : tt("status.planned");
                    return (
                      <div key={m.id} className="rounded-lg border border-border bg-secondary/20 p-4">
                        <div className="flex items-start justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-foreground">{tt("meetingNumber", { number: m.meetingNumber })}</span>
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${stCls}`}>{stLabel}</span>
                              <span className="text-xs text-muted-foreground">{fmtDate(m.meetingDate)}</span>
                            </div>
                            {m.agenda && <p className="mt-1 text-xs text-muted-foreground">{tt("agenda")}: {m.agenda}</p>}
                            {m.attendees && <p className="mt-0.5 text-[11px] text-muted-foreground">{tt("attendees")}: {m.attendees}</p>}
                          </div>
                          <div className="flex items-center gap-1">
                          <button type="button" onClick={() => { setEditingMeeting(m); setShowMeetingForm(true); }} className="rounded-lg p-1 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" title={tt("edit")}>
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" /></svg>
                          </button>
                          <button type="button" onClick={async () => {
                            if (await deleteCommitteeMeeting(m.id)) {
                              setMeetings((prev) => prev.filter((x) => x.id !== m.id));
                            }
                          }} className="rounded-lg p-1 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title={tt("delete")}>
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                          </button>
                          </div>
                        </div>

                        {/* Kararlar */}
                        {m.decisions.length > 0 && (
                          <div className="mt-3 space-y-1.5">
                            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{tt("decisions")}</p>
                            {m.decisions.map((d, di) => (
                              <div key={di} className="flex items-start gap-2 rounded-lg bg-primary/5 p-2.5">
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">{di + 1}</span>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs text-foreground">{d.text}</p>
                                  <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                                    {d.responsible && <span>{tt("responsible")}: {d.responsible}</span>}
                                    {d.deadline && <span>{tt("deadline")}: {fmtDate(d.deadline)}</span>}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {m.nextMeetingDate && (
                          <p className="mt-2 text-[11px] text-primary font-medium">{tt("nextMeeting")}: {fmtDate(m.nextMeetingDate)}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Sec>
          )}

          {/* Sağlık gözetimi kaldırıldı — Personel sekmesinde */}
        </>
      )}
    </div>
  );
}

/* ── Eğitim Ekleme Formu ── */
function TrainingForm({ companyId, editing, onSaved, onCancel }: { companyId: string; editing: TrainingRecord | null; onSaved: () => void; onCancel: () => void }) {
  const tt = useTranslations("companyWorkspace.tracking");
  const [title, setTitle] = useState(editing?.title ?? "");
  const [trainingType, setTrainingType] = useState<string>(editing?.trainingType ?? "zorunlu");
  const [trainerName, setTrainerName] = useState(editing?.trainerName ?? "");
  const [trainingDate, setTrainingDate] = useState(editing?.trainingDate ?? "");
  const [durationHours, setDurationHours] = useState(String(editing?.durationHours ?? 2));
  const [location, setLocation] = useState(editing?.location ?? "");
  const [status, setStatus] = useState<string>(editing?.status ?? "planned");
  const [notes, setNotes] = useState(editing?.notes ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!title.trim()) return;
    setSaving(true);
    const payload = { title: title.trim(), trainingType, trainerName, trainingDate, durationHours: Number(durationHours) || 0, location, status, notes };
    if (editing) {
      await updateTraining(editing.id, payload);
    } else {
      await createTraining(companyId, payload);
    }
    setSaving(false);
    onSaved();
  }

  return (
    <div className="mb-4 rounded-lg border-2 border-primary/30 bg-primary/5 p-4 space-y-3">
      <h4 className="text-sm font-semibold text-foreground">{editing ? tt("trainingForm.editTitle") : tt("trainingForm.newTitle")}</h4>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="text-[10px] font-medium uppercase text-muted-foreground">{tt("trainingForm.nameRequired")}</label><Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" placeholder={tt("trainingForm.namePlaceholder")} /></div>
        <div><label className="text-[10px] font-medium uppercase text-muted-foreground">{tt("type")}</label><select value={trainingType} onChange={(e) => setTrainingType(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground"><option value="zorunlu">{tt("trainingTypes.zorunlu")}</option><option value="istege_bagli">{tt("trainingTypes.istege_bagli")}</option><option value="yenileme">{tt("trainingTypes.yenileme")}</option></select></div>
        <div><label className="text-[10px] font-medium uppercase text-muted-foreground">{tt("trainer")}</label><Input value={trainerName} onChange={(e) => setTrainerName(e.target.value)} className="mt-1" /></div>
        <div><label className="text-[10px] font-medium uppercase text-muted-foreground">{tt("date")}</label><Input type="date" value={trainingDate} onChange={(e) => setTrainingDate(e.target.value)} className="mt-1" /></div>
        <div><label className="text-[10px] font-medium uppercase text-muted-foreground">{tt("durationHours")}</label><Input type="number" value={durationHours} onChange={(e) => setDurationHours(e.target.value)} className="mt-1" /></div>
        <div><label className="text-[10px] font-medium uppercase text-muted-foreground">{tt("location")}</label><Input value={location} onChange={(e) => setLocation(e.target.value)} className="mt-1" /></div>
        <div><label className="text-[10px] font-medium uppercase text-muted-foreground">{tt("statusLabel")}</label><select value={status} onChange={(e) => setStatus(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground"><option value="planned">{tt("status.planned")}</option><option value="completed">{tt("status.completed")}</option><option value="cancelled">{tt("status.cancelled")}</option></select></div>
      </div>
      <div><label className="text-[10px] font-medium uppercase text-muted-foreground">{tt("note")}</label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="mt-1" /></div>
      <div className="flex gap-2">
        <button type="button" onClick={handleSubmit} disabled={saving || !title.trim()} className="rounded-lg bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50">{saving ? tt("saving") : tt("save")}</button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-border px-4 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary">{tt("cancel")}</button>
      </div>
    </div>
  );
}

/* ── Periyodik Kontrol Ekleme Formu ── */
function PeriodicControlForm({ companyId, editing, onSaved, onCancel }: { companyId: string; editing: PeriodicControlRecord | null; onSaved: () => void; onCancel: () => void }) {
  const tt = useTranslations("companyWorkspace.tracking");
  const [title, setTitle] = useState(editing?.title ?? "");
  const [controlType, setControlType] = useState<string>(editing?.controlType ?? "elektrik");
  const [inspectorName, setInspectorName] = useState(editing?.inspectorName ?? "");
  const [inspectionDate, setInspectionDate] = useState(editing?.inspectionDate ?? "");
  const [nextInspectionDate, setNextInspectionDate] = useState(editing?.nextInspectionDate ?? "");
  const [result, setResult] = useState<string>(editing?.result ?? "uygun");
  const [reportReference, setReportReference] = useState(editing?.reportReference ?? "");
  const [notes, setNotes] = useState(editing?.notes ?? "");
  const [status, setStatus] = useState<string>(editing?.status ?? "completed");
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!title.trim()) return;
    setSaving(true);
    const payload = { title: title.trim(), controlType, inspectorName, inspectionDate, nextInspectionDate, result, reportReference, notes, status };
    if (editing) {
      await updatePeriodicControl(editing.id, payload);
    } else {
      await createPeriodicControl(companyId, payload);
    }
    setSaving(false);
    onSaved();
  }

  return (
    <div className="mb-4 rounded-lg border-2 border-primary/30 bg-primary/5 p-4 space-y-3">
      <h4 className="text-sm font-semibold text-foreground">{editing ? tt("controlForm.editTitle") : tt("controlForm.newTitle")}</h4>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="text-[10px] font-medium uppercase text-muted-foreground">{tt("controlForm.nameRequired")}</label><Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" placeholder={tt("controlForm.namePlaceholder")} /></div>
        <div><label className="text-[10px] font-medium uppercase text-muted-foreground">{tt("type")}</label><select value={controlType} onChange={(e) => setControlType(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground"><option value="elektrik">{tt("controlTypes.elektrik")}</option><option value="asansor">{tt("controlTypes.asansor")}</option><option value="yangin">{tt("controlTypes.yangin")}</option><option value="basinc">{tt("controlTypes.basinc")}</option><option value="vinc">{tt("controlTypes.vinc")}</option><option value="kompressor">{tt("controlTypes.kompressor")}</option><option value="forklift">{tt("controlTypes.forklift")}</option><option value="diger">{tt("controlTypes.diger")}</option></select></div>
        <div><label className="text-[10px] font-medium uppercase text-muted-foreground">{tt("inspector")}</label><Input value={inspectorName} onChange={(e) => setInspectorName(e.target.value)} className="mt-1" /></div>
        <div><label className="text-[10px] font-medium uppercase text-muted-foreground">{tt("inspectionDate")}</label><Input type="date" value={inspectionDate} onChange={(e) => setInspectionDate(e.target.value)} className="mt-1" /></div>
        <div><label className="text-[10px] font-medium uppercase text-muted-foreground">{tt("nextControl")}</label><Input type="date" value={nextInspectionDate} onChange={(e) => setNextInspectionDate(e.target.value)} className="mt-1" /></div>
        <div><label className="text-[10px] font-medium uppercase text-muted-foreground">{tt("result")}</label><select value={result} onChange={(e) => setResult(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground"><option value="uygun">{tt("results.uygun")}</option><option value="sartli_uygun">{tt("results.sartli_uygun")}</option><option value="uygun_degil">{tt("results.uygun_degil")}</option></select></div>
        <div><label className="text-[10px] font-medium uppercase text-muted-foreground">{tt("reportReference")}</label><Input value={reportReference} onChange={(e) => setReportReference(e.target.value)} className="mt-1" placeholder="RPR-2026-001" /></div>
        <div><label className="text-[10px] font-medium uppercase text-muted-foreground">{tt("statusLabel")}</label><select value={status} onChange={(e) => setStatus(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground"><option value="completed">{tt("status.completed")}</option><option value="planned">{tt("status.planned")}</option><option value="overdue">{tt("status.overdue")}</option></select></div>
      </div>
      <div><label className="text-[10px] font-medium uppercase text-muted-foreground">{tt("note")}</label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="mt-1" /></div>
      <div className="flex gap-2">
        <button type="button" onClick={handleSubmit} disabled={saving || !title.trim()} className="rounded-lg bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50">{saving ? tt("saving") : tt("save")}</button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-border px-4 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary">{tt("cancel")}</button>
      </div>
    </div>
  );
}

/* ── İSG Kurul Toplantı Formu ── */
function CommitteeMeetingForm({ companyId, nextNumber, periodMonths, editing, onSaved, onCancel }: {
  companyId: string; nextNumber: number; periodMonths: number;
  editing: CommitteeMeeting | null;
  onSaved: () => void; onCancel: () => void;
}) {
  const tt = useTranslations("companyWorkspace.tracking");
  const [meetingDate, setMeetingDate] = useState(() => editing?.meetingDate ?? isoDateAfterDays());
  const [meetingNumber, setMeetingNumber] = useState(editing?.meetingNumber ?? nextNumber);
  const [attendees, setAttendees] = useState(editing?.attendees ?? "");
  const [agenda, setAgenda] = useState(editing?.agenda ?? "");
  const [decisions, setDecisions] = useState<{ text: string; responsible: string; deadline: string }[]>(
    editing?.decisions?.length ? editing.decisions : [{ text: "", responsible: "", deadline: "" }]
  );
  const [nextMeetingDate, setNextMeetingDate] = useState(() => editing?.nextMeetingDate ?? isoDateAfterDays(periodMonths * 30));
  const [notes, setNotes] = useState(editing?.notes ?? "");
  const [status, setStatus] = useState<string>(editing?.status ?? "completed");
  const [saving, setSaving] = useState(false);

  function addDecision() { setDecisions([...decisions, { text: "", responsible: "", deadline: "" }]); }
  function updDecision(i: number, field: string, value: string) {
    setDecisions(decisions.map((d, idx) => idx === i ? { ...d, [field]: value } : d));
  }
  function removeDecision(i: number) { setDecisions(decisions.filter((_, idx) => idx !== i)); }

  async function handleSubmit() {
    if (!meetingDate) return;
    setSaving(true);
    const payload = { meetingDate, meetingNumber, attendees, agenda, decisions: decisions.filter((d) => d.text.trim()), nextMeetingDate, notes, status };
    if (editing) {
      await updateCommitteeMeeting(editing.id, payload);
    } else {
      await createCommitteeMeeting(companyId, payload);
    }
    setSaving(false);
    onSaved();
  }

  return (
    <div className="mb-4 rounded-lg border-2 border-primary/30 bg-primary/5 p-4 space-y-3">
      <h4 className="text-sm font-semibold text-foreground">{editing ? tt("meetingForm.editTitle") : tt("meetingForm.newTitle")}</h4>
      <div className="grid gap-3 sm:grid-cols-3">
        <div><label className="text-[10px] font-medium uppercase text-muted-foreground">{tt("meetingForm.dateRequired")}</label><Input type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} className="mt-1" /></div>
        <div><label className="text-[10px] font-medium uppercase text-muted-foreground">{tt("meetingForm.number")}</label><Input type="number" value={meetingNumber} onChange={(e) => setMeetingNumber(Number(e.target.value) || 1)} className="mt-1" /></div>
        <div><label className="text-[10px] font-medium uppercase text-muted-foreground">{tt("statusLabel")}</label><select value={status} onChange={(e) => setStatus(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground"><option value="completed">{tt("status.completed")}</option><option value="planned">{tt("status.planned")}</option><option value="cancelled">{tt("status.cancelled")}</option></select></div>
      </div>
      <div><label className="text-[10px] font-medium uppercase text-muted-foreground">{tt("attendees")}</label><Input value={attendees} onChange={(e) => setAttendees(e.target.value)} className="mt-1" placeholder={tt("meetingForm.attendeesPlaceholder")} /></div>
      <div><label className="text-[10px] font-medium uppercase text-muted-foreground">{tt("agenda")}</label><Textarea value={agenda} onChange={(e) => setAgenda(e.target.value)} rows={2} className="mt-1" placeholder={tt("meetingForm.agendaPlaceholder")} /></div>

      {/* Kararlar */}
      <div>
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-medium uppercase text-muted-foreground">{tt("decisions")}</label>
          <button type="button" onClick={addDecision} className="text-[10px] font-medium text-primary hover:underline">{tt("meetingForm.addDecision")}</button>
        </div>
        <div className="mt-1 space-y-2">
          {decisions.map((d, i) => (
            <div key={i} className="flex gap-2 items-start">
              <span className="mt-2.5 text-xs font-bold text-muted-foreground shrink-0">{i + 1}.</span>
              <div className="flex-1 grid gap-2 sm:grid-cols-3">
                <Input value={d.text} onChange={(e) => updDecision(i, "text", e.target.value)} placeholder={tt("meetingForm.decisionText")} className="sm:col-span-1" />
                <Input value={d.responsible} onChange={(e) => updDecision(i, "responsible", e.target.value)} placeholder={tt("responsible")} />
                <Input type="date" value={d.deadline} onChange={(e) => updDecision(i, "deadline", e.target.value)} />
              </div>
              {decisions.length > 1 && (
                <button type="button" onClick={() => removeDecision(i)} className="mt-2 text-muted-foreground hover:text-red-500">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="text-[10px] font-medium uppercase text-muted-foreground">{tt("meetingForm.nextDate")}</label><Input type="date" value={nextMeetingDate} onChange={(e) => setNextMeetingDate(e.target.value)} className="mt-1" /></div>
        <div><label className="text-[10px] font-medium uppercase text-muted-foreground">{tt("note")}</label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={1} className="mt-1" /></div>
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={handleSubmit} disabled={saving || !meetingDate} className="rounded-lg bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50">{saving ? tt("saving") : tt("save")}</button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-border px-4 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary">{tt("cancel")}</button>
      </div>
    </div>
  );
}

/* ── ORGANIZATION (members/permissions/invitations/requests) ── */
export function OrganizationTab({ setInviteOpen }: { company: CompanyRecord; setInviteOpen: (v: boolean) => void }) {
  return (
    <div className="space-y-6">
      <Sec title="Organizasyon" desc="Firma organizasyon yapısı, üyelik ve erişim yönetimi.">
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { title: "Üyeler", desc: "Firmaya erişimi olan kullanıcılar ve rolleri.", icon: "👥", action: "Yakında" },
            { title: "İzinler", desc: "Modül bazlı erişim ve yetki kontrolü.", icon: "🔒", action: "Yakında" },
            { title: "Davetler", desc: "Gönderilen ve bekleyen profesyonel davetleri.", icon: "📨", action: "Davet Gönder" },
            { title: "Talepler", desc: "Firmaya katılma talepleri ve onay süreci.", icon: "📋", action: "Yakında" },
          ].map((item) => (
            <div key={item.title} className="rounded-lg border border-border bg-secondary/20 p-4">
              <div className="flex items-start gap-3">
                <span className="text-xl">{item.icon}</span>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground leading-5">{item.desc}</p>
                  <button
                    type="button"
                    onClick={item.title === "Davetler" ? () => setInviteOpen(true) : undefined}
                    disabled={item.title !== "Davetler"}
                    className="mt-2 text-xs font-medium text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
                  >
                    {item.action}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Sec>
      <Sec title="Paylaşım ve Erişim" desc="Firma verileri üzerindeki paylaşım ve erişim kontrolleri.">
        <div className="rounded-lg border border-border bg-secondary/30 p-4">
          <p className="text-sm text-muted-foreground leading-6">Paylaşım ve erişim yönetimi modülü geliştirme aşamasındadır. Firma verileri üzerinde granular erişim kontrolü yakında aktif olacaktır.</p>
        </div>
      </Sec>
    </div>
  );
}

/* ── HISTORY ── */
type WorkspaceActivityRow = {
  id: string;
  source: string;
  action_code: string | null;
  entity_type: string;
  entity_id: string | null;
  actor_name: string | null;
  actor_email: string | null;
  payload: Record<string, unknown> | null;
  severity: string;
  created_at: string;
};

const ACTIVITY_ACTION_KEYS: Record<string, string> = {
  "workspace.created": "workspaceCreated",
  "workspace.archived": "workspaceArchived",
  "workspace.restored": "workspaceRestored",
  "workspace.assignment.created": "expertAssigned",
  "workspace.assignment.updated": "expertAssignmentUpdated",
  "workspace.assignment.deleted": "expertAssignmentDeleted",
  "risk_assessment.created": "riskAssessmentCreated",
  "risk_assessment.updated": "riskAssessmentUpdated",
  "risk_assessments.insert": "riskAssessmentCreated",
  "risk_assessments.update": "riskAssessmentUpdated",
  "risk_assessments.delete": "riskAssessmentDeleted",
  "editor_documents.insert": "documentCreated",
  "editor_documents.update": "documentUpdated",
  "editor_documents.delete": "documentDeleted",
  "company_trainings.insert": "trainingAdded",
  "company_trainings.update": "trainingUpdated",
  "incidents.insert": "incidentCreated",
  "incidents.update": "incidentUpdated",
};

const ACTIVITY_ENTITY_KEYS: Record<string, string> = {
  risk_assessments: "riskAssessments",
  editor_documents: "editorDocuments",
  incidents: "incidents",
  company_trainings: "companyTrainings",
  company_committee_meetings: "committeeMeetings",
  company_periodic_controls: "periodicControls",
  isg_tasks: "tasks",
  workspace: "workspace",
  company_workspaces: "workspace",
  company_identity: "companyIdentity",
};

function formatActivityRelative(iso: string, locale: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = now - then;
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (diff < 60_000) return rtf.format(0, "minute");
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return rtf.format(-mins, "minute");
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return rtf.format(-hrs, "hour");
  const days = Math.floor(hrs / 24);
  if (days < 7) return rtf.format(-days, "day");
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}

function formatActivityActionLabel(row: WorkspaceActivityRow, t: ReturnType<typeof useTranslations>): string {
  if (row.action_code && ACTIVITY_ACTION_KEYS[row.action_code]) {
    return t(`actions.${ACTIVITY_ACTION_KEYS[row.action_code]}`);
  }
  if (row.action_code) {
    return row.action_code.replace(/[._]/g, " ");
  }
  return t("change");
}

function formatActivityEntityLabel(entityType: string | null | undefined, t: ReturnType<typeof useTranslations>): string {
  if (!entityType) return "";
  return ACTIVITY_ENTITY_KEYS[entityType] ? t(`entities.${ACTIVITY_ENTITY_KEYS[entityType]}`) : entityType.replace(/_/g, " ");
}

export function HistoryTab({ companyWorkspaceId }: { companyWorkspaceId?: string }) {
  const t = useTranslations("companyWorkspace.history");
  const locale = useLocale();
  const [rows, setRows] = useState<WorkspaceActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyWorkspaceId) {
      setLoading(false);
      setRows([]);
      setError(null);
      return;
    }
    let cancelled = false;
    async function load() {
      const supabase = createClient();
      if (!supabase) {
        if (!cancelled) {
          setLoading(false);
          setRows([]);
          setError(t("dbConnectionError"));
        }
        return;
      }
      setLoading(true);
      setError(null);
      const { data, error: rpcError } = await supabase.rpc("list_company_workspace_activity", {
        p_company_workspace_id: companyWorkspaceId,
        p_limit: 100,
      });
      if (cancelled) return;
      if (rpcError) {
        setRows([]);
        setError(rpcError.message);
      } else {
        setRows((data ?? []) as WorkspaceActivityRow[]);
      }
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [companyWorkspaceId, t]);

  return (
    <Sec title={t("title")} desc={t("description")}>
      {!companyWorkspaceId ? (
        <div className="rounded-lg border border-dashed border-border bg-secondary/20 p-6 text-center text-sm text-muted-foreground">
          {t("noWorkspace")}
        </div>
      ) : loading ? (
        <div className="rounded-lg border border-dashed border-border bg-secondary/20 p-6 text-center text-sm text-muted-foreground">
          {t("loading")}
        </div>
      ) : error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
          {error}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-secondary/20 p-6 text-center text-sm text-muted-foreground">
          {t("empty")}
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => {
            const label = row.actor_name || row.actor_email || t("systemActor");
            const initial = label.charAt(0).toUpperCase();
            const actionLabel = formatActivityActionLabel(row, t);
            const entityLabel = formatActivityEntityLabel(row.entity_type, t);
            return (
              <div
                key={`${row.source}-${row.id}`}
                className="flex items-start gap-3 rounded-lg border border-border bg-secondary/30 p-3"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {initial}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-foreground">{label}</p>
                    <span className="shrink-0 text-[10px] text-muted-foreground" title={new Date(row.created_at).toISOString()}>
                      {formatActivityRelative(row.created_at, locale)}
                    </span>
                  </div>
                  {row.actor_email && row.actor_email !== label && (
                    <p className="text-[10px] text-muted-foreground">{row.actor_email}</p>
                  )}
                  <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-foreground">
                    <span className="inline-flex items-center rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                      {actionLabel}
                    </span>
                    {entityLabel && (
                      <span className="text-muted-foreground">· {entityLabel}</span>
                    )}
                    {row.entity_id && (
                      <span className="truncate text-[10px] text-muted-foreground" title={row.entity_id}>
                        {row.entity_id.slice(0, 8)}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Sec>
  );
}

