"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  fetchPersonnelFromSupabase,
  importPersonnelToSupabase,
  removePersonnelFromSupabase,
} from "@/lib/supabase/personnel-api";

/* ------------------------------------------------------------------ */
/* PersonnelRecord type                                                */
/* ------------------------------------------------------------------ */
export type PersonnelRecord = {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  nationalId: string;
  nationality: string;
  department: string;
  position: string;
  location: string;
  employmentType: string;
  startDate: string;
  shiftPattern: string;
  manager: string;
  phone: string;
  email: string;
  emergencyContact: string;
  trainingStatus: string;
  periodicExamStatus: string;
  ppeRequirement: string;
  highRiskDuty: boolean;
  specialMonitoring: string;
  specialMonitoringCategories: string[];
  notes: string;
};

/* ------------------------------------------------------------------ */
/* Special monitoring categories                                       */
/* ------------------------------------------------------------------ */
type SMCat = {
  key: string;
  label: string;
  desc: string;
  bv: "warning" | "danger" | "neutral" | "accent";
};

const CATS: SMCat[] = [
  { key: "pregnant", label: "Gebe \u00C7al\u0131\u015Fan", desc: "Gebe veya emziren \u00E7al\u0131\u015Fanlar i\u00E7in \u00F6zel koruma gereklidir.", bv: "warning" },
  { key: "disabled", label: "Engelli \u00C7al\u0131\u015Fan", desc: "Engel durumuna uygun i\u015F d\u00FCzenlemesi sa\u011Flanmal\u0131d\u0131r.", bv: "accent" },
  { key: "foreign_national", label: "Yabanc\u0131 Uyruklu", desc: "Dil, k\u00FClt\u00FCrel uyum ve \u00E7al\u0131\u015Fma izni takibi gerektirir.", bv: "neutral" },
  { key: "minor", label: "Gen\u00E7 \u00C7al\u0131\u015Fan (18 ya\u015F alt\u0131)", desc: "Yasal s\u0131n\u0131rlamalar ve ek koruma tedbirleri uygulanmal\u0131d\u0131r.", bv: "danger" },
  { key: "chronic_illness", label: "Kronik Hastal\u0131k", desc: "S\u00FCrekli sa\u011Fl\u0131k g\u00F6zetimi ve i\u015F uyumu de\u011Ferlendirmesi gerektirir.", bv: "warning" },
  { key: "night_shift", label: "Gece Vardiyas\u0131 \u00C7al\u0131\u015Fan\u0131", desc: "Gece \u00E7al\u0131\u015Fmas\u0131na ba\u011Fl\u0131 sa\u011Fl\u0131k riskleri ve periyodik kontrol.", bv: "neutral" },
];

/* ------------------------------------------------------------------ */
/* CSV template headers                                                */
/* ------------------------------------------------------------------ */
const HDRS = [
  "Sicil No", "Ad", "Soyad", "TC Kimlik / Pasaport No", "Uyruk",
  "B\u00F6l\u00FCm", "Pozisyon / Unvan", "Lokasyon / \u00C7al\u0131\u015Fma Alan\u0131", "\u0130stihdam T\u00FCr\u00FC",
  "\u0130\u015Fe Ba\u015Flama Tarihi", "Vardiya / \u00C7al\u0131\u015Fma D\u00FCzeni", "Y\u00F6netici / Amir",
  "Telefon", "E-posta", "Acil Durum \u0130leti\u015Fim", "E\u011Fitim Durumu",
  "Periyodik Muayene Durumu", "KKD Gereksinimi", "Y\u00FCksek Riskli G\u00F6rev",
  "\u00D6zel \u0130zleme Kategorisi", "Notlar",
];

