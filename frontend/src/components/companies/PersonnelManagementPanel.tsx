"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocale, useTranslations } from "next-intl";
import { Users, Plus, Download, Upload, FileDown, AlertTriangle, Stethoscope, Baby, Accessibility, Globe, Clock, Moon, HeartPulse, Milk, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PremiumIconBadge, type PremiumIconTone } from "@/components/ui/premium-icon-badge";

const SPECIAL_ICONS: Record<string, { icon: React.ElementType; tone: PremiumIconTone }> = {
  pregnant: { icon: Baby, tone: "orange" },
  disabled: { icon: Accessibility, tone: "cobalt" },
  foreign_national: { icon: Globe, tone: "indigo" },
  young_worker: { icon: ShieldAlert, tone: "danger" },
  night_shift: { icon: Moon, tone: "violet" },
  chronic_condition: { icon: HeartPulse, tone: "risk" },
  nursing_mother: { icon: Milk, tone: "amber" },
  temporary_restriction: { icon: Clock, tone: "neutral" },
};
import {
  type PersonnelRecord,
  type SpecialPolicyRecord,
  type PersonnelHealthExam,
  fetchPersonnelFromSupabase,
  fetchSpecialPoliciesFromSupabase,
  importPersonnelToSupabase,
  removePersonnelFromSupabase,
  bulkRemovePersonnelFromSupabase,
  updateWorkspaceEmployeeCount,
  addSpecialPolicyToSupabase,
  removeSpecialPolicyFromSupabase,
  fetchAllHealthExamsForCompany,
  createHealthExam,
  deleteHealthExam,
} from "@/lib/supabase/personnel-api";

export type { PersonnelRecord } from "@/lib/supabase/personnel-api";

/* ── Special monitoring categories ── */
type SMCat = { key: string; bv: "warning" | "danger" | "neutral" | "accent" };
const CATS: SMCat[] = [
  { key: "pregnant", bv: "warning" },
  { key: "disabled", bv: "accent" },
  { key: "foreign_national", bv: "neutral" },
  { key: "young_worker", bv: "danger" },
  { key: "night_shift", bv: "neutral" },
  { key: "chronic_condition", bv: "warning" },
  { key: "nursing_mother", bv: "warning" },
  { key: "temporary_restriction", bv: "neutral" },
];

/* ── Labels ── */
const STATUS_LABELS: Record<string, string> = { active: "Aktif", on_leave: "İzinli", suspended: "Askıya Alınmış", terminated: "İşten Ayrılmış" };
const TYPE_LABELS: Record<string, string> = { full_time: "Tam Zamanlı", part_time: "Yarı Zamanlı", temporary: "Geçici", intern: "Stajyer", subcontractor: "Taşeron" };
const GENDER_LABELS: Record<string, string> = { male: "Erkek", female: "Kadın", other: "Diğer" };
void GENDER_LABELS;

/* ── CSV ── */
const HDRS = ["Sicil Kodu","TC Kimlik No","Ad","Soyad","Doğum Tarihi","Cinsiyet","Uyruk","Kan Grubu","Medeni Durum","Telefon","E-posta","Acil Durum Kişisi","Acil Durum Telefonu","Adres","Bölüm","Pozisyon / Unvan","Lokasyon","İşe Başlama Tarihi","İstihdam Durumu","İstihdam Türü","Vardiya Türü","Eğitim Düzeyi","Notlar"];
const EX = ["1001","12345678901","Ahmet","Yılmaz","1990-05-15","male","TR","A+","married","05551234567","ahmet@firma.com","Ayşe Yılmaz","05559876543","İstanbul, Kadıköy","Üretim","Operatör","Ana Fabrika","2023-01-15","active","full_time","day","high_school",""];

