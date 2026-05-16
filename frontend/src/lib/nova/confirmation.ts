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

const SETTLED_MESSAGE_PATTERNS = [
  /olusturuldu/i,
  /oluşturuldu/i,
  /planlandi/i,
  /planlandı/i,
  /tamamlandi/i,
  /tamamlandı/i,
  /kuyruga alindi/i,
  /kuyruğa alındı/i,
  /arka planda (?:devam|surdur|sürdür|islen)/i,
  /has been queued/i,
  /already completed/i,
  /zaten tamamlandi/i,
];

export function messageRequestsConfirmation(text: string): boolean {
  const normalized = text.trim();
  if (!normalized) return false;
  return CONFIRMATION_PROMPT_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function messageIndicatesSettledAction(text: string): boolean {
  const normalized = text.trim();
  if (!normalized) return false;
  return SETTLED_MESSAGE_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function hasPendingNovaAction(actionHint?: NovaActionHint | null): boolean {
  if (!actionHint?.action_run_id) return false;
  if (actionHint.execution_status) {
    return actionHint.execution_status === "pending_confirmation";
  }
  return false;
}

export function shouldShowNovaConfirmationChoices(
  text: string,
  actionHint?: NovaActionHint | null,
): boolean {
  if (messageIndicatesSettledAction(text)) return false;

  if (actionHint?.execution_status) {
    return actionHint.execution_status === "pending_confirmation";
  }

  if (actionHint?.action_run_id) {
    return false;
  }

  return messageRequestsConfirmation(text);
}
