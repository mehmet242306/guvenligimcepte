import {
  detectUnsafeNovaIntent,
  isNovaBehaviorPromptTask,
} from "@/lib/nova/behavior-prompt";
import { normalizeNovaRequestText } from "@/lib/nova/text-normalization";

export { normalizeNovaRequestText } from "@/lib/nova/text-normalization";
export { shouldSkipNovaNavigationForContentTask } from "@/lib/nova/behavior-prompt";

export type NovaResolvedRoute =
  | "safety_refusal"
  | "behavior_prompt"
  | "vision"
  | "legal_rag"
  | "navigation"
  | "general_chat";

export function isNovaRegulationQuery(message: string) {
  const normalized = normalizeNovaRequestText(message);

  if (detectUnsafeNovaIntent(message) || isNovaBehaviorPromptTask(message)) {
    return false;
  }

  return /(mevzuat|yonetmelik|kanun|madde\s*\d+|\d+\s*sayili|regulation|law|article|legal|gesetz|verordnung|ley|leyes|loi|reglement|reglamento|normativa|isg uzmani|is guvenligi uzmani|isyeri hekimi|diger saglik personeli|dsp|tehlike sinifi|cok tehlikeli|az tehlikeli|tehlikeli sinif|calisan sayisi|personel sayisi|kac kisi|kac personel|ayda kac saat|bildirim suresi|zorunlu mu|gerekli mi|yasal uyum|yasal zorunluluk|yukumluluk|sorumluluk|yangin|mermotion|tahliye|cikis|genislik|yukseklik|iskazasi|is kazasi|ramak kala|tazminat|ihbar)/.test(
    normalized,
  );
}

/** Mevzuat / teknik ISG sorulari RAG ile yanitlanir; acik sayfa yonlendirme istegi haric. */
export function shouldUseNovaLegalRag(message: string): boolean {
  if (detectUnsafeNovaIntent(message) || isNovaBehaviorPromptTask(message)) {
    return false;
  }

  if (isNovaRegulationQuery(message)) return true;
  const normalized = normalizeNovaRequestText(message);
  if (normalized.length < 8) return false;
  return /(en az|en fazla|minimum|maksimum|kac\s*(cm|mm|metre)|genislik|yukseklik|olcu|boyut|cap|mesafe|sorumluluk|yukumluluk|ne zaman|kim yapar|nasil yapilir|zorunlu mu|gerekli mi|ceza|tazminat|bildirim|ihbar|kkd|yangin|mermotion|tahliye)/.test(
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

export function resolveNovaRoute(message: string, options?: { hasAttachedImage?: boolean }): NovaResolvedRoute {
  if (detectUnsafeNovaIntent(message)) return "safety_refusal";
  if (isNovaBehaviorPromptTask(message)) return "behavior_prompt";
  if (options?.hasAttachedImage) return "vision";
  if (shouldPreferNovaLegalRagOverNavigation(message)) return "legal_rag";
  if (isExplicitNovaNavigationRequest(message)) return "navigation";
  return "general_chat";
}

/** Widget Nova: operasyon yurutmez; statik yonlendirme + mevzuat okuma. */
export function shouldBypassNovaStaticRedirects(_message: string) {
  return false;
}

/** Tum sohbet istekleri read modda gateway'e gider (agent araclari kapali). */
export function resolveNovaRequestMode(_message: string): "read" | "agent" {
  return "read";
}

export function resolveNovaApiEndpoint(message: string) {
  const route = resolveNovaRoute(message);
  return route === "legal_rag" ? "/api/nova/legal-chat" : "/api/nova/chat";
}

// Geriye uyumluluk — testler ve importlar icin tutuluyor.
export function isNovaOperationalCommandQuery(message: string) {
  const normalized = normalizeNovaRequestText(message);
  return /\b(olustur|planla|ekle|kaydet|ac|git|yonlendir|create|plan|open|navigate|schedule|start|baslat|uygula)\b/.test(
    normalized,
  );
}

export function isNovaAgentControlQuery(_message: string) {
  return false;
}
