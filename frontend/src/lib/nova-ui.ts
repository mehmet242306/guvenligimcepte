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
    currentPageLabel: string;
    authenticatedPlaceholder: string;
    publicPlaceholder: string;
  };
  solutionCenter: {
    modes: Array<{ label: string; hint: string; badge: string }>;
    quickQuestions: string[];
    welcomeDescription: string;
    briefEyebrow: string;
    focusQuestion: string;
    loadingBrief: string;
    routeTitle: string;
    actionReadyBadge: string;
    nextStepsLabel: string;
    workflowLabel: string;
    nextStepLabel: string;
    navigationTitle: string;
    gotoPage: string;
    sourceCount: (count: number) => string;
    documentType: (isPptx: boolean, ext: string) => string;
    helpful: string;
    lacking: string;
    saved: string;
    save: string;
    copy: string;
  };
};

const trCopy: NovaUiCopy = {
  quickActions: {
    workspace: "Nova Çalışma Alanı",
    planner: "Planlayıcı",
    newIncident: "Yeni Olay",
    documents: "Dokümanlar",
    login: "Giriş Yap",
    register: "Hesap Oluştur",
  },
  widget: {
    welcomeAuthenticated:
      "Merhaba! Ben Nova. Mevzuatı yorumlayabilir, sizi doğru modüllere götürebilir, eğitim veya görev planlayabilir, olay taslağı başlatabilir ve doküman akışını hazırlayabilirim. Dilerseniz burada yazın, dilerseniz Nova çalışma alanına geçin.",
    welcomePublic:
      "Merhaba! Nova artık örnek veya anahtar kelime cevabı vermiyor. Gerçek ajana erişmek için giriş yapmanız gerekir. İsterseniz hemen oturum açın veya hesap oluşturun.",
    publicLocked:
      "Bu alanda artık hazır cevap veren basit katman yok. Gerçek Nova ajanına erişmek için giriş yapın. Oturum açtıktan sonra aynı soruyu bu widget'ta veya Nova çalışma alanında devam ettirebilirsiniz.",
    initializing: "Lütfen bir saniye, henüz hazırlanıyorum...",
    unavailable:
      "Üzgünüm, şu an cevap veremiyorum. Lütfen biraz sonra tekrar deneyin veya Nova çalışma alanını kullanın.",
    redirecting: (label) => `${label} sayfasına yönlendiriliyorsunuz...`,
    subtitle: "AI İSG Asistanı",
    openAriaLabel: "Nova asistanını aç",
    minimizeAriaLabel: "Küçült (konuşma korunur)",
    closeAriaLabel: "Kapat ve konuşmayı sıfırla",
    sourceCount: (count) => `${count} mevzuat kaynağı`,
    navigationTitle: "Sayfa Yönlendirme",
    gotoPage: "Sayfaya Git",
    workflowLabel: "Nova Workflow",
    nextStepLabel: "Sıradaki",
    openLabel: "Aç",
    continueLabel: "Devam",
    currentPageLabel: "Şu an",
    authenticatedPlaceholder: "Nova'ya sorun...",
    publicPlaceholder: "Gerçek Nova ajanı için giriş yapın...",
  },
  solutionCenter: {
    modes: [
      { label: "Mevzuat", hint: "mevzuati yorumlasin, kaynak gostersin ve riskleri aciklasin", badge: "RAG" },
      { label: "Planlama", hint: "eğitim, kurul ve operasyon görevlerini oluştursun", badge: "ACTION" },
      { label: "Olay", hint: "ramak kala ve kaza taslaklarını başlatıp sizi yönlendirsin", badge: "INCIDENT" },
      { label: "Doküman", hint: "editör için prosedür, rapor ve taslaklar hazırlasın", badge: "DOC" },
    ],
    quickQuestions: [
      "25 Haziran'a yüksekte çalışma eğitimi planla",
      "28 Haziran için aylık kurul toplantısı görevi oluştur",
      "Yeni bir ramak kala olay taslağı başlat",
      "Acil durum prosedürü için doküman taslağı hazırla",
      "Bu firmadaki açık riskleri özetle",
      "İş kazası bildirimi kaç gün içinde yapılmalı?",
    ],
    welcomeDescription:
      "Nova; mevzuatı yorumlayan, sizi doğru modüllere götüren, belge ve operasyon akışlarını başlatan kurumsal İSG ajanıdır.",
    briefEyebrow: "Nova Brief",
    focusQuestion: "Bugün sizin için neye odaklanmalıyız?",
    loadingBrief: "Nova aktif akışlarınızı ve takip bekleyen operasyonları tarıyor...",
    routeTitle: "Mevzuat, yönlendirme ve operasyon aksiyonları tek akışta",
    actionReadyBadge: "Aksiyon Hazır",
    nextStepsLabel: "Sonraki Adımlar",
    workflowLabel: "Nova Workflow",
    nextStepLabel: "Sıradaki adım",
    navigationTitle: "Sayfa Yönlendirme",
    gotoPage: "Sayfaya Git",
    sourceCount: (count) => `${count} mevzuat kaynağı`,
    documentType: (isPptx, ext) => `${isPptx ? "PowerPoint Sunumu" : "Word Belgesi"} (.${ext})`,
    helpful: "Yararlı",
    lacking: "Eksik",
    saved: "Kaydedildi",
    save: "Kaydet",
    copy: "Kopyala",
  },
};

