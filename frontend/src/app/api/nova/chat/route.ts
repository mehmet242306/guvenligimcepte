import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, requirePermission } from "@/lib/supabase/api-auth";
import {
  getAccountContextForUser,
  hasOsgbManagementAccess,
  shouldBypassNovaBillingLimits,
} from "@/lib/account/account-routing";
import { enforceRateLimit, parseJsonBody, resolveAiDailyLimit } from "@/lib/security/server";
import { createServiceClient } from "@/lib/security/server";
import {
  normalizeNovaAgentResponse,
  novaChatRequestSchema,
  type NovaAgentResponse,
} from "@/lib/nova/agent";
import { assertNovaFeatureEnabled } from "@/lib/nova/governance";
import {
  resolveNovaGreetingIntent,
  resolveNovaNavigationIntent,
} from "@/lib/nova/navigation-intents";
import { consumeEntitlement } from "@/lib/billing/entitlements";
import {
  resolveNovaAuditSimulationIntent,
  buildNovaSiteMapSummaryForPrompt,
  resolveNovaGuidanceIntent,
  resolveNovaProductHelpIntent,
} from "@/lib/nova/site-map";
import { extractNovaTrainingTitle, parseNovaNaturalDate } from "@/lib/nova/natural-date";
import { shouldBypassNovaStaticRedirects } from "@/lib/nova/request-mode";

function isCompatError(message: string | undefined | null) {
  const normalized = String(message ?? "").toLowerCase();
  return (
    normalized.includes("relation") ||
    normalized.includes("schema cache") ||
    normalized.includes("does not exist")
  );
}

function normalizeNovaIntentText(message: string) {
  return message
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "");
}

function isNovaImageContextMessage(message: string) {
  return /\[Nova Gorsel Mesaji\]|\[Gorsel Baglami\]|Kullanici bir gorsel paylasti/i.test(message);
}

function isOperationalCommandQuery(message: string) {
  const normalized = normalizeNovaIntentText(message);
  return /\b(olustur|planla|ekle|kaydet|ac|git|yonlendir|create|plan|open|navigate|schedule|start|baslat|uygula)\b/.test(
    normalized,
  );
}

function detectNovaIntentForPermission(
  message: string,
): "regulation" | "training" | "planning" | "incident" | "document" | "navigation" | "analysis" | "general" {
  const normalized = normalizeNovaIntentText(message);

  if (
    /(mevzuat|yonetmelik|kanun|madde|regulation|law|article|legal|gesetz|verordnung|ley|leyes|loi|reglement|reglamento|normativa|isg uzmani|is guvenligi uzmani|isyeri hekimi|diger saglik personeli|dsp|tehlike sinifi|cok tehlikeli|az tehlikeli|tehlikeli sinif|calisan sayisi|personel sayisi|kac kisi|kac personel|ayda kac saat|bildirim suresi|zorunlu mu|gerekli mi|yasal|yukumluluk|sorumluluk)/.test(
      normalized,
    )
  ) {
    return "regulation";
  }

  if (/(egitim|training|sertifika|certificate|schulung|formation|curso|capacitacion|pelatihan)/.test(normalized)) return "training";
  if (/(ramak kala|is kazasi|incident|near miss|occupational disease|olay|unfall|incidente|accident|accidente)/.test(normalized)) return "incident";
  if (/(dokuman|procedure|prosedur|report|rapor|form|tutanak|document|dokument|documento|rapport)/.test(normalized)) return "document";
  if (/(planla|takvim|gorev|schedule|planner|task|kurul|planifier|programar|planen|aufgabe|agenda)/.test(normalized)) return "planning";
  if (/(ac|gotur|show|open|navigate|go to|ouvrir|abrir|offnen|zeigen)/.test(normalized)) return "navigation";
  if (/(analiz|analysis|degerlendir|ozetle|risk|analyse|analisis|analizar|bewerten|summary)/.test(normalized)) return "analysis";

  return "general";
}

function canUseReadOnlyLegalFallback(message: string) {
  return detectNovaIntentForPermission(message) === "regulation" && !isOperationalCommandQuery(message);
}

function resolveNovaProfessionalPerspective(message: string): "isg_uzmani" | "isyeri_hekimi" | "yonetici" | "ik" | null {
  const normalized = normalizeNovaIntentText(message);

  if (/(isg uzmani|is guvenligi uzmani|c sinifi|b sinifi|a sinifi)/.test(normalized)) {
    return "isg_uzmani";
  }
  if (/(isyeri hekimi|hekim|doktor|isyeri doktoru|saglik gozetimi)/.test(normalized)) {
    return "isyeri_hekimi";
  }
  if (/(yonetici|mudur|ceo|isveren|ust yonetim)/.test(normalized)) {
    return "yonetici";
  }
  if (/(ik|insan kaynaklari|hr)/.test(normalized)) {
    return "ik";
  }

  return null;
}

type NovaCreateRecordIntent = {
  kind: "task" | "corrective_action" | "training";
  title: string;
  assigneeText?: string | null;
  priority?: "Dusuk" | "Orta" | "Yuksek" | "Kritik" | null;
  deadlineDate?: string | null;
};

