"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ImageIcon,
  Loader2,
  Play,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  UploadCloud,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusAlert } from "@/components/ui/status-alert";
import { Textarea } from "@/components/ui/textarea";
import {
  loadCompanyDirectory,
  saveCompanyDirectory,
  type CompanyRecord,
} from "@/lib/company-directory";
import { fetchMyCompaniesFromSupabase } from "@/lib/supabase/company-api";
import {
  listRiskAssessments,
  saveRiskAnalysis,
  type SaveRiskAnalysisInput,
  type SavedAssessment,
} from "@/lib/supabase/risk-assessment-api";
import { getActiveWorkspace } from "@/lib/supabase/workspace-api";
import {
  calculateFK,
  calculateMatrix,
  calculateR2D,
  type FKResult,
  type FKValues,
  type MatrixResult,
  type MatrixValues,
  type R2DResult,
  type R2DValues,
} from "@/lib/risk-scoring";
import { cn } from "@/lib/utils";

type AnalysisMethod = "r_skor" | "fine_kinney" | "l_matrix";
type Severity = "low" | "medium" | "high" | "critical";
type ImageStatus = "queued" | "compressing" | "analyzing" | "completed" | "fallback" | "failed";

type Annotation =
  | { id: string; kind: "pin"; label: string; x: number; y: number }
  | { id: string; kind: "box"; label: string; x: number; y: number; width: number; height: number };

type LegalReference = {
  law: string;
  article: string;
  description: string;
};

type WorkFinding = {
  id: string;
  imageId: string;
  title: string;
  category: string;
  severity: Severity;
  confidence: number;
  recommendation: string;
  correctiveActionRequired: boolean;
  annotations: Annotation[];
  legalReferences: LegalReference[];
  isManual: boolean;
  r2dValues: R2DValues;
  r2dResult: R2DResult | null;
  fkValues: FKValues;
  fkResult: FKResult | null;
  matrixValues: MatrixValues;
  matrixResult: MatrixResult | null;
};

type AnalysisImage = {
  id: string;
  file: File;
  previewUrl: string;
  status: ImageStatus;
  message: string;
  findings: WorkFinding[];
  areaSummary?: string;
  imageDescription?: string;
  degraded?: boolean;
};

type ApiRisk = Record<string, unknown> & {
  title?: string;
  category?: string;
  severity?: string;
  confidence?: number;
  recommendation?: string;
  correctiveActionRequired?: boolean;
  pinX?: number;
  pinY?: number;
  boxX?: number;
  boxY?: number;
  boxW?: number;
  boxH?: number;
  r2dParams?: Record<string, number>;
  fkParams?: FKValues;
  matrixParams?: MatrixValues;
  legalReferences?: LegalReference[];
};

type ApiResponse = {
  risks?: ApiRisk[];
  imageRelevance?: string;
  imageDescription?: string;
  areaSummary?: string;
  degraded?: boolean;
  error?: string;
};

const METHOD_OPTIONS: Array<{ value: AnalysisMethod; label: string }> = [
  { value: "r_skor", label: "R-SKOR 2D" },
  { value: "fine_kinney", label: "Fine-Kinney" },
  { value: "l_matrix", label: "5x5 L-Matris" },
];

const SEVERITY_OPTIONS: Array<{ value: Severity; label: string }> = [
  { value: "low", label: "Düşük" },
  { value: "medium", label: "Orta" },
  { value: "high", label: "Yüksek" },
  { value: "critical", label: "Kritik" },
];

const CATEGORY_OPTIONS = [
  "Elektrik",
  "Yangın",
  "Düzen/Temizlik",
  "Yüksekte Çalışma",
  "Makine/Ekipman",
  "Kimyasal",
  "Depolama",
  "KKD",
  "Acil Durum",
  "Diğer",
];

const DEFAULT_LEGAL_REFERENCES: LegalReference[] = [
  {
    law: "6331 sayılı İş Sağlığı ve Güvenliği Kanunu",
    article: "Madde 4",
    description: "İşveren, çalışanların işle ilgili sağlık ve güvenliğini sağlamakla yükümlüdür.",
  },
  {
    law: "İş Sağlığı ve Güvenliği Risk Değerlendirmesi Yönetmeliği",
    article: "Madde 8",
    description: "Tehlikeler belirlenir, riskler analiz edilir ve kontrol tedbirleri planlanır.",
  },
];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function randomId() {
  return crypto.randomUUID();
}

function coerceSeverity(value: unknown): Severity {
  if (value === "low" || value === "medium" || value === "high" || value === "critical") {
    return value;
  }
  return "medium";
}

function severityRank(severity: Severity) {
  return { low: 1, medium: 2, high: 3, critical: 4 }[severity];
}

function severityLabel(severity: Severity) {
  return SEVERITY_OPTIONS.find((item) => item.value === severity)?.label ?? "Orta";
}

