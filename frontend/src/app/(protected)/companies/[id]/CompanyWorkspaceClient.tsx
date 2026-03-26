"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { loadCompanyDirectory, saveCompanyDirectory, type CompanyRecord } from "@/lib/company-directory";
import { getGuidedTasks, getOverallRiskState, getReminderItems } from "@/lib/workplace-status";
import { CompanySharedOpsPanel } from "@/components/companies/CompanySharedOpsPanel";
import { CompanyManagementActions } from "@/components/companies/CompanyManagementActions";
import { InviteProfessionalModal } from "@/components/companies/InviteProfessionalModal";
import { PersonnelManagementPanel } from "@/components/companies/PersonnelManagementPanel";
import {
  fetchCompaniesFromSupabase,
  saveCompanyToSupabase,
  archiveCompanyInSupabase,
  deleteCompanyInSupabase,
} from "@/lib/supabase/company-api";

/* ------------------------------------------------------------------ */
/* Archived / Deleted localStorage helpers (fallback only)             */
/* ------------------------------------------------------------------ */
const ARCHIVED_KEY = "risknova_archived_companies";
const DELETED_KEY = "risknova_deleted_companies";
function loadArchivedCompanies(): CompanyRecord[] {
  if (typeof window === "undefined") return [];
  try { const r = localStorage.getItem(ARCHIVED_KEY); return r ? (JSON.parse(r) as CompanyRecord[]) : []; } catch { return []; }
}
function saveArchivedCompanies(list: CompanyRecord[]) { localStorage.setItem(ARCHIVED_KEY, JSON.stringify(list)); }
function loadDeletedCompanies(): CompanyRecord[] {
  if (typeof window === "undefined") return [];
  try { const r = localStorage.getItem(DELETED_KEY); return r ? (JSON.parse(r) as CompanyRecord[]) : []; } catch { return []; }
}
function saveDeletedCompanies(list: CompanyRecord[]) { localStorage.setItem(DELETED_KEY, JSON.stringify(list)); }

type WTab = "overview"|"structure"|"risk"|"people"|"personnel"|"tracking"|"documents"|"organization"|"history"|"digital_twin";

const fc = () => "h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-[0_4px_20px_rgba(15,23,42,0.03)]";
const sc = () => "rounded-[28px] border border-slate-200/80 bg-white/88 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.05)] backdrop-blur sm:p-6";
const tc = () => "rounded-[22px] border border-slate-200 bg-slate-50/70 p-4";

function rbv(l: string): "danger"|"warning"|"success"|"neutral" {
  if (l === "Kritik") return "danger";
  if (l === "Yüksek" || l === "Orta") return "warning";
  if (l === "Kontrollü") return "success";
  return "neutral";
}

function mockDocs(c: CompanyRecord) {
  const n = c.shortName || c.name;
  return [
    { title: `${n} Risk Analizi Raporu`, type: "Risk Analizi", status: "Güncel", v: "success" as const },
    { title: `${n} Acil Durum Planı`, type: "Acil Durum", status: "Kontrol Gerekli", v: "warning" as const },
    { title: `${n} Eğitim Planı`, type: "Eğitim", status: "Aktif", v: "success" as const },
    { title: `${n} Periyodik Kontrol Takibi`, type: "Periyodik Kontrol", status: "İzleniyor", v: "neutral" as const },
  ];
}

function mockActs(c: CompanyRecord) {
  const n = c.shortName || c.name;
  return [
    { actor: "Mehmet Yıldırım", role: "İş Güvenliği Uzmanı", action: `${n} için risk analizi gözden geçirildi.`, time: "Bugün · 14:20" },
    { actor: "Ayşe Demir", role: "İşyeri Hekimi", action: "Sağlık gözetimi ve eğitim planı notları güncellendi.", time: "Bugün · 10:05" },
    { actor: "Ali Kaya", role: "İşveren Vekili", action: "2 adet aksiyon için termin onayı verildi.", time: "Dün · 16:40" },
  ];
}