const enCopy: NovaUiCopy = {
  quickActions: {
    workspace: "Nova Workspace",
    planner: "Planner",
    newIncident: "New Incident",
    documents: "Documents",
    login: "Sign In",
    register: "Create Account",
  },
  widget: {
    welcomeAuthenticated:
      "Hello! I'm Nova. I can interpret regulations, route you to the right modules, plan trainings or tasks, start incident drafts, and prepare document workflows. You can continue here or open the Nova workspace.",
    welcomePublic:
      "Hello! Nova no longer gives sample or keyword-based answers. You need to sign in to access the real agent. You can sign in now or create an account.",
    publicLocked:
      "The lightweight answer layer has been removed from this area. Sign in to access the real Nova agent, then continue the same request here or in the Nova workspace.",
    initializing: "Please wait a moment, Nova is still getting ready...",
    unavailable:
      "Sorry, I cannot respond right now. Please try again shortly or continue inside the Nova workspace.",
    redirecting: (label) => `Routing you to ${label}...`,
    subtitle: "AI OHS Assistant",
    openAriaLabel: "Open Nova assistant",
    minimizeAriaLabel: "Minimize (keep conversation)",
    closeAriaLabel: "Close and reset conversation",
    sourceCount: (count) => `${count} legislation sources`,
    navigationTitle: "Page Routing",
    gotoPage: "Open Page",
    workflowLabel: "Nova Workflow",
    nextStepLabel: "Next",
    openLabel: "Open",
    continueLabel: "Continue",
    currentPageLabel: "Current page",
    authenticatedPlaceholder: "Ask Nova...",
    publicPlaceholder: "Sign in to access the real Nova agent...",
  },
  solutionCenter: {
    modes: [
      { label: "Regulation", hint: "interpret legislation, cite sources, and explain risk impact", badge: "RAG" },
      { label: "Planning", hint: "create training, committee, and operational tasks", badge: "ACTION" },
      { label: "Incident", hint: "start near-miss or accident drafts and guide the next steps", badge: "INCIDENT" },
      { label: "Document", hint: "prepare procedures, reports, and editor-ready drafts", badge: "DOC" },
    ],
    quickQuestions: [
      "Plan working-at-height training for June 25",
      "Create the monthly committee task for June 28",
      "Start a new near-miss incident draft",
      "Prepare an emergency procedure document draft",
      "Summarize open risks for this company",
      "Within how many days must a work accident be reported?",
    ],
    welcomeDescription:
      "Nova is the operational OHS agent that interprets legislation, routes you to the right modules, and starts document or workflow actions.",
    briefEyebrow: "Nova Brief",
    focusQuestion: "What should we focus on today?",
    loadingBrief: "Nova is scanning active workflows and pending operational follow-ups...",
    routeTitle: "Legislation, routing, and operational actions in one stream",
    actionReadyBadge: "Action Ready",
    nextStepsLabel: "Next Steps",
    workflowLabel: "Nova Workflow",
    nextStepLabel: "Next step",
    navigationTitle: "Page Routing",
    gotoPage: "Open Page",
    sourceCount: (count) => `${count} legislation sources`,
    documentType: (isPptx, ext) => `${isPptx ? "PowerPoint Deck" : "Word Document"} (.${ext})`,
    helpful: "Helpful",
    lacking: "Needs work",
    saved: "Saved",
    save: "Save",
    copy: "Copy",
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
    // Ignore non-JSON bodies and fall back to generic handling.
  }

  return result;
}

export async function resolveNovaRuntimeErrorMessage(locale?: string | null, error?: unknown): Promise<string> {
  const language = getNovaUiLanguage(locale);
  const details = await readNovaRuntimeErrorContext(error);

  if (!details) {
    return getNovaRuntimeErrorMessage(locale, error);
  }

  if (details.status === 401 || details.status === 403) {
    return language === "en"
      ? "Nova could not verify your session. Please sign out, sign in again, and retry."
      : "Nova oturumunuzu doğrulayamadı. Lütfen çıkış yapıp tekrar girin ve yeniden deneyin.";
  }

  if (details.status === 429) {
    return details.message || (
      language === "en"
        ? "Nova usage limit has been reached for now. Please try again later."
        : "Nova kullanım limiti şu an için doldu. Lütfen daha sonra tekrar deneyin."
    );
  }

  if (details.message) {
    return details.message;
  }

  return getNovaRuntimeErrorMessage(locale, error);
}