function severityClasses(severity: Severity) {
  if (severity === "critical") return "border-red-900 bg-red-950/10 text-red-700 dark:text-red-300";
  if (severity === "high") return "border-red-300 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300";
  if (severity === "medium") return "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300";
  return "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300";
}

function defaultR2D(severity: Severity, category = ""): R2DValues {
  const base = {
    low: 0.22,
    medium: 0.46,
    high: 0.68,
    critical: 0.86,
  }[severity];
  const lower = category.toLocaleLowerCase("tr-TR");
  return {
    c1: base,
    c2: lower.includes("kkd") ? base : 0.1,
    c3: 0.15,
    c4: lower.includes("yangın") ? base : 0.15,
    c5: lower.includes("elektrik") || lower.includes("kimyasal") ? base : 0.18,
    c6: lower.includes("düzen") || lower.includes("geçiş") ? base : 0.25,
    c7: lower.includes("makine") ? base : 0.18,
    c8: lower.includes("trafik") ? base : 0.08,
    c9: 0.35,
  };
}

function defaultFK(severity: Severity): FKValues {
  if (severity === "critical") return { likelihood: 6, severity: 40, exposure: 6 };
  if (severity === "high") return { likelihood: 6, severity: 15, exposure: 6 };
  if (severity === "medium") return { likelihood: 3, severity: 7, exposure: 3 };
  return { likelihood: 1, severity: 3, exposure: 2 };
}

function defaultMatrix(severity: Severity): MatrixValues {
  if (severity === "critical") return { likelihood: 5, severity: 5 };
  if (severity === "high") return { likelihood: 4, severity: 4 };
  if (severity === "medium") return { likelihood: 3, severity: 3 };
  return { likelihood: 2, severity: 2 };
}

function normalizeR2D(value: unknown, severity: Severity, category: string): R2DValues {
  const fallback = defaultR2D(severity, category);
  if (!value || typeof value !== "object") return fallback;
  const raw = value as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(fallback).map(([key, fallbackValue]) => [
      key,
      clamp(Number(raw[key] ?? fallbackValue), 0, 1),
    ]),
  ) as R2DValues;
}

function normalizeFK(value: unknown, severity: Severity): FKValues {
  const fallback = defaultFK(severity);
  if (!value || typeof value !== "object") return fallback;
  const raw = value as Record<string, unknown>;
  return {
    likelihood: Number(raw.likelihood ?? fallback.likelihood),
    severity: Number(raw.severity ?? fallback.severity),
    exposure: Number(raw.exposure ?? fallback.exposure),
  };
}

function normalizeMatrix(value: unknown, severity: Severity): MatrixValues {
  const fallback = defaultMatrix(severity);
  if (!value || typeof value !== "object") return fallback;
  const raw = value as Record<string, unknown>;
  return {
    likelihood: clamp(Number(raw.likelihood ?? fallback.likelihood), 1, 5),
    severity: clamp(Number(raw.severity ?? fallback.severity), 1, 5),
  };
}

function computeFinding(finding: Omit<WorkFinding, "r2dResult" | "fkResult" | "matrixResult">): WorkFinding {
  return {
    ...finding,
    r2dResult: calculateR2D(finding.r2dValues),
    fkResult: calculateFK(finding.fkValues),
    matrixResult: calculateMatrix(finding.matrixValues),
  };
}

function coerceLegalReferences(value: unknown): LegalReference[] {
  if (!Array.isArray(value)) return DEFAULT_LEGAL_REFERENCES;
  const refs = value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const raw = item as Record<string, unknown>;
      return {
        law: String(raw.law ?? "").trim(),
        article: String(raw.article ?? "").trim(),
        description: String(raw.description ?? "").trim(),
      };
    })
    .filter((item): item is LegalReference => Boolean(item?.law));
  return refs.length > 0 ? refs : DEFAULT_LEGAL_REFERENCES;
}

function createFindingFromApiRisk(risk: ApiRisk, imageId: string, index: number): WorkFinding {
  const severity = coerceSeverity(risk.severity);
  const category = String(risk.category ?? "Diğer").trim() || "Diğer";
  const pinX = clamp(Number(risk.pinX ?? 50), 2, 98);
  const pinY = clamp(Number(risk.pinY ?? 50), 2, 98);
  const annotations: Annotation[] = [
    { id: randomId(), kind: "pin", label: `R${index + 1}`, x: pinX, y: pinY },
  ];
  const boxX = Number(risk.boxX);
  const boxY = Number(risk.boxY);
  const boxW = Number(risk.boxW);
  const boxH = Number(risk.boxH);
  if ([boxX, boxY, boxW, boxH].every(Number.isFinite)) {
    annotations.push({
      id: randomId(),
      kind: "box",
      label: category,
      x: clamp(boxX, 0, 98),
      y: clamp(boxY, 0, 98),
      width: clamp(boxW, 2, 100),
      height: clamp(boxH, 2, 100),
    });
  }

  return computeFinding({
    id: randomId(),
    imageId,
    title: String(risk.title ?? "Saha risk kaydı").trim() || "Saha risk kaydı",
    category,
    severity,
    confidence: clamp(Number(risk.confidence ?? 0.72), 0.35, 0.99),
    recommendation:
      String(risk.recommendation ?? "").trim() ||
      "Risk kaydı sahada doğrulanmalı, kontrol tedbirleri belirlenmeli ve sorumlu kişi ile termin atanmalıdır.",
    correctiveActionRequired: risk.correctiveActionRequired !== false,
    annotations,
    legalReferences: coerceLegalReferences(risk.legalReferences),
    isManual: false,
    r2dValues: normalizeR2D(risk.r2dParams, severity, category),
    fkValues: normalizeFK(risk.fkParams, severity),
    matrixValues: normalizeMatrix(risk.matrixParams, severity),
  });
}

