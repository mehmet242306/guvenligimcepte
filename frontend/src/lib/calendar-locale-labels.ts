/**
 * Monday-first calendar labels via Intl (avoids duplicating month/weekday arrays per locale).
 */
export function getCalendarMonthNamesLong(locale: string): string[] {
  const fmt = new Intl.DateTimeFormat(locale, { month: "long" });
  return Array.from({ length: 12 }, (_, m) => fmt.format(new Date(2000, m, 15)));
}

/** Short month names for compact tables (e.g. annual work plan month columns). */
export function getCalendarMonthNamesShort(locale: string): string[] {
  const fmt = new Intl.DateTimeFormat(locale, { month: "short" });
  return Array.from({ length: 12 }, (_, m) => fmt.format(new Date(2000, m, 15)));
}

/** Weekday labels Mon → Sun (index 0 = Monday). */
export function getCalendarWeekdayLabels(locale: string): string[] {
  const lc = locale.toLowerCase();
  const weekday: Intl.DateTimeFormatOptions["weekday"] =
    lc === "ar" || lc.startsWith("ar-") ? "narrow" : "short";
  const fmt = new Intl.DateTimeFormat(locale, { weekday });
  return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(2024, 0, 1 + i)));
}
