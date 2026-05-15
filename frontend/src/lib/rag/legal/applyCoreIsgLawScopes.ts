/**
 * applyCoreIsgLawScopes.ts
 *
 * İSG ile doğrudan ilgili olmayan kanunları çekirdek İSG RAG kapsamından çıkarır.
 * Kaynakları silmez; yalnızca legal_documents + legal_chunks retrieval alanlarını günceller.
 */

export type LawRagAction = "disable_for_core_isg_rag" | "legal_procedure_only";

export type RetrievalScope =
  | "core_isg"
  | "legal_procedure"
  | "sectoral_isg"
  | "public_sector"
  | "environment"
  | "construction"
  | "energy"
  | "transport"
  | "health"
  | "product_safety";

export type LegalRagStatus =
  | "active"
  | "disabled_for_core_isg_rag"
  | "legal_procedure_only"
  | "sectoral_only";

export type LawScopeRule = {
  lawNo: string;
  title: string;
  url: string;
  action: LawRagAction;
  reason: string;
};

export type LegalDocumentPatch = {
  coreIsgEnabled: boolean;
  excludedFromDefaultRetrieval: boolean;
  ragStatus: LegalRagStatus;
  retrievalScopes: RetrievalScope[];
  disableReason?: string;
  scopeReason?: string;
  updatedAt: string;
};

export type LegalChunkPatch = {
  coreIsgEnabled: boolean;
  excludedFromDefaultRetrieval: boolean;
  ragStatus: LegalRagStatus;
  retrievalScopes: RetrievalScope[];
  disableReason?: string;
  updatedAt: string;
};

export type LegalDocumentRepository = {
  updateLegalDocumentByLawNo: (lawNo: string, patch: LegalDocumentPatch) => Promise<number>;
  updateChunksByLawNo: (lawNo: string, patch: LegalChunkPatch) => Promise<number>;
};

export type ApplyLawScopeOptions = {
  dryRun?: boolean;
  now?: string;
  logger?: Pick<Console, "log" | "warn" | "error">;
};

export type ApplyLawScopeResult = {
  dryRun: boolean;
  totalRules: number;
  documentRowsUpdated: number;
  chunkRowsUpdated: number;
  results: Array<{
    lawNo: string;
    title: string;
    action: LawRagAction;
    documentPatch: LegalDocumentPatch;
    chunkPatch: LegalChunkPatch;
    documentRowsUpdated: number;
    chunkRowsUpdated: number;
  }>;
};