function createManualFinding(imageId: string, seed?: Partial<WorkFinding>): WorkFinding {
  const severity = seed?.severity ?? "medium";
  const category = seed?.category ?? "Diğer";
  return computeFinding({
    id: randomId(),
    imageId,
    title: seed?.title ?? "Manuel risk kaydı",
    category,
    severity,
    confidence: seed?.confidence ?? 0.7,
    recommendation:
      seed?.recommendation ??
      "Risk sahada doğrulanmalı, mevcut kontrol tedbirleri kayıt altına alınmalı ve gerekiyorsa düzeltici faaliyet açılmalıdır.",
    correctiveActionRequired: seed?.correctiveActionRequired ?? true,
    annotations: seed?.annotations ?? [
      { id: randomId(), kind: "pin", label: "M", x: 50, y: 50 },
    ],
    legalReferences: seed?.legalReferences ?? DEFAULT_LEGAL_REFERENCES,
    isManual: seed?.isManual ?? true,
    r2dValues: seed?.r2dValues ?? defaultR2D(severity, category),
    fkValues: seed?.fkValues ?? defaultFK(severity),
    matrixValues: seed?.matrixValues ?? defaultMatrix(severity),
  });
}

function createTimeoutFallbacks(imageId: string, reason: string): WorkFinding[] {
  return [
    createManualFinding(imageId, {
      title: "AI yanıtı alınamadı: saha risk envanteri manuel doğrulama gerektiriyor",
      category: "Diğer",
      severity: "medium",
      confidence: 0.62,
      recommendation: `${reason} Bu fotoğraf için çalışma alanı, zemin/geçiş, elektrik, yangın ve acil durum başlıkları sahada kontrol edilmelidir. Tespitler sorumlu kişi, termin ve kanıt fotoğrafı ile tamamlanmalıdır.`,
      isManual: false,
    }),
    createManualFinding(imageId, {
      title: "Geçiş yolu, zemin ve düzen/temizlik kontrolü",
      category: "Düzen/Temizlik",
      severity: "medium",
      confidence: 0.58,
      recommendation:
        "Görsel analizi tamamlanamadığı için geçiş yolları, kablo/hortum düzeni, kaygan zemin, istif ve engeller sahada kontrol edilmelidir. Uygunsuzluk varsa alan düzenlenmeli ve tekrar fotoğraflanmalıdır.",
      isManual: false,
    }),
  ];
}

function imageStatusLabel(status: ImageStatus) {
  switch (status) {
    case "compressing":
      return "Hazırlanıyor";
    case "analyzing":
      return "AI analizde";
    case "completed":
      return "Tamamlandı";
    case "fallback":
      return "Ön envanter";
    case "failed":
      return "Hata";
    default:
      return "Bekliyor";
  }
}

async function fileToAnalysisPayload(file: File): Promise<{ base64: string; mimeType: "image/jpeg" }> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Görsel okunamadı"));
      img.src = objectUrl;
    });

    const max = 900;
    const ratio = Math.min(1, max / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * ratio));
    const height = Math.max(1, Math.round(image.height * ratio));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas başlatılamadı");
    ctx.drawImage(image, 0, 0, width, height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
    const base64 = dataUrl.split(",")[1] ?? "";
    if (!base64) throw new Error("Görsel sıkıştırılamadı");
    return { base64, mimeType: "image/jpeg" };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function readJsonOrText(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text().catch(() => "");
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { error: text.slice(0, 300) };
  }
}

