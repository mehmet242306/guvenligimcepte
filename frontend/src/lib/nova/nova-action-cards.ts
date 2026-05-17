import { normalizeNovaRequestText } from "@/lib/nova/text-normalization";
import { isNovaHardGateTask } from "@/lib/nova/behavior-prompt";
import { isNovaRagServiceRequest } from "@/lib/nova/nova-navigation-policy";

const SUPPRESS_ACTION_CARD_GATEWAYS = new Set([
  "safety_refusal",
  "content_generation",
  "advisory",
  "behavior_prompt",
  "method_advisor",
  "behavior_validator_fallback",
  "read_rag",
  "read_rag_inline",
  "legal_rag",
  "navigation_fallback",
  "product_help_fallback",
  "guidance_fallback",
]);

const USER_NO_NAVIGATION_PATTERN =
  /\b(yonlendirme\s*yapma|sayfaya\s*git\s*deme|modul\s*istemiyorum|kart\s*gosterme|yonlendirme\s*istemiyorum)\b/;

export function shouldSuppressNovaActionCards(
  gatewayMode: string | null | undefined,
  userMessage?: string | null,
): boolean {
  const mode = String(gatewayMode ?? "").trim();
  if (mode && SUPPRESS_ACTION_CARD_GATEWAYS.has(mode)) return true;

  const n = normalizeNovaRequestText(userMessage ?? "");
  if (USER_NO_NAVIGATION_PATTERN.test(n)) return true;

  if (isNovaHardGateTask(userMessage ?? "") || isNovaRagServiceRequest(userMessage ?? "")) {
    return true;
  }

  return false;
}