const EX = [
  "1001", "Ahmet", "Y\u0131lmaz", "12345678901", "TC", "\u00DCretim", "Operat\u00F6r",
  "Ana Fabrika", "Tam Zamanl\u0131", "2023-01-15", "G\u00FCnd\u00FCz", "Mehmet Kaya",
  "05551234567", "ahmet@firma.com", "Ay\u015Fe Y\u0131lmaz - 05559876543",
  "Tamamland\u0131", "G\u00FCncel", "Baret, Eldiven, G\u00F6zl\u00FCk", "Hay\u0131r", "", "",
];

/* ------------------------------------------------------------------ */
/* CSV helpers                                                         */
/* ------------------------------------------------------------------ */
function mkCSV(): string {
  return "\uFEFF" + HDRS.join(";") + "\n" + EX.join(";") + "\n";
}

function dlCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportPersonnelCSV(records: PersonnelRecord[], companyName: string): void {
  const rows = records.map((p) => [
    p.employeeId, p.firstName, p.lastName, p.nationalId, p.nationality,
    p.department, p.position, p.location, p.employmentType, p.startDate,
    p.shiftPattern, p.manager, p.phone, p.email, p.emergencyContact,
    p.trainingStatus, p.periodicExamStatus, p.ppeRequirement,
    p.highRiskDuty ? "Evet" : "Hay\u0131r", p.specialMonitoring, p.notes,
  ].map((v) => `"${(v ?? "").replace(/"/g, '""')}"`).join(";"));

  const csv = "\uFEFF" + HDRS.join(";") + "\n" + rows.join("\n") + "\n";
  dlCSV(csv, `${companyName.replace(/\s+/g, "_")}_personel_listesi.csv`);
}

function detDel(header: string): string {
  const s = (header.match(/;/g) || []).length;
  const c = (header.match(/,/g) || []).length;
  const t = (header.match(/\t/g) || []).length;
  return s >= c && s >= t ? ";" : c >= t ? "," : "\t";
}

function pLine(line: string, delimiter: string): string[] {
  return line.split(delimiter).map((c) => c.trim().replace(/^"|"$/g, ""));
}

async function readEnc(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const b = new Uint8Array(buf);
  if (b.length >= 3 && b[0] === 0xEF && b[1] === 0xBB && b[2] === 0xBF) {
    const r = new TextDecoder("utf-8").decode(buf);
    return r.charCodeAt(0) === 0xFEFF ? r.slice(1) : r;
  }
  try {
    const r = new TextDecoder("utf-8", { fatal: true }).decode(buf);
    return r.charCodeAt(0) === 0xFEFF ? r.slice(1) : r;
  } catch { /* not utf8 */ }
  for (const enc of ["windows-1254", "iso-8859-9", "windows-1252"]) {
    try {
      const r = new TextDecoder(enc).decode(buf);
      if (!r.includes("\uFFFD")) return r.charCodeAt(0) === 0xFEFF ? r.slice(1) : r;
    } catch { continue; }
  }
  const r = new TextDecoder("utf-8").decode(buf);
  return r.charCodeAt(0) === 0xFEFF ? r.slice(1) : r;
}

function deriveCategories(sm: string): string[] {
  if (!sm) return [];
  const lower = sm.toLowerCase();
  const out: string[] = [];
  for (const cat of CATS) {
    if (lower.includes(cat.key) || lower.includes(cat.label.toLowerCase())) out.push(cat.key);
  }
  return out;
}

