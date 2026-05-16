export function normalizeNovaRequestText(message: string) {
  return message
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "");
}

export function isNovaOperationalCommandQuery(message: string) {
  const normalized = normalizeNovaRequestText(message);
  return /\b(olustur|planla|ekle|kaydet|ac|git|yonlendir|create|plan|open|navigate|schedule|start|baslat|uygula)\b/.test(
    normalized,
  );
}

/** Onay, iptal, workflow takibi ve proaktif operasyon sorulari agent endpoint'e gider. */
/** Operasyon / onay / taslak isteklerinde statik sayfa yonlendirmesini atla. */
export function shouldBypassNovaStaticRedirects(message: string) {
  const normalized = normalizeNovaRequestText(message);
  if (isNovaOperationalCommandQuery(message) || isNovaAgentControlQuery(message)) {
    return true;
  }
  return /(olustur|planla|hazirla|ekle|baslat|yap|tanimla|duzenle|onayla|iptal|sinav olustur|anket olustur)/.test(
    normalized,
  );
}

export function isNovaAgentControlQuery(message: string) {
  const normalized = normalizeNovaRequestText(message);
  const trimmed = message.trim();

  if (
    /(onayla|onayliyorum|onayladim|iptal et|vazgectim|vazgec|tamamladim|adimi kapatt|siradaki adim|approve|confirm|cancel|complete step|step done)/.test(
      normalized,
    )
  ) {
    return true;
  }

  if (
    /(sirada ne var|ne kaldi|devam edelim|bugun ne yapmaliyim|oncelikli ne var|hangi adimdayiz|what is next|what remains|continue workflow)/.test(
      normalized,
    )
  ) {
    return true;
  }

  if (trimmed.length <= 28 && /\b(evet|tamam|ok|devam|uygula)\b/.test(normalized)) {
    return true;
  }

  return false;
}

export function isNovaRegulationQuery(message: string) {
  const normalized = normalizeNovaRequestText(message);
  return /(mevzuat|yonetmelik|kanun|madde|regulation|law|article|legal|gesetz|verordnung|ley|leyes|loi|reglement|reglamento|normativa|isg uzmani|is guvenligi uzmani|isyeri hekimi|diger saglik personeli|dsp|tehlike sinifi|cok tehlikeli|az tehlikeli|tehlikeli sinif|calisan sayisi|personel sayisi|kac kisi|kac personel|ayda kac saat|bildirim suresi|zorunlu mu|gerekli mi|yasal|yukumluluk|sorumluluk)/.test(
    normalized,
  );
}

export function resolveNovaRequestMode(message: string): "read" | "agent" {
  if (isNovaOperationalCommandQuery(message) || isNovaAgentControlQuery(message)) {
    return "agent";
  }
  return "read";
}

export function resolveNovaApiEndpoint(message: string) {
  return resolveNovaRequestMode(message) === "read"
    ? "/api/nova/legal-chat"
    : "/api/nova/chat";
}