export const lawsToDisableForCoreIsgRag: LawScopeRule[] = [
  {
    lawNo: "5953",
    title:
      "Basın Mesleğinde Çalışanlarla Çalıştıranlar Arasındaki Münasebetlerin Tanzimi Hakkında Kanun",
    url: "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=5953&MevzuatTur=1&MevzuatTertip=3",
    action: "disable_for_core_isg_rag",
    reason: "Basın iş ilişkisi kanunu; çekirdek İSG yükümlülüğü üretmez.",
  },
  {
    lawNo: "4447",
    title: "İşsizlik Sigortası Kanunu",
    url: "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=4447&MevzuatTur=1&MevzuatTertip=5",
    action: "disable_for_core_isg_rag",
    reason: "İşsizlik sigortası ve istihdam desteği odaklıdır.",
  },
  {
    lawNo: "4688",
    title: "Kamu Görevlileri Sendikaları ve Toplu Sözleşme Kanunu",
    url: "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=4688&MevzuatTur=1&MevzuatTertip=5",
    action: "disable_for_core_isg_rag",
    reason:
      "Kamu sendikal ilişkileri; İSG teknik/yükümlülük cevabı için çekirdek kaynak değildir.",
  },
  {
    lawNo: "6356",
    title: "Sendikalar ve Toplu İş Sözleşmesi Kanunu",
    url: "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=6356&MevzuatTur=1&MevzuatTertip=5",
    action: "disable_for_core_isg_rag",
    reason: "Sendikal haklar ve toplu iş sözleşmesi odaklıdır.",
  },
  {
    lawNo: "6102",
    title: "Türk Ticaret Kanunu",
    url: "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=6102&MevzuatTur=1&MevzuatTertip=5",
    action: "disable_for_core_isg_rag",
    reason: "Şirketler hukuku kaynağıdır; İSG mevzuatı değildir.",
  },
  {
    lawNo: "6100",
    title: "Hukuk Muhakemeleri Kanunu",
    url: "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=6100&MevzuatTur=1&MevzuatTertip=5",
    action: "legal_procedure_only",
    reason: "Tazminat davası usulü için kullanılabilir; çekirdek İSG kaynağı değildir.",
  },
  {
    lawNo: "5271",
    title: "Ceza Muhakemesi Kanunu",
    url: "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=5271&MevzuatTur=1&MevzuatTertip=5",
    action: "legal_procedure_only",
    reason:
      "İş kazası sonrası ceza soruşturması usulü için kullanılabilir; İSG mevzuatı değildir.",
  },
  {
    lawNo: "6325",
    title: "Hukuk Uyuşmazlıklarında Arabuluculuk Kanunu",
    url: "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=6325&MevzuatTur=1&MevzuatTertip=5",
    action: "legal_procedure_only",
    reason: "Uyuşmazlık çözümü kaynağıdır; İSG yükümlülüğü kaynağı değildir.",
  },
  {
    lawNo: "2886",
    title: "Devlet İhale Kanunu",
    url: "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=2886&MevzuatTur=1&MevzuatTertip=5",
    action: "disable_for_core_isg_rag",
    reason: "Kamu ihalesiyle dolaylı bağ olabilir; 4734/4735 daha anlamlıdır.",
  },
  {
    lawNo: "5018",
    title: "Kamu Mali Yönetimi ve Kontrol Kanunu",
    url: "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=5018&MevzuatTur=1&MevzuatTertip=5",
    action: "disable_for_core_isg_rag",
    reason: "Kamu mali yönetimi kaynağıdır; İSG mevzuatı değildir.",
  },
  {
    lawNo: "5442",
    title: "İl İdaresi Kanunu",
    url: "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=5442&MevzuatTur=1&MevzuatTertip=3",
    action: "disable_for_core_isg_rag",
    reason: "Genel idare ve mülki yönetim kaynağıdır.",
  },
  {
    lawNo: "5326",
    title: "Kabahatler Kanunu",
    url: "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=5326&MevzuatTur=1&MevzuatTertip=5",
    action: "disable_for_core_isg_rag",
    reason:
      "Genel kabahat/idari yaptırım kanunudur; 6331 idari para cezası tablosu daha doğrudan kaynaktır.",
  },
  {
    lawNo: "6735",
    title: "Uluslararası İşgücü Kanunu",
    url: "https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=6735&MevzuatTur=1&MevzuatTertip=5",
    action: "disable_for_core_isg_rag",
    reason: "Yabancı çalışma izni ve uluslararası işgücü odaklıdır.",
  },
];

export const lawsToDisableForCoreIsgRagMap = new Map<string, LawScopeRule>(
  lawsToDisableForCoreIsgRag.map((law) => [normalizeLawNo(law.lawNo), law]),
);

export function normalizeLawNo(lawNo: string): string {
  return String(lawNo).replace(/\D/g, "").trim();
}

export function docNumberMatchesLawNo(docNumber: string | null | undefined, lawNo: string): boolean {
  const target = normalizeLawNo(lawNo);
  if (!target) return false;
  return normalizeLawNo(docNumber ?? "") === target;
}

export function catalogLawNo(metadata: Record<string, unknown> | null | undefined): string | null {
  if (!metadata) return null;
  const raw = metadata.law_no ?? metadata.lawNo;
  if (raw == null) return null;
  const normalized = normalizeLawNo(String(raw));
  return normalized || null;
}

export function classifyLawForRag(lawNo: string): {
  lawNo: string;
  action: LawRagAction | "active";
  coreIsgEnabled: boolean;
  excludedFromDefaultRetrieval: boolean;
  ragStatus: LegalRagStatus;
  retrievalScopes: RetrievalScope[];
  reason?: string;
} {
  const normalizedLawNo = normalizeLawNo(lawNo);
  const rule = lawsToDisableForCoreIsgRagMap.get(normalizedLawNo);

  if (!rule) {
    return {
      lawNo: normalizedLawNo,
      action: "active",
      coreIsgEnabled: true,
      excludedFromDefaultRetrieval: false,
      ragStatus: "active",
      retrievalScopes: ["core_isg"],
    };
  }

  if (rule.action === "legal_procedure_only") {
    return {
      lawNo: normalizedLawNo,
      action: rule.action,
      coreIsgEnabled: false,
      excludedFromDefaultRetrieval: true,
      ragStatus: "legal_procedure_only",
      retrievalScopes: ["legal_procedure"],
      reason: rule.reason,
    };
  }

  return {
    lawNo: normalizedLawNo,
    action: rule.action,
    coreIsgEnabled: false,
    excludedFromDefaultRetrieval: true,
    ragStatus: "disabled_for_core_isg_rag",
    retrievalScopes: [],
    reason: rule.reason,
  };
}