export function CompanyWorkspaceClient({ companyId }: { companyId: string }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [companies, setCompanies] = useState<CompanyRecord[]>([]);
  const [activeTab, setActiveTab] = useState<WTab>("overview");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success"|"error"|"">("");
  const [inviteOpen, setInviteOpen] = useState(false);

  const [dataSource, setDataSource] = useState<"supabase" | "local">("local");

  /* Load data: try Supabase first, fall back to localStorage */
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const sbCompanies = await fetchCompaniesFromSupabase();
      if (cancelled) return;
      if (sbCompanies !== null) {
        setCompanies(sbCompanies);
        setDataSource("supabase");
        // Sync to localStorage as backup
        saveCompanyDirectory(sbCompanies);
      } else {
        setCompanies(loadCompanyDirectory());
        setDataSource("local");
      }
      setMounted(true);
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  const company = useMemo(() => companies.find((c) => c.id === companyId) ?? null, [companies, companyId]);
  const risk = useMemo(() => (company ? getOverallRiskState(company) : null), [company]);
  const tasks = useMemo(() => (company ? getGuidedTasks(company) : []), [company]);
  const reminders = useMemo(() => (company ? getReminderItems(company) : []), [company]);
  const docs = useMemo(() => (company ? mockDocs(company) : []), [company]);
  const acts = useMemo(() => (company ? mockActs(company) : []), [company]);

  type TF = "name"|"shortName"|"kind"|"address"|"sector"|"naceCode"|"hazardClass"|"shiftModel"|"phone"|"email"|"contactPerson"|"employerName"|"employerRepresentative"|"notes"|"lastAnalysisDate"|"lastInspectionDate"|"lastDrillDate";
  type NF = "employeeCount"|"activeProfessionals"|"employeeRepresentativeCount"|"supportStaffCount"|"openActions"|"overdueActions"|"openRiskAssessments"|"documentCount"|"completionRate"|"maturityScore"|"openRiskScore"|"last30DayImprovement"|"completedTrainingCount"|"expiringTrainingCount"|"periodicControlCount"|"overduePeriodicControlCount";

  const clr = () => { setMessage(""); setMessageType(""); };
  const utx = (f: TF, v: string) => { setCompanies((p) => p.map((c) => c.id === companyId ? { ...c, [f]: v } : c)); clr(); };
  const unm = (f: NF, v: number) => { setCompanies((p) => p.map((c) => c.id === companyId ? { ...c, [f]: Number.isFinite(v) ? v : 0 } : c)); clr(); };
  const uar = (f: "locations"|"departments", i: number, v: string) => { setCompanies((p) => p.map((c) => { if (c.id !== companyId) return c; const n = [...c[f]]; n[i] = v; return { ...c, [f]: n }; })); clr(); };
  const aar = (f: "locations"|"departments") => { setCompanies((p) => p.map((c) => c.id === companyId ? { ...c, [f]: [...c[f], ""] } : c)); clr(); };
  const rar = (f: "locations"|"departments", i: number) => { setCompanies((p) => p.map((c) => { if (c.id !== companyId) return c; const n = c[f].filter((_, j) => j !== i); return { ...c, [f]: n.length > 0 ? n : [""] }; })); clr(); };

  const handleSave = async () => {
    if (!company) return;
    if (!company.name.trim()) { setMessage("Firma / kurum adı boş bırakılamaz."); setMessageType("error"); return; }

    // Always save to localStorage
    saveCompanyDirectory(companies);

    // Try Supabase
    if (dataSource === "supabase") {
      const sbResult = await saveCompanyToSupabase(company);
      if (sbResult === true) {
        setMessage("İşyeri çalışma alanı bilgileri kaydedildi. (Supabase)");
        setMessageType("success");
        return;
      }
    }

    setMessage("İşyeri çalışma alanı bilgileri kaydedildi.");
    setMessageType("success");
  };

  const handleArchive = async () => {
    // Try Supabase first
    if (dataSource === "supabase") {
      const sbResult = await archiveCompanyInSupabase(companyId);
      if (sbResult === true) {
        router.push("/companies");
        return;
      }
    }

    // Fallback: localStorage
    const target = companies.find((c) => c.id === companyId);
    const nextActive = companies.filter((c) => c.id !== companyId);
    saveCompanyDirectory(nextActive);
    if (target) { const archived = loadArchivedCompanies(); saveArchivedCompanies([...archived, target]); }
    router.push("/companies");
  };

  const handleDelete = async () => {
    // Try Supabase first
    if (dataSource === "supabase") {
      const sbResult = await deleteCompanyInSupabase(companyId);
      if (sbResult === true) {
        router.push("/companies");
        return;
      }
    }

    // Fallback: localStorage
    const target = companies.find((c) => c.id === companyId);
    const nextActive = companies.filter((c) => c.id !== companyId);
    saveCompanyDirectory(nextActive);
    if (target) { const deleted = loadDeletedCompanies(); saveDeletedCompanies([...deleted, target]); }
    router.push("/companies");
  };
  const onSharedLink = useCallback((payload: { sharedCompanyCode?: string; sharedCompanyIdentityId?: string; sharedWorkspaceId?: string }) => {
    if (!payload.sharedCompanyCode && !payload.sharedCompanyIdentityId && !payload.sharedWorkspaceId) return;
    setMessage(`Ortak firma bağlantısı güncellendi${payload.sharedCompanyCode ? ` · Kod: ${payload.sharedCompanyCode}` : ""}`);
    setMessageType("success");
  }, []);
  const handleInviteSubmit = useCallback((payload: { email: string; permissions: Record<string, string> }) => {
    setInviteOpen(false);
    setMessage(`${payload.email} adresine davet hazırlandı. Paylaşım tercihleri kaydedildi.`);
    setMessageType("success");
  }, []);

  const tabList: Array<{ id: WTab; label: string }> = [
    { id: "overview", label: "Genel Durum" }, { id: "structure", label: "Yerleşke / Yapı" },
    { id: "risk", label: "Risk ve Saha" }, { id: "people", label: "Kadro / Roller" },
    { id: "personnel", label: "Personel Yönetimi" },
    { id: "tracking", label: "Takip" }, { id: "documents", label: "Dokümanlar" },
    { id: "organization", label: "Organizasyon" }, { id: "history", label: "Geçmiş" },
    { id: "digital_twin", label: "Dijital İkiz" },
  ];

  /* Show loading skeleton until client-side data is ready */
  if (!mounted) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_24px_60px_rgba(15,23,42,0.06)]">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-primary" />
          <p className="mt-4 text-sm text-slate-500">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_24px_60px_rgba(15,23,42,0.06)]">
        <h1 className="text-3xl font-semibold text-slate-950">Kayıt bulunamadı</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">İstenen firma / kurum kaydı bulunamadı veya silinmiş olabilir.</p>
        <Link href="/companies" className="mt-6 inline-flex h-11 items-center justify-center rounded-2xl bg-primary px-5 text-sm font-medium text-primary-foreground shadow-[var(--shadow-soft)] transition-opacity hover:opacity-95">Firma listesine dön</Link>
      </div>
    );
  }

  const lc = company.locations.filter(Boolean).length;
  const dc = company.departments.filter(Boolean).length;

  /* ---- Tab content renderers ---- */

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Quick-glance operational summary */}
      <div className="rounded-[24px] border border-blue-100 bg-blue-50/40 p-5">
        <h3 className="mb-3 text-base font-semibold text-slate-950">Operasyonel Özet</h3>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Kapsam Oranı</p>
            <div className="mt-2 flex items-center gap-2">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(company.completionRate, 100)}%` }} /></div>
              <span className="text-sm font-semibold text-slate-950">%{company.completionRate}</span>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Olgunluk Skoru</p>
            <div className="mt-2 flex items-center gap-2">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-accent transition-all" style={{ width: `${Math.min(company.maturityScore, 100)}%` }} /></div>
              <span className="text-sm font-semibold text-slate-950">%{company.maturityScore}</span>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Açık İş Yükü</p>
            <p className="mt-2 text-lg font-semibold text-slate-950">{company.openActions} aksiyon · {company.openRiskAssessments} analiz</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Geciken İşler</p>
            <p className={`mt-2 text-lg font-semibold ${company.overdueActions > 0 ? "text-red-600" : "text-slate-950"}`}>{company.overdueActions} aksiyon · {company.overduePeriodicControlCount} kontrol</p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-4 text-base font-semibold text-slate-950">Firma Kimliği</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Firma / Kurum Adı" value={company.name} onChange={(e) => utx("name", e.target.value)} />
          <Input label="Kısa Ad" value={company.shortName} onChange={(e) => utx("shortName", e.target.value)} />
          <Input label="Tür" value={company.kind} onChange={(e) => utx("kind", e.target.value)} />
          <Input label="Sektör / Faaliyet" value={company.sector} onChange={(e) => utx("sector", e.target.value)} />
          <Input label="NACE Kodu" value={company.naceCode} onChange={(e) => utx("naceCode", e.target.value)} />
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-900">Tehlike sınıfı</label>
            <select value={company.hazardClass} onChange={(e) => utx("hazardClass", e.target.value)} className={fc()}><option value="">Seç</option><option value="Az Tehlikeli">Az Tehlikeli</option><option value="Tehlikeli">Tehlikeli</option><option value="Çok Tehlikeli">Çok Tehlikeli</option></select>
          </div>
        </div>
      </div>
      <div>
        <h3 className="mb-4 text-base font-semibold text-slate-950">İletişim ve Konum</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Adres / İl / Bölge" value={company.address} onChange={(e) => utx("address", e.target.value)} />
          <Input label="Telefon" value={company.phone} onChange={(e) => utx("phone", e.target.value)} />
          <Input label="E-posta" value={company.email} onChange={(e) => utx("email", e.target.value)} />
          <Input label="İletişim Kişisi" value={company.contactPerson} onChange={(e) => utx("contactPerson", e.target.value)} />
        </div>
      </div>
      <div>
        <h3 className="mb-4 text-base font-semibold text-slate-950">Operasyonel Bilgiler</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Çalışan Sayısı" type="number" value={String(company.employeeCount)} onChange={(e) => unm("employeeCount", Number(e.target.value))} />
          <Input label="Vardiya Düzeni" value={company.shiftModel} onChange={(e) => utx("shiftModel", e.target.value)} />
          <Input label="İşveren" value={company.employerName} onChange={(e) => utx("employerName", e.target.value)} />
          <Input label="İşveren Vekili" value={company.employerRepresentative} onChange={(e) => utx("employerRepresentative", e.target.value)} />
        </div>
      </div>
      <Textarea label="Firma / Kurum Notu" rows={4} value={company.notes} onChange={(e) => utx("notes", e.target.value)} />
    </div>
  );

  const renderStructure = () => (
    <div className="space-y-5">
      <p className="text-sm leading-7 text-slate-600">Firmanın fiziksel yerleşke ve organizasyonel yapısını buradan yönetebilirsiniz.</p>
      <div className="grid gap-5 lg:grid-cols-2">
      <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-slate-950">Lokasyonlar</h3>
          <Button type="button" variant="outline" size="sm" onClick={() => aar("locations")}>Lokasyon Ekle</Button>
        </div>
        <div className="space-y-3">{company.locations.map((v, i) => (<div key={`l-${i}`} className="flex gap-2"><input value={v} onChange={(e) => uar("locations", i, e.target.value)} className={fc()} placeholder="Lokasyon adı" /><Button type="button" variant="ghost" size="sm" onClick={() => rar("locations", i)}>Sil</Button></div>))}</div>
      </div>
      <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-slate-950">Bölümler / Birimler</h3>
          <Button type="button" variant="outline" size="sm" onClick={() => aar("departments")}>Bölüm Ekle</Button>
        </div>
        <div className="space-y-3">{company.departments.map((v, i) => (<div key={`d-${i}`} className="flex gap-2"><input value={v} onChange={(e) => uar("departments", i, e.target.value)} className={fc()} placeholder="Bölüm / birim adı" /><Button type="button" variant="ghost" size="sm" onClick={() => rar("departments", i)}>Sil</Button></div>))}</div>
      </div>
    </div>
    </div>
  );

  const renderRisk = () => (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className={tc()}><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Açık Risk Analizi</p><p className="mt-3 text-2xl font-semibold text-slate-950">{company.openRiskAssessments}</p></div>
        <div className={tc()}><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Açık Aksiyon</p><p className="mt-3 text-2xl font-semibold text-slate-950">{company.openActions}</p></div>
        <div className={tc()}><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Gecikmiş Aksiyon</p><p className={`mt-3 text-2xl font-semibold ${company.overdueActions > 0 ? "text-red-600" : "text-slate-950"}`}>{company.overdueActions}</p></div>
        <div className={tc()}><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Açık Risk Baskısı</p><p className="mt-3 text-2xl font-semibold text-slate-950">%{company.openRiskScore}</p></div>
      </div>
      <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-5">
        <h3 className="text-base font-semibold text-slate-950">Risk ve saha yönetimi</h3>
        <p className="mt-3 text-sm leading-7 text-slate-600">Risk analizi, saha tespiti, görsel yükleme ve ileride canlı saha taraması bu işyeri bağlamında çalışır.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/risk-analysis" className="inline-flex h-11 items-center justify-center rounded-2xl bg-primary px-5 text-sm font-medium text-primary-foreground shadow-[var(--shadow-soft)] transition-opacity hover:opacity-95">Risk Analizi Modülüne Git</Link>
          <span className="inline-flex h-11 items-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-500">Canlı Saha Taraması · Yakında</span>
        </div>
      </div>
    </div>
  );

  const renderPeople = () => (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className={tc()}><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Aktif Profesyonel</p><p className="mt-3 text-2xl font-semibold text-slate-950">{company.activeProfessionals}</p><p className="mt-1 text-xs text-slate-500">İSG uzmanı, işyeri hekimi vb.</p></div>
        <div className={tc()}><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Çalışan Temsilcisi</p><p className="mt-3 text-2xl font-semibold text-slate-950">{company.employeeRepresentativeCount}</p><p className="mt-1 text-xs text-slate-500">Seçilmiş temsilciler</p></div>
        <div className={tc()}><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Destek Elemanı</p><p className="mt-3 text-2xl font-semibold text-slate-950">{company.supportStaffCount}</p><p className="mt-1 text-xs text-slate-500">Yardımcı personel</p></div>
        <div className={tc()}><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Toplam Çalışan</p><p className="mt-3 text-2xl font-semibold text-slate-950">{company.employeeCount}</p><p className="mt-1 text-xs text-slate-500">Tüm personel</p></div>
      </div>
      <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-5">
        <h3 className="mb-4 text-base font-semibold text-slate-950">Temsil ve Yönetim Yapısı</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">İşveren</p><p className="mt-2 text-sm font-semibold text-slate-950">{company.employerName || "—"}</p></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">İşveren Vekili</p><p className="mt-2 text-sm font-semibold text-slate-950">{company.employerRepresentative || "—"}</p></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">İletişim Kişisi</p><p className="mt-2 text-sm font-semibold text-slate-950">{company.contactPerson || "—"}</p></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Vardiya Düzeni</p><p className="mt-2 text-sm font-semibold text-slate-950">{company.shiftModel || "—"}</p></div>
        </div>
      </div>
      <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-5">
        <h3 className="mb-4 text-base font-semibold text-slate-950">Personel Sayıları Düzenle</h3>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Input label="Aktif Profesyonel" type="number" value={String(company.activeProfessionals)} onChange={(e) => unm("activeProfessionals", Number(e.target.value))} />
          <Input label="Çalışan Temsilcisi" type="number" value={String(company.employeeRepresentativeCount)} onChange={(e) => unm("employeeRepresentativeCount", Number(e.target.value))} />
          <Input label="Destek Elemanı" type="number" value={String(company.supportStaffCount)} onChange={(e) => unm("supportStaffCount", Number(e.target.value))} />
          <Input label="İletişim Kişisi" value={company.contactPerson} onChange={(e) => utx("contactPerson", e.target.value)} />
        </div>
      </div>
    </div>
  );

  const renderTracking = () => (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className={tc()}><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Tamamlanan Eğitim</p><p className="mt-3 text-2xl font-semibold text-slate-950">{company.completedTrainingCount}</p></div>
        <div className={tc()}><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Yenileme Yaklaşan</p><p className={`mt-3 text-2xl font-semibold ${company.expiringTrainingCount > 0 ? "text-amber-600" : "text-slate-950"}`}>{company.expiringTrainingCount}</p></div>
        <div className={tc()}><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Periyodik Kontrol</p><p className="mt-3 text-2xl font-semibold text-slate-950">{company.periodicControlCount}</p></div>
        <div className={tc()}><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Geciken Kontrol</p><p className={`mt-3 text-2xl font-semibold ${company.overduePeriodicControlCount > 0 ? "text-red-600" : "text-slate-950"}`}>{company.overduePeriodicControlCount}</p></div>
      </div>
      <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-5">
        <h3 className="mb-4 text-base font-semibold text-slate-950">Tarih ve Sayı Bilgileri</h3>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Input label="Son Risk Analizi Tarihi" type="date" value={company.lastAnalysisDate} onChange={(e) => utx("lastAnalysisDate", e.target.value)} />
          <Input label="Son Denetim Tarihi" type="date" value={company.lastInspectionDate} onChange={(e) => utx("lastInspectionDate", e.target.value)} />
          <Input label="Son Tatbikat Tarihi" type="date" value={company.lastDrillDate} onChange={(e) => utx("lastDrillDate", e.target.value)} />
          <Input label="Doküman Sayısı" type="number" value={String(company.documentCount)} onChange={(e) => unm("documentCount", Number(e.target.value))} />
        </div>
      </div>
      <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-5">
        <h3 className="mb-4 text-base font-semibold text-slate-950">Performans Metrikleri</h3>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Input label="Tamamlanma Oranı (%)" type="number" value={String(company.completionRate)} onChange={(e) => unm("completionRate", Number(e.target.value))} />
          <Input label="Olgunluk Skoru (%)" type="number" value={String(company.maturityScore)} onChange={(e) => unm("maturityScore", Number(e.target.value))} />
          <Input label="Açık Risk Skoru (%)" type="number" value={String(company.openRiskScore)} onChange={(e) => unm("openRiskScore", Number(e.target.value))} />
          <Input label="Son 30 Gün İyileşme (%)" type="number" value={String(company.last30DayImprovement)} onChange={(e) => unm("last30DayImprovement", Number(e.target.value))} />
        </div>
      </div>
    </div>
  );

  const renderDocuments = () => (
    <div className="space-y-4">
      <p className="text-sm leading-7 text-slate-600">Firma ile ilişkili dokümanlar, raporlar ve kayıtlar bu alanda listelenir.</p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">{docs.length} doküman kaydı</p>
        <Link href="/reports" className="text-sm font-medium text-primary hover:underline">Tüm dokümanları görüntüle</Link>
      </div>
      {docs.map((d) => (
        <div key={d.title} className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="text-base font-semibold text-slate-950">{d.title}</p><p className="mt-1 text-sm text-slate-600">Tür: {d.type}</p></div>
            <Badge variant={d.v}>{d.status}</Badge>
          </div>
        </div>
      ))}
    </div>
  );

  const renderOrganization = () => (
    <div className="space-y-6">
      {/* Intro */}
      <div className="rounded-[24px] border border-blue-100 bg-blue-50/50 p-5">
        <h3 className="text-base font-semibold text-slate-950">Organizasyon ve Erişim Yönetimi</h3>
        <p className="mt-2 text-sm leading-7 text-slate-600">Bu alan firma için üye yönetimi, erişim talepleri, davetler ve yetki yapılandırmasını içerir. Ortak çalışma kimliği oluşturarak diğer profesyonellerin bu firmaya bağlanmasını sağlayabilirsiniz.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-3 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Üyeler</p>
            <p className="mt-1 text-xs text-slate-600">Firmaya bağlı profesyoneller ve roller</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-3 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Yetkiler</p>
            <p className="mt-1 text-xs text-slate-600">Modül bazlı erişim ve düzenleme hakları</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-3 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Davetler</p>
            <p className="mt-1 text-xs text-slate-600">E-posta ile profesyonel davet gönderimi</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-3 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Talepler</p>
            <p className="mt-1 text-xs text-slate-600">Bekleyen erişim ve katılım talepleri</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button type="button" onClick={() => setInviteOpen(true)}>Profesyonel Davet Et</Button>
        </div>
      </div>

      {/* Shared Ops Panel — members, identity, requests */}
      <CompanySharedOpsPanel company={{ id: company.id, name: company.name, shortName: company.shortName, sector: company.sector, naceCode: company.naceCode, hazardClass: company.hazardClass, address: company.address }} onSharedLinkChange={onSharedLink} />

      {/* Lifecycle Management — archive / delete */}
      <CompanyManagementActions companyName={company.name} onArchiveConfirm={handleArchive} onDeleteConfirm={handleDelete} />
    </div>
  );

  const renderHistory = () => (
    <div className="space-y-4">
      <div className="rounded-[24px] border border-blue-100 bg-blue-50/40 p-4">
        <h3 className="text-sm font-semibold text-slate-950">Denetim İzi ve Aktivite Geçmişi</h3>
        <p className="mt-1 text-sm leading-7 text-slate-600">Firma üzerinde yapılan işlemler ve değişiklikler burada listelenir. Kim, ne zaman, ne değiştirdi bilgisi görünür. İleride tam denetim izi (audit trail) entegrasyonu sağlanacaktır.</p>
      </div>
      {acts.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-slate-300 bg-white px-5 py-6 text-center text-sm text-slate-500">Henüz kayıtlı hareket bulunmuyor.</div>
      ) : null}
      {acts.map((a, i) => (
        <div key={`${a.actor}-${i}`} className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-base font-semibold text-slate-950">{a.actor}</p>
              <p className="mt-0.5 text-sm text-slate-600">{a.role}</p>
            </div>
            <span className="shrink-0 rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-500">{a.time}</span>
          </div>
          <p className="mt-3 text-sm leading-7 text-slate-700">{a.action}</p>
        </div>
      ))}
    </div>
  );

  const renderPersonnel = () => (
    <PersonnelManagementPanel
      companyId={companyId}
      companyName={company.name}
      departments={company.departments}
      locations={company.locations}
    />
  );

  const renderDigitalTwin = () => (
    <div className="space-y-4">
      <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-5">
        <h3 className="text-base font-semibold text-slate-950">Dijital ikiz yaklaşımı</h3>
        <p className="mt-3 text-sm leading-7 text-slate-600">Bu işyeri için dijital ikiz; lokasyon, bölüm, risk analizi, saha taraması, doküman ve işlem geçmişinin tek kurumsal hafızada birleşmesiyle kurulacaktır.</p>
        <p className="mt-2 text-sm leading-7 text-slate-500">Mevcut veriler (lokasyonlar, bölümler, risk analizleri, dokümanlar) dijital ikizin temelini oluşturur. İlerleyen aşamalarda canlı saha taraması ve dinamik risk haritası entegre edilecektir.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[24px] border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Bugün</p>
          <p className="mt-2 text-sm font-semibold text-slate-950">Operasyonel dijital ikiz temeli</p>
          <p className="mt-1 text-xs text-slate-500">{lc} lokasyon · {dc} bölüm · {company.documentCount} doküman</p>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Sonraki Aşama</p>
          <p className="mt-2 text-sm font-semibold text-slate-950">Canlı saha taraması + alan eşleme</p>
          <p className="mt-1 text-xs text-slate-500">Görsel tespit ve saha gözlemi</p>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Nihai Hedef</p>
          <p className="mt-2 text-sm font-semibold text-slate-950">Dinamik risk haritası</p>
          <p className="mt-1 text-xs text-slate-500">Gerçek zamanlı risk görselleştirme</p>
        </div>
      </div>
    </div>
  );

  const tabContent: Record<WTab, () => React.ReactNode> = {
    overview: renderOverview,
    structure: renderStructure,
    risk: renderRisk,
    people: renderPeople,
    personnel: renderPersonnel,
    tracking: renderTracking,
    documents: renderDocuments,
    organization: renderOrganization,
    history: renderHistory,
    digital_twin: renderDigitalTwin,
  };

  return (
    <div className="space-y-6">
      {/* HERO HEADER */}
      <section className="overflow-hidden rounded-[34px] border border-slate-200/80 bg-white/90 shadow-[0_24px_70px_rgba(15,23,42,0.06)]">
        <div className="border-b border-slate-200/70 bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.10),transparent_34%),linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-6 sm:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-4xl space-y-4">
              <span className="inline-flex rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">İşyeri çalışma alanı</span>
              <div className="space-y-3">
                <h1 className="max-w-4xl text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{company.name}</h1>
                <p className="max-w-3xl text-sm leading-8 text-slate-600 sm:text-base">{company.notes || "Bu ekran işyerinin İSG operasyon merkezi olarak kullanılır."}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="neutral">{company.kind || "Tür yok"}</Badge>
                {company.hazardClass ? <Badge variant={company.hazardClass === "Çok Tehlikeli" ? "danger" : company.hazardClass === "Tehlikeli" ? "warning" : "success"}>{company.hazardClass}</Badge> : <Badge variant="neutral">Tehlike sınıfı yok</Badge>}
                <Badge variant="neutral">{company.employeeCount} çalışan</Badge>
                <Badge variant="neutral">{lc} lokasyon</Badge>
                <Badge variant="neutral">{dc} bölüm</Badge>
                {company.sector ? <Badge variant="default">{company.sector}</Badge> : null}
              </div>
              <div className="flex flex-wrap items-center gap-5">
                <div className="flex items-center gap-2"><span className="text-xs font-medium text-slate-500">Kapsam:</span><div className="h-2 w-24 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(company.completionRate, 100)}%` }} /></div><span className="text-xs font-semibold text-slate-900">%{company.completionRate}</span></div>
                <div className="flex items-center gap-2"><span className="text-xs font-medium text-slate-500">Olgunluk:</span><div className="h-2 w-24 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-accent transition-all" style={{ width: `${Math.min(company.maturityScore, 100)}%` }} /></div><span className="text-xs font-semibold text-slate-900">%{company.maturityScore}</span></div>
                {company.last30DayImprovement > 0 ? <span className="text-xs font-medium text-emerald-600">↑ Son 30 gün: +%{company.last30DayImprovement}</span> : null}
              </div>
            </div>
            <div className="flex flex-wrap gap-3 xl:justify-end">
              <Link href="/risk-analysis" className="inline-flex h-11 items-center justify-center rounded-2xl bg-primary px-5 text-sm font-medium text-primary-foreground shadow-[var(--shadow-soft)] transition-opacity hover:opacity-95">Risk Analizi Başlat</Link>
              <Link href="/reports" className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">Dokümanlar</Link>
              <Link href="/companies" className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">Listeye Dön</Link>
            </div>
          </div>
        </div>
        {/* Top metrics strip */}
        <div className="grid gap-0 sm:grid-cols-2 xl:grid-cols-5">
          <div className="border-b border-slate-200/70 p-5 sm:border-r xl:border-b-0"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Genel Durum</p><div className="mt-3">{risk ? <Badge variant={rbv(risk.label)}>{risk.label}{risk.score !== null ? ` · ${risk.score}/100` : ""}</Badge> : null}</div></div>
          <div className="border-b border-slate-200/70 p-5 xl:border-b-0 xl:border-r"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Açık Aksiyon</p><p className="mt-3 text-2xl font-semibold text-slate-950">{company.openActions}</p></div>
          <div className="border-b border-slate-200/70 p-5 sm:border-r xl:border-b-0"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Geciken İş</p><p className={`mt-3 text-2xl font-semibold ${company.overdueActions > 0 ? "text-red-600" : "text-slate-950"}`}>{company.overdueActions}</p></div>
          <div className="border-b border-slate-200/70 p-5 xl:border-b-0 xl:border-r"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Açık Risk Analizi</p><p className="mt-3 text-2xl font-semibold text-slate-950">{company.openRiskAssessments}</p></div>
          <div className="p-5"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Son Risk Analizi</p><p className="mt-3 text-base font-semibold text-slate-950">{company.lastAnalysisDate || "—"}</p></div>
        </div>
      </section>

      {/* MAIN GRID */}
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="space-y-6">
          {/* Guided Tasks */}
          <div className={sc()}>
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div><h2 className="text-2xl font-semibold text-slate-950">Bugün ne yapmalıyım?</h2><p className="mt-2 text-sm leading-7 text-slate-600">Sistem bu işyeri için öncelikli işleri öne çıkarır.</p></div>
              {risk ? <Badge variant={rbv(risk.label)} className="shrink-0">{risk.label}{risk.score !== null ? ` · ${risk.score}/100` : ""}</Badge> : null}
            </div>
            <div className="space-y-4">
              {tasks.map((t, i) => (
                <div key={`${t.title}-${i}`} className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0 flex-1 space-y-2">
                      <Badge variant={t.priority === "high" ? "danger" : t.priority === "medium" ? "warning" : "success"}>{t.priority === "high" ? "Yüksek Öncelik" : t.priority === "medium" ? "Orta Öncelik" : "Düşük Öncelik"}</Badge>
                      <p className="text-base font-semibold text-slate-950">{t.title}</p>
                      <p className="text-sm leading-7 text-slate-600">{t.description}</p>
                    </div>
                    <Link href={t.href} className="inline-flex h-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">{t.actionLabel}</Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tab Section */}
          <div className={sc()}>
            <div className="mb-5 flex flex-wrap gap-2">
              {tabList.map((tab) => (
                <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`inline-flex h-10 items-center rounded-2xl px-4 text-sm font-medium transition-colors ${activeTab === tab.id ? "bg-primary text-primary-foreground shadow-[var(--shadow-soft)]" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-950"}`}>{tab.label}</button>
              ))}
            </div>

            {tabContent[activeTab]()}

            {/* Save & Back */}
            <div className="mt-6 flex flex-wrap gap-3">
              <Button type="button" size="lg" onClick={() => void handleSave()}>Değişiklikleri Kaydet</Button>
              <Link href="/companies" className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 text-base font-medium text-slate-700 transition-colors hover:bg-slate-50">Listeye Dön</Link>
            </div>
            {message ? <div className={`mt-5 rounded-2xl px-4 py-3 text-sm font-medium ${messageType === "success" ? "border border-green-200 bg-green-50 text-green-700" : "border border-red-200 bg-red-50 text-red-700"}`}>{message}</div> : null}
          </div>
        </section>

        {/* SIDEBAR */}
        <aside className="space-y-6">
          {risk ? (
            <div className={sc()}>
              <h2 className="text-xl font-semibold text-slate-950">İşyeri Durumu</h2>
              <div className="mt-4"><Badge variant={rbv(risk.label)}>{risk.label}{risk.score !== null ? ` · ${risk.score}/100` : ""}</Badge></div>
              <p className="mt-4 text-sm leading-7 text-slate-600">{risk.description}</p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className={tc()}><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Yapısal Risk</p><p className="mt-2 text-xl font-semibold text-slate-950">{risk.structural}/100</p></div>
                <div className={tc()}><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Kapsam</p><p className="mt-2 text-xl font-semibold text-slate-950">%{risk.coverage}</p></div>
                <div className={tc()}><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Olgunluk</p><p className="mt-2 text-xl font-semibold text-slate-950">%{risk.maturity}</p></div>
                <div className={tc()}><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Açık Risk Baskısı</p><p className="mt-2 text-xl font-semibold text-slate-950">%{risk.openPressure}</p></div>
              </div>
            </div>
          ) : null}

          {/* Document Status */}
          <div className={sc()}>
            <h2 className="text-xl font-semibold text-slate-950">Doküman Durumu</h2>
            <div className="mt-4 space-y-3">
              {docs.map((d) => (
                <div key={d.title} className="flex items-center justify-between gap-3 rounded-[22px] border border-slate-200 bg-slate-50/70 px-4 py-3">
                  <p className="min-w-0 truncate text-sm font-medium text-slate-700">{d.type}</p>
                  <Badge variant={d.v} className="shrink-0">{d.status}</Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Reminders */}
          <div className={sc()}>
            <h2 className="text-xl font-semibold text-slate-950">Yaklaşan İşler</h2>
            <div className="mt-4 space-y-3">
              {reminders.map((r, i) => (
                <div key={`r-${i}`} className="rounded-[22px] border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm leading-7 text-slate-700">{r}</div>
              ))}
            </div>
          </div>

          {/* Collaboration Summary */}
          <div className={sc()}>
            <h2 className="text-xl font-semibold text-slate-950">Ortak Çalışma</h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">Bu firma birden fazla profesyonel tarafından yönetilebilir. Üye, davet ve yetki yönetimi için Organizasyon sekmesini kullanın.</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-[18px] border border-slate-200 bg-slate-50/70 p-3 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Profesyonel</p>
                <p className="mt-1 text-lg font-semibold text-slate-950">{company.activeProfessionals}</p>
              </div>
              <div className="rounded-[18px] border border-slate-200 bg-slate-50/70 p-3 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Çalışan</p>
                <p className="mt-1 text-lg font-semibold text-slate-950">{company.employeeCount}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => setInviteOpen(true)} className="inline-flex h-9 items-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground shadow-[var(--shadow-soft)] transition-opacity hover:opacity-95">Davet Et</button>
              <button type="button" onClick={() => setActiveTab("organization")} className="inline-flex h-9 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">Organizasyon</button>
            </div>
          </div>

          {/* Recent Activity / Audit Trail */}
          <div className={sc()}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-slate-950">Denetim İzi</h2>
              <button type="button" onClick={() => setActiveTab("history")} className="text-xs font-medium text-primary hover:underline">Tümünü Gör</button>
            </div>
            <p className="mt-1 text-xs text-slate-500">Kim, ne zaman, ne değiştirdi</p>
            <div className="mt-4 space-y-3">
              {acts.map((a, i) => (
                <div key={`sa-${i}`} className="rounded-[22px] border border-slate-200 bg-slate-50/70 px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-950">{a.actor}</p>
                    <span className="shrink-0 text-[10px] font-medium text-slate-400">{a.time}</span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-500">{a.role}</p>
                  <p className="mt-2 text-sm leading-7 text-slate-700">{a.action}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* Invite Modal */}
      <InviteProfessionalModal open={inviteOpen} onClose={() => setInviteOpen(false)} onSubmit={handleInviteSubmit} />
    </div>
  );
}
