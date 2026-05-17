import type { NovaAgentNavigation } from "@/lib/nova/agent";
import { normalizeNovaRequestText } from "@/lib/nova/text-normalization";

/** Kullanıcıya açık olmayan admin / mevzuat indeks yönetimi rotaları. */
export const NOVA_ADMIN_NAVIGATION_URL_DENYLIST = [
  "/settings",
  "/settings?tab=mevzuat",
  "/settings?tab=legislation",
  "/settings?tab=admin_ai",
  "/platform-admin",
  "/admin",
] as const;

const ADMIN_NAVIGATION_TEXT_DENYLIST =
  /(mevzuat ve rehberler|ayarlar\s*>\s*mevzuat|mevzuat sekmesinde yonetilir|mevzuat indeks yonetimi|admin panel|platform-admin|isg kutuphanesi.*mevzuat kaynag)/i;

const RAG_SERVICE_REQUEST_PATTERN =
  /\b(rag\b|mevzuat\s*kontrol|mevzuat\s*\/\s*rag|search_legislation|mevzuat kontrolu|rag\s*sonuc|rag\s*\/\s*mevzuat)\b/;

const INCIDENT_RAG_ANALYSIS_PATTERN =
  /\b(olay|ramak\s*kala|is\s*kazasi|cati|yuksekte|boya|uygunsuzluk).*(analiz|rag|mevzuat)|(analiz|rag|mevzuat).*(olay|ramak|mevzuat\s*kontrol)/;

/** RAG arka plan hizmeti — sayfa yönlendirmesi değil. */
export function isNovaRagServiceRequest(message: string): boolean {
  const n = normalizeNovaRequestText(message);
  if (RAG_SERVICE_REQUEST_PATTERN.test(n)) return true;
  return INCIDENT_RAG_ANALYSIS_PATTERN.test(n);
}

export function isNovaIncidentRagAnalysisRequest(message: string): boolean {
  return INCIDENT_RAG_ANALYSIS_PATTERN.test(normalizeNovaRequestText(message));
}

export function isAdminOnlyNavigationUrl(url: string): boolean {
  const normalized = String(url ?? "").toLowerCase().split("#")[0] ?? "";
  if (NOVA_ADMIN_NAVIGATION_URL_DENYLIST.some((denied) => normalized === denied)) {
    return true;
  }
  if (normalized.startsWith("/settings") && /tab=(mevzuat|legislation|admin_ai)/.test(normalized)) {
    return true;
  }
  if (normalized.startsWith("/platform-admin") || normalized === "/admin" || normalized.startsWith("/admin/")) {
    return true;
  }
  return false;
}

export function isForbiddenUserNavigationCopy(text: string): boolean {
  const n = normalizeNovaRequestText(text);
  if (ADMIN_NAVIGATION_TEXT_DENYLIST.test(n)) return true;
  if (/\bsayfaya\s*git\b/.test(n) && /\b(mevzuat|rehberler|ayarlar)\b/.test(n)) {
    return true;
  }
  return false;
}

export function sanitizeNovaNavigationForUser(
  navigation: NovaAgentNavigation | null | undefined,
): NovaAgentNavigation | null {
  if (!navigation) return null;
  if (isAdminOnlyNavigationUrl(navigation.url ?? "")) return null;
  if (isForbiddenUserNavigationCopy(`${navigation.label ?? ""} ${navigation.reason ?? ""}`)) {
    return null;
  }
  return navigation;
}

export function stripForbiddenNavigationFromAnswer(answer: string): string {
  if (!isForbiddenUserNavigationCopy(answer)) return answer;
  return answer
    .replace(/[^.!?]*mevzuat ve rehberler[^.!?]*[.!?]?/gi, "")
    .replace(/[^.!?]*ayarlar\s*>\s*mevzuat[^.!?]*[.!?]?/gi, "")
    .replace(/[^.!?]*sayfaya\s*git[^.!?]*[.!?]?/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
