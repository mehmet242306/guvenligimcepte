import type { NovaActionHint } from "@/lib/nova/agent";

const CONFIRMATION_PROMPT_PATTERNS = [
  /onayl[iı]yor\s+musunuz/i,
  /onayl[iı]yor\s+musun/i,
  /\bonayla\b.*\byaz/i,
  /\bevet\b.*\bonayla\b/i,
  /\bapprove\b/i,
  /\bdo you approve\b/i,
  /onayinizi bekliyorum/i,
  /waiting for your approval/i,
];

export function messageRequestsConfirmation(text: string): boolean {
  const normalized = text.trim();
  if (!normalized) return false;
  return CONFIRMATION_PROMPT_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function hasPendingNovaAction(actionHint?: NovaActionHint | null): boolean {
  return Boolean(actionHint?.action_run_id);
}

export function shouldShowNovaConfirmationChoices(
  text: string,
  actionHint?: NovaActionHint | null,
): boolean {
  return hasPendingNovaAction(actionHint) || messageRequestsConfirmation(text);
}
