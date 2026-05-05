"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Bot, Check, ClipboardCheck, Download, GitBranch, HelpCircle, Network, Link as LinkIcon, Target, Building2, Plus, ShieldAlert, Sparkles, Stethoscope, TriangleAlert, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { IshikawaFishboneDiagram } from "@/components/incidents/IshikawaFishboneDiagram";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/ui/page-header";
import { clearPersistedStates, usePersistedState } from "@/lib/use-persisted-state";
import { loadCompanyDirectory } from "@/lib/company-directory";
import { calculateBusinessDayDeadline, type CorrectiveActionAiSuggestion, type IshikawaAiResponse } from "@/lib/incidents/ai";
import { requestCorrectiveActions, requestIshikawaAnalysis } from "@/lib/incidents/ai-client";
import { addWitness, createDof, createIncident, createIshikawa, saveIncidentPersonnel, type IncidentRecord, type IncidentType } from "@/lib/supabase/incident-api";
import { METHOD_META, type AnalysisMethod, type FiveWhyData, type FaultTreeData, type ScatData, type BowTieData, type MortData, type R2dRcaData } from "@/lib/analysis/types";

const ANALYSIS_METHODS = Object.keys(METHOD_META) as AnalysisMethod[];
import { createAnalysis, requestAiAnalysis } from "@/lib/analysis/api";
import { FiveWhyPanel } from "@/components/analysis/FiveWhyPanel";
import { FaultTreePanel } from "@/components/analysis/FaultTreePanel";
import { ScatPanel } from "@/components/analysis/ScatPanel";
import { BowTiePanel } from "@/components/analysis/BowTiePanel";
import { MortPanel } from "@/components/analysis/MortPanel";
import { R2dRcaPanel } from "@/components/analysis/R2dRcaPanel";
import { Activity } from "lucide-react";
import {
  computeR2DRCA,
  R2D_DIMENSIONS as R2D_DIMENSIONS_C,
  DIMENSION_META as R2D_META,
} from "@/lib/r2d-rca-engine";
import { DofOsgbForm, type DofFormData } from "@/components/incidents/DofOsgbForm";
import { exportDofPdf } from "@/lib/dof-pdf-template";
import { PersonnelPicker, type PickedPerson } from "@/components/incidents/PersonnelPicker";
import { exportIshikawaPdf, exportIshikawaPdfBlob } from "@/lib/ishikawa-pdf-template";
import { exportFiveWhyPdf, exportFiveWhyPdfBlob } from "@/lib/fivewhy-pdf-template";
import { exportFaultTreePdf, exportFaultTreePdfBlob } from "@/lib/fault-tree-pdf-template";
import { exportScatPdf, exportScatPdfBlob } from "@/lib/scat-pdf-template";
import { exportBowTiePdf, exportBowTiePdfBlob } from "@/lib/bowtie-pdf-template";
import { exportMortPdf, exportMortPdfBlob } from "@/lib/mort-pdf-template";
import { shareOrDownloadPdf } from "@/lib/pdf-generator";
import type { PdfReportMeta } from "@/lib/pdf-shared-template";
import { createClient } from "@/lib/supabase/client";
import { buildR2dRcaPdfI18n } from "@/lib/r2d-rca-pdf-i18n";

const METHOD_ICON_MAP: Record<string, typeof GitBranch> = {
  GitBranch, HelpCircle, Network, Link: LinkIcon, Target, Building2, Activity,
};

type Step = "type" | "basic" | "ishikawa" | "dof" | "review";
type Cat = "insan" | "makine" | "metot" | "malzeme" | "olcum" | "cevre";

const TYPE_OPTION_DEFS: { value: IncidentType; icon: typeof ShieldAlert; badge: "danger" | "warning" | "accent" | "neutral" }[] = [
  { value: "work_accident", icon: ShieldAlert, badge: "danger" },
  { value: "occupational_disease", icon: Stethoscope, badge: "accent" },
  { value: "near_miss", icon: TriangleAlert, badge: "warning" },
  { value: "other", icon: FileText, badge: "neutral" },
];

const CAT_ORDER: Cat[] = ["insan", "makine", "metot", "malzeme", "olcum", "cevre"];

const CAT_TO_RCA_CATEGORY: Record<Cat, "insan" | "makine" | "yontem" | "malzeme" | "cevre" | "yonetim"> = {
  insan: "insan",
  makine: "makine",
  metot: "yontem",
  malzeme: "malzeme",
  olcum: "yonetim",
  cevre: "cevre",
};

const dateInput = (date: Date) => date.toISOString().split("T")[0];
const EMPTY_ISHIKAWA = (): IshikawaAiResponse => ({
  analysis_summary: "",
  primary_root_cause: "",
  severity_assessment: "Orta",
  categories: { insan: [], makine: [], metot: [], malzeme: [], olcum: [], cevre: [] },
});
/** Şema `suggested_role` için yalnızca sabit TR enum değerleri; arayüz dili ayrı. */
function emptySuggestion(): CorrectiveActionAiSuggestion {
  return {
    root_cause: "",
    category: "insan",
    corrective_action: "",
    preventive_action: "",
    suggested_role: "İSG Uzmanı",
    suggested_deadline_days: 30,
    priority: "Orta",
    estimated_effort: "4 saat",
  };
}

