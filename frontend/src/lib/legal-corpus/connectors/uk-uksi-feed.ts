/**
 * UK Statutory Instruments Atom feed (official legislation.gov.uk).
 * Feed terms: https://www.legislation.gov.uk/developer
 */

export const UK_UKSI_FEED_URL =
  "https://www.legislation.gov.uk/new/uksi/data.feed";

export type UkFeedItem = {
  title: string;
  /** Stable identifier URL (typically .../id/uksi/year/no) */
  idUrl: string;
  /** Human-readable legislation URL */
  webUrl: string;
  summary: string;
  docNumber: string;
};

function normalizeHttps(url: string): string {
  return url.trim().replace(/^http:\/\//i, "https://");
}

function extractFirstMatch(xml: string, re: RegExp): string | null {
  const m = xml.match(re);
  return m?.[1]?.trim() ?? null;
}

/**
 * Split Atom feed into raw entry XML blobs (best-effort; sufficient for legislation.gov.uk feeds).
 */
function splitEntries(xml: string): string[] {
  return xml
    .split(/<entry[\s>]/)
    .slice(1)
    .map((chunk) => `<entry${chunk}`);
}

export function parseUkUksiAtom(xml: string): UkFeedItem[] {
  const items: UkFeedItem[] = [];

  for (const raw of splitEntries(xml)) {
    const title =
      extractFirstMatch(raw, /<title[^>]*>([\s\S]*?)<\/title>/i)?.replace(/<[^>]+>/g, "") ??
      "";
    if (!title) continue;

    const idUrlRaw =
      extractFirstMatch(raw, /<link[^>]*rel="self"[^>]*href="([^"]+)"/i) ??
      extractFirstMatch(raw, /<link[^>]*href="([^"]+)"[^>]*rel="self"/i);
    if (!idUrlRaw) continue;

    const idUrl = normalizeHttps(idUrlRaw);

    const webUrlRaw =
      extractFirstMatch(
        raw,
        /href="(https?:\/\/www\.legislation\.gov\.uk\/uksi\/\d+\/\d+\/made)"/i,
      ) ??
      extractFirstMatch(raw, /<link[^>]*href="(https?:\/\/[^"]+?\/uksi\/[^"]+)"/i);
    const webUrl = normalizeHttps(
      webUrlRaw ?? `${idUrl.replace(/\/id\/(uksi\/\d+\/\d+)\/?$/i, "/$1")}/made`,
    );

    const summaryRaw =
      extractFirstMatch(raw, /<summary[^>]*>([\s\S]*?)<\/summary>/i) ?? "";
    const summary = summaryRaw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

    const docMatch = idUrl.match(/\/id\/(uksi\/\d+\/\d+)/i);
    const docNumber = docMatch?.[1] ?? idUrl.replace(/^https:\/\/www\.legislation\.gov\.uk\/id\//i, "");

    items.push({
      title,
      idUrl,
      webUrl,
      summary,
      docNumber,
    });
  }

  return items;
}

export async function fetchUkUksiFeed(): Promise<string> {
  const res = await fetch(UK_UKSI_FEED_URL, {
    headers: {
      Accept: "application/atom+xml,application/xml;q=0.9,*/*;q=0.8",
      "User-Agent": "RiskNovaLegalCorpusBot/1.0 (+https://getrisknova.com)",
    },
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    throw new Error(`UKSI feed HTTP ${res.status}`);
  }
  return res.text();
}