function mkCSV(): string { return "\uFEFF" + HDRS.join(";") + "\n" + EX.join(";") + "\n"; }
function dlCSV(content: string, filename: string): void { const blob = new Blob([content], { type: "text/csv;charset=utf-8;" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url); }
function exportPersonnelCSV(records: PersonnelRecord[], companyName: string): void {
  const rows = records.map((p) => [p.employeeCode,p.tcIdentityNumber,p.firstName,p.lastName,p.birthDate,p.gender,p.nationality,p.bloodType,p.maritalStatus,p.phone,p.email,p.emergencyContactName,p.emergencyContactPhone,p.address,p.department,p.positionTitle,p.location,p.hireDate,p.employmentStatus,p.employmentType,p.shiftType,p.educationLevel,p.notes].map((v) => `"${(v ?? "").replace(/"/g, '""')}"`).join(";"));
  dlCSV("\uFEFF" + HDRS.join(";") + "\n" + rows.join("\n") + "\n", `${companyName.replace(/\s+/g, "_")}_personel_listesi.csv`);
}
function detDel(header: string): string { const s = (header.match(/;/g) || []).length; const c = (header.match(/,/g) || []).length; const t = (header.match(/\t/g) || []).length; return s >= c && s >= t ? ";" : c >= t ? "," : "\t"; }
function pLine(line: string, delimiter: string): string[] { return line.split(delimiter).map((col) => col.trim().replace(/^"|"$/g, "")); }
async function readEnc(file: File): Promise<string> {
  const buf = await file.arrayBuffer(); const b = new Uint8Array(buf);
  if (b.length >= 3 && b[0] === 0xEF && b[1] === 0xBB && b[2] === 0xBF) { const r = new TextDecoder("utf-8").decode(buf); return r.charCodeAt(0) === 0xFEFF ? r.slice(1) : r; }
  try { const r = new TextDecoder("utf-8", { fatal: true }).decode(buf); return r.charCodeAt(0) === 0xFEFF ? r.slice(1) : r; } catch { /* not utf8 */ }
  for (const enc of ["windows-1254", "iso-8859-9", "windows-1252"]) { try { const r = new TextDecoder(enc).decode(buf); if (!r.includes("\uFFFD")) return r.charCodeAt(0) === 0xFEFF ? r.slice(1) : r; } catch { continue; } }
  const r = new TextDecoder("utf-8").decode(buf); return r.charCodeAt(0) === 0xFEFF ? r.slice(1) : r;
}
function toRecs(text: string): PersonnelRecord[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim()); if (lines.length < 2) return []; const d = detDel(lines[0]); const out: PersonnelRecord[] = [];
  for (let i = 1; i < lines.length; i++) { const c = pLine(lines[i], d); if (c.length < 3) continue;
    out.push({ id: crypto.randomUUID(), employeeCode: c[0]||"", tcIdentityNumber: c[1]||"", firstName: c[2]||"", lastName: c[3]||"", birthDate: c[4]||"", gender: c[5]||"", nationality: c[6]||"TR", bloodType: c[7]||"", maritalStatus: c[8]||"", phone: c[9]||"", email: c[10]||"", emergencyContactName: c[11]||"", emergencyContactPhone: c[12]||"", address: c[13]||"", department: c[14]||"", positionTitle: c[15]||"", location: c[16]||"", hireDate: c[17]||"", terminationDate: "", employmentStatus: c[18]||"active", employmentType: c[19]||"full_time", shiftType: c[20]||"day", educationLevel: c[21]||"", isActive: true, notes: c[22]||"" });
  } return out;
}

/* ── Hover Card for personnel (portal-based, no overflow clipping) ── */
function PersonnelHoverCard({ person }: { person: PersonnelRecord }) {
  const t = useTranslations("companyWorkspace.personnel");
  const triggerRef = useRef<HTMLSpanElement>(null);
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  function handleEnter() {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPos({ top: rect.top - 8, left: rect.left + rect.width / 2 });
    setShow(true);
  }

  const card = show
    ? createPortal(
        <div
          className="fixed z-[9999] w-72 -translate-x-1/2 -translate-y-full rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-elevated)] animate-in fade-in duration-150"
          style={{ top: pos.top, left: pos.left }}
          onMouseEnter={() => setShow(true)}
          onMouseLeave={() => setShow(false)}
        >
          {/* Arrow */}
          <div className="absolute left-1/2 top-full -translate-x-1/2 border-[6px] border-transparent border-t-border" />
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {person.firstName.charAt(0)}{person.lastName.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-foreground">{person.firstName} {person.lastName}</p>
              <p className="truncate text-xs text-muted-foreground">{person.positionTitle || t("table.positionMissing")}</p>
            </div>
          </div>
          {/* Details grid */}
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("table.employeeCode")}</p><p className="font-medium text-foreground">{person.employeeCode || "\u2014"}</p></div>
            <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("table.department")}</p><p className="font-medium text-foreground">{person.department || "\u2014"}</p></div>
            <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("table.location")}</p><p className="font-medium text-foreground">{person.location || "\u2014"}</p></div>
            <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("table.status")}</p><p className="font-medium text-foreground">{t(`statuses.${person.employmentStatus}`) || person.employmentStatus}</p></div>
            {person.phone && <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("table.phone")}</p><p className="font-medium text-foreground">{person.phone}</p></div>}
            {person.email && <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("table.email")}</p><p className="truncate font-medium text-foreground">{person.email}</p></div>}
            {person.hireDate && <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("table.hireDate")}</p><p className="font-medium text-foreground">{person.hireDate}</p></div>}
            {person.bloodType && <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("table.bloodType")}</p><p className="font-medium text-foreground">{person.bloodType}</p></div>}
          </div>
          {person.emergencyContactName && (
            <div className="mt-2 rounded-lg bg-danger/5 px-2.5 py-1.5 text-xs">
              <p className="text-[10px] uppercase tracking-wider text-danger">{t("table.emergency")}</p>
              <p className="font-medium text-foreground">{person.emergencyContactName} {person.emergencyContactPhone && `\u00b7 ${person.emergencyContactPhone}`}</p>
            </div>
          )}
          {/* Özlük Sayfası linki */}
          <a
            href={`/personnel/${person.id}`}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary/10 px-3 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
            onClick={e => e.stopPropagation()}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            {t("table.profilePage")}
          </a>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={handleEnter}
        onMouseLeave={() => setShow(false)}
        className="cursor-pointer"
      >
        {person.firstName} {person.lastName}
      </span>
      {card}
    </>
  );
}

