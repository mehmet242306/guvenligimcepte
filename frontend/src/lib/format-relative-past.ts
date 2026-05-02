/** Past-only relative labels; uses active **BCP 47** locale (e.g. next-intl `useLocale()`). */
export function formatRelativePast(iso: string, locale: string): string {
  const diffMs = Math.max(0, Date.now() - new Date(iso).getTime());
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const sec = Math.floor(diffMs / 1000);
  const min = Math.floor(diffMs / 60000);
  const hr = Math.floor(diffMs / 3600000);
  const day = Math.floor(diffMs / 86400000);
  const month = Math.floor(diffMs / (86400000 * 30));
  if (min < 1) return rtf.format(-Math.max(sec, 1), "second");
  if (min < 60) return rtf.format(-min, "minute");
  if (hr < 24) return rtf.format(-hr, "hour");
  if (day < 30) return rtf.format(-day, "day");
  return rtf.format(-Math.max(month, 1), "month");
}