export function buildLegalDocumentPatch(rule: LawScopeRule, now = new Date().toISOString()): LegalDocumentPatch {
  const classification = classifyLawForRag(rule.lawNo);

  return {
    coreIsgEnabled: classification.coreIsgEnabled,
    excludedFromDefaultRetrieval: classification.excludedFromDefaultRetrieval,
    ragStatus: classification.ragStatus,
    retrievalScopes: classification.retrievalScopes,
    disableReason:
      classification.ragStatus === "disabled_for_core_isg_rag" ? rule.reason : undefined,
    scopeReason: classification.ragStatus === "legal_procedure_only" ? rule.reason : undefined,
    updatedAt: now,
  };
}

export function buildLegalChunkPatch(rule: LawScopeRule, now = new Date().toISOString()): LegalChunkPatch {
  const classification = classifyLawForRag(rule.lawNo);

  return {
    coreIsgEnabled: classification.coreIsgEnabled,
    excludedFromDefaultRetrieval: classification.excludedFromDefaultRetrieval,
    ragStatus: classification.ragStatus,
    retrievalScopes: classification.retrievalScopes,
    disableReason: rule.reason,
    updatedAt: now,
  };
}

export async function applyCoreIsgLawScopeRules(
  repository: LegalDocumentRepository,
  options: ApplyLawScopeOptions = {},
): Promise<ApplyLawScopeResult> {
  const logger = options.logger ?? console;
  const now = options.now ?? new Date().toISOString();
  const dryRun = options.dryRun ?? false;

  let documentRowsUpdated = 0;
  let chunkRowsUpdated = 0;

  const results: ApplyLawScopeResult["results"] = [];

  for (const rule of lawsToDisableForCoreIsgRag) {
    const lawNo = normalizeLawNo(rule.lawNo);
    const documentPatch = buildLegalDocumentPatch(rule, now);
    const chunkPatch = buildLegalChunkPatch(rule, now);

    let updatedDocuments = 0;
    let updatedChunks = 0;

    if (!dryRun) {
      updatedDocuments = await repository.updateLegalDocumentByLawNo(lawNo, documentPatch);
      updatedChunks = await repository.updateChunksByLawNo(lawNo, chunkPatch);
    }

    documentRowsUpdated += updatedDocuments;
    chunkRowsUpdated += updatedChunks;

    results.push({
      lawNo,
      title: rule.title,
      action: rule.action,
      documentPatch,
      chunkPatch,
      documentRowsUpdated: updatedDocuments,
      chunkRowsUpdated: updatedChunks,
    });

    logger.log(
      `[core-isg-law-scope] ${dryRun ? "DRY_RUN" : "UPDATED"} lawNo=${lawNo} action=${rule.action} documents=${updatedDocuments} chunks=${updatedChunks}`,
    );
  }

  return {
    dryRun,
    totalRules: lawsToDisableForCoreIsgRag.length,
    documentRowsUpdated,
    chunkRowsUpdated,
    results,
  };
}

export const defaultCoreIsgRagFilter = {
  coreIsgEnabled: true,
  excludedFromDefaultRetrieval: false,
  retrievalScopes: { hasSome: ["core_isg"] as RetrievalScope[] },
  ragStatus: {
    notIn: ["disabled_for_core_isg_rag", "legal_procedure_only"] as LegalRagStatus[],
  },
};

export const legalProcedureRagFilter = {
  retrievalScopes: { hasSome: ["core_isg", "legal_procedure"] as RetrievalScope[] },
  ragStatus: { in: ["active", "legal_procedure_only"] as LegalRagStatus[] },
};

export function detectRagRetrievalMode(userQuery: string): "core_isg" | "legal_procedure" {
  const q = userQuery.toLocaleLowerCase("tr-TR");

  const legalProcedureKeywords = [
    "dava",
    "tazminat",
    "ceza",
    "soruşturma",
    "kovuşturma",
    "savcılık",
    "mahkeme",
    "bilirkişi",
    "arabuluculuk",
    "kusur",
    "taksir",
    "bilinçli taksir",
    "ifade",
    "delil",
    "iş kazası sonrası",
    "ölümlü iş kazası",
    "yaralanmalı iş kazası",
  ];

  const isLegalProcedure = legalProcedureKeywords.some((keyword) => q.includes(keyword));
  return isLegalProcedure ? "legal_procedure" : "core_isg";
}

export function getRetrievalModeForUserQuery(userQuery: string): "core_isg" | "legal_procedure" {
  return detectRagRetrievalMode(userQuery);
}
