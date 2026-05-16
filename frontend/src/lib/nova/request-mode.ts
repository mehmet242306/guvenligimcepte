export function normalizeNovaRequestText(message: string) {
  return message
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "");
}

export function isNovaRegulationQuery(message: string) {
  const normalized = normalizeNovaRequestText(message);
  return /(mevzuat|yonetmelik|kanun|madde|regulation|law|article|legal|gesetz|verordnung|ley|leyes|loi|reglement|reglamento|normativa|isg uzmani|is guvenligi uzmani|isyeri hekimi|diger saglik personeli|dsp|tehlike sinifi|cok tehlikeli|az tehlikeli|tehlikeli sinif|calisan sayisi|personel sayisi|kac kisi|kac personel|ayda kac saat|bildirim suresi|zorunlu mu|gerekli mi|yasal|yukumluluk|sorumluluk)/.test(
    normalized,
  );
}

/** Widget Nova: operasyon yurutmez; statik yonlendirme + mevzuat okuma. */
export function shouldBypassNovaStaticRedirects(_message: string) {
  return false;
}

/** Tum sohbet istekleri read modda gateway'e gider (agent araclari kapali). */
export function resolveNovaRequestMode(_message: string): "read" | "agent" {
  return "read";
}

export function resolveNovaApiEndpoint(_message: string) {
  return "/api/nova/chat";
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
