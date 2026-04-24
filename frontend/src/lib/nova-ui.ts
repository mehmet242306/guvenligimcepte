export type NovaUiLanguage = "tr" | "en";

export function getNovaUiLanguage(locale?: string | null): NovaUiLanguage {
  return String(locale || "").toLowerCase().startsWith("tr") ? "tr" : "en";
}

type NovaUiCopy = {
  quickActions: {
    workspace: string;
    planner: string;
    newIncident: string;
    documents: string;
    login: string;
    register: string;
  };
  widget: {
    welcomeAuthenticated: string;
    welcomePublic: string;
    publicLocked: string;
    initializing: string;
    unavailable: string;
    redirecting: (label: string) => string;
    subtitle: string;
    openAriaLabel: string;
    minimizeAriaLabel: string;
    closeAriaLabel: string;
    sourceCount: (count: number) => string;
    navigationTitle: string;
    gotoPage: string;
    workflowLabel: string;
    nextStepLabel: string;
    openLabel: string;
    continueLabel: string;
    toolPreviewLabel: string;
    draftReadyLabel: string;
    safetyBlockLabel: string;
    continueInWorkspace: string;
    approveAction: string;
    cancelAction: string;
    actionRunning: string;
    actionDone: string;
    currentPageLabel: string;
    authenticatedPlaceholder: string;
    publicPlaceholder: string;
    copy: string;
    copied: string;
  };
};

const trCopy: NovaUiCopy = {
  quickActions: {
    workspace: "Panel",
    planner: "Planlayici",
    newIncident: "Yeni Olay",
    documents: "Dokumanlar",
    login: "Giris Yap",
    register: "Hesap Olustur",
  },
  widget: {
    welcomeAuthenticated:
      "Merhaba! Ben Nova. Mevzuati yorumlayabilir, sizi dogru modullere goturebilir, egitim veya gorev planlayabilir, olay taslagi baslatabilir ve dokuman gerekiyorsa ilgili ekrana yonlendirebilirim.",
    welcomePublic:
      "Merhaba! Gercek Nova ajanina erismek icin giris yapmaniz gerekir. Isterseniz hemen oturum acin veya hesap olusturun.",
    publicLocked:
      "Gercek Nova ajanina erismek icin giris yapin. Girdikten sonra Nova bu sohbet penceresinden ISG sorularinizi yanitlar ve sizi dogru ekrana yonlendirir.",
    initializing: "Lutfen bir saniye, Nova hazirlaniyor...",
    unavailable:
      "Nova su anda cevap veremiyor. Lutfen biraz sonra tekrar deneyin.",
    redirecting: (label) => `${label} sayfasina yonlendiriliyorsunuz...`,
    subtitle: "AI ISG Asistani",
    openAriaLabel: "Nova asistanini ac",
    minimizeAriaLabel: "Kucult",
    closeAriaLabel: "Kapat ve konusmayi sifirla",
    sourceCount: (count) => `${count} mevzuat kaynagi`,
    navigationTitle: "Sayfa Yonlendirme",
    gotoPage: "Sayfaya Git",
    workflowLabel: "Nova Workflow",
    nextStepLabel: "Siradaki",
    openLabel: "Ac",
    continueLabel: "Devam",
    toolPreviewLabel: "Nova Aksiyon Onerisi",
    draftReadyLabel: "Taslak Hazir",
    safetyBlockLabel: "Guvenlik Kisitlamasi",
    continueInWorkspace: "Ilgili ekranda devam et",
    approveAction: "Onayla",
    cancelAction: "Iptal Et",
    actionRunning: "Isleniyor...",
    actionDone: "Tamamlandi",
    currentPageLabel: "Su an",
    authenticatedPlaceholder: "Nova'ya sorun...",
    publicPlaceholder: "Gercek Nova ajani icin giris yapin...",
    copy: "Kopyala",
    copied: "Kopyalandi",
  },
};