function resolveNovaCreateRecordIntent(message: string): NovaCreateRecordIntent | null {
  const normalized = normalizeNovaIntentText(message);
  const extractTitle = () => {
    const quoted = message.match(/["“](.+?)["”]/)?.[1]?.trim();
    if (quoted) return quoted;
    const afterColon = message.split(":").slice(1).join(":").trim();
    if (afterColon) return afterColon.slice(0, 140);
    return "";
  };

  const assigneeMatch = message.match(/(?:sorumlu|assignee|atanan)\s*[:=]\s*([^\n,.;]+)/i);
  const assigneeText = assigneeMatch?.[1]?.trim() || null;
  const priority =
    /(kritik|critical)/i.test(message)
      ? "Kritik"
      : /(yuksek|high)/i.test(message)
        ? "Yuksek"
        : /(dusuk|low)/i.test(message)
          ? "Dusuk"
          : /(orta|medium)/i.test(message)
            ? "Orta"
            : null;

  const dateMatch = message.match(/\b(\d{4}-\d{2}-\d{2}|\d{2}[./-]\d{2}[./-]\d{4})\b/);
  const trDateLike = dateMatch?.[1] ?? null;
  const today = new Date();
  const toIso = (date: Date) => date.toISOString().slice(0, 10);
  let deadlineDate: string | null = null;
  if (trDateLike) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(trDateLike)) {
      deadlineDate = trDateLike;
    } else {
      const [dd, mm, yyyy] = trDateLike.split(/[./-]/);
      if (dd && mm && yyyy) {
        deadlineDate = `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
      }
    }
  } else if (/(yarin|tomorrow)/i.test(message)) {
    const d = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    deadlineDate = toIso(d);
  } else if (/(haftaya|next week)/i.test(message)) {
    const d = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    deadlineDate = toIso(d);
  } else if (/(bugun|today)/i.test(message)) {
    deadlineDate = toIso(today);
  } else {
    deadlineDate = parseNovaNaturalDate(message, today);
  }

  if (/(gorev olustur|gorev ac|task create|create task|yeni gorev)/.test(normalized)) {
    return { kind: "task", title: extractTitle() || "Nova gorevi", assigneeText, priority, deadlineDate };
  }
  if (/(dof ac|dof olustur|duzeltici faaliyet ac|corrective action create|yeni dof)/.test(normalized)) {
    return { kind: "corrective_action", title: extractTitle() || "Nova DOF kaydi", assigneeText, priority, deadlineDate };
  }
  if (/(egitim olustur|egitim planla|training create|yeni egitim|egitim ekle)/.test(normalized)) {
    return {
      kind: "training",
      title: extractTitle() || extractNovaTrainingTitle(message) || "Is guvenligi egitimi",
      assigneeText,
      priority,
      deadlineDate,
    };
  }

  return null;
}

async function createRecordFromNovaIntent(params: {
  intent: NovaCreateRecordIntent;
  organizationId: string;
  userId: string;
  companyWorkspaceId: string | null;
  language?: string;
}) {
  if (!params.companyWorkspaceId) {
    return {
      ok: false as const,
      answer:
        params.language?.startsWith("en")
          ? "I can create records directly, but I first need a selected company/workspace context. Please select a company and try again."
          : "Kaydi dogrudan olusturabilirim ancak once secili bir firma/workspace baglami gerekiyor. Lutfen firma secip tekrar deneyin.",
      navigation: {
        action: "navigate" as const,
        url: "/companies",
        label: "Firmalar",
        reason: "Kayit olusturmadan once firma secimi gerekiyor.",
        destination: "companies_workspace_selection",
        auto_navigate: false,
      },
      toolPreview: {
        toolName: "select_workspace_for_record_create",
        title: params.language?.startsWith("en") ? "Select Company First" : "Once Firma Secin",
        summary:
          params.language?.startsWith("en")
            ? "A selected workspace is required for direct record creation."
            : "Dogrudan kayit acmak icin secili workspace gerekli.",
        riskClass: "read" as const,
        requiresConfirmation: false,
        actionSurface: "read" as const,
      },
    };
  }

  const service = createServiceClient();
  const today = new Date();
  const isoDate = today.toISOString().slice(0, 10);
  const in14Days = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const resolvedDeadline = params.intent.deadlineDate ?? in14Days;
  const resolvedPriority = params.intent.priority ?? "Orta";
  const correctiveActionPriority =
    resolvedPriority === "Dusuk"
      ? "Düşük"
      : resolvedPriority === "Yuksek"
        ? "Yüksek"
        : resolvedPriority;

  let assigneeAuthUserId: string | null = null;
  let assigneeProfileId: string | null = null;
  if (params.intent.assigneeText) {
    const token = params.intent.assigneeText.trim();
    const { data: profileRows } = await service
      .from("user_profiles")
      .select("id, auth_user_id, full_name, email")
      .eq("organization_id", params.organizationId)
      .or(`full_name.ilike.%${token}%,email.ilike.%${token}%`)
      .limit(1);

    const profile = (profileRows?.[0] ?? null) as
      | { id?: string | null; auth_user_id?: string | null }
      | null;
    assigneeAuthUserId = profile?.auth_user_id ?? null;
    assigneeProfileId = profile?.id ?? null;
  }

  if (params.intent.kind === "task") {
    const basePayload: Record<string, unknown> = {
      organization_id: params.organizationId,
      company_workspace_id: params.companyWorkspaceId,
      title: params.intent.title,
      description: "Nova tarafindan olusturulan gorev.",
      start_date: isoDate,
      end_date: resolvedDeadline,
      status: "planned",
      reminder_days: 3,
      include_in_timesheet: false,
      recurrence: "none",
      metadata: {
        source: "nova_chat",
        requested_priority: resolvedPriority,
      },
    };
    const fallbackCategoryId = "9b722ae5-0a72-48c8-9d1f-836e1a114b8a";

    const { data, error } = await service
      .from("isg_tasks")
      .insert({
        ...basePayload,
        category_id: fallbackCategoryId,
        ...(assigneeProfileId ? { assigned_to: assigneeProfileId } : {}),
      })
      .select("id")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return {
      ok: true as const,
      answer: params.language?.startsWith("en")
        ? `Task created successfully: ${params.intent.title}`
        : `Gorev basariyla olusturuldu: ${params.intent.title}`,
      navigation: {
        action: "navigate" as const,
        url: "/planner",
        label: "Ajanda",
        reason: "Yeni gorev ajandaya eklendi.",
        destination: "planner_task_created",
        auto_navigate: false,
      },
      createdId: data?.id as string | undefined,
    };
  }

  if (params.intent.kind === "training") {
    const { data, error } = await service
      .from("company_trainings")
      .insert({
        organization_id: params.organizationId,
        company_workspace_id: params.companyWorkspaceId,
        title: params.intent.title,
        training_type: "zorunlu",
        trainer_name: "Nova plani",
        training_date: resolvedDeadline,
        duration_hours: 2,
        location: "Saha",
        status: "planned",
        notes: `Nova sohbetinden olusturulan egitim kaydi.${params.intent.assigneeText ? ` Sorumlu: ${params.intent.assigneeText}.` : ""}`,
      })
      .select("id")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return {
      ok: true as const,
      answer: params.language?.startsWith("en")
        ? `Training record created: ${params.intent.title}`
        : `Egitim kaydi olusturuldu: ${params.intent.title}`,
      navigation: {
        action: "navigate" as const,
        url: `/companies/${params.companyWorkspaceId}?tab=tracking`,
        label: "Takip",
        reason: "Egitim kaydi takip sekmesine eklendi.",
        destination: "training_created_tracking",
        auto_navigate: false,
      },
      createdId: data?.id as string | undefined,
    };
  }

  const { data, error } = await service
    .from("corrective_actions")
    .insert({
      organization_id: params.organizationId,
      company_workspace_id: params.companyWorkspaceId,
      title: params.intent.title,
      root_cause: "Nova ilk degerlendirme",
      category: "Genel",
      corrective_action: "Sahada dogrulayip aksiyon adimlarini uygulayin.",
      preventive_action: "Tekrari onlemek icin periyodik kontrol planlayin.",
      responsible_user_id: assigneeAuthUserId ?? params.userId,
      responsible_role: "isg_uzmani",
      deadline: resolvedDeadline,
      status: "tracking",
      priority: correctiveActionPriority,
      completion_percentage: 0,
      ai_generated: true,
      ishikawa_snapshot: {},
      metadata: { source: "nova_chat" },
      created_by: params.userId,
      updated_by: params.userId,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    ok: true as const,
    answer: params.language?.startsWith("en")
      ? `Corrective action created: ${params.intent.title}`
      : `DOF kaydi olusturuldu: ${params.intent.title}`,
    navigation: {
      action: "navigate" as const,
      url: data?.id ? `/corrective-actions/${data.id}` : "/corrective-actions",
      label: "DOF",
      reason: "Olusturulan kaydi detay ekraninda acabilirsiniz.",
      destination: "corrective_action_created",
      auto_navigate: false,
    },
    createdId: data?.id as string | undefined,
  };
}

function resolveNovaOperationalKickoffIntent(message: string): {
  answer: string;
  toolPreview: {
    toolName: string;
    title: string;
    summary: string;
    riskClass: "read";
    requiresConfirmation: false;
    actionSurface: "read";
  };
  followUpActions: Array<{
    id: string;
    kind: "navigate" | "prompt";
    label: string;
    description: string;
    url?: string;
    prompt?: string;
  }>;
} | null {
  if (!isOperationalCommandQuery(message)) {
    return null;
  }

  const intent = detectNovaIntentForPermission(message);
  if (!["incident", "planning", "training", "document"].includes(intent)) {
    return null;
  }

  if (intent === "incident") {
    return {
      answer:
        "Talebinizi hizli aksiyona donusturebiliriz. Once olay kaydini acin, ardindan Nova'ya olay ozetini yazin; ben size kok neden, DOF ve takip adimlarini cikarayim.",
      toolPreview: {
        toolName: "kickoff_incident_workflow",
        title: "Olay aksiyon akisini baslat",
        summary: "Olay kaydi + takip adimlari icin hizli baslangic.",
        riskClass: "read",
        requiresConfirmation: false,
        actionSurface: "read",
      },
      followUpActions: [
        {
          id: crypto.randomUUID(),
          kind: "navigate",
          label: "Olay kaydi olustur",
          description: "Olay formunu ac ve temel bilgileri gir.",
          url: "/incidents/new",
        },
        {
          id: crypto.randomUUID(),
          kind: "prompt",
          label: "Nova'ya olay ozeti yazdir",
          description: "Tek mesajla olay ozetini ve oncelikli aksiyonlari hazirlat.",
          prompt: "Yeni bir olay olusturuyorum. Kisa olay ozeti, kok neden ve ilk 3 DOF onerisi hazirla.",
        },
      ],
    };
  }

  if (intent === "training") {
    return {
      answer:
        "Egitim talebinizi tek akisa cevirelim: once Egitim modulu, sonra hedef kitle ve tarih. Ardindan Nova katilim/takip planini cikarir.",
      toolPreview: {
        toolName: "kickoff_training_workflow",
        title: "Egitim planini baslat",
        summary: "Egitim, sinav ve takip adimlari icin hizli yonlendirme.",
        riskClass: "read",
        requiresConfirmation: false,
        actionSurface: "read",
      },
      followUpActions: [
        {
          id: crypto.randomUUID(),
          kind: "navigate",
          label: "Egitim modulu",
          description: "Egitim/sinav ekranina gec.",
          url: "/training",
        },
        {
          id: crypto.randomUUID(),
          kind: "prompt",
          label: "Nova'dan egitim plani iste",
          description: "Rol, tehlike sinifi ve sureye gore plan olustur.",
          prompt: "Calisanlar icin mevzuata uygun 30 gunluk egitim ve takip plani hazirla.",
        },
      ],
    };
  }

  if (intent === "planning") {
    return {
      answer:
        "Plan/gorev talebinizi Ajanda uzerinden hizlica baslatabilirsiniz. Nova once 3 onceligi cikarir, sonra gorev dagilimini netlestirir.",
      toolPreview: {
        toolName: "kickoff_planning_workflow",
        title: "Ajanda gorev akisini baslat",
        summary: "Onceliklendirme ve gorev dagilimi icin hizli baslangic.",
        riskClass: "read",
        requiresConfirmation: false,
        actionSurface: "read",
      },
      followUpActions: [
        {
          id: crypto.randomUUID(),
          kind: "navigate",
          label: "Ajandaya git",
          description: "Gorev ve takvim ekranina gec.",
          url: "/planner",
        },
        {
          id: crypto.randomUUID(),
          kind: "prompt",
          label: "Nova'dan 3 oncelik cikar",
          description: "Bugun/hafta icin kritik adimlari netlestir.",
          prompt: "Bu hafta icin mevzuat riski en yuksek 3 gorevi ve sorumlulari cikar.",
        },
      ],
    };
  }

  return {
    answer:
      "Dokuman talebinizi sohbet yerine dogru modulle hizlandiralim. ISG Kutuphanesi ve Dokuman Editoru uzerinden mevzuata uygun taslak akisini baslatabilirsiniz.",
    toolPreview: {
      toolName: "kickoff_document_workflow",
      title: "Dokuman akisina basla",
      summary: "Sablon secimi ve dokuman taslagi icin hizli yonlendirme.",
      riskClass: "read",
      requiresConfirmation: false,
      actionSurface: "read",
    },
    followUpActions: [
      {
        id: crypto.randomUUID(),
        kind: "navigate",
        label: "ISG Kutuphanesi Dokumantasyon",
        description: "Hazir sablon ve prosedurlere gec.",
        url: "/isg-library?section=documentation",
      },
      {
        id: crypto.randomUUID(),
        kind: "navigate",
        label: "Dokuman editoru",
        description: "Sifirdan taslak olustur.",
        url: "/documents/new",
      },
    ],
  };
}

function isUuid(value: string | null | undefined) {
  return !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function extractWorkspaceIdFromCurrentPage(currentPage: string | undefined) {
  if (!currentPage) return null;

  try {
    const url = new URL(currentPage, "http://localhost");
    const workspaceId =
      url.searchParams.get("workspaceId") ??
      url.searchParams.get("companyWorkspaceId") ??
      null;

    return isUuid(workspaceId) ? workspaceId : null;
  } catch {
    return null;
  }
}

function isOsgbManagerSurface(currentPage: string | undefined | null) {
  const normalized = String(currentPage ?? "").toLowerCase();
  return normalized.includes("/osgb") || normalized.includes("surface=osgb-manager");
}

function isPlatformAdminSurface(currentPage: string | undefined | null) {
  const normalized = String(currentPage ?? "").toLowerCase();
  return normalized.includes("/platform-admin") || normalized.includes("surface=platform-admin");
}

function isEnterpriseSurface(currentPage: string | undefined | null) {
  const normalized = String(currentPage ?? "").toLowerCase();
  return normalized.includes("/enterprise") || normalized.includes("surface=enterprise");
}

async function buildPlatformAdminContextNote(params: {
  currentPage?: string;
}) {
  const service = createServiceClient();
  const page = String(params.currentPage ?? "/platform-admin").split("?")[0] || "/platform-admin";

  const [
    openErrorsResult,
    criticalErrorsResult,
    criticalAlertsResult,
    pendingQueueResult,
    riskDraftResult,
    documentApprovalResult,
    activeWorkspaceResult,
    healthChecksResult,
  ] = await Promise.all([
    service
      .from("error_logs")
      .select("id", { count: "exact", head: true })
      .is("resolved_at", null),
    service
      .from("error_logs")
      .select("id", { count: "exact", head: true })
      .eq("level", "critical")
      .is("resolved_at", null),
    service
      .from("admin_notifications")
      .select("id", { count: "exact", head: true })
      .eq("is_resolved", false)
      .eq("level", "critical"),
    service
      .from("task_queue")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    service
      .from("risk_assessments")
      .select("id", { count: "exact", head: true })
      .eq("status", "draft"),
    service
      .from("editor_documents")
      .select("id", { count: "exact", head: true })
      .eq("status", "onay_bekliyor"),
    service
      .from("company_workspaces")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    service
      .from("health_checks")
      .select("component_key,status,checked_at")
      .order("checked_at", { ascending: false })
      .limit(8),
  ]);

  for (const error of [
    openErrorsResult.error,
    criticalErrorsResult.error,
    criticalAlertsResult.error,
    pendingQueueResult.error,
    riskDraftResult.error,
    documentApprovalResult.error,
    activeWorkspaceResult.error,
    healthChecksResult.error,
  ]) {
    if (error && !isCompatError(error.message)) {
      throw new Error(error.message);
    }
  }

  const degradedComponents = ((healthChecksResult.data ?? []) as Array<{
    component_key: string;
    status: "healthy" | "degraded" | "down";
    checked_at: string;
  }>)
    .filter((row) => row.status !== "healthy")
    .slice(0, 4)
    .map((row) => `${row.component_key}:${row.status}`);

  return [
    "Platform admin context:",
    `- current_page: ${page}`,
    `- active_workspaces: ${activeWorkspaceResult.count ?? 0}`,
    `- open_errors: ${openErrorsResult.count ?? 0}`,
    `- critical_errors: ${criticalErrorsResult.count ?? 0}`,
    `- critical_alerts: ${criticalAlertsResult.count ?? 0}`,
    `- pending_queue: ${pendingQueueResult.count ?? 0}`,
    `- draft_risk_assessments: ${riskDraftResult.count ?? 0}`,
    `- pending_document_approvals: ${documentApprovalResult.count ?? 0}`,
    `- degraded_components: ${degradedComponents.length > 0 ? degradedComponents.join(", ") : "none"}`,
    "- behavior: ic operasyon ve platform sagligi perspektifiyle cevap ver; tenant icerigi yazmak yerine global eksik, aksaklik, hata ve oncelikleri ozetle.",
    "- behavior: risk analizi, dokuman omurgasi, hata loglari ve kuyruk sinyalleri arasindaki baglantiyi kur.",
  ].join("\n");
}

async function buildOsgbManagerContextNote(params: {
  organizationId: string;
  companyWorkspaceId: string | null;
  currentPage?: string;
}) {
  const service = createServiceClient();
  const page = String(params.currentPage ?? "/osgb").split("?")[0] || "/osgb";

  const companyPromise = params.companyWorkspaceId
    ? service
        .from("company_workspaces")
        .select(
          `
          id,
          display_name,
          company_identities (
            official_name
          )
        `,
        )
        .eq("organization_id", params.organizationId)
        .eq("id", params.companyWorkspaceId)
        .maybeSingle()
    : Promise.resolve({ data: null, error: null });

  const taskQuery = service
    .from("workspace_tasks")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", params.organizationId);
  const overdueTaskQuery = service
    .from("workspace_tasks")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", params.organizationId)
    .lt("due_date", new Date().toISOString().slice(0, 10))
    .in("status", ["open", "in_progress"]);
  const assignmentQuery = service
    .from("workspace_assignments")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", params.organizationId)
    .eq("assignment_status", "active");
  const documentQuery = service
    .from("editor_documents")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", params.organizationId)
    .eq("status", "onay_bekliyor");

  if (params.companyWorkspaceId) {
    taskQuery.eq("company_workspace_id", params.companyWorkspaceId);
    overdueTaskQuery.eq("company_workspace_id", params.companyWorkspaceId);
    assignmentQuery.eq("company_workspace_id", params.companyWorkspaceId);
    documentQuery.eq("company_workspace_id", params.companyWorkspaceId);
  }

  const [
    companyResult,
    openTasksResult,
    overdueTasksResult,
    assignmentsResult,
    pendingDocumentsResult,
  ] = await Promise.all([
    companyPromise,
    taskQuery,
    overdueTaskQuery,
    assignmentQuery,
    documentQuery,
  ]);

  for (const error of [
    companyResult.error,
    openTasksResult.error,
    overdueTasksResult.error,
    assignmentsResult.error,
    pendingDocumentsResult.error,
  ]) {
    if (error && !isCompatError(error.message)) {
      throw new Error(error.message);
    }
  }

  const companyRow = companyResult.data as
    | {
        display_name?: string | null;
        company_identities?:
          | { official_name?: string | null }
          | Array<{ official_name?: string | null }>
          | null;
      }
    | null;
  const identity = Array.isArray(companyRow?.company_identities)
    ? companyRow?.company_identities[0]
    : companyRow?.company_identities;
  const companyLabel =
    companyRow?.display_name ||
    identity?.official_name ||
    (params.companyWorkspaceId ? "secili firma" : "tum portfoy");

  return [
    "OSGB manager context:",
    `- current_page: ${page}`,
    `- scope: ${companyLabel}`,
    `- open_tasks: ${openTasksResult.count ?? 0}`,
    `- overdue_tasks: ${overdueTasksResult.count ?? 0}`,
    `- active_assignments: ${assignmentsResult.count ?? 0}`,
    `- pending_document_approvals: ${pendingDocumentsResult.count ?? 0}`,
    "- behavior: yonetici perspektifiyle cevap ver; personel yuk dagilimi, atama bosluklari, geciken isler ve belge/onay riski uzerine odaklan.",
    params.companyWorkspaceId
      ? "- constraint: kullanici firma secimi yapmis durumda; varsayilan olarak yalnizca bu firma kapsaminda analiz yap."
      : "- constraint: kullanici portfoy seviyesinde; firma bazli ozet verirken acikca hangi firmadan bahsettigini soyle.",
  ].join("\n");
}

async function buildEnterpriseContextNote(params: {
  organizationId: string;
  companyWorkspaceId: string | null;
  currentPage?: string;
}) {
  const service = createServiceClient();
  const page = String(params.currentPage ?? "/enterprise").split("?")[0] || "/enterprise";

  const workspaceQuery = service
    .from("company_workspaces")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", params.organizationId)
    .eq("status", "active");
  const taskQuery = service
    .from("workspace_tasks")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", params.organizationId);
  const documentQuery = service
    .from("editor_documents")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", params.organizationId)
    .eq("status", "onay_bekliyor");

  if (params.companyWorkspaceId) {
    taskQuery.eq("company_workspace_id", params.companyWorkspaceId);
    documentQuery.eq("company_workspace_id", params.companyWorkspaceId);
  }

  const [workspaceResult, taskResult, documentResult] = await Promise.all([
    workspaceQuery,
    taskQuery,
    documentQuery,
  ]);

  for (const error of [workspaceResult.error, taskResult.error, documentResult.error]) {
    if (error && !isCompatError(error.message)) {
      throw new Error(error.message);
    }
  }

  return [
    "Enterprise context:",
    `- current_page: ${page}`,
    `- active_workspaces: ${workspaceResult.count ?? 0}`,
    `- open_tasks: ${taskResult.count ?? 0}`,
    `- pending_document_approvals: ${documentResult.count ?? 0}`,
    params.companyWorkspaceId
      ? "- scope: kullanici secili kurumsal firma/workspace baglaminda."
      : "- scope: kullanici kurumsal portfoy seviyesinde.",
    "- behavior: cevaplarini kurumsal yonetim perspektifiyle ver; standardizasyon, lokasyonlar arasi tutarlilik, dokuman onaylari ve raporlama onceliklerine odaklan.",
  ].join("\n");
}

function getSupabaseUrl() {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!value) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL tanimli degil.");
  }
  return value.replace(/\/+$/, "");
}

function getPublishableKey() {
  const value =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    "";

  if (!value) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY veya NEXT_PUBLIC_SUPABASE_ANON_KEY tanimli degil.",
    );
  }

  return value;
}

function resolveWorkspaceCountryCode(
  rawWorkspace:
    | { country_code?: string | null }
    | { country_code?: string | null }[]
    | null
    | undefined,
) {
  const workspace = Array.isArray(rawWorkspace) ? rawWorkspace[0] : rawWorkspace;
  return workspace?.country_code ?? "TR";
}

async function resolveWorkspaceFallback(
  client: SupabaseClient,
  userId: string,
) {
  const { data } = await client
    .from("nova_workspace_members")
    .select(
      `
      workspace:nova_workspaces!inner (
        id,
        country_code
      )
    `,
    )
    .eq("user_id", userId)
    .order("is_primary", { ascending: false })
    .order("joined_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const row = data as
    | {
        workspace?:
          | { id?: string | null; country_code?: string | null }
          | { id?: string | null; country_code?: string | null }[]
          | null;
      }
    | null;

  const rawWorkspace = row?.workspace as
    | { id?: string | null; country_code?: string | null }
    | { id?: string | null; country_code?: string | null }[]
    | null
    | undefined;
  const workspace = Array.isArray(rawWorkspace) ? rawWorkspace[0] : rawWorkspace;

  return {
    workspaceId: workspace?.id ?? null,
    jurisdictionCode: workspace?.country_code ?? "TR",
  };
}

async function resolveAuthFromAccessToken(accessToken: string) {
  const tokenClient = createSupabaseClient(getSupabaseUrl(), getPublishableKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });

  const {
    data: { user },
    error,
  } = await tokenClient.auth.getUser(accessToken);

  if (error || !user) {
    return null;
  }

  // tokenClient RLS passes (auth.uid() === user.id); supabaseServer cookie
  // yoksa RLS profile'i gizliyor ve Nova 401 donuyordu.
  const { data: profile, error: profileError } = await tokenClient
    .from("user_profiles")
    .select(`
      organization_id,
      active_workspace_id,
      active_workspace:nova_workspaces!user_profiles_active_workspace_id_fkey (
        country_code
      )
    `)
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (profileError && !profileError.message.includes("active_workspace_id")) {
    return null;
  }

  if (profileError?.message.includes("active_workspace_id")) {
    const { data: orgProfile } = await tokenClient
      .from("user_profiles")
      .select("organization_id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (!orgProfile?.organization_id) {
      return null;
    }

    const fallback = await resolveWorkspaceFallback(tokenClient, user.id);
    return {
      userId: user.id,
      organizationId: orgProfile.organization_id,
      workspaceId: fallback.workspaceId,
      jurisdictionCode: fallback.jurisdictionCode,
      accessToken,
    };
  }

  if (!profile?.organization_id) {
    return null;
  }

  return {
    userId: user.id,
    organizationId: profile.organization_id,
    workspaceId: profile.active_workspace_id ?? null,
    jurisdictionCode: resolveWorkspaceCountryCode(
      profile.active_workspace as
        | { country_code?: string | null }
        | { country_code?: string | null }[]
        | null
        | undefined,
    ),
    accessToken,
  };
}

async function hasAiUsePermission(accessToken: string) {
  const tokenClient = createSupabaseClient(getSupabaseUrl(), getPublishableKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });

  const { data, error } = await tokenClient.rpc("user_has_permission", {
    p_permission_code: "ai.use",
  });

  if (error) {
    return false;
  }

  return data === true;
}

async function hasLegacyNovaManagerAccess(userId: string) {
  try {
    const accountContext = await getAccountContextForUser(userId);
    return accountContext.isPlatformAdmin || hasOsgbManagementAccess(accountContext);
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const parsed = await parseJsonBody(request, novaChatRequestSchema);
    if (!parsed.ok) return parsed.response;

    const payload = parsed.data;
    const supabase = await createClient();
    const internalServiceSecret =
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || null;
    const hasImageContext = isNovaImageContextMessage(payload.message);
    const bypassStaticRedirects = shouldBypassNovaStaticRedirects(payload.message);
    const navigationIntent =
      hasImageContext || bypassStaticRedirects ? null : resolveNovaNavigationIntent(payload.message);
    const greetingIntent = resolveNovaGreetingIntent(payload.message);
    const auditSimulationIntent = resolveNovaAuditSimulationIntent(payload.message);
    const guidanceIntent = hasImageContext ? null : resolveNovaGuidanceIntent(payload.message);
    const productHelpIntent =
      hasImageContext || bypassStaticRedirects ? null : resolveNovaProductHelpIntent(payload.message);
    const professionalPerspective = resolveNovaProfessionalPerspective(payload.message);
    const operationalKickoffIntent = null;
    const createRecordIntent = null;

    let authContext =
      payload.access_token
        ? await resolveAuthFromAccessToken(payload.access_token)
        : null;
    const requestedCompanyWorkspaceId =
      payload.company_workspace_id ??
      extractWorkspaceIdFromCurrentPage(payload.current_page);
    let effectiveRequestMode: "read" | "agent" = payload.mode ?? "read";
    let effectiveCompanyWorkspaceId = requestedCompanyWorkspaceId;
    let usedReadOnlyLegalFallback = false;

    let useInternalNovaAuth = false;

    if (!authContext) {
      const allowReadOnlyLegalFallback = canUseReadOnlyLegalFallback(payload.message);
      const allowNavigationFallback = navigationIntent !== null;
      const allowGreetingFallback = greetingIntent !== null;
      const allowAuditSimulationFallback = auditSimulationIntent !== null;
      const allowGuidanceFallback = guidanceIntent !== null;
      const allowProductHelpFallback = productHelpIntent !== null;
      const allowOperationalKickoffFallback = operationalKickoffIntent !== null;
      const allowCreateRecordFallback = createRecordIntent !== null;
      const auth = allowReadOnlyLegalFallback || allowNavigationFallback || allowGreetingFallback || allowProductHelpFallback
        || allowGuidanceFallback || allowAuditSimulationFallback || allowOperationalKickoffFallback || allowCreateRecordFallback
        ? await requireAuth(request)
        : await requirePermission(request, "ai.use");
      if (!auth.ok) return auth.response;

      if (allowReadOnlyLegalFallback) {
        effectiveRequestMode = "read";
        effectiveCompanyWorkspaceId = null;
        usedReadOnlyLegalFallback = true;
      }

      const { data: refreshData, error: refreshError } =
        await supabase.auth.refreshSession();

      const accessToken =
        refreshData.session?.access_token ??
        (await supabase.auth.getSession()).data.session?.access_token ??
        null;

      authContext = {
        userId: auth.userId,
        organizationId: auth.organizationId,
        workspaceId: null,
        jurisdictionCode: "TR",
        accessToken: accessToken ?? "",
      };

      const { data: profile } = await supabase
        .from("user_profiles")
        .select(`
          active_workspace_id,
          active_workspace:nova_workspaces!user_profiles_active_workspace_id_fkey (
            country_code
          )
        `)
        .eq("auth_user_id", auth.userId)
        .maybeSingle();
      if (profile?.active_workspace_id !== undefined) {
        authContext.workspaceId = profile?.active_workspace_id ?? null;
        authContext.jurisdictionCode = resolveWorkspaceCountryCode(
          profile?.active_workspace as
            | { country_code?: string | null }
            | { country_code?: string | null }[]
            | null
            | undefined,
        );
      } else {
        const fallbackClient = createSupabaseClient(getSupabaseUrl(), getPublishableKey(), {
          auth: { persistSession: false, autoRefreshToken: false },
          global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
        });
        const fallback = await resolveWorkspaceFallback(fallbackClient, auth.userId);
        authContext.workspaceId = fallback.workspaceId;
        authContext.jurisdictionCode = fallback.jurisdictionCode;
      }

      useInternalNovaAuth = !accessToken;

      if (useInternalNovaAuth && !internalServiceSecret) {
        return NextResponse.json(
          {
            message:
              "Nova sunucu dogrulama katmani su an hazir degil. Lutfen daha sonra tekrar deneyin.",
            detail: refreshError?.message ?? "internal_auth_secret_missing",
          },
          { status: 500 },
        );
      }
    } else {
      const hasNovaPermission = navigationIntent || greetingIntent || guidanceIntent || auditSimulationIntent || productHelpIntent || operationalKickoffIntent || createRecordIntent
        ? true
        : await hasAiUsePermission(payload.access_token!);
      const hasManagerAccess = navigationIntent || greetingIntent || guidanceIntent || auditSimulationIntent || productHelpIntent || operationalKickoffIntent || createRecordIntent
        ? true
        : await hasLegacyNovaManagerAccess(authContext.userId);
      const readOnlyLegalFallback =
        !navigationIntent &&
        !greetingIntent &&
        !hasNovaPermission &&
        !hasManagerAccess &&
        canUseReadOnlyLegalFallback(payload.message);

      if (!hasNovaPermission && !hasManagerAccess && !readOnlyLegalFallback) {
        return NextResponse.json(
          { message: "Bu islem icin gerekli yetki bulunmuyor. (ERR_AUTH_006)" },
          { status: 403 },
        );
      }

      if (readOnlyLegalFallback) {
        effectiveRequestMode = "read";
        effectiveCompanyWorkspaceId = null;
        usedReadOnlyLegalFallback = true;
      }
    }

    if (greetingIntent) {
      return NextResponse.json(
        normalizeNovaAgentResponse({
          type: "message",
          answer: greetingIntent,
          session_id: payload.session_id ?? null,
          as_of_date: payload.as_of_date ?? new Date().toISOString().slice(0, 10),
          answer_mode: payload.answer_mode,
          jurisdiction_code: payload.jurisdiction_code ?? authContext.jurisdictionCode ?? "TR",
          sources: [],
          telemetry: {
            gateway_mode: "greeting_fallback",
            context_surface: payload.context_surface,
            current_page: payload.current_page ?? null,
          },
        }),
      );
    }

    if (navigationIntent) {
      return NextResponse.json(
        normalizeNovaAgentResponse({
          type: "message",
          answer: navigationIntent.answer,
          session_id: payload.session_id ?? null,
          as_of_date: payload.as_of_date ?? new Date().toISOString().slice(0, 10),
          answer_mode: payload.answer_mode,
          jurisdiction_code: payload.jurisdiction_code ?? authContext.jurisdictionCode ?? "TR",
          sources: [],
          navigation: navigationIntent.navigation,
          telemetry: {
            gateway_mode: "navigation_fallback",
            context_surface: payload.context_surface,
            current_page: payload.current_page ?? null,
            company_workspace_id: effectiveCompanyWorkspaceId,
          },
        }),
      );
    }

    if (productHelpIntent) {
      return NextResponse.json(
        normalizeNovaAgentResponse({
          type: "message",
          answer: productHelpIntent.answer,
          session_id: payload.session_id ?? null,
          as_of_date: payload.as_of_date ?? new Date().toISOString().slice(0, 10),
          answer_mode: payload.answer_mode,
          jurisdiction_code: payload.jurisdiction_code ?? authContext.jurisdictionCode ?? "TR",
          sources: [],
          ...(productHelpIntent.navigation ? { navigation: productHelpIntent.navigation } : {}),
          telemetry: {
            gateway_mode: "product_help_fallback",
            context_surface: payload.context_surface,
            current_page: payload.current_page ?? null,
          },
        }),
      );
    }

    if (auditSimulationIntent) {
      return NextResponse.json(
        normalizeNovaAgentResponse({
          type: "tool_preview",
          answer: auditSimulationIntent.answer,
          session_id: payload.session_id ?? null,
          as_of_date: payload.as_of_date ?? new Date().toISOString().slice(0, 10),
          answer_mode: payload.answer_mode,
          jurisdiction_code: payload.jurisdiction_code ?? authContext.jurisdictionCode ?? "TR",
          sources: [],
          navigation: auditSimulationIntent.navigation,
          tool_preview: {
            toolName: "audit_simulation",
            title: "Denetim Simulasyonu Baslat",
            summary: "Saha denetimi ekraninda bulgulari ve kapanislari adim adim gozden gecirin.",
            riskClass: "read",
            requiresConfirmation: false,
            actionSurface: "read",
          },
          telemetry: {
            gateway_mode: "audit_simulation_fallback",
            context_surface: payload.context_surface,
            current_page: payload.current_page ?? null,
          },
        }),
      );
    }

    if (operationalKickoffIntent) {
      return NextResponse.json(
        normalizeNovaAgentResponse({
          type: "tool_preview",
          answer: operationalKickoffIntent.answer,
          session_id: payload.session_id ?? null,
          as_of_date: payload.as_of_date ?? new Date().toISOString().slice(0, 10),
          answer_mode: payload.answer_mode,
          jurisdiction_code: payload.jurisdiction_code ?? authContext.jurisdictionCode ?? "TR",
          sources: [],
          tool_preview: operationalKickoffIntent.toolPreview,
          follow_up_actions: operationalKickoffIntent.followUpActions,
          telemetry: {
            gateway_mode: "operational_kickoff_fallback",
            context_surface: payload.context_surface,
            current_page: payload.current_page ?? null,
          },
        }),
      );
    }

    if (createRecordIntent) {
      try {
        const created = await createRecordFromNovaIntent({
          intent: createRecordIntent,
          organizationId: authContext.organizationId,
          userId: authContext.userId,
          companyWorkspaceId: effectiveCompanyWorkspaceId,
          language: payload.language,
        });

        return NextResponse.json(
          normalizeNovaAgentResponse({
            type: "tool_preview",
            answer: created.answer,
            session_id: payload.session_id ?? null,
            as_of_date: payload.as_of_date ?? new Date().toISOString().slice(0, 10),
            answer_mode: payload.answer_mode,
            jurisdiction_code: payload.jurisdiction_code ?? authContext.jurisdictionCode ?? "TR",
            sources: [],
            navigation: created.navigation,
            ...(created.ok
              ? {
                  tool_preview: {
                    toolName: "record_create_success",
                    title: payload.language?.startsWith("en")
                      ? "Record Created"
                      : "Kayit Olusturuldu",
                    summary: payload.language?.startsWith("en")
                      ? "Nova created a real database record from chat."
                      : "Nova sohbetten gercek bir veritabani kaydi olusturdu.",
                    riskClass: "read",
                    requiresConfirmation: false,
                    actionSurface: "read",
                  },
                }
              : { tool_preview: created.toolPreview }),
            telemetry: {
              gateway_mode: "record_create_fallback",
              context_surface: payload.context_surface,
              current_page: payload.current_page ?? null,
              company_workspace_id: effectiveCompanyWorkspaceId,
              created_kind: createRecordIntent.kind,
              created_id: created.ok ? (created.createdId ?? null) : null,
            },
          }),
        );
      } catch (error) {
        return NextResponse.json(
          normalizeNovaAgentResponse({
            type: "safety_block",
            answer:
              payload.language?.startsWith("en")
                ? "Nova could not create the record due to a technical issue."
                : "Nova kaydi teknik bir nedenle olusturamadi.",
            safety_block: {
              code: "nova_record_create_failed",
              title: payload.language?.startsWith("en")
                ? "Record Creation Failed"
                : "Kayit Olusturma Basarisiz",
              message: error instanceof Error ? error.message : "unknown_error",
            },
            telemetry: {
              gateway_mode: "record_create_fallback",
              context_surface: payload.context_surface,
              current_page: payload.current_page ?? null,
              company_workspace_id: effectiveCompanyWorkspaceId,
              created_kind: createRecordIntent.kind,
              created_id: null,
            },
          }),
          { status: 500 },
        );
      }
    }

    if (guidanceIntent) {
      return NextResponse.json(
        normalizeNovaAgentResponse({
          type: "message",
          answer: guidanceIntent.answer,
          session_id: payload.session_id ?? null,
          as_of_date: payload.as_of_date ?? new Date().toISOString().slice(0, 10),
          answer_mode: payload.answer_mode,
          jurisdiction_code: payload.jurisdiction_code ?? authContext.jurisdictionCode ?? "TR",
          sources: [],
          ...(guidanceIntent.navigation ? { navigation: guidanceIntent.navigation } : {}),
          telemetry: {
            gateway_mode: "guidance_fallback",
            context_surface: payload.context_surface,
            current_page: payload.current_page ?? null,
          },
        }),
      );
    }

    const accountContext = await getAccountContextForUser(authContext.userId);
    const bypassNovaLimitsForAdmin = shouldBypassNovaBillingLimits(accountContext);
    const contextualHistory = [...payload.history];

    if (hasImageContext) {
      contextualHistory.unshift({
        role: "assistant",
        content:
          "Image message constraint: The user shared an image. Do not navigate, do not call or suggest navigate_to_page, do not return a navigation object, and do not route the user to Reports, Agenda, Documents, Risk Analysis, or any module. Answer in chat by interpreting the image, explaining visible OHS risks, likely consequences, and practical controls. You may mention that records can later be created manually, but no page routing.",
      });
    }

    contextualHistory.unshift({
      role: "assistant",
      content:
        "Nova role constraint: Nova is the RiskNova site agent inside the floating chat widget. Do not present a separate Nova workspace or Nova center. For document needs, do not generate full documents inside chat; route the user to ISG Kutuphanesi Dokumantasyon or Dokuman Editoru and explain the next click briefly.",
    });

    contextualHistory.unshift({
      role: "assistant",
      content:
        "Expert role constraint: Act as a senior ISG specialist and occupational physician copilot for Turkiye. Prioritize Turkish OHS legislation (Kanun, Yonetmelik, Teblig) and operational compliance workflows in RiskNova. Give concrete, implementation-ready guidance (who does what, when, with what record). Ask a short clarifying question if workplace risk class, employee count, sector, or event details are missing and they change legal obligations.",
    });

    contextualHistory.unshift({
      role: "assistant",
      content:
        "Answer quality constraint: Never invent law articles, deadlines, thresholds, or sanctions. If evidence is incomplete or a source cannot be verified, explicitly say uncertainty, provide the safest conservative path, and recommend checking the official text or an ISG professional. Keep answers concise but practical: summary, legal basis (if available), required actions, and immediate next step in RiskNova.",
    });

    contextualHistory.unshift({
      role: "assistant",
      content:
        "Navigation guidance constraint: Keep users oriented in-site. If user is unsure, present 3-5 likely modules with one-line purpose and recommend the best next page. Prefer explicit in-product routing over generic advice. You may propose short path hints like: Header > Module, then first action.",
    });

    contextualHistory.unshift({
      role: "assistant",
      content:
        "Response format constraint: For substantial answers, structure in this order: 1) Kisa Yanit, 2) Yasal Dayanak/Kaynak, 3) Uygulanacak Adimlar, 4) RiskNova Icinde Sonraki Tik. If sources are missing, explicitly state verification status and avoid precise legal claims.",
    });

    contextualHistory.unshift({
      role: "assistant",
      content:
        "Proactive copilot constraint: If the user asks broadly (for example: ne yapmaliyim, nereden baslayayim, oncelik ne), provide top 3 priority actions with rationale and route each action to the most relevant RiskNova module.",
    });

    if (professionalPerspective) {
      const perspectiveNote =
        professionalPerspective === "isg_uzmani"
          ? "Perspective mode: Answer with ISG specialist emphasis (risk hierarchy, control measures, legal compliance cadence, field applicability)."
          : professionalPerspective === "isyeri_hekimi"
            ? "Perspective mode: Answer with occupational physician emphasis (health surveillance, fitness for work, exposure-health linkage, medical follow-up)."
            : professionalPerspective === "yonetici"
              ? "Perspective mode: Answer with manager/employer emphasis (priority, cost-risk balance, accountability, timeline and ownership)."
              : "Perspective mode: Answer with HR emphasis (workforce records, training participation, communication and assignment tracking).";

      contextualHistory.unshift({
        role: "assistant",
        content: perspectiveNote,
      });
    }

    contextualHistory.unshift({
      role: "assistant",
      content: buildNovaSiteMapSummaryForPrompt(),
    });

    if (effectiveRequestMode === "read" && effectiveCompanyWorkspaceId === null) {
      contextualHistory.unshift({
        role: "assistant",
        content:
          "Permission constraint: Answer only with general OHS legislation and source-backed guidance. Do not use tenant-private company/workspace records, do not summarize active operational data, and do not prepare record-creating actions. If legislation tools return no relevant hit or authority is unclear, say explicitly that the source could not be verified and recommend an ISG expert or official text — do not invent articles or obligations.",
      });
    }

    if (
      !usedReadOnlyLegalFallback &&
      accountContext.isPlatformAdmin &&
      isPlatformAdminSurface(payload.current_page)
    ) {
      const platformAdminContextNote = await buildPlatformAdminContextNote({
        currentPage: payload.current_page,
      });

      contextualHistory.unshift({
        role: "assistant",
        content: platformAdminContextNote,
      });
    } else if (
      !usedReadOnlyLegalFallback &&
      accountContext.accountType === "osgb" &&
      hasOsgbManagementAccess(accountContext) &&
      isOsgbManagerSurface(payload.current_page)
    ) {
      const managerContextNote = await buildOsgbManagerContextNote({
        organizationId: authContext.organizationId,
        companyWorkspaceId: effectiveCompanyWorkspaceId,
        currentPage: payload.current_page,
      });

      contextualHistory.unshift({
        role: "assistant",
        content: managerContextNote,
      });
    } else if (
      !usedReadOnlyLegalFallback &&
      accountContext.accountType === "enterprise" &&
      isEnterpriseSurface(payload.current_page)
    ) {
      const enterpriseContextNote = await buildEnterpriseContextNote({
        organizationId: authContext.organizationId,
        companyWorkspaceId: effectiveCompanyWorkspaceId,
        currentPage: payload.current_page,
      });

      contextualHistory.unshift({
        role: "assistant",
        content: enterpriseContextNote,
      });
    }

    const rolloutResponse = await assertNovaFeatureEnabled({
      featureKey: "nova.agent.chat",
      userId: authContext.userId,
      organizationId: authContext.organizationId,
      workspaceId: payload.workspace_id ?? authContext.workspaceId ?? null,
      fallbackMessage:
        "Nova bu tenant icin kontrollu rollout asamasinda kapali. Lutfen daha sonra tekrar deneyin.",
    });
    if (rolloutResponse) {
      return rolloutResponse;
    }

    const plan = await resolveAiDailyLimit(authContext.userId);
    if (!bypassNovaLimitsForAdmin) {
      const rateLimitResponse = await enforceRateLimit(request, {
        userId: authContext.userId,
        organizationId: authContext.organizationId,
        endpoint: "/api/nova/chat",
        scope: "ai",
        limit: plan.dailyLimit,
        windowSeconds: 24 * 60 * 60,
        planKey: plan.planKey,
        metadata: {
          feature: "nova_agent",
          context_surface: payload.context_surface,
          mode: effectiveRequestMode,
          current_page: payload.current_page ?? null,
          company_workspace_id: effectiveCompanyWorkspaceId,
        },
      });

      if (rateLimitResponse) {
        return rateLimitResponse;
      }

      if (!usedReadOnlyLegalFallback) {
        const entitlementResponse = await consumeEntitlement(
          {
            userId: authContext.userId,
            organizationId: authContext.organizationId,
          },
          "nova_message",
        );
        if (entitlementResponse) {
          return entitlementResponse;
        }
      }
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      apikey: getPublishableKey(),
    };

    if (authContext.accessToken) {
      headers.Authorization = `Bearer ${authContext.accessToken}`;
    }

    if (useInternalNovaAuth && internalServiceSecret) {
      headers["x-nova-internal-auth"] = internalServiceSecret;
      headers["x-nova-user-id"] = authContext.userId;
      headers["x-nova-organization-id"] = authContext.organizationId;
    }

    const response = await fetch(`${getSupabaseUrl()}/functions/v1/solution-chat`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        message: payload.message,
        organization_id: authContext.organizationId,
        ...(payload.workspace_id || authContext.workspaceId
          ? { workspace_id: payload.workspace_id ?? authContext.workspaceId }
          : {}),
        ...(effectiveCompanyWorkspaceId
          ? { company_workspace_id: effectiveCompanyWorkspaceId }
          : {}),
        jurisdiction_code: payload.jurisdiction_code ?? authContext.jurisdictionCode ?? "TR",
        ...(payload.session_id ? { session_id: payload.session_id } : {}),
        language: payload.language,
        as_of_date: payload.as_of_date ?? new Date().toISOString().slice(0, 10),
        answer_mode: payload.answer_mode,
        mode: effectiveRequestMode,
        context_surface: payload.context_surface,
        confirmation_token: payload.confirmation_token ?? null,
        history: contextualHistory,
      }),
      cache: "no-store",
    });

    const rawText = await response.text();

    try {
      const json = rawText ? JSON.parse(rawText) : {};
      const normalized: NovaAgentResponse = normalizeNovaAgentResponse({
        ...json,
        telemetry: {
          ...(json?.telemetry && typeof json.telemetry === "object" ? json.telemetry : {}),
          gateway_mode: effectiveRequestMode,
          context_surface: payload.context_surface,
          plan_key: plan.planKey,
          current_page: payload.current_page ?? null,
          company_workspace_id: effectiveCompanyWorkspaceId,
        },
      });
      if (hasImageContext) {
        normalized.navigation = null;
        if (normalized.tool_preview?.toolName === "navigate_to_page") {
          normalized.tool_preview = null;
        }
        normalized.follow_up_actions = [];
      }
      return NextResponse.json(normalized, { status: response.status });
    } catch {
      return NextResponse.json(
        normalizeNovaAgentResponse({
          type: "safety_block",
          message: rawText || "Nova servisi beklenmeyen bir yanit dondurdu.",
          safety_block: {
            code: "invalid_nova_payload",
            title: "Nova yaniti okunamadi",
            message: rawText || "Nova servisi beklenmeyen bir yanit dondurdu.",
          },
        }),
        { status: response.status },
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bilinmeyen hata";
    return NextResponse.json({ message }, { status: 500 });
  }
}