function toRecs(text: string): PersonnelRecord[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const d = detDel(lines[0]);
  const out: PersonnelRecord[] = [];
  for (let i = 1; i < lines.length; i++) {
    const c = pLine(lines[i], d);
    if (c.length < 3) continue;
    const sm = c[19] || "";
    out.push({
      id: crypto.randomUUID(),
      employeeId: c[0] || "", firstName: c[1] || "", lastName: c[2] || "",
      nationalId: c[3] || "", nationality: c[4] || "", department: c[5] || "",
      position: c[6] || "", location: c[7] || "", employmentType: c[8] || "",
      startDate: c[9] || "", shiftPattern: c[10] || "", manager: c[11] || "",
      phone: c[12] || "", email: c[13] || "", emergencyContact: c[14] || "",
      trainingStatus: c[15] || "", periodicExamStatus: c[16] || "",
      ppeRequirement: c[17] || "",
      highRiskDuty: (c[18] || "").toLowerCase() === "evet",
      specialMonitoring: sm,
      specialMonitoringCategories: deriveCategories(sm),
      notes: c[20] || "",
    });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Employee table sub-component                                        */
/* ------------------------------------------------------------------ */
function EmpTbl({ rows }: { rows: PersonnelRecord[] }) {
  return (
    <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/70">
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Sicil</th>
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Ad Soyad</th>
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">B&#246;l&#252;m</th>
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Pozisyon</th>
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Lokasyon</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50">
              <td className="px-3 py-2 font-medium text-slate-950">{p.employeeId || "\u2014"}</td>
              <td className="px-3 py-2 font-medium text-slate-950">{p.firstName} {p.lastName}</td>
              <td className="px-3 py-2 text-slate-700">{p.department || "\u2014"}</td>
              <td className="px-3 py-2 text-slate-700">{p.position || "\u2014"}</td>
              <td className="px-3 py-2 text-slate-700">{p.location || "\u2014"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* localStorage helpers (fallback only)                                */
/* ------------------------------------------------------------------ */
const PERSONNEL_KEY_PREFIX = "risknova_personnel_";

function loadPersonnelLocal(companyId: string): PersonnelRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PERSONNEL_KEY_PREFIX + companyId);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PersonnelRecord[];
    return parsed.map((p) => ({
      ...p,
      specialMonitoringCategories: Array.isArray(p.specialMonitoringCategories)
        ? p.specialMonitoringCategories
        : deriveCategories(p.specialMonitoring || ""),
    }));
  } catch { return []; }
}

function savePersonnelLocal(companyId: string, list: PersonnelRecord[]): void {
  localStorage.setItem(PERSONNEL_KEY_PREFIX + companyId, JSON.stringify(list));
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */
type Props = { companyId: string; companyName: string; departments: string[]; locations: string[] };

export function PersonnelManagementPanel({ companyId, companyName, departments, locations }: Props) {
  const [mounted, setMounted] = useState(false);
  const [ppl, setPpl] = useState<PersonnelRecord[]>([]);
  const [dataSource, setDataSource] = useState<"supabase" | "local">("local");
  const [impFile, setImpFile] = useState<File | null>(null);
  const [impBusy, setImpBusy] = useState(false);
  const [impMsg, setImpMsg] = useState("");
  const [impOk, setImpOk] = useState(true);
  const [sec, setSec] = useState<"list" | "import" | "special">("list");
  const [expCat, setExpCat] = useState<string | null>(null);
  const [hrExp, setHrExp] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  /* Load: Supabase-first, localStorage fallback */
  useEffect(() => {
    let cancelled = false;
    async function load() {
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
      setMounted(true);
    }
    void load();
    return () => { cancelled = true; };
  }, [companyId]);

  /* Category matching */
  const catPpl = useCallback(
    (c: SMCat) => ppl.filter((p) => {
      if (p.specialMonitoringCategories?.includes(c.key)) return true;
      const lower = p.specialMonitoring.toLowerCase();
      return lower.includes(c.key) || lower.includes(c.label.toLowerCase());
    }),
    [ppl],
  );

  const sCnt = useMemo(() => {
    const m: Record<string, number> = {};
    CATS.forEach((c) => { m[c.key] = catPpl(c).length; });
    return m;
  }, [catPpl]);

  const hrCnt = useMemo(() => ppl.filter((p) => p.highRiskDuty).length, [ppl]);
  const hrPpl = useMemo(() => ppl.filter((p) => p.highRiskDuty), [ppl]);
  const depts = departments.filter(Boolean);
  const locs = locations.filter(Boolean);

  /* Template download */
  const dl = useCallback(() => {
    dlCSV(mkCSV(), `${companyName.replace(/\s+/g, "_")}_personel_sablonu.csv`);
  }, [companyName]);

  /* CSV Import: Supabase-first */
  const doImp = useCallback(async () => {
    if (!impFile) { setImpMsg("L\u00FCtfen bir CSV dosyas\u0131 se\u00E7in."); setImpOk(false); return; }
    setImpBusy(true); setImpMsg("");
    try {
      const text = await readEnc(impFile);
      const records = toRecs(text);
      if (!records.length) { setImpMsg("Dosyada ge\u00E7erli kay\u0131t bulunamad\u0131."); setImpOk(false); return; }
      const sbResult = await importPersonnelToSupabase(companyId, records);
      setPpl((prev) => { const next = [...prev, ...records]; savePersonnelLocal(companyId, next); return next; });
      setImpMsg(sbResult !== null
        ? `${records.length} personel kayd\u0131 ba\u015Far\u0131yla i\u00E7e aktar\u0131ld\u0131. (Supabase)`
        : `${records.length} personel kayd\u0131 ba\u015Far\u0131yla i\u00E7e aktar\u0131ld\u0131. (Yerel)`);
      setImpOk(true); setImpFile(null); setSec("list");
    } catch { setImpMsg("Dosya okunurken hata olu\u015Ftu."); setImpOk(false); }
    finally { setImpBusy(false); }
  }, [impFile, companyId]);

  /* Remove: Supabase soft-delete first */
  const rm = useCallback(async (id: string) => {
    setRemovingId(id);
    await removePersonnelFromSupabase(id);
    setPpl((prev) => { const next = prev.filter((p) => p.id !== id); savePersonnelLocal(companyId, next); return next; });
    setRemovingId(null);
  }, [companyId]);

  /* Export existing personnel */
  const doExport = useCallback(() => { exportPersonnelCSV(ppl, companyName); }, [ppl, companyName]);

  /* Loading state */
  if (!mounted) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="mx-auto h-7 w-7 animate-spin rounded-full border-4 border-slate-200 border-t-primary" />
          <p className="mt-3 text-sm text-slate-500">Personel verileri y&#252;kleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header summary */}
      <div className="rounded-[24px] border border-blue-100 bg-blue-50/40 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-950">Personel Y&#246;netimi</h3>
            <p className="mt-2 text-sm leading-7 text-slate-600">{companyName} i&#231;in personel kay&#305;tlar&#305;n&#305; y&#246;netin.</p>
          </div>
          {dataSource === "supabase" ? (
            <Badge variant="success" className="text-[10px]">Supabase</Badge>
          ) : (
            <Badge variant="neutral" className="text-[10px]">Yerel Depolama</Badge>
          )}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Toplam Personel</p>
            <p className="mt-1 text-lg font-semibold text-slate-950">{ppl.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Y&#252;ksek Riskli</p>
            <p className={`mt-1 text-lg font-semibold ${hrCnt > 0 ? "text-red-600" : "text-slate-950"}`}>{hrCnt}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">B&#246;l&#252;m</p>
            <p className="mt-1 text-lg font-semibold text-slate-950">{depts.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Lokasyon</p>
            <p className="mt-1 text-lg font-semibold text-slate-950">{locs.length}</p>
          </div>
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex flex-wrap gap-2">
        {(["list", "import", "special"] as const).map((t) => (
          <button key={t} type="button" onClick={() => setSec(t)}
            className={`inline-flex h-10 items-center rounded-2xl px-4 text-sm font-medium transition-colors ${sec === t ? "bg-primary text-primary-foreground shadow-[var(--shadow-soft)]" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-950"}`}
          >
            {t === "list" ? "Personel Listesi" : t === "import" ? "\u0130\u00E7e Aktarma" : "\u00D6zel \u0130zleme"}
          </button>
        ))}
      </div>

      {/* LIST SECTION */}
      {sec === "list" && (
        <div className="space-y-4">
          {ppl.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-slate-300 bg-white px-6 py-8 text-center">
              <p className="text-base font-semibold text-slate-950">Hen&#252;z personel kayd&#305; bulunmuyor</p>
              <p className="mt-2 text-sm text-slate-600">CSV &#351;ablonunu indirip &#304;&#231;e Aktarma sekmesinden y&#252;kleyin.</p>
              <div className="mt-4 flex flex-wrap justify-center gap-3">
                <Button variant="outline" onClick={dl}>&#350;ablonu &#304;ndir</Button>
                <Button onClick={() => setSec("import")}>&#304;&#231;e Aktarmaya Git</Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-slate-600">{ppl.length} personel kayd&#305;</p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={dl}>&#350;ablonu &#304;ndir</Button>
                  <Button variant="outline" size="sm" onClick={doExport}>Listeyi D&#305;&#351;a Aktar</Button>
                  <Button size="sm" onClick={() => setSec("import")}>Yeni &#304;&#231;e Aktarma</Button>
                </div>
              </div>
              <div className="overflow-x-auto rounded-[24px] border border-slate-200 bg-white">
                <table className="w-full min-w-[900px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70">
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Sicil</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Ad Soyad</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">B&#246;l&#252;m</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Pozisyon</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Lokasyon</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">E&#287;itim</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Muayene</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">&#214;zel</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">&#304;&#351;lem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ppl.map((p) => (
                      <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-medium text-slate-950">{p.employeeId || "\u2014"}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-950">{p.firstName} {p.lastName}</p>
                          {p.phone && <p className="text-xs text-slate-500">{p.phone}</p>}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{p.department || "\u2014"}</td>
                        <td className="px-4 py-3 text-slate-700">{p.position || "\u2014"}</td>
                        <td className="px-4 py-3 text-slate-700">{p.location || "\u2014"}</td>
                        <td className="px-4 py-3">
                          {p.trainingStatus ? (
                            <Badge variant={p.trainingStatus.toLowerCase().includes("tamaml") ? "success" : p.trainingStatus.toLowerCase().includes("eksik") ? "danger" : "neutral"} className="text-[10px]">{p.trainingStatus}</Badge>
                          ) : <span className="text-slate-400">{"\u2014"}</span>}
                        </td>
                        <td className="px-4 py-3">
                          {p.periodicExamStatus ? (
                            <Badge variant={p.periodicExamStatus.toLowerCase().includes("g\u00fcncel") ? "success" : p.periodicExamStatus.toLowerCase().includes("gecik") ? "danger" : "neutral"} className="text-[10px]">{p.periodicExamStatus}</Badge>
                          ) : <span className="text-slate-400">{"\u2014"}</span>}
                        </td>
                        <td className="px-4 py-3">
                          {p.highRiskDuty && <Badge variant="danger" className="text-[10px]">Y&#252;ksek Risk</Badge>}
                          {p.specialMonitoring && <Badge variant="warning" className="ml-1 text-[10px]">{p.specialMonitoring}</Badge>}
                        </td>
                        <td className="px-4 py-3">
                          <button type="button" onClick={() => void rm(p.id)} disabled={removingId === p.id} className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50">
                            {removingId === p.id ? "..." : "Kald\u0131r"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* IMPORT SECTION */}
      {sec === "import" && (
        <div className="space-y-5">
          <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-base font-bold text-primary">1</div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-slate-950">CSV Şablonunu İndirin</h4>
                <p className="mt-1 text-sm leading-7 text-slate-600">Aşağıdaki şablonu indirip personel bilgilerini doldurun.</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={dl}>Şablonu İndir</Button>
              </div>
            </div>
          </div>
          <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-base font-bold text-primary">2</div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-slate-950">CSV Dosyasını Yükleyin</h4>
                <p className="mt-1 text-sm leading-7 text-slate-600">Doldurduğunuz CSV dosyasını seçin ve içe aktarın.</p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <input type="file" accept=".csv,.txt" onChange={(e) => setImpFile(e.target.files?.[0] ?? null)} className="text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary" />
                  <Button onClick={() => void doImp()} disabled={impBusy || !impFile}>{impBusy ? "Yükleniyor..." : "İçe Aktar"}</Button>
                </div>
              </div>
            </div>
          </div>
          {impMsg && (
            <div className={`rounded-2xl border px-5 py-4 text-sm font-medium ${impOk ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-800"}`}>{impMsg}</div>
          )}
        </div>
      )}

      {/* SPECIAL MONITORING SECTION */}
      {sec === "special" && (
        <div className="space-y-5">
          <div className="rounded-[24px] border border-amber-100 bg-amber-50/40 p-5">
            <h3 className="text-base font-semibold text-slate-950">Özel İzleme Kategorileri</h3>
            <p className="mt-2 text-sm leading-7 text-slate-600">Hassas gruplar ve özel izleme gerektiren çalışanlar. Bu veriler yalnızca yetkili roller tarafından görüntülenir.</p>
            <div className="mt-2 flex items-center gap-2">
              <Badge variant="warning" className="text-[10px]">Hassas Veri</Badge>
              <span className="text-xs text-slate-500">Erişim yetki kontrolüne tabidir</span>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {CATS.map((cat) => {
              const cnt = sCnt[cat.key] || 0;
              const open = expCat === cat.key;
              const emps = catPpl(cat);
              return (
                <div key={cat.key} className="rounded-[24px] border border-slate-200 bg-white p-4">
                  <button type="button" onClick={() => setExpCat(open ? null : cat.key)} className="flex w-full items-start justify-between gap-3 text-left">
                    <div className="flex-1">
                      <Badge variant={cat.bv} className="text-[10px]">{cat.label}</Badge>
                      <p className="mt-2 text-sm leading-7 text-slate-600">{cat.desc}</p>
                    </div>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-lg font-semibold text-slate-950">{cnt}</div>
                  </button>
                  {cnt > 0 && (
                    <p className="mt-2 cursor-pointer text-xs font-medium text-primary" onClick={() => setExpCat(open ? null : cat.key)}>
                      {open ? "\u25B2 Listeyi gizle" : "\u25BC Çalışanları göster"}
                    </p>
                  )}
                  {cnt === 0 && <p className="mt-3 text-xs text-slate-400">Bu kategoride kayıtlı çalışan bulunmuyor.</p>}
                  {open && cnt > 0 && <EmpTbl rows={emps} />}
                </div>
              );
            })}
          </div>
          <div className="rounded-[24px] border border-red-100 bg-red-50/40 p-5">
            <button type="button" onClick={() => setHrExp(!hrExp)} className="flex w-full items-start justify-between gap-4 text-left">
              <div>
                <h4 className="text-sm font-semibold text-slate-950">Yüksek Riskli Görev Takibi</h4>
                <p className="mt-2 text-sm leading-7 text-slate-600">Yüksekte çalışma, kapalı alan, kimyasal maruz kalma gibi yüksek riskli görevlerdeki çalışanlar.</p>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-100 text-xl font-bold text-red-700">{hrCnt}</div>
            </button>
            {hrCnt > 0 && (
              <p className="mt-2 cursor-pointer text-xs font-medium text-red-600" onClick={() => setHrExp(!hrExp)}>
                {hrExp ? "\u25B2 Listeyi gizle" : "\u25BC Çalışanları göster"}
              </p>
            )}
            {hrExp && hrCnt > 0 && <EmpTbl rows={hrPpl} />}
            {hrExp && hrCnt === 0 && (
              <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-5 text-center">
                <p className="text-sm text-slate-500">Yüksek riskli görevde kayıtlı çalışan yok.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