const enCopy: NovaUiCopy = {
  quickActions: {
    workspace: "Dashboard",
    planner: "Planner",
    newIncident: "New Incident",
    documents: "Documents",
    login: "Sign In",
    register: "Create Account",
  },
  widget: {
    welcomeAuthenticated:
      "Hello! I'm Nova. I can interpret regulations, route you to the right modules, plan trainings or tasks, start incident drafts, and send you to the right screen when a document is needed.",
    welcomePublic:
      "Hello! You need to sign in to access the real Nova agent. You can sign in now or create an account.",
    publicLocked:
      "Sign in to access the real Nova agent. After signing in, Nova answers OHS questions from this chat window and routes you to the right screen.",
    initializing: "Please wait a moment, Nova is getting ready...",
    unavailable:
      "Nova cannot respond right now. Please try again shortly.",
    redirecting: (label) => `Routing you to ${label}...`,
    subtitle: "AI OHS Assistant",
    openAriaLabel: "Open Nova assistant",
    minimizeAriaLabel: "Minimize",
    closeAriaLabel: "Close and reset conversation",
    sourceCount: (count) => `${count} legislation sources`,
    navigationTitle: "Page Routing",
    gotoPage: "Open Page",
    workflowLabel: "Nova Workflow",
    nextStepLabel: "Next",
    openLabel: "Open",
    continueLabel: "Continue",
    toolPreviewLabel: "Nova Action Preview",
    draftReadyLabel: "Draft Ready",
    safetyBlockLabel: "Safety Guardrail",
    continueInWorkspace: "Continue on the relevant screen",
    approveAction: "Approve",
    cancelAction: "Cancel",
    actionRunning: "Processing...",
    actionDone: "Completed",
    currentPageLabel: "Current page",
    authenticatedPlaceholder: "Ask Nova...",
    publicPlaceholder: "Sign in to access the real Nova agent...",
    copy: "Copy",
    copied: "Copied",
  },
};

export function getNovaUiCopy(locale?: string | null): NovaUiCopy {
  return getNovaUiLanguage(locale) === "tr" ? trCopy : enCopy;
}

export function getNovaRuntimeErrorMessage(locale?: string | null, error?: unknown): string {
  const language = getNovaUiLanguage(locale);
  const message = String(
    error && typeof error === "object" && "message" in error ? (error as { message?: string }).message : error || "",
  ).toLowerCase();

  const isEdgeFailure =
    message.includes("non-2xx") ||
    message.includes("edge function") ||
    message.includes("schema cache") ||
    message.includes("does not exist") ||
    message.includes("relation") ||
    message.includes("failed to fetch");

  if (language === "en") {
    return isEdgeFailure
      ? "Nova is temporarily unavailable while the latest server updates are being applied. Please try again shortly."
      : "Nova could not complete this request right now. Please try again shortly.";
  }

  return isEdgeFailure
    ? "Nova servisi son sunucu guncellemeleri uygulanirken gecici olarak hazir degil. Lutfen biraz sonra tekrar deneyin."
    : "Nova bu istegi su anda tamamlayamadi. Lutfen biraz sonra tekrar deneyin.";
}

type NovaRuntimeErrorContext = {
  status?: number;
  message?: string | null;
  error?: string | null;
};

async function readNovaRuntimeErrorContext(error?: unknown): Promise<NovaRuntimeErrorContext | null> {
  if (!error || typeof error !== "object" || !("context" in error)) {
    return null;
  }

  const response = (error as { context?: Response }).context;
  if (!response || typeof response.status !== "number") {
    return null;
  }

  const result: NovaRuntimeErrorContext = { status: response.status };

  try {
    const payload = await response.clone().json();
    if (payload && typeof payload === "object") {
      result.message =
        typeof payload.message === "string"
          ? payload.message
          : typeof payload.error === "string"
            ? payload.error
            : null;
      result.error = typeof payload.error === "string" ? payload.error : null;
    }
  } catch {
    return result;
  }

  return result;
}

export async function resolveNovaRuntimeErrorMessage(locale?: string | null, error?: unknown): Promise<string> {
  const context = await readNovaRuntimeErrorContext(error);
  const fallback = getNovaRuntimeErrorMessage(locale, error);
  const language = getNovaUiLanguage(locale);
  const rawMessage = String(context?.message || "").toLowerCase();

  if (
    rawMessage.includes("err_auth_006") ||
    rawMessage.includes("gerekli yetki") ||
    rawMessage.includes("required permission")
  ) {
    return language === "tr"
      ? "Nova genel ISG ve mevzuat sorularinda yardim edebilir; ancak firma verisine dayali ozetler, kayit acma ve operasyon aksiyonlari icin gerekli yetki bulunmuyor. Ilgili firmayi acin veya yoneticinizden erisim isteyin."
      : "Nova can help with general OHS and legislation questions, but you do not have permission for company-specific summaries, record creation, or operational actions on this screen. Open the relevant company or ask your admin for access.";
  }

  if (!context?.message) {
    return fallback;
  }

  return context.status && context.status < 500 ? context.message : fallback;
}
