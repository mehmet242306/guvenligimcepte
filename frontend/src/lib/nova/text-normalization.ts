/**
 * Nova intent checks run on normalized Turkish text.
 *
 * `toLowerCase()` + NFKD is not enough for Turkish because `ı` survives the
 * diacritic pass. Converting dotless-i to ascii `i` keeps regex gates stable
 * for both Turkish and ascii prompts: "kısa" -> "kisa", "İSG" -> "isg".
 */
export function normalizeNovaRequestText(message: string) {
  return String(message ?? "")
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}