/* ── Employee table ── */
function EmpTbl({ rows }: { rows: PersonnelRecord[] }) {
  const t = useTranslations("companyWorkspace.personnel");
  return (
    <div className="mt-3 overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full min-w-[560px] text-sm">
        <thead><tr className="border-b border-border bg-secondary/50">
          <th className="px-3 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{t("table.employeeCode")}</th>
          <th className="px-3 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{t("table.fullName")}</th>
          <th className="px-3 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{t("table.department")}</th>
          <th className="px-3 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{t("table.position")}</th>
          <th className="px-3 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{t("table.location")}</th>
        </tr></thead>
        <tbody>{rows.map((p) => (
          <tr key={p.id} className="border-b border-border last:border-b-0 transition-colors hover:bg-secondary/30">
            <td className="px-3 py-2 font-medium text-foreground">{p.employeeCode || "\u2014"}</td>
            <td className="px-3 py-2 font-medium text-foreground">
              <PersonnelHoverCard person={p} />
            </td>
            <td className="px-3 py-2 text-muted-foreground">{p.department || "\u2014"}</td>
            <td className="px-3 py-2 text-muted-foreground">{p.positionTitle || "\u2014"}</td>
            <td className="px-3 py-2 text-muted-foreground">{p.location || "\u2014"}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

/* ── localStorage fallback ── */
const PERSONNEL_KEY_PREFIX = "risknova_personnel_";
function loadPersonnelLocal(companyId: string): PersonnelRecord[] { if (typeof window === "undefined") return []; try { const raw = localStorage.getItem(PERSONNEL_KEY_PREFIX + companyId); if (!raw) return []; return JSON.parse(raw) as PersonnelRecord[]; } catch { return []; } }
function savePersonnelLocal(companyId: string, list: PersonnelRecord[]): void { localStorage.setItem(PERSONNEL_KEY_PREFIX + companyId, JSON.stringify(list)); }

function statusBadgeVariant(status: string): "success" | "warning" | "danger" | "neutral" {
  if (status === "active") return "success"; if (status === "on_leave") return "warning"; if (status === "suspended" || status === "terminated") return "danger"; return "neutral";
}

/* ── Sorting ── */
type SortKey =
  | "employeeCode"
  | "fullName"
  | "department"
  | "positionTitle"
  | "location"
  | "employmentStatus"
  | "employmentType";
type SortDir = "asc" | "desc";

const SORT_LABELS: Record<SortKey, string> = {
  employeeCode: "Sicil",
  fullName: "Ad Soyad",
  department: "Bölüm",
  positionTitle: "Pozisyon",
  location: "Lokasyon",
  employmentStatus: "Durum",
  employmentType: "İstihdam",
};

function sortValueFor(p: PersonnelRecord, key: SortKey): string {
  switch (key) {
    case "employeeCode":
      return p.employeeCode || "";
    case "fullName":
      return `${p.firstName || ""} ${p.lastName || ""}`.trim();
    case "department":
      return p.department || "";
    case "positionTitle":
      return p.positionTitle || "";
    case "location":
      return p.location || "";
    case "employmentStatus":
      return STATUS_LABELS[p.employmentStatus] || p.employmentStatus || "";
    case "employmentType":
      return TYPE_LABELS[p.employmentType] || p.employmentType || "";
  }
}

// Türkçe locale-aware karşılaştırma: "Ç", "Ğ", "İ", "Ö", "Ş", "Ü" doğru sıralanır.
// Sicil gibi numerik alanlar için {numeric: true} kullanıyoruz ki "9" < "10" olsun.


function sortPersonnel(rows: PersonnelRecord[], key: SortKey, dir: SortDir, locale: string): PersonnelRecord[] {
  const collator = new Intl.Collator(locale, { numeric: true, sensitivity: "base" });
  const mul = dir === "asc" ? 1 : -1;
  const out = [...rows];
  out.sort((a, b) => {
    const av = sortValueFor(a, key);
    const bv = sortValueFor(b, key);
    // Boş değerler her zaman sona.
    if (!av && !bv) return 0;
    if (!av) return 1;
    if (!bv) return -1;
    return collator.compare(av, bv) * mul;
  });
  return out;
}

/* ── Main component ── */
type Props = { companyId: string; companyName: string; departments: string[]; locations: string[] };

export function PersonnelManagementPanel({ companyId, companyName, departments, locations }: Props) {
  const t = useTranslations("companyWorkspace.personnel");
  const locale = useLocale();
  const [mounted, setMounted] = useState(false);
  const [ppl, setPpl] = useState<PersonnelRecord[]>([]);
  const [policies, setPolicies] = useState<Map<string, SpecialPolicyRecord[]>>(new Map());
  const [dataSource, setDataSource] = useState<"supabase" | "local">("local");
  const [impFile, setImpFile] = useState<File | null>(null);
  const [impBusy, setImpBusy] = useState(false);
  const [impMsg, setImpMsg] = useState("");
  const [impOk, setImpOk] = useState(true);
  const [sec, setSec] = useState<"list" | "import" | "special" | "health">("list");
  const [healthExams, setHealthExams] = useState<(PersonnelHealthExam & { personnelName: string })[]>([]);
  const [showHealthForm, setShowHealthForm] = useState(false);
  const [expCat, setExpCat] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [policyModal, setPolicyModal] = useState<{ personnelId: string; name: string } | null>(null);
  const [policyBusy, setPolicyBusy] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("fullName");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      /* 1) Personnel */
      const sbData = await fetchPersonnelFromSupabase(companyId);
      if (cancelled) return;
      if (sbData !== null) {
        setPpl(sbData);
        setDataSource("supabase");
        savePersonnelLocal(companyId, sbData);
      } else {
        setPpl(loadPersonnelLocal(companyId));
        setDataSource("local");
      }
      /* 2) Policies - always try to load regardless of personnel source */
      try {
        const sbPolicies = await fetchSpecialPoliciesFromSupabase(companyId);
        if (!cancelled && sbPolicies) {
          console.log("[PersonnelPanel] Loaded policies:", sbPolicies.size, "personnel with policies");
          setPolicies(sbPolicies);
        }
      } catch (e) {
        console.warn("[PersonnelPanel] Policy load error:", e);
      }
      /* 3) Health exams */
      const exams = await fetchAllHealthExamsForCompany(companyId);
      if (!cancelled) setHealthExams(exams);
      setMounted(true);
    }
    void load();
    return () => { cancelled = true; };
  }, [companyId]);

  const pplWithPolicy = useCallback((policyType: string) => { const result: PersonnelRecord[] = []; for (const p of ppl) { const pP = policies.get(p.id); if (pP?.some((sp) => sp.policyType === policyType)) result.push(p); } return result; }, [ppl, policies]);
  const sCnt = useMemo(() => { const m: Record<string, number> = {}; CATS.forEach((c) => { m[c.key] = pplWithPolicy(c.key).length; }); return m; }, [pplWithPolicy]);
  const totalPolicies = useMemo(() => { let count = 0; policies.forEach((v) => { count += v.length; }); return count; }, [policies]);
  const depts = departments.filter(Boolean);
  const locs = locations.filter(Boolean);
  void locs;
  const activeCount = useMemo(() => ppl.filter((p) => p.employmentStatus === "active").length, [ppl]);

  const sortedPpl = useMemo(() => sortPersonnel(ppl, sortKey, sortDir, locale), [ppl, sortKey, sortDir, locale]);

  const onSortClick = useCallback(
    (key: SortKey) => {
      if (key === sortKey) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(key);
        setSortDir("asc");
      }
    },
    [sortKey],
  );

  const dl = useCallback(() => { dlCSV(mkCSV(), `${companyName.replace(/\s+/g, "_")}_personel_sablonu.csv`); }, [companyName]);

  const doImp = useCallback(async () => {
    if (!impFile) { setImpMsg(t("import.chooseFile")); setImpOk(false); return; }
    setImpBusy(true); setImpMsg("");
    try {
      const text = await readEnc(impFile); const records = toRecs(text);
      if (!records.length) { setImpMsg(t("import.noValidRecords")); setImpOk(false); return; }
      const sbResult = await importPersonnelToSupabase(companyId, records);
      const newList = [...ppl, ...records]; setPpl(newList); savePersonnelLocal(companyId, newList);
      const activeTotal = newList.filter((p) => p.employmentStatus === "active").length;
      await updateWorkspaceEmployeeCount(companyId, activeTotal);
      setImpMsg(sbResult !== null ? t("import.successSupabase", { count: records.length, total: newList.length }) : t("import.successLocal", { count: records.length, total: newList.length }));
      setImpOk(true); setImpFile(null); setSec("list");
    } catch { setImpMsg(t("import.readError")); setImpOk(false); }
    finally { setImpBusy(false); }
  }, [impFile, companyId, ppl, t]);

  const rm = useCallback(async (id: string) => {
    setRemovingId(id); await removePersonnelFromSupabase(id);
    setPpl((prev) => { const next = prev.filter((p) => p.id !== id); savePersonnelLocal(companyId, next); void updateWorkspaceEmployeeCount(companyId, next.filter((p) => p.employmentStatus === "active").length); return next; });
    setSelectedIds((prev) => { const n = new Set(prev); n.delete(id); return n; }); setRemovingId(null);
  }, [companyId]);

  const bulkRm = useCallback(async () => {
    if (selectedIds.size === 0) return; setBulkBusy(true);
    await bulkRemovePersonnelFromSupabase(Array.from(selectedIds));
    setPpl((prev) => { const next = prev.filter((p) => !selectedIds.has(p.id)); savePersonnelLocal(companyId, next); void updateWorkspaceEmployeeCount(companyId, next.filter((p) => p.employmentStatus === "active").length); return next; });
    setSelectedIds(new Set()); setBulkBusy(false);
  }, [selectedIds, companyId]);

  const toggleSelect = useCallback((id: string) => { setSelectedIds((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; }); }, []);
  const toggleSelectAll = useCallback(() => { setSelectedIds((prev) => prev.size === ppl.length ? new Set() : new Set(ppl.map((p) => p.id))); }, [ppl]);

  const addPolicy = useCallback(async (personnelId: string, policyType: string) => {
    setPolicyBusy(true); const newId = await addSpecialPolicyToSupabase(companyId, personnelId, policyType);
    if (newId) { const sbPolicies = await fetchSpecialPoliciesFromSupabase(companyId); if (sbPolicies) setPolicies(sbPolicies); }
    setPolicyBusy(false); setPolicyModal(null);
  }, [companyId]);

  const rmPolicy = useCallback(async (policyId: string) => {
    await removeSpecialPolicyFromSupabase(policyId); const sbPolicies = await fetchSpecialPoliciesFromSupabase(companyId); if (sbPolicies) setPolicies(sbPolicies);
  }, [companyId]);

  const doExport = useCallback(() => { exportPersonnelCSV(ppl, companyName); }, [ppl, companyName]);

  if (!mounted) return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <div className="mx-auto h-7 w-7 animate-spin rounded-full border-4 border-muted border-t-primary" />
        <p className="mt-3 text-sm text-muted-foreground">{t("loading")}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header summary */}
      <div className="rounded-[1.7rem] border border-border/80 bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <PremiumIconBadge icon={Users} tone="cobalt" size="md" />
            <div>
              <h3 className="text-base font-bold text-foreground">{t("title")}</h3>
              <p className="mt-0.5 text-sm text-muted-foreground">{t("description", { companyName })}</p>
            </div>
          </div>
          <Badge variant={dataSource === "supabase" ? "success" : "neutral"} className="shrink-0 text-[10px]">{dataSource === "supabase" ? "Supabase" : t("sourceLocal")}</Badge>
        </div>
        <div className="mt-4 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          {[{ l: t("summary.total"), v: ppl.length, c: false }, { l: t("summary.active"), v: activeCount, c: false }, { l: t("summary.departments"), v: depts.length, c: false }, { l: t("summary.special"), v: totalPolicies, c: totalPolicies > 0 }].map((s) => (
            <div key={s.l} className="rounded-[1.25rem] border border-border/60 bg-gradient-to-br from-secondary/30 to-transparent p-4 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{s.l}</p>
              <p className={`mt-1.5 text-2xl font-bold tabular-nums ${s.c ? "text-warning" : "text-foreground"}`}>{s.v}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex flex-wrap rounded-[1.25rem] border border-border/60 bg-secondary/20 p-1 shadow-sm">
        {(["list", "import", "special", "health"] as const).map((tab) => (
          <button key={tab} type="button" onClick={() => setSec(tab)}
            className={`inline-flex h-10 items-center rounded-[0.8rem] px-5 text-sm font-semibold transition-all ${sec === tab ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
            {t(`tabs.${tab}`)}
            {tab === "health" && healthExams.length > 0 && <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold">{healthExams.length}</span>}
          </button>
        ))}
      </div>

      {/* LIST */}
      {sec === "list" && (
        <div className="space-y-4">
          {ppl.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card px-6 py-8 text-center">
              <p className="text-base font-semibold text-foreground">{t("empty.title")}</p>
              <p className="mt-1.5 text-sm text-muted-foreground">{t("empty.description")}</p>
              <div className="mt-4 flex flex-wrap justify-center gap-3">
                <Button variant="outline" size="sm" onClick={dl}>{t("actions.templateDownload")}</Button>
                <Button size="sm" onClick={() => setSec("import")}>{t("actions.goImport")}</Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-sm text-muted-foreground">{t("list.count", { count: ppl.length })}</p>
                  {selectedIds.size > 0 && (
                    <Button variant="danger" size="sm" onClick={() => void bulkRm()} disabled={bulkBusy}>
                      {bulkBusy ? t("actions.deleting") : t("actions.deleteSelected", { count: selectedIds.size })}
                    </Button>
                  )}
                  <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-secondary/30 px-2 py-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground" htmlFor="personnel-sort">
                      {t("list.sort")}
                    </label>
                    <select
                      id="personnel-sort"
                      value={sortKey}
                      onChange={(e) => { setSortKey(e.target.value as SortKey); }}
                      className="rounded-lg border border-border bg-card px-2 py-1 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    >
                      {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                        <option key={k} value={k}>{t(`sort.${k}`)}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                      title={sortDir === "asc" ? t("sort.ascTitle") : t("sort.descTitle")}
                      aria-label={sortDir === "asc" ? t("sort.ascAria") : t("sort.descAria")}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card text-xs font-bold text-foreground transition hover:bg-secondary"
                    >
                      {sortDir === "asc" ? "A→Z" : "Z→A"}
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  <Button variant="outline" onClick={dl} className="h-10 rounded-xl px-4 text-sm font-semibold"><Download size={15} className="mr-2" />{t("actions.templateDownload")}</Button>
                  <Button variant="outline" onClick={doExport} className="h-10 rounded-xl px-4 text-sm font-semibold"><FileDown size={15} className="mr-2" />{t("actions.export")}</Button>
                  <Button onClick={() => setSec("import")} className="h-10 rounded-xl bg-[var(--gold)] px-5 text-sm font-bold text-white shadow-md hover:brightness-110"><Upload size={15} className="mr-2" />{t("actions.newImport")}</Button>
                </div>
              </div>
              <div className="overflow-x-auto rounded-xl border border-border bg-card">
                <table className="w-full min-w-[1100px] text-sm">
                  <thead><tr className="border-b border-border bg-secondary/50">
                    <th className="w-10 px-3 py-2.5 text-center"><input type="checkbox" checked={selectedIds.size === ppl.length && ppl.length > 0} onChange={toggleSelectAll} className="h-4 w-4 rounded border-border accent-primary" /></th>
                    {([
                      { label: t("table.employeeCode"), key: "employeeCode" as SortKey },
                      { label: t("table.fullName"), key: "fullName" as SortKey },
                      { label: t("table.identity"), key: null },
                      { label: t("table.department"), key: "department" as SortKey },
                      { label: t("table.position"), key: "positionTitle" as SortKey },
                      { label: t("table.location"), key: "location" as SortKey },
                      { label: t("table.status"), key: "employmentStatus" as SortKey },
                      { label: t("table.employment"), key: "employmentType" as SortKey },
                      { label: t("table.actions"), key: null },
                    ] as Array<{ label: string; key: SortKey | null }>).map((h) => {
                      const isSortable = h.key !== null;
                      const isActive = isSortable && sortKey === h.key;
                      const indicator = isActive ? (sortDir === "asc" ? "▲" : "▼") : "";
                      return (
                        <th key={h.label} className="px-3 py-2.5 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                          {isSortable ? (
                            <button
                              type="button"
                              onClick={() => onSortClick(h.key as SortKey)}
                              className={`inline-flex items-center gap-1 transition-colors hover:text-foreground ${isActive ? "text-foreground" : ""}`}
                              aria-label={t("sort.columnAria", { label: h.label })}
                            >
                              {h.label}
                              <span className={`text-[9px] ${isActive ? "opacity-100" : "opacity-30"}`}>
                                {indicator || "↕"}
                              </span>
                            </button>
                          ) : (
                            h.label
                          )}
                        </th>
                      );
                    })}
                  </tr></thead>
                  <tbody>{sortedPpl.map((p) => (
                    <tr key={p.id} className={`border-b border-border transition-colors hover:bg-secondary/30 ${selectedIds.has(p.id) ? "bg-primary/5" : ""}`}>
                      <td className="w-10 px-3 py-2.5 text-center"><input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleSelect(p.id)} className="h-4 w-4 rounded border-border accent-primary" /></td>
                      <td className="px-3 py-2.5 font-medium text-foreground">{p.employeeCode || "\u2014"}</td>
                      <td className="px-3 py-2.5"><p className="font-medium text-foreground"><PersonnelHoverCard person={p} /></p>{p.phone && <p className="text-xs text-muted-foreground">{p.phone}</p>}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{p.tcIdentityNumber ? `***${p.tcIdentityNumber.slice(-4)}` : "\u2014"}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{p.department || "—"}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{p.positionTitle || "—"}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{p.location || "—"}</td>
                      <td className="px-3 py-2.5"><Badge variant={statusBadgeVariant(p.employmentStatus)} className="text-[10px]">{t(`statuses.${p.employmentStatus}`) || p.employmentStatus}</Badge></td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">{t(`employmentTypes.${p.employmentType}`) || p.employmentType}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <a href={`/personnel/${p.id}`} className="text-xs font-medium text-emerald-600 hover:underline">{t("actions.profile")}</a>
                          <button type="button" onClick={() => setPolicyModal({ personnelId: p.id, name: `${p.firstName} ${p.lastName}` })} className="text-xs font-medium text-primary hover:underline">{t("actions.special")}</button>
                          <button type="button" onClick={() => void rm(p.id)} disabled={removingId === p.id} className="text-xs font-medium text-danger hover:underline disabled:opacity-50">{removingId === p.id ? "..." : t("actions.delete")}</button>
                        </div>
                      </td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* IMPORT */}
      {sec === "import" && (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-border bg-card p-4">
            <div className="flex items-start gap-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">1</div>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-semibold text-foreground">{t("import.templateTitle")}</h4>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{t("import.templateDesc")}</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={dl}>{t("actions.templateDownload")}</Button>
              </div>
            </div>
          </div>
          <div className="overflow-hidden rounded-xl border border-border bg-card p-4">
            <div className="flex items-start gap-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">2</div>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-semibold text-foreground">{t("import.uploadTitle")}</h4>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{t("import.uploadDesc")}</p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <input type="file" accept=".csv,.txt" onChange={(e) => setImpFile(e.target.files?.[0] ?? null)} className="text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary" />
                  <Button onClick={() => void doImp()} disabled={impBusy || !impFile}>{impBusy ? t("actions.uploading") : t("actions.import")}</Button>
                </div>
              </div>
            </div>
          </div>
          {impMsg && (
            <div className={`rounded-lg border px-4 py-3 text-sm font-medium ${impOk ? "border-success/30 bg-success/5 text-success" : "border-danger/30 bg-danger/5 text-danger"}`}>{impMsg}</div>
          )}
        </div>
      )}

      {/* SPECIAL MONITORING */}
      {sec === "special" && (
        <div className="space-y-4">
          <div className="rounded-[1.7rem] border border-border/80 bg-card p-5 shadow-[var(--shadow-card)]">
            <div className="flex items-center gap-3">
              <PremiumIconBadge icon={AlertTriangle} tone="orange" size="md" />
              <div>
                <h3 className="text-base font-bold text-foreground">{t("special.title")}</h3>
                <p className="mt-0.5 text-sm text-muted-foreground">{t("special.description")}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Badge variant="warning" className="text-[10px]">{t("special.sensitiveData")}</Badge>
              <span className="text-xs text-muted-foreground">{t("special.accessControlled")}</span>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {CATS.map((cat) => {
              const cnt = sCnt[cat.key] || 0;
              const open = expCat === cat.key;
              const emps = pplWithPolicy(cat.key);
              const iconDef = SPECIAL_ICONS[cat.key] || { icon: ShieldAlert, tone: "neutral" as PremiumIconTone };
              return (
                <div key={cat.key} className="overflow-hidden rounded-[1.5rem] border border-border/80 bg-card p-5 shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:border-[var(--gold)]/30 hover:shadow-[var(--shadow-elevated)]">
                  <button type="button" onClick={() => setExpCat(open ? null : cat.key)} className="flex w-full items-start justify-between gap-3 text-left">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <PremiumIconBadge icon={iconDef.icon} tone={iconDef.tone} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-foreground">{t(`special.categories.${cat.key}.label`)}</p>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t(`special.categories.${cat.key}.desc`)}</p>
                      </div>
                    </div>
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-base font-bold text-foreground">{cnt}</div>
                  </button>
                  {cnt > 0 && (
                    <p className="mt-2 cursor-pointer text-xs font-medium text-primary" onClick={() => setExpCat(open ? null : cat.key)}>
                      {open ? t("special.hideList") : t("special.showEmployees")}
                    </p>
                  )}
                  {cnt === 0 && <p className="mt-2 text-xs text-muted-foreground">{t("special.emptyCategory")}</p>}
                  {open && cnt > 0 && (
                    <div className="mt-3">
                      <EmpTbl rows={emps} />
                      <div className="mt-2 space-y-1">
                        {emps.map((emp) => {
                          const empPolicies = policies.get(emp.id) ?? [];
                          const thisCatPolicy = empPolicies.find((sp) => sp.policyType === cat.key);
                          return thisCatPolicy ? (
                            <div key={emp.id} className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-1.5 text-xs">
                              <span className="text-muted-foreground">{emp.firstName} {emp.lastName}</span>
                              <button type="button" onClick={() => void rmPolicy(thisCatPolicy.id)} className="font-medium text-danger hover:underline">{t("actions.remove")}</button>
                            </div>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Special Policy Assignment Modal */}
      {/* HEALTH — Sağlık Gözetimi */}
      {sec === "health" && (
        <div className="space-y-4">
          <div className="rounded-[1.7rem] border border-border/80 bg-card p-5 shadow-[var(--shadow-card)]">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-3">
                <PremiumIconBadge icon={Stethoscope} tone="emerald" size="md" />
                <div>
                  <h3 className="text-base font-bold text-foreground">{t("health.title")}</h3>
                  <p className="mt-0.5 text-sm text-muted-foreground">{t("health.description")}</p>
                </div>
              </div>
              <button type="button" onClick={() => setShowHealthForm(!showHealthForm)}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--gold)] px-5 text-sm font-bold text-white shadow-md transition-all hover:brightness-110 hover:shadow-lg">
                <Plus size={16} strokeWidth={2.5} />
                {t("health.newExam")}
              </button>
            </div>

            {showHealthForm && (
              <HealthExamForm
                personnel={ppl}
                companyId={companyId}
                onSaved={async () => {
                  setShowHealthForm(false);
                  setHealthExams(await fetchAllHealthExamsForCompany(companyId));
                }}
                onCancel={() => setShowHealthForm(false)}
              />
            )}

            {healthExams.length === 0 && !showHealthForm ? (
              <p className="text-center text-sm text-muted-foreground py-8">{t("health.empty")}</p>
            ) : (
              <div className="space-y-2">
                {healthExams.map((h) => {
                  const today = new Date().toISOString().split("T")[0];
                  const isOverdue = h.nextExamDate && h.nextExamDate < today;
                  const isDue = h.nextExamDate && !isOverdue && h.nextExamDate <= new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];
                  const resCls = h.result === "uygun" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : h.result === "uygun_degil" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    : h.result === "izleme" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
                  const resLabel = h.result === "uygun" ? t("health.results.uygun") : h.result === "uygun_degil" ? t("health.results.uygun_degil") : h.result === "izleme" ? t("health.results.izleme") : t("health.results.sartli_uygun");
                  const typeLabel = h.examType === "ise_giris" ? t("health.examTypes.ise_giris") : h.examType === "periyodik" ? t("health.examTypes.periyodik") : h.examType === "isten_ayrilma" ? t("health.examTypes.isten_ayrilma") : t("health.examTypes.ozel");
                  function fmtD(d: string | null) { if (!d) return "—"; try { return new Date(d).toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" }); } catch { return d; } }

                  return (
                    <div key={h.id} className={`flex items-center justify-between rounded-lg border p-3 ${isOverdue ? "border-red-400/40 bg-red-50/5 dark:bg-red-950/10" : isDue ? "border-amber-400/30 bg-amber-50/5 dark:bg-amber-950/10" : "border-border bg-secondary/20"}`}>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-foreground">{h.personnelName || "İsimsiz"}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${resCls}`}>{resLabel}</span>
                          <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{typeLabel}</span>
                          {isOverdue && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-900/30 dark:text-red-400">{t("health.overdue")}</span>}
                        </div>
                        <div className="mt-0.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                          <span>{t("health.exam")}: {fmtD(h.examDate)}</span>
                          {h.nextExamDate && <span className={isOverdue ? "text-red-500 font-medium" : ""}>{t("health.next")}: {fmtD(h.nextExamDate)}</span>}
                          {h.physicianName && <span>Dr. {h.physicianName}</span>}
                          {h.reportNumber && <span>{t("health.report")}: {h.reportNumber}</span>}
                        </div>
                        {h.restrictions && <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">{t("health.restriction")}: {h.restrictions}</p>}
                        {h.recommendedActions && <p className="mt-0.5 text-[11px] text-blue-600 dark:text-blue-400">{t("health.recommendation")}: {h.recommendedActions}</p>}
                      </div>
                      <button type="button" onClick={async () => {
                        if (await deleteHealthExam(h.id)) {
                          setHealthExams((prev) => prev.filter((x) => x.id !== h.id));
                        }
                      }} className="rounded-lg p-1 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {policyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4">
          <div className="w-full max-w-md overflow-hidden rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-elevated)]">
            <h3 className="text-base font-semibold text-foreground">{t("special.assignmentTitle")}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{policyModal.name}</span> {t("special.assignmentDescription")}
            </p>
            <div className="mt-4 grid gap-2">
              {CATS.map((cat) => (
                <button key={cat.key} type="button" disabled={policyBusy} onClick={() => void addPolicy(policyModal.personnelId, cat.key)}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 text-left transition-colors hover:bg-secondary disabled:opacity-50">
                  <Badge variant={cat.bv} className="shrink-0 text-[10px]">{t(`special.categories.${cat.key}.label`)}</Badge>
                  <span className="min-w-0 flex-1 text-xs text-muted-foreground">{t(`special.categories.${cat.key}.desc`)}</span>
                </button>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setPolicyModal(null)} disabled={policyBusy}>
                {policyBusy ? t("actions.saving") : t("actions.close")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Sağlık Muayene Formu ── */
function HealthExamForm({ personnel, companyId, onSaved, onCancel }: {
  personnel: PersonnelRecord[]; companyId: string;
  onSaved: () => void; onCancel: () => void;
}) {
  const t = useTranslations("companyWorkspace.personnel");
  const [personnelId, setPersonnelId] = useState(personnel[0]?.id ?? "");
  const [examType, setExamType] = useState("periyodik");
  const [examDate, setExamDate] = useState(new Date().toISOString().split("T")[0]);
  const [nextExamDate, setNextExamDate] = useState("");
  const [result, setResult] = useState("uygun");
  const [physicianName, setPhysicianName] = useState("");
  const [physicianInstitution, setPhysicianInstitution] = useState("");
  const [reportNumber, setReportNumber] = useState("");
  const [restrictions, setRestrictions] = useState("");
  const [recommendedActions, setRecommendedActions] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!personnelId || !examDate) return;
    setSaving(true);
    await createHealthExam(personnelId, companyId, {
      examType, examDate, nextExamDate, result, physicianName,
      physicianInstitution, reportNumber, restrictions, recommendedActions, notes,
    });
    setSaving(false);
    onSaved();
  }

  return (
    <div className="mb-4 rounded-lg border-2 border-primary/30 bg-primary/5 p-4 space-y-3">
      <h4 className="text-sm font-semibold text-foreground">{t("health.formTitle")}</h4>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-[10px] font-medium uppercase text-muted-foreground">{t("health.personnelRequired")}</label>
          <select value={personnelId} onChange={(e) => setPersonnelId(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground">
            {personnel.map((p) => (
              <option key={p.id} value={p.id}>{p.firstName} {p.lastName} — {p.department || t("table.noDepartment")}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-medium uppercase text-muted-foreground">{t("health.examType")}</label>
          <select value={examType} onChange={(e) => setExamType(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground">
            <option value="ise_giris">{t("health.examTypes.ise_giris")}</option>
            <option value="periyodik">{t("health.examTypes.periyodik")}</option>
            <option value="isten_ayrilma">{t("health.examTypes.isten_ayrilma")}</option>
            <option value="ozel">{t("health.examTypes.ozel")}</option>
          </select>
        </div>
        <div><label className="text-[10px] font-medium uppercase text-muted-foreground">{t("health.examDateRequired")}</label><input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground" /></div>
        <div><label className="text-[10px] font-medium uppercase text-muted-foreground">{t("health.nextExam")}</label><input type="date" value={nextExamDate} onChange={(e) => setNextExamDate(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground" /></div>
        <div>
          <label className="text-[10px] font-medium uppercase text-muted-foreground">{t("health.result")}</label>
          <select value={result} onChange={(e) => setResult(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground">
            <option value="uygun">{t("health.results.uygun")}</option>
            <option value="sartli_uygun">{t("health.results.sartli_uygun")}</option>
            <option value="uygun_degil">{t("health.results.uygun_degil")}</option>
            <option value="izleme">{t("health.results.izleme")}</option>
          </select>
        </div>
        <div><label className="text-[10px] font-medium uppercase text-muted-foreground">{t("health.physicianName")}</label><input value={physicianName} onChange={(e) => setPhysicianName(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground" /></div>
        <div><label className="text-[10px] font-medium uppercase text-muted-foreground">{t("health.institution")}</label><input value={physicianInstitution} onChange={(e) => setPhysicianInstitution(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground" /></div>
        <div><label className="text-[10px] font-medium uppercase text-muted-foreground">{t("health.reportNo")}</label><input value={reportNumber} onChange={(e) => setReportNumber(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground" /></div>
      </div>
      <div><label className="text-[10px] font-medium uppercase text-muted-foreground">{t("health.restrictions")}</label><input value={restrictions} onChange={(e) => setRestrictions(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground" placeholder={t("health.restrictionsPlaceholder")} /></div>
      <div><label className="text-[10px] font-medium uppercase text-muted-foreground">{t("health.recommendedActions")}</label><input value={recommendedActions} onChange={(e) => setRecommendedActions(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground" placeholder={t("health.recommendedActionsPlaceholder")} /></div>
      <div className="flex gap-2">
        <button type="button" onClick={handleSubmit} disabled={saving || !personnelId || !examDate} className="rounded-lg bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50">{saving ? t("actions.saving") : t("actions.save")}</button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-border px-4 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary">{t("actions.cancel")}</button>
      </div>
    </div>
  );
}
