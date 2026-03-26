"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import {
  defaultCompanyDirectory,
  loadCompanyDirectory,
  saveCompanyDirectory,
  type CompanyRecord,
} from "@/lib/company-directory";
import { getOverallRiskState } from "@/lib/workplace-status";
import {
  fetchCompaniesFromSupabase,
  fetchArchivedFromSupabase,
  fetchDeletedFromSupabase,
  createCompanyInSupabase,
  archiveCompanyInSupabase,
  restoreCompanyInSupabase,
  deleteCompanyInSupabase,
  permanentDeleteFromSupabase,
} from "@/lib/supabase/company-api";

/* ------------------------------------------------------------------ */
/* Archived / Deleted localStorage helpers (fallback only)             */
/* ------------------------------------------------------------------ */
const ARCHIVED_KEY = "risknova_archived_companies";
const DELETED_KEY = "risknova_deleted_companies";

function loadArchived(): CompanyRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ARCHIVED_KEY);
    return raw ? (JSON.parse(raw) as CompanyRecord[]) : [];
  } catch {
    return [];
  }
}
function saveArchived(list: CompanyRecord[]) {
  localStorage.setItem(ARCHIVED_KEY, JSON.stringify(list));
}
function loadDeleted(): CompanyRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DELETED_KEY);
    return raw ? (JSON.parse(raw) as CompanyRecord[]) : [];
  } catch {
    return [];
  }
}
function saveDeleted(list: CompanyRecord[]) {
  localStorage.setItem(DELETED_KEY, JSON.stringify(list));
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
function createEmptyCompany(): CompanyRecord {
  return {
    id: crypto.randomUUID(),
    name: "Yeni Firma / Kurum",
    shortName: "Yeni Kayıt",
    kind: "Özel Sektör",
    address: "",
    sector: "",
    naceCode: "",
    hazardClass: "",
    employeeCount: 0,
    shiftModel: "",
    phone: "",
    email: "",
    contactPerson: "",
    employerName: "",
    employerRepresentative: "",
    notes: "",
    activeProfessionals: 0,
    employeeRepresentativeCount: 0,
    supportStaffCount: 0,
    openActions: 0,
    overdueActions: 0,
    openRiskAssessments: 0,
    documentCount: 0,
    completionRate: 0,
    maturityScore: 0,
    openRiskScore: 0,
    last30DayImprovement: 0,
    completedTrainingCount: 0,
    expiringTrainingCount: 0,
    periodicControlCount: 0,
    overduePeriodicControlCount: 0,
    lastAnalysisDate: "",
    lastInspectionDate: "",
    lastDrillDate: "",
    locations: [""],
    departments: [""],
  };
}

function riskBadgeVariant(label: string): "success" | "warning" | "danger" | "neutral" {
  switch (label) {
    case "Kritik":
      return "danger";
    case "Yüksek":
    case "Orta":
      return "warning";
    case "Kontrollü":
      return "success";
    default:
      return "neutral";
  }
}

function hazardBadgeVariant(hc: string): "danger" | "warning" | "success" | "neutral" {
  switch (hc) {
    case "Çok Tehlikeli":
      return "danger";
    case "Tehlikeli":
      return "warning";
    case "Az Tehlikeli":
      return "success";
    default:
      return "neutral";
  }
}

type ViewMode = "active" | "archived" | "deleted";

/* ================================================================== */
/* Component                                                           */
/* ================================================================== */
export function CompaniesListClient() {
  const router = useRouter();

  /* Hydration-safe: defer all reads to client via useEffect */
  const [mounted, setMounted] = useState(false);
  const [companies, setCompanies] = useState<CompanyRecord[]>([]);
  const [archivedCompanies, setArchivedCompanies] = useState<CompanyRecord[]>([]);
  const [deletedCompanies, setDeletedCompanies] = useState<CompanyRecord[]>([]);
  const [dataSource, setDataSource] = useState<"supabase" | "local">("local");

  /**
   * Load data: try Supabase first, fall back to localStorage.
   * This is the single source-of-truth loading function.
   */
  const loadAllData = useCallback(async () => {
    // Try Supabase first
    const [sbActive, sbArchived, sbDeleted] = await Promise.all([
      fetchCompaniesFromSupabase(),
      fetchArchivedFromSupabase(),
      fetchDeletedFromSupabase(),
    ]);

    if (sbActive !== null) {
      // Supabase is available and returned data
      setCompanies(sbActive);
      setArchivedCompanies(sbArchived ?? []);
      setDeletedCompanies(sbDeleted ?? []);
      setDataSource("supabase");

      // Sync to localStorage as backup
      saveCompanyDirectory(sbActive);
      saveArchived(sbArchived ?? []);
      saveDeleted(sbDeleted ?? []);
    } else {
      // Supabase unavailable — use localStorage
      setCompanies(loadCompanyDirectory());
      setArchivedCompanies(loadArchived());
      setDeletedCompanies(loadDeleted());
      setDataSource("local");
    }
  }, []);

  /** Reload from localStorage only (for immediate UI updates after mutations) */
  const reloadLocal = useCallback(() => {
    setCompanies(loadCompanyDirectory());
    setArchivedCompanies(loadArchived());
    setDeletedCompanies(loadDeleted());
  }, []);

  /* Initial load on mount */
  useEffect(() => {
    void loadAllData().then(() => setMounted(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [viewMode, setViewMode] = useState<ViewMode>("active");
  const [search, setSearch] = useState("");
  const [hazardFilter, setHazardFilter] = useState("");
  const [sectorFilter, setSectorFilter] = useState("");
  const [confirmingArchiveId, setConfirmingArchiveId] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const sectors = useMemo(() => {
    const set = new Set<string>();
    for (const c of companies) { if (c.sector) set.add(c.sector); }
    return Array.from(set).sort();
  }, [companies]);

  const sourceList = viewMode === "active" ? companies : viewMode === "archived" ? archivedCompanies : deletedCompanies;

  const filteredCompanies = useMemo(() => {
    const q = search.toLowerCase().trim();
    return sourceList.filter((c) => {
      const hay = [c.name, c.shortName, c.kind, c.sector, c.address, c.naceCode].join(" ").toLowerCase();
      return (!q || hay.includes(q)) && (!hazardFilter || c.hazardClass === hazardFilter) && (!sectorFilter || c.sector === sectorFilter);
    });
  }, [sourceList, search, hazardFilter, sectorFilter]);

  const stats = useMemo(() => {
    const te = companies.reduce((s, c) => s + c.employeeCount, 0);
    const cr = companies.filter((c) => getOverallRiskState(c).label === "Kritik").length;
    const am = companies.length > 0 ? Math.round(companies.reduce((s, c) => s + c.maturityScore, 0) / companies.length) : 0;
    const oa = companies.reduce((s, c) => s + c.openActions, 0);
    const od = companies.reduce((s, c) => s + c.overdueActions, 0);
    return { total: companies.length, employees: te, critical: cr, maturity: am, openActions: oa, overdue: od };
  }, [companies]);

  /* ── Mutations ── */

  async function handleCreate() {
    const n = createEmptyCompany();

    // Try Supabase first
    const sbId = await createCompanyInSupabase(n);
    if (sbId) {
      // Supabase created — reload from Supabase
      await loadAllData();
      router.push(`/companies/${sbId}`);
      return;
    }

    // Fallback: localStorage
    const d = [...loadCompanyDirectory(), n];
    saveCompanyDirectory(d);
    reloadLocal();
    router.push(`/companies/${n.id}`);
  }

  function handleResetDefaults() {
    saveCompanyDirectory(defaultCompanyDirectory);
    reloadLocal();
  }

  function clearFilters() { setSearch(""); setHazardFilter(""); setSectorFilter(""); }

  async function confirmArchive(id: string) {
    // Try Supabase first
    const sbResult = await archiveCompanyInSupabase(id);
    if (sbResult === true) {
      await loadAllData();
      setConfirmingArchiveId(null);
      return;
    }

    // Fallback: localStorage
    const t = companies.find((c) => c.id === id);
    if (!t) return;
    const na = companies.filter((c) => c.id !== id);
    const nv = [...archivedCompanies, t];
    saveCompanyDirectory(na); saveArchived(nv);
    reloadLocal();
    setConfirmingArchiveId(null);
  }

  async function confirmDelete(id: string) {
    // Try Supabase first
    const sbResult = await deleteCompanyInSupabase(id);
    if (sbResult === true) {
      await loadAllData();
      setConfirmingDeleteId(null);
      setDeleteConfirmText("");
      return;
    }

    // Fallback: localStorage
    const t = companies.find((c) => c.id === id);
    if (!t) return;
    const na = companies.filter((c) => c.id !== id);
    const nd = [...deletedCompanies, t];
    saveCompanyDirectory(na); saveDeleted(nd);
    reloadLocal();
    setConfirmingDeleteId(null); setDeleteConfirmText("");
  }

  async function restoreArchivedCompany(id: string) {
    // Try Supabase first
    const sbResult = await restoreCompanyInSupabase(id);
    if (sbResult === true) {
      await loadAllData();
      return;
    }

    // Fallback: localStorage
    const t = archivedCompanies.find((c) => c.id === id);
    if (!t) return;
    const nv = archivedCompanies.filter((c) => c.id !== id);
    const na = [...companies, t];
    saveArchived(nv); saveCompanyDirectory(na);
    reloadLocal();
  }

  async function permanentDelete(id: string) {
    // Try Supabase first
    const sbResult = await permanentDeleteFromSupabase(id);
    if (sbResult === true) {
      await loadAllData();
      return;
    }

    // Fallback: localStorage
    const nd = deletedCompanies.filter((c) => c.id !== id);
    saveDeleted(nd);
    reloadLocal();
  }

  const hasFilters = !!(search || hazardFilter || sectorFilter);

  /* ── Loading state (before client mount) ── */
  if (!mounted) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="İşyeri Yönetimi" title="Firmalar / Kurumlar" description="Her firma için ayrı çalışma alanı açılır. Risk analizi, takip, dokümanlar ve dijital ikiz aynı yapı içinde yönetilir." />
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  /* ── Full empty state ── */
  if (companies.length === 0 && archivedCompanies.length === 0 && deletedCompanies.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="İşyeri Yönetimi" title="Firmalar / Kurumlar" description="Her firma için ayrı çalışma alanı açılır. Risk analizi, takip, dokümanlar ve dijital ikiz aynı yapı içinde yönetilir." />
        <EmptyState
          title="Henüz kayıtlı firma bulunmuyor"
          description="İlk firmanızı oluşturarak İSG çalışma alanınızı başlatın. Varsayılan demo verileri ile de hızlıca başlayabilirsiniz."
          action={
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button type="button" onClick={() => void handleCreate()}>Yeni Firma Oluştur</Button>
              <Button type="button" variant="outline" onClick={handleResetDefaults}>Demo Verileri Yükle</Button>
            </div>
          }
        />
      </div>
    );
  }

  /* ── Render a company card (active view) ── */
  function renderActiveCard(company: CompanyRecord) {
    const risk = getOverallRiskState(company);
    const lc = company.locations.filter(Boolean).length;
    const dc = company.departments.filter(Boolean).length;
    return (
      <div key={company.id} className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] transition-shadow hover:shadow-[var(--shadow-card)]">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-foreground">{company.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{company.kind}{company.sector ? ` · ${company.sector}` : ""}{company.address ? ` · ${company.address}` : ""}</p>
            </div>
            <Badge variant={riskBadgeVariant(risk.label)} className="shrink-0">{risk.label}{risk.score !== null ? ` · ${risk.score}/100` : ""}</Badge>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
            <div className="rounded-xl border border-border bg-muted/50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Tehlike</p>
              <div className="mt-1">{company.hazardClass ? <Badge variant={hazardBadgeVariant(company.hazardClass)} className="text-[10px]">{company.hazardClass}</Badge> : <span className="text-sm text-muted-foreground">—</span>}</div>
            </div>
            <div className="rounded-xl border border-border bg-muted/50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Çalışan</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{company.employeeCount}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Açık Aksiyon</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{company.openActions}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Geciken</p>
              <p className={`mt-1 text-sm font-semibold ${company.overdueActions > 0 ? "text-red-600" : "text-foreground"}`}>{company.overdueActions}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Lokasyon</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{lc}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Bölüm</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{dc}</p>
            </div>
          </div>

          {/* NACE & date */}
          {(company.naceCode || company.lastAnalysisDate) ? (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
              {company.naceCode ? <span className="text-xs text-muted-foreground">NACE: <span className="font-semibold text-foreground">{company.naceCode}</span></span> : null}
              {company.lastAnalysisDate ? <span className="text-xs text-muted-foreground">Son analiz: <span className="font-semibold text-foreground">{new Date(company.lastAnalysisDate).toLocaleDateString("tr-TR")}</span></span> : null}
            </div>
          ) : null}

          {/* Progress bars */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Kapsam:</span>
              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(company.completionRate, 100)}%` }} /></div>
              <span className="text-xs font-semibold text-foreground">%{company.completionRate}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Olgunluk:</span>
              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-accent transition-all" style={{ width: `${Math.min(company.maturityScore, 100)}%` }} /></div>
              <span className="text-xs font-semibold text-foreground">%{company.maturityScore}</span>
            </div>
            {company.documentCount > 0 ? <span className="text-xs text-muted-foreground">{company.documentCount} doküman</span> : null}
          </div>

          {/* Description */}
          <p className="text-sm leading-relaxed text-muted-foreground">{risk.description}</p>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
            <Link href={`/companies/${company.id}`} className="inline-flex h-9 items-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground shadow-[var(--shadow-soft)] transition-opacity hover:opacity-95">Çalışma Alanını Aç</Link>
            <Link href="/risk-analysis" className="inline-flex h-9 items-center rounded-xl border border-border bg-card px-3 text-sm font-medium text-foreground hover:bg-secondary">Risk Analizi</Link>
            <Link href="/reports" className="inline-flex h-9 items-center rounded-xl border border-border bg-card px-3 text-sm font-medium text-foreground hover:bg-secondary">Dokümanlar</Link>
            <div className="ml-auto flex items-center gap-1.5">
              <button type="button" onClick={() => { setConfirmingArchiveId(company.id); setConfirmingDeleteId(null); setDeleteConfirmText(""); }} className="inline-flex h-7 items-center rounded-lg border border-amber-200 bg-amber-50 px-2 text-[11px] font-medium text-amber-700 hover:bg-amber-100">Arşivle</button>
              <button type="button" onClick={() => { setConfirmingDeleteId(company.id); setConfirmingArchiveId(null); setDeleteConfirmText(""); }} className="inline-flex h-7 items-center rounded-lg border border-red-200 bg-red-50 px-2 text-[11px] font-medium text-red-700 hover:bg-red-100">Sil</button>
            </div>
          </div>

          {/* Archive confirmation */}
          {confirmingArchiveId === company.id ? (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/80 p-4">
              <p className="text-sm font-semibold text-amber-900">&ldquo;{company.name}&rdquo; arşive alınsın mı?</p>
              <p className="mt-2 text-sm leading-relaxed text-amber-800">Bu firma aktif çalışma listesinden ayrılacak ve arşiv alanına taşınacaktır. Geçmiş verileri korunur ve ihtiyaç halinde tekrar geri yüklenebilir.</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button type="button" size="sm" onClick={() => void confirmArchive(company.id)}>Arşivlemeyi Onayla</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setConfirmingArchiveId(null)}>Vazgeç</Button>
              </div>
            </div>
          ) : null}

          {/* Delete confirmation */}
          {confirmingDeleteId === company.id ? (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50/80 p-4">
              <p className="text-sm font-semibold text-red-900">&ldquo;{company.name}&rdquo; kaydını silme onayı</p>
              <p className="mt-2 text-sm leading-relaxed text-red-800">Bu işlem geri alınamaz. Firma kaydı kalıcı olarak silinecektir. Arşivlemeden farklı olarak, silme yıkıcı bir işlemdir.</p>
              <p className="mt-2 text-sm text-red-800">Onay için aşağıya <span className="font-bold">SİL</span> yazın:</p>
              <input value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} placeholder='Onay için "SİL" yazın' className="mt-2 h-9 w-full max-w-xs rounded-lg border border-red-300 bg-white px-3 text-sm text-slate-900" />
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button type="button" disabled={deleteConfirmText.trim() !== "SİL"} onClick={() => void confirmDelete(company.id)} className={`inline-flex h-8 items-center rounded-lg px-4 text-sm font-medium text-white transition-colors ${deleteConfirmText.trim() === "SİL" ? "bg-red-600 hover:bg-red-700" : "cursor-not-allowed bg-red-300"}`}>Silmeyi Onayla</button>
                <Button type="button" variant="outline" size="sm" onClick={() => { setConfirmingDeleteId(null); setDeleteConfirmText(""); }}>Vazgeç</Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  /* ── Main view ── */
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="İşyeri Yönetimi"
        title="Firmalar / Kurumlar"
        description="Her firma için ayrı çalışma alanı açılır. Risk analizi, takip, dokümanlar ve dijital ikiz aynı yapı içinde yönetilir."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" onClick={() => void handleCreate()}>Yeni Firma Oluştur</Button>
            <Button type="button" variant="outline" onClick={handleResetDefaults}>Varsayılan Liste</Button>
            {dataSource === "supabase" ? (
              <Badge variant="success" className="text-[10px]">Supabase</Badge>
            ) : (
              <Badge variant="neutral" className="text-[10px]">Yerel Depolama</Badge>
            )}
          </div>
        }
      />

      {/* View mode tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setViewMode("active")} className={`inline-flex h-10 items-center rounded-xl px-4 text-sm font-medium transition-colors ${viewMode === "active" ? "bg-primary text-primary-foreground shadow-[var(--shadow-soft)]" : "border border-border bg-card text-muted-foreground hover:bg-secondary"}`}>
          Aktif Firmalar <span className="ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white/20 px-1.5 text-xs font-semibold">{companies.length}</span>
        </button>
        <button type="button" onClick={() => setViewMode("archived")} className={`inline-flex h-10 items-center rounded-xl px-4 text-sm font-medium transition-colors ${viewMode === "archived" ? "bg-amber-600 text-white shadow-[var(--shadow-soft)]" : "border border-border bg-card text-muted-foreground hover:bg-secondary"}`}>
          Arşivlenen {archivedCompanies.length > 0 ? <span className="ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white/20 px-1.5 text-xs font-semibold">{archivedCompanies.length}</span> : null}
        </button>
        <button type="button" onClick={() => setViewMode("deleted")} className={`inline-flex h-10 items-center rounded-xl px-4 text-sm font-medium transition-colors ${viewMode === "deleted" ? "bg-red-600 text-white shadow-[var(--shadow-soft)]" : "border border-border bg-card text-muted-foreground hover:bg-secondary"}`}>
          Silinen {deletedCompanies.length > 0 ? <span className="ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white/20 px-1.5 text-xs font-semibold">{deletedCompanies.length}</span> : null}
        </button>
      </div>

      {/* Stats — active only */}
      {viewMode === "active" ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Toplam Firma</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{stats.total}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Toplam Çalışan</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{stats.employees}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Kritik İşyeri</p>
            <p className={`mt-2 text-2xl font-semibold ${stats.critical > 0 ? "text-red-600" : "text-foreground"}`}>{stats.critical}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Açık Aksiyon</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{stats.openActions}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Geciken İş</p>
            <p className={`mt-2 text-2xl font-semibold ${stats.overdue > 0 ? "text-red-600" : "text-foreground"}`}>{stats.overdue}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Ort. Olgunluk</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">%{stats.maturity}</p>
          </div>
        </div>
      ) : null}

      {/* Search & Filters */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_180px_180px]">
          <Input label="Firma ara" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ad, sektör, tür, adres veya NACE kodu ile ara" />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Tehlike sınıfı</label>
            <select value={hazardFilter} onChange={(e) => setHazardFilter(e.target.value)} className="h-11 rounded-xl border border-border bg-input px-3 text-sm text-foreground shadow-[var(--shadow-soft)]">
              <option value="">Tümü</option>
              <option value="Az Tehlikeli">Az Tehlikeli</option>
              <option value="Tehlikeli">Tehlikeli</option>
              <option value="Çok Tehlikeli">Çok Tehlikeli</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Sektör</label>
            <select value={sectorFilter} onChange={(e) => setSectorFilter(e.target.value)} className="h-11 rounded-xl border border-border bg-input px-3 text-sm text-foreground shadow-[var(--shadow-soft)]">
              <option value="">Tümü</option>
              {sectors.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <p className="text-sm text-muted-foreground">{filteredCompanies.length} / {sourceList.length} firma gösteriliyor</p>
          {hasFilters ? <button type="button" onClick={clearFilters} className="text-sm font-medium text-primary hover:underline">Filtreleri temizle</button> : null}
        </div>
      </div>

      {/* ── ACTIVE VIEW ── */}
      {viewMode === "active" ? (
        filteredCompanies.length > 0 ? (
          <div className="grid gap-5 xl:grid-cols-2">{filteredCompanies.map(renderActiveCard)}</div>
        ) : (
          <EmptyState title="Eşleşen firma bulunamadı" description="Arama veya filtreleme kriterlerinize uygun firma kaydı bulunamadı." action={<Button type="button" variant="outline" onClick={clearFilters}>Filtreleri Temizle</Button>} />
        )
      ) : null}

      {/* ── ARCHIVED VIEW ── */}
      {viewMode === "archived" ? (
        filteredCompanies.length > 0 ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-amber-200 bg-amber-50/60 px-5 py-4">
              <p className="text-sm font-medium text-amber-800">Arşivlenen firmalar aktif listeden ayrılmıştır. Geçmiş verileri korunur ve ihtiyaç halinde geri yüklenebilir.</p>
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              {filteredCompanies.map((c) => (
                <div key={c.id} className="rounded-2xl border border-amber-200 bg-card p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-semibold text-foreground">{c.name}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{c.kind}{c.sector ? ` · ${c.sector}` : ""}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{c.employeeCount} çalışan · {c.hazardClass || "Tehlike sınıfı yok"}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Button type="button" size="sm" onClick={() => void restoreArchivedCompany(c.id)}>Geri Yükle</Button>
                      <Badge variant="warning">Arşivde</Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <EmptyState title="Arşivde firma bulunmuyor" description="Henüz arşivlenmiş firma kaydı yok. Aktif firmalardan arşivleme yapabilirsiniz." />
        )
      ) : null}

      {/* ── DELETED VIEW ── */}
      {viewMode === "deleted" ? (
        filteredCompanies.length > 0 ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-red-200 bg-red-50/60 px-5 py-4">
              <p className="text-sm font-medium text-red-800">Silinen firmalar burada listelenir. Kalıcı silme işlemi geri alınamaz.</p>
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              {filteredCompanies.map((c) => (
                <div key={c.id} className="rounded-2xl border border-red-200 bg-card p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-semibold text-foreground">{c.name}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{c.kind}{c.sector ? ` · ${c.sector}` : ""}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{c.employeeCount} çalışan · {c.hazardClass || "Tehlike sınıfı yok"}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button type="button" onClick={() => void permanentDelete(c.id)} className="inline-flex h-8 items-center rounded-lg border border-red-300 bg-red-50 px-3 text-xs font-medium text-red-700 hover:bg-red-100">Kalıcı Sil</button>
                      <Badge variant="danger">Silindi</Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <EmptyState title="Silinen firma bulunmuyor" description="Henüz silinmiş firma kaydı yok." />
        )
      ) : null}
    </div>
  );
}
