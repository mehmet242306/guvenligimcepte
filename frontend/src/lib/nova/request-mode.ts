import {
  detectUnsafeNovaIntent,
  isNovaBehaviorPromptTask,
  isNovaHardGateTask,
} from "@/lib/nova/behavior-prompt";
import { isNovaConceptualRiskQuery, isNovaMethodAdvisorTask } from "@/lib/nova/risk-method-advisor";
import { isNovaRagServiceRequest } from "@/lib/nova/nova-navigation-policy";
import { normalizeNovaRequestText } from "@/lib/nova/text-normalization";

export { isNovaRagServiceRequest, isNovaIncidentRagAnalysisRequest } from "@/lib/nova/nova-navigation-policy";

export { normalizeNovaRequestText } from "@/lib/nova/text-normalization";
export { shouldSkipNovaNavigationForContentTask } from "@/lib/nova/behavior-prompt";
export { isNovaHardGateTask, isNovaBehaviorPromptTask } from "@/lib/nova/behavior-prompt";
export { isNovaMethodAdvisorTask, isNovaConceptualRiskQuery } from "@/lib/nova/risk-method-advisor";

export type NovaResolvedRoute =
  | "safety_refusal"
  | "behavior_prompt"
  | "method_advisor"
  | "vision"
  | "legal_rag"
  | "navigation"
  | "general_chat";

const REGULATION_QUERY_PATTERN =
  /(6331|6325|\d{3,4}\s*sayili|madde\s*\d+|maddesi\s*\d+|yonetmelik|kanunda\s|kanun\s*\d|isg\s*uzmani.*(saat|ayda)|is\s*guvenligi\s*uzmani.*(saat|ayda)|isyeri\s*hekimi.*(saat|ayda)|az\s*tehlikeli|cok\s*tehlikeli|tehlikeli\s*sinif|calisan\s*sayisi.*(uzman|hekim)|yangin.*(mermotion|mermotion|genislik)|tahliye.*(genislik|olcu)|mevzuata\s*gore|mevzuatta\s*nasil|hangi\s*yonetmelikte|bildirim\s*suresi|ihbar\s*suresi)/;

/** Gerçek mevzuat / madde / yönetmelik soruları — kavramsal yöntem soruları hariç. */
export function isNovaRegulationQuery(message: string) {
  const normalized = normalizeNovaRequestText(message);

  if (detectUnsafeNovaIntent(message) || isNovaHardGateTask(message)) {
    return false;
  }

  if (isNovaConceptualRiskQuery(message)) {
    return false;
  }

  return REGULATION_QUERY_PATTERN.test(normalized);
}

/** Mevzuat / teknik ISG soruları RAG ile yanıtlanır; kavramsal ve hard-gate istekleri hariç. */
export function shouldUseNovaLegalRag(message: string): boolean {
  if (detectUnsafeNovaIntent(message) || isNovaHardGateTask(message)) {
    return false;
  }

  if (isNovaRagServiceRequest(message)) return true;

  if (isNovaRegulationQuery(message)) return true;

  const normalized = normalizeNovaRequestText(message);
  if (normalized.length < 12) return false;

  if (isNovaConceptualRiskQuery(message)) return false;

  return /(en\s*az|en\s*fazla|minimum|maksimum|kac\s*(cm|mm|metre|saat|kisi|personel)|genislik|yukseklik|olcu|boyut|kim\s*yapar|nasil\s*yapilir|zorunlu\s*mu|gerekli\s*mi|ceza|tazminat|ihbar|kkd\s*zorunlu)/.test(
    normalized,
  );
}

export function isExplicitNovaNavigationRequest(message: string): boolean {
  const normalized = normalizeNovaRequestText(message);
  return /(sayfaya git|modulune git|ekranina git|yonlendir|plannera git|ajandaya git|egitim modulune git|ac\s+(sayfa|modul|ekran)|open\s+(page|module))/.test(
    normalized,
  );
}

export function shouldPreferNovaLegalRagOverNavigation(message: string): boolean {
  return shouldUseNovaLegalRag(message) && !isExplicitNovaNavigationRequest(message);
}

/**
 * Nova Risk Intelligence v3 route sırası:
 * normalize → safety → behavior → method_advisor → vision → legal_rag → navigation → general_chat
 */
export function resolveNovaRoute(message: string, options?: { hasAttachedImage?: boolean }): NovaResolvedRoute {
  if (detectUnsafeNovaIntent(message)) return "safety_refusal";
  if (isNovaBehaviorPromptTask(message)) return "behavior_prompt";
  if (isNovaMethodAdvisorTask(message)) return "method_advisor";
  if (options?.hasAttachedImage) return "vision";
  if (shouldPreferNovaLegalRagOverNavigation(message)) return "legal_rag";
  if (isExplicitNovaNavigationRequest(message)) return "navigation";
  return "general_chat";
}

export function resolveNovaHardGateGatewayMode(message: string): string {
  const route = resolveNovaRoute(message);
  if (route === "safety_refusal") return "safety_refusal";
  if (route === "method_advisor") return "method_advisor";
  if (route === "behavior_prompt") return "behavior_prompt";
  return "behavior_prompt";
}

/** Widget Nova: operasyon yürütmez; statik yönlendirme + mevzuat okuma. */
export function shouldBypassNovaStaticRedirects(_message: string) {
  return false;
}

/** Tüm sohbet istekleri read modda gateway'e gider (agent araçları kapalı). */
export function resolveNovaRequestMode(_message: string): "read" | "agent" {
  return "read";
}

export function resolveNovaApiEndpoint(message: string) {
  const route = resolveNovaRoute(message);
  return route === "legal_rag" ? "/api/nova/legal-chat" : "/api/nova/chat";
}

// Geriye uyumluluk — testler ve importlar için tutuluyor.
export function isNovaOperationalCommandQuery(message: string) {
  const normalized = normalizeNovaRequestText(message);
  return /\b(olustur|planla|ekle|kaydet|ac|git|yonlendir|create|plan|open|navigate|schedule|start|baslat|uygula)\b/.test(
    normalized,
  );
}

export function isNovaAgentControlQuery(_message: string) {
  return false;
}
