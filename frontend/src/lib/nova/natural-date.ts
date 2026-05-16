const TR_MONTHS: Record<string, number> = {
  ocak: 1,
  subat: 2,
  mart: 3,
  nisan: 4,
  mayis: 5,
  haziran: 6,
  temmuz: 7,
  agustos: 8,
  eylul: 9,
  ekim: 10,
  kasim: 11,
  aralik: 12,
};

function normalizeDateText(text: string) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** "15 Haziran", "15.06.2026", "2026-06-15" → YYYY-MM-DD */
export function parseNovaNaturalDate(text: string, reference = new Date()): string | null {
  const normalized = normalizeDateText(text);

  const iso = normalized.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (iso?.[1]) return iso[1];

  const dmy = normalized.match(/\b(\d{1,2})[./-](\d{1,2})[./-](\d{4})\b/);
  if (dmy) {
    const dd = dmy[1].padStart(2, "0");
    const mm = dmy[2].padStart(2, "0");
    return `${dmy[3]}-${mm}-${dd}`;
  }

  for (const [name, month] of Object.entries(TR_MONTHS)) {
    const match = normalized.match(new RegExp(`\\b(\\d{1,2})\\s*${name}(?:\\s*(\\d{4}))?\\b`));
    if (!match) continue;

    let year = match[2] ? Number(match[2]) : reference.getFullYear();
    const day = match[1].padStart(2, "0");
    const monthPart = String(month).padStart(2, "0");
    let candidate = `${year}-${monthPart}-${day}`;
    const candidateDate = new Date(`${candidate}T12:00:00`);

    if (!match[2] && !Number.isNaN(candidateDate.getTime()) && candidateDate < reference) {
      year += 1;
      candidate = `${year}-${monthPart}-${day}`;
    }

    return candidate;
  }

  return null;
}

/** "iş güvenliği eğitimi planla" → başlık özeti */
export function extractNovaTrainingTitle(text: string): string | null {
  const cleaned = text
    .replace(/["“](.+?)["”]/, "$1")
    .replace(/\b\d{1,2}\s+[a-z]+\s*(?:\d{4})?\b/gi, "")
    .replace(/\b(planla|olustur|ekle|kaydet|egitim|training|icin|a|e)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length < 4) return null;
  return cleaned.slice(0, 140);
}