export function NewIncidentWizard() {
  const fishbonePrintRef = useRef<HTMLDivElement | null>(null);
  const [stepIndex, setStepIndex] = usePersistedState("incident:v2:step", 0);
  const [incidentType, setIncidentType] = usePersistedState<IncidentType | null>("incident:v2:type", null);
  const [companyId, setCompanyId] = usePersistedState<string | null>("incident:v2:company", null);
  const [incidentDate, setIncidentDate] = usePersistedState("incident:v2:date", "");
  const [incidentTime, setIncidentTime] = usePersistedState("incident:v2:time", "");
  const [location, setLocation] = usePersistedState("incident:v2:location", "");
  const [department, setDepartment] = usePersistedState("incident:v2:department", "");
  const [affectedPersons, setAffectedPersons] = usePersistedState<PickedPerson[]>("incident:v2:affectedPersons", []);
  const [narrative, setNarrative] = usePersistedState("incident:v2:narrative", "");
  const [firstAidProvided, setFirstAidProvided] = usePersistedState("incident:v2:firstAidProvided", false);
  const [firstAidNotes, setFirstAidNotes] = usePersistedState("incident:v2:firstAidNotes", "");
  const [witnessPersons, setWitnessPersons] = usePersistedState<PickedPerson[]>("incident:v2:witnessPersons", []);
  const [ishikawa, setIshikawa] = usePersistedState<IshikawaAiResponse | null>("incident:v2:ishikawa", null);
  // RiskNova'nın kendi modeli (R₂D-RCA) varsayılan analiz yöntemi.
  // Diğer 6 klasik yöntem (Ishikawa, 5 Why, FTA, SCAT, Bow-Tie, MORT) isteğe bağlı alternatif.
  const [analysisMethod, setAnalysisMethod] = usePersistedState<AnalysisMethod>("incident:v2:analysisMethod", "r2d_rca");
  const [fiveWhyData, setFiveWhyData] = usePersistedState<FiveWhyData | null>("incident:v2:fiveWhy", null);
  const [faultTreeData, setFaultTreeData] = usePersistedState<FaultTreeData | null>("incident:v2:faultTree", null);
  const [scatData, setScatData] = usePersistedState<ScatData | null>("incident:v2:scat", null);
  const [bowTieData, setBowTieData] = usePersistedState<BowTieData | null>("incident:v2:bowTie", null);
  const [mortData, setMortData] = usePersistedState<MortData | null>("incident:v2:mort", null);
  const [r2dRcaData, setR2dRcaData] = usePersistedState<R2dRcaData | null>("incident:v2:r2dRca", null);
  const [ishikawaCustomCats, setIshikawaCustomCats] = usePersistedState<{ key: string; label: string; items: string[] }[]>("incident:v2:ishikawaCustom", []);
  const [suggestions, setSuggestions] = usePersistedState<DofFormData[]>("incident:v2:dof", []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedIncident, setSavedIncident] = useState<IncidentRecord | null>(null);
  const [showSgkModal, setShowSgkModal] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string; title: string } | null>(null);
  const [pdfShareBusy, setPdfShareBusy] = useState(false);
  const [pdfShareFeedback, setPdfShareFeedback] = useState<"shared" | "downloaded" | null>(null);
  const [sgkAjandaBusy, setSgkAjandaBusy] = useState(false);
  const [sgkAjandaStatus, setSgkAjandaStatus] = useState<"idle" | "success" | "error">("idle");
  const [sgkAjandaError, setSgkAjandaError] = useState<string | null>(null);

  const t = useTranslations("incidents");
  const tw = useTranslations("incidents.wizard");
  const trca = useTranslations("incidents.rca");
  const tr2d = useTranslations("incidents.r2dRca");
  const locale = useLocale();
  const r2dPdfI18n = useMemo(() => buildR2dRcaPdfI18n(tr2d, locale), [tr2d, locale]);

  const localizedMethodMeta = useMemo(() => {
    const out = {} as Record<AnalysisMethod, (typeof METHOD_META)[AnalysisMethod]>;
    for (const m of ANALYSIS_METHODS) {
      const base = METHOD_META[m];
      out[m] = {
        ...base,
        label: trca(`methodMeta.${m}.label`),
        subtitle: trca(`methodMeta.${m}.subtitle`),
        description: trca(`methodMeta.${m}.description`),
      };
    }
    return out;
  }, [trca]);

  const typeOptions = useMemo(
    () =>
      TYPE_OPTION_DEFS.map((o) => ({
        ...o,
        label: t(`types.${o.value}`),
        desc: tw(`typeDesc.${o.value}`),
      })),
    [t, tw],
  );

  const catMeta = useMemo(
    () =>
      CAT_ORDER.map((key) => ({
        key,
        label: trca(`categories.${CAT_TO_RCA_CATEGORY[key]}`),
      })),
    [trca],
  );

  const severityOptions = useMemo(
    () =>
      [
        { value: "Düşük" as const, label: tw("severityLow") },
        { value: "Orta" as const, label: tw("severityMedium") },
        { value: "Yüksek" as const, label: tw("severityHigh") },
        { value: "Kritik" as const, label: tw("severityCritical") },
      ],
    [tw],
  );

  const incidentTitleForAnalysis = useMemo(
    () => (narrative.trim() ? narrative : tw("incidentAnalysisDefault")),
    [narrative, tw],
  );

  // Auth user — PDF "Hazırlayan" alanı için
  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled || !data.user) return;
      const meta = (data.user.user_metadata ?? {}) as Record<string, unknown>;
      const fullName =
        (typeof meta.full_name === "string" && meta.full_name) ||
        (typeof meta.name === "string" && meta.name) ||
        data.user.email?.split("@")[0] ||
        tw("unknownUser");
      const title =
        (typeof meta.title === "string" && meta.title) ||
        (typeof meta.role === "string" && meta.role) ||
        (typeof meta.user_type === "string" && meta.user_type) ||
        tw("defaultRoleTitle");
      setCurrentUser({
        name: String(fullName),
        email: data.user.email ?? "",
        title: String(title),
      });
    }).catch(() => { /* sessizce geç */ });
    return () => { cancelled = true; };
  }, [tw]);

  const companies = useMemo(() => loadCompanyDirectory(), []);
  const selectedCompany = companies.find((item) => item.id === companyId) ?? null;
  const steps: Step[] = useMemo(() => (incidentType === "other" ? ["type", "basic", "review"] : ["type", "basic", "ishikawa", "dof", "review"]), [incidentType]);
  const currentStep = steps[Math.min(stepIndex, steps.length - 1)] ?? "type";
  const requiredAi = incidentType === "work_accident" || incidentType === "occupational_disease";

  // Witness row helpers kaldırıldı — PersonnelPicker'a geçildi
  function addCause(cat: Cat) { setIshikawa((prev) => prev ? { ...prev, categories: { ...prev.categories, [cat]: [...prev.categories[cat], ""] } } : { analysis_summary: "", primary_root_cause: "", severity_assessment: "Orta", categories: { insan: cat === "insan" ? [""] : [], makine: cat === "makine" ? [""] : [], metot: cat === "metot" ? [""] : [], malzeme: cat === "malzeme" ? [""] : [], olcum: cat === "olcum" ? [""] : [], cevre: cat === "cevre" ? [""] : [] } }); }
  function updateCause(cat: Cat, index: number, value: string) { if (!ishikawa) return; const next = [...ishikawa.categories[cat]]; next[index] = value; setIshikawa({ ...ishikawa, categories: { ...ishikawa.categories, [cat]: next } }); }
  function removeCause(cat: Cat, index: number) { if (!ishikawa) return; setIshikawa({ ...ishikawa, categories: { ...ishikawa.categories, [cat]: ishikawa.categories[cat].filter((_, i) => i !== index) } }); }
  function updateSuggestion(index: number, field: keyof CorrectiveActionAiSuggestion, value: string | number) { setSuggestions((prev) => prev.map((item, i) => i === index ? { ...item, [field]: value } : item)); }
  function addManualSuggestion() { setSuggestions((prev) => [...prev, emptySuggestion()]); }
  function removeSuggestion(index: number) { setSuggestions((prev) => prev.filter((_, i) => i !== index)); }
  /** PDF için ortak meta üretici — tüm yöntemler aynı header/footer'ı kullanır */
  function buildPdfMeta(): Omit<PdfReportMeta, "reportTitle" | "reportSubtitle"> {
    const incidentTypeLabel = typeOptions.find((item) => item.value === incidentType)?.label;
    const locationDept = [location, department].filter(Boolean).join(" · ");
    const shareUrl = typeof window !== "undefined"
      ? `${window.location.origin}/incidents${savedIncident ? `/${savedIncident.id}` : "/new"}`
      : "";
    return {
      companyName: selectedCompany?.name ?? null,
      location: locationDept || null,
      incidentTitle: narrative || null,
      incidentDate: incidentDate || null,
      incidentType: incidentTypeLabel ?? null,
      preparedBy: currentUser ? {
        name: currentUser.name,
        title: currentUser.title,
        email: currentUser.email,
      } : null,
      shareUrl,
    };
  }

  /** Paylaş wrapper — feedback state ile */
  async function handleSharePdfWithFeedback() {
    setPdfShareBusy(true);
    setPdfShareFeedback(null);
    try {
      await shareAnalysisPdf();
      setPdfShareFeedback("shared");
      setTimeout(() => setPdfShareFeedback(null), 3000);
    } finally {
      setPdfShareBusy(false);
    }
  }

  /** Aktif analiz yöntemine göre uygun PDF template'i dispatch eder */
  async function exportAnalysisPdf() {
    const meta = buildPdfMeta();
    try {
      switch (analysisMethod) {
        case "ishikawa":
          if (!ishikawa) { alert(tw("alerts.ishikawaFill")); return; }
          await exportIshikawaPdf(
            {
              insan: ishikawa.categories.insan,
              makine: ishikawa.categories.makine,
              metot: ishikawa.categories.metot,
              malzeme: ishikawa.categories.malzeme,
              olcum: ishikawa.categories.olcum,
              cevre: ishikawa.categories.cevre,
              problemStatement: ishikawa.analysis_summary || narrative,
              analysisSummary: ishikawa.analysis_summary,
              primaryRootCause: ishikawa.primary_root_cause,
              severityAssessment: ishikawa.severity_assessment,
              customCategories: ishikawaCustomCats,
            },
            meta,
          );
          break;
        case "five_why":
          if (!fiveWhyData) { alert(tw("alerts.fiveWhyFill")); return; }
          await exportFiveWhyPdf({ ...fiveWhyData, problemStatement: narrative }, meta);
          break;
        case "fault_tree":
          if (!faultTreeData) { alert(tw("alerts.faultTreeFill")); return; }
          await exportFaultTreePdf({ ...faultTreeData, problemStatement: narrative }, meta);
          break;
        case "scat":
          if (!scatData) { alert(tw("alerts.scatFill")); return; }
          await exportScatPdf({ ...scatData, problemStatement: narrative }, meta);
          break;
        case "bow_tie":
          if (!bowTieData) { alert(tw("alerts.bowTieFill")); return; }
          await exportBowTiePdf({ ...bowTieData, problemStatement: narrative }, meta);
          break;
        case "mort":
          if (!mortData) { alert(tw("alerts.mortFill")); return; }
          await exportMortPdf({ ...mortData, problemStatement: narrative }, meta);
          break;
        case "r2d_rca":
          // R2D-RCA paneli kendi PDF butonuna sahip; burada da çalışsın diye fallback
          if (!r2dRcaData) { alert(tw("alerts.r2dFill")); return; }
          // Lazy import — döngü olmasın diye
          import("@/lib/r2d-rca-pdf-template").then(({ exportR2dRcaPdf }) =>
            exportR2dRcaPdf(r2dRcaData, meta, r2dPdfI18n),
          );
          break;
      }
    } catch (e) {
      console.error("exportAnalysisPdf:", e);
      alert(tw("alerts.pdfExportError"));
    }
  }

  /** Geriye dönük uyumluluk: eski "Balık Kılçığı PDF" butonu artık aktif yöntemin PDF'ini açar */
  const exportFishbonePdf = () => void exportAnalysisPdf();

  /**
   * Aktif analiz yöntemine göre PDF blob üretir, native share veya download.
   * Mobilde WhatsApp/Mail/AirDrop seçeneklerine PDF dosyası eklenmiş olarak açar.
   */
  async function shareAnalysisPdf() {
    const meta = buildPdfMeta();
    const safeTitle = (narrative || tw("reportFileStem")).replace(/[^a-z0-9-_]/gi, "_").slice(0, 60) || tw("reportFileStem");
    const date = new Date().toISOString().slice(0, 10);
    try {
      let blob: Blob | null = null;
      let reportTitle = tw("pdfTitles.generic");

      switch (analysisMethod) {
        case "ishikawa":
          if (!ishikawa) { alert(tw("alerts.ishikawaFill")); return; }
          reportTitle = tw("pdfTitles.ishikawa");
          blob = await exportIshikawaPdfBlob(
            {
              insan: ishikawa.categories.insan,
              makine: ishikawa.categories.makine,
              metot: ishikawa.categories.metot,
              malzeme: ishikawa.categories.malzeme,
              olcum: ishikawa.categories.olcum,
              cevre: ishikawa.categories.cevre,
              problemStatement: ishikawa.analysis_summary || narrative,
              analysisSummary: ishikawa.analysis_summary,
              primaryRootCause: ishikawa.primary_root_cause,
              severityAssessment: ishikawa.severity_assessment,
              customCategories: ishikawaCustomCats,
            },
            meta,
          );
          break;
        case "five_why":
          if (!fiveWhyData) { alert(tw("alerts.fiveWhyFill")); return; }
          reportTitle = tw("pdfTitles.fiveWhy");
          blob = await exportFiveWhyPdfBlob({ ...fiveWhyData, problemStatement: narrative }, meta);
          break;
        case "fault_tree":
          if (!faultTreeData) { alert(tw("alerts.faultTreeFill")); return; }
          reportTitle = tw("pdfTitles.faultTree");
          blob = await exportFaultTreePdfBlob({ ...faultTreeData, problemStatement: narrative }, meta);
          break;
        case "scat":
          if (!scatData) { alert(tw("alerts.scatFill")); return; }
          reportTitle = tw("pdfTitles.scat");
          blob = await exportScatPdfBlob({ ...scatData, problemStatement: narrative }, meta);
          break;
        case "bow_tie":
          if (!bowTieData) { alert(tw("alerts.bowTieFill")); return; }
          reportTitle = tw("pdfTitles.bowTie");
          blob = await exportBowTiePdfBlob({ ...bowTieData, problemStatement: narrative }, meta);
          break;
        case "mort":
          if (!mortData) { alert(tw("alerts.mortFill")); return; }
          reportTitle = tw("pdfTitles.mort");
          blob = await exportMortPdfBlob({ ...mortData, problemStatement: narrative }, meta);
          break;
        case "r2d_rca": {
          if (!r2dRcaData) { alert(tw("alerts.r2dFill")); return; }
          reportTitle = tw("pdfTitles.r2d");
          const { exportR2dRcaPdfBlob } = await import("@/lib/r2d-rca-pdf-template");
          blob = await exportR2dRcaPdfBlob(r2dRcaData, meta, r2dPdfI18n);
          break;
        }
      }

      if (!blob) return;
      const fileName = `${safeTitle}-${date}.pdf`;
      await shareOrDownloadPdf(blob, fileName, reportTitle, {
        shareText: narrative ? `${reportTitle}: ${narrative.slice(0, 100)}` : reportTitle,
        shareUrl: meta.shareUrl ?? undefined,
      });
    } catch (e) {
      console.error("shareAnalysisPdf:", e);
      alert(tw("alerts.pdfShareError"));
    }
  }

  async function runIshikawa() {
    if (!incidentType || incidentType === "other" || !companyId) return;
    setBusy(true); setError(null);
    try {
      const result = await requestIshikawaAnalysis({ incidentType, companyWorkspaceId: companyId, companySector: selectedCompany?.sector ?? "", location, narrative, affectedCount: affectedPersons.length, witnesses: witnessPersons.map((w) => w.fullName).filter(Boolean).join("; ") });
      setIshikawa(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : tw("alerts.aiBusy"));
    } finally { setBusy(false); }
  }

  function extractRootCauses(): { category: "insan" | "makine" | "metot" | "malzeme" | "olcum" | "cevre"; cause: string }[] {
    switch (analysisMethod) {
      case "ishikawa":
        if (!ishikawa) return [];
        return [
          ...ishikawa.categories.insan.map((cause) => ({ category: "insan" as const, cause })),
          ...ishikawa.categories.makine.map((cause) => ({ category: "makine" as const, cause })),
          ...ishikawa.categories.metot.map((cause) => ({ category: "metot" as const, cause })),
          ...ishikawa.categories.malzeme.map((cause) => ({ category: "malzeme" as const, cause })),
          ...ishikawa.categories.olcum.map((cause) => ({ category: "olcum" as const, cause })),
          ...ishikawa.categories.cevre.map((cause) => ({ category: "cevre" as const, cause })),
        ].filter((item) => item.cause.trim());

      case "five_why":
        if (!fiveWhyData) return [];
        const whyItems = fiveWhyData.whys.map((w) => ({ category: "metot" as const, cause: w.answer })).filter((item) => item.cause.trim());
        if (fiveWhyData.rootCause.trim()) whyItems.push({ category: "metot" as const, cause: fiveWhyData.rootCause });
        return whyItems;

      case "fault_tree":
        if (!faultTreeData) return [];
        return faultTreeData.nodes
          .filter((n) => n.type === "basic_event" && n.label.trim())
          .map((n) => ({ category: "metot" as const, cause: n.label }));

      case "scat":
        if (!scatData) return [];
        return [
          ...scatData.basicCauses.map((c) => ({ category: "metot" as const, cause: c })),
          ...scatData.controlDeficiencies.map((c) => ({ category: "metot" as const, cause: c })),
        ].filter((item) => item.cause.trim());

      case "bow_tie":
        if (!bowTieData) return [];
        return bowTieData.threats.flatMap((t) =>
          t.causes.map((c) => ({ category: "metot" as const, cause: c })),
        ).filter((item) => item.cause.trim());

      case "mort":
        if (!mortData) return [];
        return [
          ...mortData.sections.managementSystem.map((c) => ({ category: "metot" as const, cause: c })),
          ...mortData.sections.supervisoryControl.map((c) => ({ category: "metot" as const, cause: c })),
        ].filter((item) => item.cause.trim());

      case "r2d_rca":
        if (!r2dRcaData || !Array.isArray(r2dRcaData.t0) || !Array.isArray(r2dRcaData.t1)) return [];
        {
          const r = computeR2DRCA(r2dRcaData.t0, r2dRcaData.t1);
          // C1-C9 kodlarını 6M kategorilerine map'le
          const R2D_C_TO_6M: Record<string, "insan" | "makine" | "metot" | "malzeme" | "olcum" | "cevre"> = {
            C1: "cevre", C2: "insan", C3: "insan", C4: "cevre",
            C5: "malzeme", C6: "metot", C7: "makine", C8: "metot", C9: "insan",
          };
          return r.primaryRootCauseIndices.map((i) => {
            const code = R2D_DIMENSIONS_C[i];
            const meta = R2D_META[code];
            return {
              category: R2D_C_TO_6M[code] ?? "metot",
              cause: `${code} ${meta.nameTR}`,
            };
          });
        }

      default:
        return [];
    }
  }

  async function runDof() {
    if (!incidentType || incidentType === "other" || !companyId) return;
    const rootCauses = extractRootCauses();
    if (rootCauses.length === 0) { setError(tw("alerts.completeRcaStep3")); return; }
    setBusy(true); setError(null);
    try {
      const result = await requestCorrectiveActions({ incidentType, companyWorkspaceId: companyId, rootCauses });
      setSuggestions(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : tw("alerts.aiBusy"));
    } finally { setBusy(false); }
  }

  const basicErrors = showErrors && currentStep === "basic" ? {
    company: !companyId,
    date: !incidentDate,
    location: !location.trim(),
    narrative: narrative.trim().length < 50,
  } : { company: false, date: false, location: false, narrative: false };

  const hasAnalysisData = useMemo(() => {
    switch (analysisMethod) {
      case "ishikawa": return !!ishikawa && Object.values(ishikawa.categories).some((list) => list.length > 0);
      case "five_why": return !!fiveWhyData && fiveWhyData.whys.length > 0;
      case "fault_tree": return !!faultTreeData && faultTreeData.nodes.length > 0;
      case "scat": return !!scatData && (scatData.immediateCauses.length > 0 || scatData.basicCauses.length > 0);
      case "bow_tie": return !!bowTieData && (bowTieData.threats.length > 0 || bowTieData.consequences.length > 0);
      case "mort": return !!mortData && (mortData.sections.managementSystem.length > 0 || mortData.sections.supervisoryControl.length > 0);
      case "r2d_rca": return !!r2dRcaData && Array.isArray(r2dRcaData.t0) && r2dRcaData.t0.length === 9 && r2dRcaData.t0.some((v, i) => v !== r2dRcaData.t1[i]);
      default: return false;
    }
  }, [analysisMethod, ishikawa, fiveWhyData, faultTreeData, scatData, bowTieData, mortData, r2dRcaData]);

  const canNext = useMemo(() => {
    if (currentStep === "type") return !!incidentType;
    if (currentStep === "basic") return !!companyId && !!incidentDate && !!location.trim() && narrative.trim().length >= 50;
    if (currentStep === "ishikawa") return requiredAi ? hasAnalysisData : true;
    if (currentStep === "dof") return requiredAi ? suggestions.length > 0 : true;
    return true;
  }, [currentStep, incidentType, companyId, incidentDate, location, narrative, requiredAi, hasAnalysisData, suggestions.length]);

  async function handleSave() {
    if (!incidentType || !companyId) return;
    setBusy(true); setError(null);
    try {
      const sgkDeadline = incidentType === "work_accident" && incidentDate ? dateInput(calculateBusinessDayDeadline(new Date(`${incidentDate}T12:00:00`), 3)) : null;
      const incident = await createIncident({ incidentType, companyWorkspaceId: companyId, incidentDate: incidentDate || null, incidentTime: incidentTime || null, incidentLocation: location || null, incidentDepartment: department || null, description: narrative || null, narrative: narrative || null, accidentCauseDescription: ishikawa?.primary_root_cause || null, dofRequired: suggestions.length > 0, ishikawaRequired: !!ishikawa, ishikawaData: ishikawa as unknown as Record<string, unknown> | null, firstAidProvided, firstAidNotes: firstAidNotes || null, sgkNotificationDeadline: sgkDeadline, status: "reported" });
      // createIncident artık throw ediyor (CreateIncidentError) — buraya gelirsek incident garantili
      if (!incident) throw new Error(tw("alerts.unexpectedNoIncident"));
      if (affectedPersons.length > 0) {
        await saveIncidentPersonnel(
          incident.id,
          affectedPersons.map((person) => ({
            personnelId: person.id ?? null,
            personnelName: person.fullName,
            personnelTc: null,
            personnelDepartment: person.department || department || null,
            personnelPosition: person.positionTitle || null,
            outcome: incidentType === "near_miss" ? "unknown" : "injured",
            injuryType: null, injuryBodyPart: null, injuryCauseEvent: null, injuryCauseTool: null,
            workDisability: false, disabilityStatus: null, daysLost: 0,
            medicalIntervention: firstAidProvided,
            medicalPerson: null, medicalLocation: null, medicalCity: null, medicalDistrict: null,
            medicalDate: null, medicalTime: null, notes: null,
          })),
        );
      }
      for (const witness of witnessPersons) {
        if (witness.fullName.trim()) {
          await addWitness(incident.id, {
            fullName: witness.fullName.trim(),
            tcIdentity: null,
            phone: witness.phone?.trim() || null,
            email: witness.email?.trim() || null,
            address: null,
          });
        }
      }
      if (incidentType !== "other" && ishikawa && analysisMethod === "ishikawa") await createIshikawa(incident.id, incident.organizationId, { problemStatement: ishikawa.analysis_summary, manCauses: ishikawa.categories.insan, machineCauses: ishikawa.categories.makine, methodCauses: ishikawa.categories.metot, materialCauses: ishikawa.categories.malzeme, environmentCauses: ishikawa.categories.cevre, measurementCauses: ishikawa.categories.olcum, rootCauseConclusion: ishikawa.primary_root_cause, aiSuggestions: { ...ishikawa, customCategories: ishikawaCustomCats } as unknown as Record<string, unknown> });
      if (incidentType !== "other" && analysisMethod !== "ishikawa" && hasAnalysisData) {
        const dataMap: Record<string, unknown> = { five_why: fiveWhyData, fault_tree: faultTreeData, scat: scatData, bow_tie: bowTieData, mort: mortData, r2d_rca: r2dRcaData };
        await createAnalysis({ incidentId: incident.id, incidentTitle: incidentTitleForAnalysis, method: analysisMethod, data: dataMap[analysisMethod] });
      }
      if (incidentType !== "other" && suggestions.length > 0) await createDof(incident.id, incident.organizationId, { rootCause: ishikawa?.primary_root_cause ?? suggestions[0]?.root_cause ?? null, rootCauseAnalysis: ishikawa?.analysis_summary ?? narrative, correctiveActions: suggestions.map((item) => ({ action: item.corrective_action, assignedTo: item.suggested_role, deadline: dateInput(calculateBusinessDayDeadline(new Date(), item.suggested_deadline_days)), done: false })), preventiveActions: suggestions.map((item) => ({ action: item.preventive_action, assignedTo: item.suggested_role, deadline: dateInput(calculateBusinessDayDeadline(new Date(), item.suggested_deadline_days)), done: false })), assignedTo: suggestions[0]?.suggested_role ?? null, deadline: dateInput(calculateBusinessDayDeadline(new Date(), suggestions[0]?.suggested_deadline_days ?? 30)), aiSuggestions: { suggestions } });
      setSavedIncident(incident);
      clearPersistedStates("incident:v2:");
      if (incidentType === "work_accident") setShowSgkModal(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : tw("alerts.saveFailed"));
    } finally { setBusy(false); }
  }

  /**
   * SGK bildirim son tarihini kendi Ajanda'mıza (isg_tasks tablosuna) ekler.
   * Google Calendar yerine platform-içi takvim kullanılır.
   * Kategori: Yasal Yükümlülük (amber)
   */
  async function addSgkReminderToAjanda() {
    if (!savedIncident?.sgkNotificationDeadline) {
      setSgkAjandaError(tw("alerts.sgkNoDeadline"));
      setSgkAjandaStatus("error");
      return;
    }
    setSgkAjandaBusy(true);
    setSgkAjandaError(null);
    try {
      const { syncToAjanda } = await import("@/lib/supabase/ajanda-sync");
      const code = savedIncident.incidentCode ?? "—";
      const result = await syncToAjanda({
        title: tw("sgk.taskTitle", { code }),
        description: [
          tw("sgk.taskDescLine1"),
          "",
          tw("sgk.taskDescIncident", { text: narrative || savedIncident.incidentCode }),
          tw("sgk.taskDescDate", { date: incidentDate }),
          tw("sgk.taskDescDeadline", { deadline: savedIncident.sgkNotificationDeadline }),
          tw("sgk.taskDescCode", { code }),
        ].join("\n"),
        startDate: savedIncident.sgkNotificationDeadline,
        category: "YASAL_YUKUMLULUK",
        companyWorkspaceId: savedIncident.companyWorkspaceId ?? companyId,
        location: location || null,
        reminderDays: 1,
        refType: "incident_sgk",
        refId: savedIncident.id,
      });
      if (!result.ok) throw new Error(result.error);
      setSgkAjandaStatus("success");
    } catch (e) {
      console.warn("addSgkReminderToAjanda:", e);
      setSgkAjandaError(e instanceof Error ? e.message : tw("alerts.sgkUnknown"));
      setSgkAjandaStatus("error");
    } finally {
      setSgkAjandaBusy(false);
    }
  }

  return (
    <div className="page-stack">
      <PageHeader title={tw("title")} description={tw("description")} meta={<Link href="/incidents" className="text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="mr-1 inline size-4" /> {tw("backToList")}</Link>} />
      <div className="flex flex-wrap gap-2">{steps.map((step, index) => (
        <button key={step} type="button" onClick={() => index <= stepIndex && setStepIndex(index)} className={`rounded-xl px-3 py-2 text-xs font-medium ${currentStep === step ? "bg-primary text-primary-foreground" : index < stepIndex ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
          {index + 1}. {tw(`steps.${step}`)}
        </button>
      ))}</div>
      {error && <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-200">{error}</div>}

      {currentStep === "type" && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {typeOptions.map((option) => {
            const Icon = option.icon;
            const selected = incidentType === option.value;
            return (
              <button key={option.value} type="button" onClick={() => setIncidentType(option.value)} className={`rounded-2xl border p-5 text-left transition-all ${selected ? "border-primary bg-primary/5 shadow-[var(--shadow-card)]" : "border-border bg-card hover:border-primary/30"}`}>
                <span className={`inline-flex size-12 items-center justify-center rounded-xl ${selected ? "bg-primary/15" : "bg-muted"}`}><Icon className={`size-6 ${selected ? "text-primary" : "text-muted-foreground"}`} strokeWidth={1.5} /></span>
                <div className="mt-4 flex items-center gap-2"><h3 className="text-base font-semibold text-foreground">{option.label}</h3><Badge variant={option.badge}>{option.label}</Badge></div>
                <p className="mt-2 text-sm text-muted-foreground">{option.desc}</p>
              </button>
            );
          })}
        </div>
      )}

      {currentStep === "basic" && (
        <Card>
          <CardHeader>
            <CardTitle>{tw("basicTitle")}</CardTitle>
            <CardDescription>{tw("basicDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={`mb-1 block text-sm font-medium ${basicErrors.company ? "text-red-500" : "text-foreground"}`}>{tw("basic.company")}</label>
                <select value={companyId ?? ""} onChange={(event) => setCompanyId(event.target.value || null)} className={`h-11 w-full rounded-xl border bg-input px-3 text-sm text-foreground ${basicErrors.company ? "border-red-500" : "border-border"}`}>
                  <option value="">{tw("basic.companyPlaceholder")}</option>
                  {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
                </select>
                {basicErrors.company && <p className="mt-1 text-xs text-red-500">{tw("basic.companyRequired")}</p>}
              </div>
              <div>
                <Input label={tw("basic.location")} value={location} onChange={(event) => setLocation(event.target.value)} placeholder={tw("basic.locationPlaceholder")} className={basicErrors.location ? "!border-red-500" : ""} />
                {basicErrors.location && <p className="mt-1 text-xs text-red-500">{tw("basic.locationRequired")}</p>}
              </div>
              <div>
                <Input label={tw("basic.date")} type="date" value={incidentDate} onChange={(event) => setIncidentDate(event.target.value)} className={basicErrors.date ? "!border-red-500" : ""} />
                {basicErrors.date && <p className="mt-1 text-xs text-red-500">{tw("basic.dateRequired")}</p>}
              </div>
              <Input label={tw("basic.time")} type="time" value={incidentTime} onChange={(event) => setIncidentTime(event.target.value)} />
            </div>
            <Input label={tw("basic.department")} value={department} onChange={(event) => setDepartment(event.target.value)} />
            <PersonnelPicker
              companyId={companyId}
              selected={affectedPersons}
              onChange={setAffectedPersons}
              mode="affected"
              label={tw("basic.affected")}
            />
            <Textarea label={tw("basic.narrative")} value={narrative} onChange={(event) => setNarrative(event.target.value)} placeholder={tw("basic.narrativePlaceholder")} rows={10} className={`min-h-[220px] ${basicErrors.narrative ? "!border-red-500" : ""}`} />
            <p className={`text-xs ${basicErrors.narrative ? "text-red-500 font-medium" : "text-muted-foreground"}`}>{tw("nav.minChars", { count: narrative.trim().length })}</p>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <input id="first-aid" type="checkbox" checked={firstAidProvided} onChange={(event) => setFirstAidProvided(event.target.checked)} className="size-4 rounded" />
                <label htmlFor="first-aid" className="text-sm font-medium text-foreground">{tw("basic.firstAidQuestion")}</label>
              </div>
              {firstAidProvided && <Textarea label={tw("basic.firstAidNotes")} value={firstAidNotes} onChange={(event) => setFirstAidNotes(event.target.value)} />}
            </div>
            <PersonnelPicker
              companyId={companyId}
              selected={witnessPersons}
              onChange={setWitnessPersons}
              mode="witness"
              label={tw("basic.witnesses")}
            />
          </CardContent>
        </Card>
      )}

      {currentStep === "ishikawa" && (
        <div className="space-y-4">
          {/* Yöntem seçici */}
          {/* R2D-RCA — RiskNova özel + varsayılan yöntem, ilk sırada */}
          {(() => {
            const meta = localizedMethodMeta.r2d_rca;
            const Icon = METHOD_ICON_MAP[meta.icon] ?? GitBranch;
            const active = analysisMethod === "r2d_rca";
            return (
              <button
                type="button"
                onClick={() => setAnalysisMethod("r2d_rca")}
                className={`group relative flex w-full items-center gap-4 rounded-2xl border-2 p-5 text-left transition-all ${
                  active
                    ? "shadow-[var(--shadow-card)] ring-2 ring-offset-2 ring-offset-background"
                    : "border-border bg-card hover:border-primary/30"
                }`}
                style={
                  active
                    ? { borderColor: meta.color, backgroundColor: `${meta.color}15`, boxShadow: `0 0 0 1px ${meta.color}40, var(--shadow-card)` }
                    : undefined
                }
              >
                {active && (
                  <span
                    className="absolute -top-2 left-4 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
                    style={{ background: meta.color }}
                  >
                    {tw("methodPicker.r2dDefaultBadge")}
                  </span>
                )}
                <span
                  className="inline-flex size-14 shrink-0 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: `${meta.color}20` }}
                >
                  <Icon className="size-7" style={{ color: meta.color }} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold text-foreground">{meta.label}</h3>
                    <Badge variant="warning">{tw("methodPicker.badgeExclusive")}</Badge>
                    <Badge style={{ background: `${meta.color}20`, color: meta.color, borderColor: `${meta.color}40` }}>{tw("methodPicker.badgeAi")}</Badge>
                    <Badge variant="accent">{tw("methodPicker.badgeRecommended")}</Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{meta.subtitle}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{meta.description}</p>
                </div>
              </button>
            );
          })()}

          {/* Klasik 6 yöntem — 3x2 grid (R₂D-RCA varsayılan, bunlar alternatif) */}
          <div className="flex items-center gap-3 pt-2">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {tw("methodPicker.classicDivider")}
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ANALYSIS_METHODS.filter((method) => method !== "r2d_rca")
              .map((method) => {
                const meta = localizedMethodMeta[method];
                const Icon = METHOD_ICON_MAP[meta.icon] ?? GitBranch;
                const active = analysisMethod === method;
                return (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setAnalysisMethod(method)}
                    className={`group relative flex items-start gap-3 rounded-2xl border-2 p-4 text-left transition-all ${
                      active ? "shadow-[var(--shadow-card)]" : "border-border bg-card hover:border-primary/30"
                    }`}
                    style={active ? { borderColor: meta.color, backgroundColor: `${meta.color}10` } : undefined}
                  >
                    <span
                      className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl"
                      style={{ backgroundColor: `${meta.color}18` }}
                    >
                      <Icon className="size-5" style={{ color: meta.color }} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-semibold text-foreground">{meta.label}</h4>
                        {meta.aiSupported && <Badge variant="warning" className="text-[10px]">{tw("methodPicker.badgeAi")}</Badge>}
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">{meta.subtitle}</p>
                      <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-muted-foreground">{meta.description}</p>
                    </div>
                  </button>
                );
              })}
          </div>

          {!requiredAi && !hasAnalysisData && (
            <div className="rounded-2xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
              {tw("dof.nearMissOptional")}
            </div>
          )}

          {/* ============================================================ */}
          {/* GLOBAL PDF AKSIYON BAR — tüm yöntemler için PDF Paylaş + İndir */}
          {/* Aktif yönteme göre uygun PDF template'i çağrılır              */}
          {/* ============================================================ */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-orange-500/10 p-3.5">
            <div className="flex items-center gap-2.5 text-xs">
              <Download className="size-4 text-amber-700 dark:text-amber-400" />
              <div>
                <div className="font-semibold text-foreground">
                  {tw("pdfBar.reportLine", { method: localizedMethodMeta[analysisMethod].label })}
                </div>
                <div className="text-muted-foreground">
                  {hasAnalysisData
                    ? tw("pdfBar.readyWithPreparer", { name: currentUser?.name ?? tw("pdfBar.preparerLoading") })
                    : tw("pdfBar.fillAnalysisFirst")}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={pdfShareFeedback === "shared" ? "accent" : "primary"}
                size="sm"
                onClick={() => void handleSharePdfWithFeedback()}
                disabled={!hasAnalysisData || pdfShareBusy}
                aria-label={tw("pdfBar.shareButton")}
                title={
                  !hasAnalysisData
                    ? tw("pdfBar.shareDisabledTitle")
                    : tw("pdfBar.shareEnabledTitle")
                }
              >
                {pdfShareBusy
                  ? <Bot className="mr-1 size-4 animate-pulse" />
                  : <Sparkles className="mr-1 size-4" />}
                {pdfShareBusy
                  ? tw("pdfBar.preparing")
                  : pdfShareFeedback === "shared"
                    ? tw("pdfBar.shared")
                    : tw("pdfBar.shareButton")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void exportAnalysisPdf()}
                disabled={!hasAnalysisData}
                aria-label={tw("pdfBar.downloadButton")}
                title={
                  !hasAnalysisData
                    ? tw("pdfBar.downloadDisabledTitle")
                    : tw("pdfBar.downloadEnabledTitle")
                }
              >
                <Download className="mr-1 size-4" />
                {tw("pdfBar.downloadButton")}
              </Button>
            </div>
          </div>

          {/* Ishikawa inline panel */}
          {analysisMethod === "ishikawa" && (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2"><GitBranch className="size-5 text-[var(--gold)]" /> {tw("ishikawa.cardTitle")}</CardTitle>
                    <CardDescription>{tw("ishikawa.cardDesc")}</CardDescription>
                  </div>
                  <Button variant="accent" onClick={() => void runIshikawa()} disabled={busy}><Bot className="mr-1 size-4" /> {busy ? tw("ishikawa.aiWorking") : tw("ishikawa.aiButton")}</Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-200">{tw("ishikawa.disclaimer")}</div>
                {ishikawa && (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{tw("ishikawa.liveTitle")}</p>
                        <p className="text-xs text-muted-foreground">{tw("ishikawa.liveDesc")}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="primary" size="sm" onClick={() => void shareAnalysisPdf()}>
                          <Sparkles className="mr-1 size-4" /> {tw("pdfBar.shareSmall")}
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={exportFishbonePdf}>
                          <Download className="mr-1 size-4" /> {tw("pdfBar.downloadSmall")}
                        </Button>
                      </div>
                    </div>
                    <div ref={fishbonePrintRef}>
                      <IshikawaFishboneDiagram data={ishikawa} />
                    </div>
                  </div>
                )}
                {!ishikawa && (
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setIshikawa(EMPTY_ISHIKAWA())}>
                      <Plus className="mr-1 size-4" /> {tw("ishikawa.manualAnalysisStart")}
                    </Button>
                  </div>
                )}
                <Textarea label={tw("ishikawa.analysisSummary")} value={ishikawa?.analysis_summary ?? ""} onChange={(event) => setIshikawa((prev) => prev ? { ...prev, analysis_summary: event.target.value } : { analysis_summary: event.target.value, primary_root_cause: "", severity_assessment: "Orta", categories: { insan: [], makine: [], metot: [], malzeme: [], olcum: [], cevre: [] } })} />
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {catMeta.map((cat) => (
                    <div key={cat.key} className="rounded-2xl border border-border bg-muted/30 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-sm font-semibold text-foreground">{cat.label}</p>
                        <button type="button" onClick={() => addCause(cat.key)} className="text-xs font-medium text-primary hover:underline">{tw("ishikawa.add")}</button>
                      </div>
                      <div className="space-y-2">
                        {(ishikawa?.categories[cat.key] ?? []).map((item, index) => (
                          <div key={`${cat.key}-${index}`} className="flex items-center gap-2">
                            <input value={item} onChange={(event) => updateCause(cat.key, index, event.target.value)} className="h-9 flex-1 rounded-xl border border-border bg-input px-3 text-sm text-foreground" placeholder={tw("ishikawa.causePlaceholder", { category: cat.label })} />
                            <button type="button" onClick={() => removeCause(cat.key, index)} className="text-xs text-danger hover:underline">{tw("ishikawa.remove")}</button>
                          </div>
                        ))}
                        {(ishikawa?.categories[cat.key] ?? []).length === 0 && <p className="text-xs text-muted-foreground">{tw("ishikawa.noCausesYet")}</p>}
                      </div>
                    </div>
                  ))}

                  {/* Özel (custom) kategoriler — AI kapsamı dışı, sadece manuel */}
                  {ishikawaCustomCats.map((cat, catIdx) => (
                    <div key={cat.key} className="rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 p-4">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <input
                          value={cat.label}
                          onChange={(e) => setIshikawaCustomCats((prev) => prev.map((c, i) => i === catIdx ? { ...c, label: e.target.value } : c))}
                          className="h-7 flex-1 rounded border border-border bg-input px-2 text-sm font-semibold text-foreground"
                          placeholder={tw("ishikawa.customCategoryNamePlaceholder")}
                        />
                        <button
                          type="button"
                          onClick={() => setIshikawaCustomCats((prev) => prev.map((c, i) => i === catIdx ? { ...c, items: [...c.items, ""] } : c))}
                          className="shrink-0 text-xs font-medium text-primary hover:underline"
                        >
                          {tw("ishikawa.add")}
                        </button>
                        <button
                          type="button"
                          onClick={() => setIshikawaCustomCats((prev) => prev.filter((_, i) => i !== catIdx))}
                          className="shrink-0 text-xs text-danger hover:underline"
                          title={tw("ishikawa.deleteCategoryTitle")}
                        >
                          ✕
                        </button>
                      </div>
                      <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                        {tw("ishikawa.customCategoryBadge")}
                      </div>
                      <div className="space-y-2">
                        {cat.items.map((item, index) => (
                          <div key={`${cat.key}-${index}`} className="flex items-center gap-2">
                            <input
                              value={item}
                              onChange={(e) => setIshikawaCustomCats((prev) => prev.map((c, i) => i === catIdx ? { ...c, items: c.items.map((it, j) => j === index ? e.target.value : it) } : c))}
                              className="h-9 flex-1 rounded-xl border border-border bg-input px-3 text-sm text-foreground"
                              placeholder={tw("ishikawa.customReasonPlaceholder", { category: cat.label || "—" })}
                            />
                            <button
                              type="button"
                              onClick={() => setIshikawaCustomCats((prev) => prev.map((c, i) => i === catIdx ? { ...c, items: c.items.filter((_, j) => j !== index) } : c))}
                              className="text-xs text-danger hover:underline"
                            >
                              {tw("ishikawa.remove")}
                            </button>
                          </div>
                        ))}
                        {cat.items.length === 0 && <p className="text-xs text-muted-foreground">{tw("ishikawa.noCausesYet")}</p>}
                      </div>
                    </div>
                  ))}

                  {/* + Özel Kategori Ekle butonu */}
                  <button
                    type="button"
                    onClick={() => {
                      const label = window.prompt(tw("ishikawa.customCategoryPrompt"));
                      if (!label || !label.trim()) return;
                      const key = `custom_${Date.now()}`;
                      setIshikawaCustomCats((prev) => [...prev, { key, label: label.trim(), items: [] }]);
                    }}
                    className="flex min-h-[140px] items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/20 p-4 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                  >
                    <span className="flex flex-col items-center gap-1">
                      <Plus className="size-5" />
                      {tw("ishikawa.customCategoryAddButton")}
                    </span>
                  </button>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Textarea label={tw("ishikawa.primaryRootCause")} value={ishikawa?.primary_root_cause ?? ""} onChange={(event) => setIshikawa((prev) => prev ? { ...prev, primary_root_cause: event.target.value } : { analysis_summary: "", primary_root_cause: event.target.value, severity_assessment: "Orta", categories: { insan: [], makine: [], metot: [], malzeme: [], olcum: [], cevre: [] } })} />
                  <div>
                    <label className="mb-1 block text-sm font-medium text-foreground">{tw("ishikawa.severityAssessment")}</label>
                    <select value={ishikawa?.severity_assessment ?? "Orta"} onChange={(event) => setIshikawa((prev) => prev ? { ...prev, severity_assessment: event.target.value as IshikawaAiResponse["severity_assessment"] } : { analysis_summary: "", primary_root_cause: "", severity_assessment: event.target.value as IshikawaAiResponse["severity_assessment"], categories: { insan: [], makine: [], metot: [], malzeme: [], olcum: [], cevre: [] } })} className="h-11 w-full rounded-xl border border-border bg-input px-3 text-sm text-foreground">
                      {severityOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Diğer yöntem panelleri */}
          {analysisMethod === "five_why" && (
            <FiveWhyPanel
              incidentTitle={incidentTitleForAnalysis}
              initialData={fiveWhyData}
              onSave={(d) => setFiveWhyData(d)}
              onAiRequest={(ctx) => requestAiAnalysis({ method: "five_why", incidentTitle: incidentTitleForAnalysis, incidentDescription: narrative, context: ctx })}
            />
          )}
          {analysisMethod === "fault_tree" && (
            <FaultTreePanel
              incidentTitle={incidentTitleForAnalysis}
              initialData={faultTreeData}
              onSave={(d) => setFaultTreeData(d)}
              onAiRequest={() => requestAiAnalysis({ method: "fault_tree", incidentTitle: incidentTitleForAnalysis, incidentDescription: narrative })}
            />
          )}
          {analysisMethod === "scat" && (
            <ScatPanel
              incidentTitle={incidentTitleForAnalysis}
              initialData={scatData}
              onSave={(d) => setScatData(d)}
              onAiRequest={() => requestAiAnalysis({ method: "scat", incidentTitle: incidentTitleForAnalysis, incidentDescription: narrative })}
            />
          )}
          {analysisMethod === "bow_tie" && (
            <BowTiePanel
              incidentTitle={incidentTitleForAnalysis}
              initialData={bowTieData}
              onSave={(d) => setBowTieData(d)}
              onAiRequest={() => requestAiAnalysis({ method: "bow_tie", incidentTitle: incidentTitleForAnalysis, incidentDescription: narrative })}
            />
          )}
          {analysisMethod === "mort" && (
            <MortPanel
              incidentTitle={incidentTitleForAnalysis}
              initialData={mortData}
              onSave={(d) => setMortData(d)}
              onAiRequest={() => requestAiAnalysis({ method: "mort", incidentTitle: incidentTitleForAnalysis, incidentDescription: narrative })}
            />
          )}
          {analysisMethod === "r2d_rca" && (
            <R2dRcaPanel
              incidentTitle={incidentTitleForAnalysis}
              initialData={r2dRcaData}
              onSave={(d) => setR2dRcaData(d)}
              onAiRequest={() =>
                requestAiAnalysis({
                  method: "r2d_rca",
                  incidentTitle: incidentTitleForAnalysis,
                  incidentDescription: narrative,
                  locale,
                })
              }
            />
          )}
        </div>
      )}

      {currentStep === "dof" && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2"><ClipboardCheck className="size-5 text-[var(--gold)]" /> {tw("dof.cardTitle")}</CardTitle>
                <CardDescription>{tw("dof.cardDesc")}</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                {suggestions.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => exportDofPdf(
                      (suggestions as DofFormData[]).map((s) => ({
                        ...s,
                        formuTarihi: s.formuTarihi ?? incidentDate,
                        formuYeri: s.formuYeri ?? location,
                        formuTanimi: s.formuTanimi ?? narrative.slice(0, 500),
                        formuDolduran: s.formuDolduran ?? { adSoyad: "", tc: "", firma: selectedCompany?.name ?? "", imza: "" },
                      })),
                      tw("dof.pdfFileStem", { company: selectedCompany?.name ?? incidentTitleForAnalysis }),
                    )}
                  >
                    <Download className="mr-1 size-4" /> {tw("dof.downloadAll")}
                  </Button>
                )}
                <Button variant="accent" onClick={() => void runDof()} disabled={busy || !hasAnalysisData}><Sparkles className="mr-1 size-4" /> {busy ? tw("dof.aiWorking") : tw("dof.aiButton")}</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-200">{tw("ishikawa.disclaimer")}</div>
            {!hasAnalysisData && (
              <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-200">
                {tw("dof.warnCompleteRca")}
              </div>
            )}
            {!requiredAi && suggestions.length === 0 && <div className="rounded-2xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">{tw("dof.nearMissOptional")}</div>}
            {suggestions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-6 text-center">
                <p className="text-sm text-muted-foreground">{tw("dof.empty")}</p>
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={addManualSuggestion}>
                    <Plus className="mr-1 size-4" /> {tw("dof.manualAdd")}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {(suggestions as DofFormData[]).map((item, index) => (
                  <DofOsgbForm
                    key={index}
                    index={index}
                    data={{
                      ...item,
                      formuTarihi: item.formuTarihi ?? incidentDate,
                      formuYeri: item.formuYeri ?? location,
                      formuTanimi: item.formuTanimi ?? narrative.slice(0, 500),
                      formuDolduran: item.formuDolduran ?? { adSoyad: "", tc: "", firma: selectedCompany?.name ?? "", imza: "" },
                    }}
                    onChange={(patch) => {
                      // Tüm patch alanlarını tek tek güncelle (mevcut updateSuggestion sadece tek key kabul ediyor)
                      setSuggestions((prev) => prev.map((s, i) => i === index ? { ...s, ...patch } : s) as typeof prev);
                    }}
                    onRemove={() => removeSuggestion(index)}
                  />
                ))}
                <div className="flex justify-center">
                  <Button type="button" variant="outline" size="sm" onClick={addManualSuggestion}>
                    <Plus className="mr-1 size-4" /> {tw("dof.manualAdd")}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {currentStep === "review" && (
        <Card>
          <CardHeader>
            <CardTitle>{tw("review.title")}</CardTitle>
            <CardDescription>{tw("review.desc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-border bg-muted/40 p-4"><p className="text-xs text-muted-foreground">{tw("review.fieldType")}</p><p className="mt-1 font-semibold text-foreground">{typeOptions.find((item) => item.value === incidentType)?.label ?? "-"}</p></div>
              <div className="rounded-xl border border-border bg-muted/40 p-4"><p className="text-xs text-muted-foreground">{tw("review.fieldCompany")}</p><p className="mt-1 font-semibold text-foreground">{selectedCompany?.name ?? "-"}</p></div>
              <div className="rounded-xl border border-border bg-muted/40 p-4"><p className="text-xs text-muted-foreground">{tw("review.fieldRootCauses")}</p><p className="mt-1 font-semibold text-foreground">{ishikawa ? Object.values(ishikawa.categories).reduce((sum, list) => sum + list.length, 0) : 0}</p></div>
              <div className="rounded-xl border border-border bg-muted/40 p-4"><p className="text-xs text-muted-foreground">{tw("review.fieldCapa")}</p><p className="mt-1 font-semibold text-foreground">{suggestions.length}</p></div>
            </div>
            <div className="rounded-2xl border border-border bg-muted/30 p-4"><p className="mb-2 text-sm font-medium text-foreground">{tw("review.narrative")}</p><p className="text-sm leading-6 text-muted-foreground">{narrative}</p></div>
            {savedIncident && (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-200">{tw("review.savedTitle")}</p>
                <p className="mt-1 text-sm text-emerald-700/80 dark:text-emerald-200/80">{tw("review.savedCode", { code: savedIncident.incidentCode })}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href={`/incidents/${savedIncident.id}`}><Button variant="outline" size="sm">{tw("review.openDetail")}</Button></Link>
                  <Link href={`/incidents/${savedIncident.id}/dof`}><Button variant="accent" size="sm">{tw("review.openCapa")}</Button></Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Alt boşluk — sticky bar içeriği kapatmasın */}
      <div className="h-20" aria-hidden="true" />

      {/* ============================================================ */}
      {/* STICKY NAVIGATION BAR — ekranda sabit, scroll'da kaybolmaz   */}
      {/* ============================================================ */}
      <div className="sticky bottom-0 left-0 right-0 z-30 -mx-4 mt-2 border-t border-border bg-card/95 px-4 py-3 shadow-[0_-4px_20px_-8px_rgba(0,0,0,0.15)] backdrop-blur-md sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          {/* Sol: Geri */}
          <Button
            variant="outline"
            onClick={() => { setShowErrors(false); setStepIndex((prev) => Math.max(0, prev - 1)); }}
            disabled={stepIndex === 0 || busy}
          >
            <ArrowLeft className="mr-1 size-4" /> {tw("nav.back")}
          </Button>

          {/* Orta: Step göstergesi */}
          <div className="hidden flex-1 items-center justify-center gap-2 text-xs sm:flex">
            <span className="rounded-full bg-primary/15 px-2.5 py-1 font-mono font-bold text-primary">
              {stepIndex + 1} / {steps.length}
            </span>
            <span className="text-muted-foreground">
              {tw(`stepsFooter.${currentStep}`)}
            </span>
          </div>

          {/* Sağ: Yeni olay + İleri/Onayla */}
          <Link
            href="/incidents"
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title={tw("nav.incidentListTooltip")}
          >
            <ArrowLeft className="size-3.5" /> {tw("nav.incidentList")}
          </Link>

          {currentStep !== "review" ? (
            <Button
              variant="primary"
              onClick={() => { if (!canNext) { setShowErrors(true); return; } setShowErrors(false); setStepIndex((prev) => Math.min(prev + 1, steps.length - 1)); }}
              disabled={busy}
            >
              {tw("nav.forward")} <ArrowRight className="ml-1 size-4" />
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={() => void handleSave()}
              disabled={busy || !!savedIncident}
            >
              {busy ? tw("nav.saveBusy") : savedIncident ? tw("nav.saved") : tw("nav.saveSubmit")} <Check className="ml-1 size-4" />
            </Button>
          )}
        </div>
      </div>

      {showSgkModal && savedIncident?.sgkNotificationDeadline && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-xl rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-elevated)]">
            <div className="flex items-start gap-3">
              <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-amber-500/15"><TriangleAlert className="size-6 text-amber-500" /></span>
              <div className="flex-1">
                <p className="text-lg font-semibold text-foreground">{tw("sgk.modalTitle")}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{tw("sgk.modalBody")}</p>
                <p className="mt-3 text-sm font-medium text-foreground">{tw("sgk.deadlineLabel", { date: savedIncident.sgkNotificationDeadline })}</p>
                {sgkAjandaStatus === "success" && (
                  <p className="mt-2 rounded-md bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
                    {tw("sgk.ajandaSuccess")}
                  </p>
                )}
                {sgkAjandaStatus === "error" && (
                  <p className="mt-2 rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300">
                    {tw("sgk.ajandaErrorPrefix")} {sgkAjandaError}
                  </p>
                )}
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => setShowSgkModal(false)}>{tw("sgk.understand")}</Button>
                  <Button
                    variant="accent"
                    disabled={sgkAjandaBusy || sgkAjandaStatus === "success"}
                    onClick={() => void addSgkReminderToAjanda()}
                  >
                    {sgkAjandaBusy
                      ? tw("sgk.ajandaBusy")
                      : sgkAjandaStatus === "success"
                        ? tw("sgk.ajandaDone")
                        : tw("sgk.ajandaAdd")}
                  </Button>
                  {sgkAjandaStatus === "success" && (
                    <Link href="/planner">
                      <Button variant="outline">{tw("sgk.goPlanner")}</Button>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
