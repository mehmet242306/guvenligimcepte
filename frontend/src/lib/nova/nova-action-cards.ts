import { normalizeNovaRequestText } from "@/lib/nova/text-normalization";
import { isNovaRagServiceRequest } from "@/lib/nova/nova-navigation-policy";
import {
  isNovaExplicitReportsNavigationRequest,
  isNovaReportContentAdvisoryTask,
  USER_NO_NAVIGATION_PATTERN,
} from "@/lib/nova/nova-report-intent";

export { USER_NO_NAVIGATION_PATTERN };

const SUPPRESS_SUGGESTION_CHIP_GATEWAYS = new Set([
  "safety_refusal",
  "content_generation",
  "advisory",
  "behavior_prompt",
  "method_advisor",
  "behavior_validator_fallback",
  "read_rag",
  "read_rag_inline",
  "legal_rag",
  "guidance_fallback",
]);

export function userRequestedNoNavigationThisTurn(message?: string | null): boolean {
  return USER_NO_NAVIGATION_PATTERN.test(normalizeNovaRequestText(message ?? ""));
}

/** API cevabındaki navigation kartını kaldır (RAG/safety/rapor danışmanlığı/opt-out). */
export function shouldStripNavigationFromResponse(
  gatewayMode: string | null | undefined,
  userMessage?: string | null,
): boolean {
  if (userRequestedNoNavigationThisTurn(userMessage)) return true;

  const mode = String(gatewayMode ?? "").trim();
  if (mode === "safety_refusal" || mode === "read_rag" || mode === "read_rag_inline" || mode === "legal_rag") {
    return true;
  }

  if (isNovaRagServiceRequest(userMessage ?? "")) return true;

  if (userMessage && isNovaReportContentAdvisoryTask(userMessage)) {
    return !isNovaExplicitReportsNavigationRequest(userMessage);
  }

  return false;
}

/** Metin tabanlı öneri chip'leri (Olay Kaydı, İSG Kütüphanesi vb.). */
export function shouldSuppressNovaSuggestionChips(
  gatewayMode: string | null | undefined,
  userMessage?: string | null,
): boolean {
  if (shouldStripNavigationFromResponse(gatewayMode, userMessage)) return true;

  const mode = String(gatewayMode ?? "").trim();
  if (mode && SUPPRESS_SUGGESTION_CHIP_GATEWAYS.has(mode)) return true;

  return false;
}

/** @deprecated Use shouldStripNavigationFromResponse / shouldSuppressNovaSuggestionChips */
export function shouldSuppressNovaActionCards(
  gatewayMode: string | null | undefined,
  userMessage?: string | null,
): boolean {
  return (
    shouldStripNavigationFromResponse(gatewayMode, userMessage) &&
    shouldSuppressNovaSuggestionChips(gatewayMode, userMessage)
  );
}