export function RiskAnalysisWorkbenchClient() {
  const [companies, setCompanies] = useState<CompanyRecord[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [location, setLocation] = useState("");
  const [department, setDepartment] = useState("");
  const [title, setTitle] = useState("Saha Risk Analizi");
  const [note, setNote] = useState("");
  const [method, setMethod] = useState<AnalysisMethod>("r_skor");
  const [images, setImages] = useState<AnalysisImage[]>([]);
  const [saved, setSaved] = useState<SavedAssessment[]>([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "warning" | "danger" | "info"; text: string } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const cancelledRef = useRef(false);
  const previewUrlsRef = useRef<string[]>([]);

  const selectedCompany = useMemo(
    () => companies.find((company) => company.id === selectedCompanyId) ?? null,
    [companies, selectedCompanyId],
  );

  const allFindings = useMemo(() => images.flatMap((image) => image.findings), [images]);
  const criticalCount = allFindings.filter((finding) => finding.severity === "critical").length;
  const completedCount = images.filter((image) => image.status === "completed" || image.status === "fallback").length;
  const highestSeverity = allFindings.reduce<Severity | null>((current, finding) => {
    if (!current) return finding.severity;
    return severityRank(finding.severity) > severityRank(current) ? finding.severity : current;
  }, null);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      setIsLoadingCompanies(true);
      const fallback = loadCompanyDirectory();
      if (mounted) setCompanies(fallback);
      try {
        const activeWorkspace = await getActiveWorkspace();
        const remoteCompanies = await fetchMyCompaniesFromSupabase({
          scopedOrganizationId: activeWorkspace?.organization_id ?? null,
        });
        if (mounted && remoteCompanies && remoteCompanies.length > 0) {
          setCompanies(remoteCompanies);
          saveCompanyDirectory(remoteCompanies);
          setSelectedCompanyId((current) => current || remoteCompanies[0]?.id || "");
        } else if (mounted && fallback.length > 0) {
          setSelectedCompanyId((current) => current || fallback[0]?.id || "");
        }
      } finally {
        if (mounted) setIsLoadingCompanies(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedCompany) return;
    setLocation((current) => current || selectedCompany.locations?.find(Boolean) || selectedCompany.city || "");
    setDepartment((current) => current || selectedCompany.departments?.find(Boolean) || "");
  }, [selectedCompany]);

  useEffect(() => {
    if (!selectedCompanyId) return;
    let mounted = true;
    void (async () => {
      const rows = await listRiskAssessments(selectedCompanyId).catch(() => []);
      if (mounted) setSaved(rows.slice(0, 5));
    })();
    return () => {
      mounted = false;
    };
  }, [selectedCompanyId]);

  useEffect(() => {
    previewUrlsRef.current = images.map((image) => image.previewUrl);
  }, [images]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const updateImage = useCallback((imageId: string, patch: Partial<AnalysisImage>) => {
    setImages((current) =>
      current.map((image) => (image.id === imageId ? { ...image, ...patch } : image)),
    );
  }, []);

  const updateFinding = useCallback((imageId: string, findingId: string, patch: Partial<WorkFinding>) => {
    setImages((current) =>
      current.map((image) => {
        if (image.id !== imageId) return image;
        return {
          ...image,
          findings: image.findings.map((finding) => {
            if (finding.id !== findingId) return finding;
            const severityChanged = patch.severity && patch.severity !== finding.severity;
            const nextBase = {
              ...finding,
              ...patch,
              ...(severityChanged
                ? {
                    r2dValues: defaultR2D(patch.severity ?? finding.severity, patch.category ?? finding.category),
                    fkValues: defaultFK(patch.severity ?? finding.severity),
                    matrixValues: defaultMatrix(patch.severity ?? finding.severity),
                  }
                : {}),
            };
            return computeFinding(nextBase);
          }),
        };
      }),
    );
  }, []);

  const addFiles = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []).filter((file) => file.type.startsWith("image/"));
    if (files.length === 0) return;
    const nextImages = files.map<AnalysisImage>((file) => ({
      id: randomId(),
      file,
      previewUrl: URL.createObjectURL(file),
      status: "queued",
      message: `${file.name} (${formatBytes(file.size)})`,
      findings: [],
    }));
    setImages((current) => [...current, ...nextImages]);
    setNotice({ tone: "info", text: `${files.length} görsel eklendi.` });
    event.target.value = "";
  }, []);

  const removeImage = useCallback((imageId: string) => {
    setImages((current) => {
      const image = current.find((item) => item.id === imageId);
      if (image) URL.revokeObjectURL(image.previewUrl);
      return current.filter((item) => item.id !== imageId);
    });
  }, []);

  const resetAll = useCallback(() => {
    abortRef.current?.abort();
    cancelledRef.current = true;
    images.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    setImages([]);
    setNotice({ tone: "info", text: "Analiz çalışma alanı temizlendi." });
    setIsAnalyzing(false);
  }, [images]);

  const analyzeOneImage = useCallback(
    async (image: AnalysisImage) => {
      updateImage(image.id, { status: "compressing", message: "Görsel hazırlanıyor..." });
      const payload = await fileToAnalysisPayload(image.file);
      if (cancelledRef.current) throw new DOMException("İptal edildi", "AbortError");

      updateImage(image.id, { status: "analyzing", message: "AI riskleri çıkarıyor..." });
      const controller = new AbortController();
      abortRef.current = controller;
      const timeout = window.setTimeout(() => controller.abort(), 145_000);

      try {
        const response = await fetch("/api/analyze-risk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          signal: controller.signal,
          body: JSON.stringify({
            imageBase64: payload.base64,
            mimeType: payload.mimeType,
            method,
            mode: "fast",
            language: "tr",
            companyContext: selectedCompany
              ? {
                  name: selectedCompany.name || undefined,
                  sector: selectedCompany.sector || undefined,
                  kind: selectedCompany.kind || undefined,
                  hazardClass: selectedCompany.hazardClass || undefined,
                  address: [selectedCompany.address, selectedCompany.city].filter(Boolean).join(" ") || undefined,
                }
              : undefined,
          }),
        });

        const json = (response.ok ? await response.json() : await readJsonOrText(response)) as ApiResponse;
        if (!response.ok) {
          const message = typeof json.error === "string" ? json.error : `AI servisi HTTP ${response.status} döndürdü.`;
          return {
            status: "fallback" as const,
            message,
            findings: createTimeoutFallbacks(image.id, message),
            areaSummary: "AI yanıtı alınamadığı için ön risk envanteri üretildi.",
            imageDescription: image.file.name,
            degraded: true,
          };
        }

        if (json.imageRelevance && json.imageRelevance !== "relevant") {
          return {
            status: "completed" as const,
            message: "Görsel işyeri/saha analizi için uygun bulunmadı.",
            findings: [],
            areaSummary: json.areaSummary ?? "",
            imageDescription: json.imageDescription ?? image.file.name,
            degraded: Boolean(json.degraded),
          };
        }

        const risks = Array.isArray(json.risks) ? json.risks : [];
        const findings = risks.map((risk, index) => createFindingFromApiRisk(risk, image.id, index));
        if (findings.length === 0) {
          return {
            status: "fallback" as const,
            message: "AI boş risk listesi döndürdü; ön envanter oluşturuldu.",
            findings: createTimeoutFallbacks(image.id, "AI boş risk listesi döndürdü."),
            areaSummary: json.areaSummary ?? "Ön risk envanteri manuel doğrulama gerektirir.",
            imageDescription: json.imageDescription ?? image.file.name,
            degraded: true,
          };
        }

        return {
          status: json.degraded ? ("fallback" as const) : ("completed" as const),
          message: json.degraded ? "AI gecikti; ön risk envanteriyle devam edildi." : `${findings.length} risk bulundu.`,
          findings,
          areaSummary: json.areaSummary ?? "",
          imageDescription: json.imageDescription ?? image.file.name,
          degraded: Boolean(json.degraded),
        };
      } catch (error) {
        const isAbort = error instanceof DOMException && error.name === "AbortError";
        const message = isAbort
          ? "AI zamanında yanıt vermedi; ön risk envanteri oluşturuldu."
          : error instanceof Error
            ? error.message
            : "AI analizi tamamlanamadı.";
        return {
          status: "fallback" as const,
          message,
          findings: createTimeoutFallbacks(image.id, message),
          areaSummary: "AI yanıtı alınamadığı için ön risk envanteri üretildi.",
          imageDescription: image.file.name,
          degraded: true,
        };
      } finally {
        window.clearTimeout(timeout);
        if (abortRef.current === controller) abortRef.current = null;
      }
    },
    [method, selectedCompany, updateImage],
  );

  const runAnalysis = useCallback(async () => {
    if (images.length === 0) {
      setNotice({ tone: "warning", text: "Önce en az bir görsel ekleyin." });
      return;
    }
    cancelledRef.current = false;
    setIsAnalyzing(true);
    setNotice({ tone: "info", text: "Risk analizi başlatıldı." });

    for (const image of images) {
      if (cancelledRef.current) break;
      const result = await analyzeOneImage(image);
      updateImage(image.id, result);
    }

    setIsAnalyzing(false);
    setNotice({
      tone: cancelledRef.current ? "warning" : "success",
      text: cancelledRef.current ? "Analiz iptal edildi." : "Risk analizi tamamlandı.",
    });
  }, [analyzeOneImage, images, updateImage]);

  const cancelAnalysis = useCallback(() => {
    cancelledRef.current = true;
    abortRef.current?.abort();
    setIsAnalyzing(false);
  }, []);

  const addManualFinding = useCallback((imageId: string) => {
    setImages((current) =>
      current.map((image) =>
        image.id === imageId
          ? {
              ...image,
              findings: [...image.findings, createManualFinding(imageId)],
              status: image.status === "queued" ? "fallback" : image.status,
              message: image.status === "queued" ? "Manuel risk kaydı eklendi." : image.message,
            }
          : image,
      ),
    );
  }, []);

  const removeFinding = useCallback((imageId: string, findingId: string) => {
    setImages((current) =>
      current.map((image) =>
        image.id === imageId
          ? { ...image, findings: image.findings.filter((finding) => finding.id !== findingId) }
          : image,
      ),
    );
  }, []);

  const saveAnalysis = useCallback(async () => {
    if (!selectedCompanyId) {
      setNotice({ tone: "warning", text: "Kaydetmek için firma seçin." });
      return;
    }
    if (images.length === 0 || allFindings.length === 0) {
      setNotice({ tone: "warning", text: "Kaydetmek için en az bir risk kaydı gerekiyor." });
      return;
    }

    setIsSaving(true);
    setNotice({ tone: "info", text: "Risk analizi kaydediliyor..." });
    try {
      const input: SaveRiskAnalysisInput = {
        title: title.trim() || "Saha Risk Analizi",
        analysisNote: note.trim(),
        method,
        companyWorkspaceId: selectedCompanyId,
        location,
        department,
        participants: [],
        rows: [
          {
            title: selectedCompany?.shortName || selectedCompany?.name || "Saha görselleri",
            description: note.trim(),
            images: images.map((image) => ({
              file: image.file,
              findingIds: image.findings.map((finding) => finding.id),
            })),
            findings: allFindings.map((finding) => ({
              id: finding.id,
              imageId: finding.imageId,
              title: finding.title,
              category: finding.category,
              severity: finding.severity,
              confidence: finding.confidence,
              isManual: finding.isManual,
              correctiveActionRequired: finding.correctiveActionRequired,
              recommendation: finding.recommendation,
              action: finding.recommendation,
              r2dValues: finding.r2dValues,
              r2dResult: finding.r2dResult,
              fkValues: finding.fkValues,
              fkResult: finding.fkResult,
              matrixValues: finding.matrixValues,
              matrixResult: finding.matrixResult,
              annotations: finding.annotations,
              legalReferences: finding.legalReferences,
            })),
          },
        ],
        totalFindings: allFindings.length,
        criticalCount,
        highestRiskLevel: highestSeverity ?? "medium",
        analysisType: "RISK_ANALYSIS",
        sourceMethod: "image_upload",
      };

      const id = await saveRiskAnalysis(input);
      if (!id) throw new Error("Kayıt kimliği alınamadı.");
      setNotice({ tone: "success", text: "Risk analizi kaydedildi." });
      const rows = await listRiskAssessments(selectedCompanyId).catch(() => []);
      setSaved(rows.slice(0, 5));
    } catch (error) {
      setNotice({
        tone: "danger",
        text: error instanceof Error ? error.message : "Risk analizi kaydedilemedi.",
      });
    } finally {
      setIsSaving(false);
    }
  }, [
    allFindings,
    criticalCount,
    department,
    highestSeverity,
    images,
    location,
    method,
    note,
    selectedCompany,
    selectedCompanyId,
    title,
  ]);

  return (
    <div className="space-y-5 p-4 sm:p-6 lg:p-8">
      <section className="rounded-lg border border-border bg-card p-4 shadow-[var(--shadow-card)] sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 space-y-2">
            <span className="eyebrow">Risk analizi</span>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Görsel saha risk çalışma alanı
            </h1>
            <div className="flex flex-wrap gap-2 text-xs font-medium text-muted-foreground">
              <span className="rounded-md border border-border px-2.5 py-1">{images.length} görsel</span>
              <span className="rounded-md border border-border px-2.5 py-1">{allFindings.length} risk</span>
              <span className="rounded-md border border-border px-2.5 py-1">{completedCount}/{images.length || 0} tamamlandı</span>
              <span className={cn("rounded-md border px-2.5 py-1", highestSeverity ? severityClasses(highestSeverity) : "border-border")}>
                {highestSeverity ? severityLabel(highestSeverity) : "Henüz skor yok"}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={resetAll} disabled={isAnalyzing || images.length === 0}>
              <RotateCcw className="h-4 w-4" />
              Sıfırla
            </Button>
            {isAnalyzing ? (
              <Button variant="danger" onClick={cancelAnalysis}>
                <XCircle className="h-4 w-4" />
                İptal
              </Button>
            ) : (
              <Button variant="primary" onClick={runAnalysis} disabled={images.length === 0}>
                <Play className="h-4 w-4" />
                Analiz et
              </Button>
            )}
            <Button variant="accent" onClick={saveAnalysis} disabled={isSaving || allFindings.length === 0}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Kaydet
            </Button>
          </div>
        </div>
      </section>

      {notice ? <StatusAlert tone={notice.tone}>{notice.text}</StatusAlert> : null}

      <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-5">
          <section className="rounded-lg border border-border bg-card p-4 shadow-[var(--shadow-card)]">
            <h2 className="text-base font-semibold text-foreground">Analiz bilgileri</h2>
            <div className="mt-4 space-y-4">
              <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
                Firma
                <select
                  value={selectedCompanyId}
                  disabled={isLoadingCompanies}
                  onChange={(event) => setSelectedCompanyId(event.target.value)}
                  className="h-12 rounded-lg border border-border bg-card px-3 text-sm text-foreground shadow-[var(--shadow-soft)]"
                >
                  <option value="">{isLoadingCompanies ? "Yükleniyor..." : "Firma seçin"}</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.shortName || company.name}
                    </option>
                  ))}
                </select>
              </label>

              <Input label="Başlık" value={title} onChange={(event) => setTitle(event.target.value)} />

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
                  Lokasyon
                  <select
                    value={location}
                    onChange={(event) => setLocation(event.target.value)}
                    className="h-12 rounded-lg border border-border bg-card px-3 text-sm text-foreground shadow-[var(--shadow-soft)]"
                  >
                    <option value="">Lokasyon yok</option>
                    {(selectedCompany?.locations ?? []).filter(Boolean).map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                    {location && !(selectedCompany?.locations ?? []).includes(location) ? (
                      <option value={location}>{location}</option>
                    ) : null}
                  </select>
                </label>

                <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
                  Bölüm
                  <select
                    value={department}
                    onChange={(event) => setDepartment(event.target.value)}
                    className="h-12 rounded-lg border border-border bg-card px-3 text-sm text-foreground shadow-[var(--shadow-soft)]"
                  >
                    <option value="">Bölüm yok</option>
                    {(selectedCompany?.departments ?? []).filter(Boolean).map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                    {department && !(selectedCompany?.departments ?? []).includes(department) ? (
                      <option value={department}>{department}</option>
                    ) : null}
                  </select>
                </label>
              </div>

              <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
                Skor yöntemi
                <select
                  value={method}
                  onChange={(event) => setMethod(event.target.value as AnalysisMethod)}
                  className="h-12 rounded-lg border border-border bg-card px-3 text-sm text-foreground shadow-[var(--shadow-soft)]"
                >
                  {METHOD_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </label>

              <Textarea label="Not" rows={4} value={note} onChange={(event) => setNote(event.target.value)} />
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card p-4 shadow-[var(--shadow-card)]">
            <h2 className="text-base font-semibold text-foreground">Görseller</h2>
            <label className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-primary/40 bg-primary/5 px-4 py-8 text-center transition hover:bg-primary/10">
              <UploadCloud className="h-8 w-8 text-primary" />
              <span className="text-sm font-semibold text-foreground">Görsel seç</span>
              <span className="text-xs text-muted-foreground">JPG, PNG veya WEBP</span>
              <input className="sr-only" type="file" accept="image/*" multiple onChange={addFiles} />
            </label>
          </section>

          <section className="rounded-lg border border-border bg-card p-4 shadow-[var(--shadow-card)]">
            <h2 className="text-base font-semibold text-foreground">Son kayıtlar</h2>
            <div className="mt-3 space-y-2">
              {saved.length === 0 ? (
                <p className="text-sm text-muted-foreground">Kayıt bulunamadı.</p>
              ) : (
                saved.map((item) => (
                  <div key={item.id} className="rounded-lg border border-border p-3">
                    <div className="text-sm font-semibold text-foreground">{item.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {item.itemCount} risk · {new Date(item.createdAt).toLocaleDateString("tr-TR")}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </aside>

        <main className="space-y-5">
          {images.length === 0 ? (
            <section className="flex min-h-[420px] flex-col items-center justify-center rounded-lg border border-border bg-card p-8 text-center shadow-[var(--shadow-card)]">
              <ImageIcon className="h-12 w-12 text-muted-foreground" />
              <h2 className="mt-4 text-lg font-semibold text-foreground">Analiz için görsel ekleyin</h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                Görseller eklendiğinde her fotoğraf ayrı durum kartı olarak analiz edilir.
              </p>
            </section>
          ) : (
            images.map((image, imageIndex) => (
              <section key={image.id} className="rounded-lg border border-border bg-card shadow-[var(--shadow-card)]">
                <div className="flex flex-col gap-4 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground">
                        Görsel {imageIndex + 1}
                      </span>
                      <span className={cn(
                        "rounded-md border px-2.5 py-1 text-xs font-semibold",
                        image.status === "completed" && "border-emerald-300 bg-emerald-50 text-emerald-700",
                        image.status === "fallback" && "border-amber-300 bg-amber-50 text-amber-700",
                        image.status === "failed" && "border-red-300 bg-red-50 text-red-700",
                        (image.status === "queued" || image.status === "compressing" || image.status === "analyzing") && "border-border text-muted-foreground",
                      )}>
                        {image.status === "compressing" || image.status === "analyzing" ? (
                          <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />
                        ) : image.status === "completed" ? (
                          <CheckCircle2 className="mr-1 inline h-3 w-3" />
                        ) : image.status === "fallback" ? (
                          <AlertTriangle className="mr-1 inline h-3 w-3" />
                        ) : null}
                        {imageStatusLabel(image.status)}
                      </span>
                    </div>
                    <p className="mt-2 truncate text-sm text-muted-foreground">{image.message}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => addManualFinding(image.id)}>
                      <Plus className="h-4 w-4" />
                      Manuel risk
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => removeImage(image.id)} disabled={isAnalyzing}>
                      <Trash2 className="h-4 w-4" />
                      Kaldır
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4 p-4 lg:grid-cols-[360px_minmax(0,1fr)]">
                  <div className="space-y-3">
                    <div className="relative overflow-hidden rounded-lg border border-border bg-secondary">
                      <img src={image.previewUrl} alt={image.file.name} className="h-auto w-full object-contain" />
                      {image.findings.flatMap((finding) =>
                        finding.annotations.map((annotation) => {
                          if (annotation.kind === "box") {
                            return (
                              <div
                                key={annotation.id}
                                className="absolute border-2 border-amber-400 bg-amber-400/10"
                                style={{
                                  left: `${annotation.x}%`,
                                  top: `${annotation.y}%`,
                                  width: `${annotation.width}%`,
                                  height: `${annotation.height}%`,
                                }}
                              />
                            );
                          }
                          return (
                            <div
                              key={annotation.id}
                              className="absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-red-600 text-xs font-bold text-white shadow-lg"
                              style={{ left: `${annotation.x}%`, top: `${annotation.y}%` }}
                            >
                              {annotation.label}
                            </div>
                          );
                        }),
                      )}
                    </div>
                    {image.areaSummary ? (
                      <p className="rounded-lg border border-border bg-secondary/40 p-3 text-xs leading-5 text-muted-foreground">
                        {image.areaSummary}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-3">
                    {image.findings.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground">
                        Bu görsel için henüz risk kaydı yok.
                      </div>
                    ) : (
                      image.findings.map((finding, findingIndex) => (
                        <article key={finding.id} className="rounded-lg border border-border p-4">
                          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                            <div className="min-w-0 flex-1 space-y-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-md bg-secondary px-2 py-1 text-xs font-semibold text-secondary-foreground">
                                  R{findingIndex + 1}
                                </span>
                                <span className={cn("rounded-md border px-2 py-1 text-xs font-semibold", severityClasses(finding.severity))}>
                                  {severityLabel(finding.severity)}
                                </span>
                                <span className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground">
                                  %{Math.round(finding.confidence * 100)}
                                </span>
                              </div>

                              <Input
                                label="Risk başlığı"
                                value={finding.title}
                                onChange={(event) => updateFinding(image.id, finding.id, { title: event.target.value })}
                              />

                              <div className="grid gap-3 md:grid-cols-3">
                                <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
                                  Kategori
                                  <select
                                    value={finding.category}
                                    onChange={(event) => updateFinding(image.id, finding.id, { category: event.target.value })}
                                    className="h-12 rounded-lg border border-border bg-card px-3 text-sm text-foreground"
                                  >
                                    {CATEGORY_OPTIONS.map((item) => (
                                      <option key={item} value={item}>{item}</option>
                                    ))}
                                    {!CATEGORY_OPTIONS.includes(finding.category) ? (
                                      <option value={finding.category}>{finding.category}</option>
                                    ) : null}
                                  </select>
                                </label>
                                <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
                                  Şiddet
                                  <select
                                    value={finding.severity}
                                    onChange={(event) => updateFinding(image.id, finding.id, { severity: event.target.value as Severity })}
                                    className="h-12 rounded-lg border border-border bg-card px-3 text-sm text-foreground"
                                  >
                                    {SEVERITY_OPTIONS.map((item) => (
                                      <option key={item.value} value={item.value}>{item.label}</option>
                                    ))}
                                  </select>
                                </label>
                                <Input
                                  label="Güven"
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={Math.round(finding.confidence * 100)}
                                  onChange={(event) => updateFinding(image.id, finding.id, { confidence: clamp(Number(event.target.value) / 100, 0, 1) })}
                                />
                              </div>

                              <Textarea
                                label="Öneri / aksiyon"
                                rows={3}
                                value={finding.recommendation}
                                onChange={(event) => updateFinding(image.id, finding.id, { recommendation: event.target.value })}
                              />
                            </div>
                            <div className="flex min-w-[120px] flex-row gap-2 xl:flex-col">
                              <div className="rounded-lg border border-border p-3 text-center">
                                <div className="text-xs text-muted-foreground">R-SKOR</div>
                                <div className="mt-1 text-lg font-bold text-foreground">
                                  {Math.round((finding.r2dResult?.score ?? 0) * 100)}
                                </div>
                              </div>
                              <Button variant="ghost" size="sm" onClick={() => removeFinding(image.id, finding.id)}>
                                <Trash2 className="h-4 w-4" />
                                Sil
                              </Button>
                            </div>
                          </div>
                        </article>
                      ))
                    )}
                  </div>
                </div>
              </section>
            ))
          )}
        </main>
      </div>
    </div>
  );
}
