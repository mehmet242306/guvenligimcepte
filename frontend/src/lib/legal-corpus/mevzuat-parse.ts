export type ParsedArticle = {
  article_number: string;
  article_title: string;
  content: string;
  article_type: string;
  is_repealed: boolean;
};

export function extractMevzuatNo(sourceUrl: string | null | undefined, docNumber: string): string | null {
  if (sourceUrl) {
    const fromUrl = /MevzuatNo=(\d+)/i.exec(sourceUrl)?.[1];
    if (fromUrl) return fromUrl;
  }
  if (/^\d+$/.test(docNumber.trim())) return docNumber.trim();
  return null;
}

export function extractMevzuatTurTertip(sourceUrl: string | null | undefined, docType: string) {
  let tur = docType === "regulation" ? 7 : docType === "communique" ? 9 : 1;
  let tertip = 5;
  if (sourceUrl) {
    const turMatch = /MevzuatTur=(\d+)/i.exec(sourceUrl);
    const tertipMatch = /MevzuatTertip=(\d+)/i.exec(sourceUrl);
    if (turMatch) tur = Number(turMatch[1]);
    if (tertipMatch) tertip = Number(tertipMatch[1]);
  }
  return { tur, tertip };
}

export function buildMevzuatHtmlUrl(
  docType: string,
  mevzuatNo: string,
  opts?: { mevzuatTur?: number; mevzuatTertip?: number },
): string {
  const { tur, tertip } = opts?.mevzuatTur != null
    ? { tur: opts.mevzuatTur, tertip: opts.mevzuatTertip ?? 5 }
    : extractMevzuatTurTertip(null, docType);
  return `https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=${mevzuatNo}&MevzuatTur=${tur}&MevzuatTertip=${tertip}`;
}

export function buildMevzuatPdfUrl(
  mevzuatNo: string,
  opts?: { mevzuatTur?: number; mevzuatTertip?: number },
): string {
  const tur = opts?.mevzuatTur ?? 1;
  const tertip = opts?.mevzuatTertip ?? 5;
  return `https://www.mevzuat.gov.tr/MevzuatMetin/${tur}.${tertip}.${mevzuatNo}.pdf`;
}

export function resolveMevzuatFetchUrls(doc: {
  doc_type: string;
  doc_number: string;
  source_url?: string | null;
  catalog_metadata?: Record<string, unknown> | null;
}): { htmlUrl: string | null; pdfUrl: string | null; mevzuatNo: string | null } {
  const meta = doc.catalog_metadata ?? {};
  const mevzuatNo =
    (typeof meta.mevzuat_no === "string" && meta.mevzuat_no) ||
    extractMevzuatNo(doc.source_url ?? null, doc.doc_number);

  const { tur, tertip } = extractMevzuatTurTertip(doc.source_url ?? null, doc.doc_type);

  const pdfFromMeta = typeof meta.pdf_url === "string" ? meta.pdf_url : null;
  const pdfUrl = pdfFromMeta || (mevzuatNo ? buildMevzuatPdfUrl(mevzuatNo, { mevzuatTur: tur, mevzuatTertip: tertip }) : null);

  let htmlUrl: string | null = null;
  const sourceUrl = doc.source_url?.trim();
  if (sourceUrl && /mevzuat\.gov\.tr/i.test(sourceUrl) && /MevzuatNo=/i.test(sourceUrl)) {
    htmlUrl = sourceUrl;
  } else if (mevzuatNo) {
    htmlUrl = buildMevzuatHtmlUrl(doc.doc_type, mevzuatNo, { mevzuatTur: tur, mevzuatTertip: tertip });
  }

  return { htmlUrl, pdfUrl, mevzuatNo };
}

export function parseArticlesFromHtml(html: string, docTitle: string): ParsedArticle[] {
  const articles: ParsedArticle[] = [];

  let cleanText = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const patterns = [
    {
      regex:
        /GEÇİCİ\s+MADDE\s+(\d+)\s*[-–—]?\s*([\s\S]*?)(?=GEÇİCİ\s+MADDE\s+\d|(?:^|\n)MADDE\s+\d|EK\s+MADDE\s+\d|$)/gim,
      type: "gecici",
      prefix: "Geçici Madde",
    },
    {
      regex:
        /EK\s+MADDE\s+(\d+)\s*[-–—]?\s*([\s\S]*?)(?=GEÇİCİ\s+MADDE\s+\d|(?:^|\n)MADDE\s+\d|EK\s+MADDE\s+\d|$)/gim,
      type: "ek",
      prefix: "Ek Madde",
    },
    {
      regex:
        /(?:^|\n)MADDE\s+(\d+(?:\/[A-ZĞÜŞİÖÇ])?)\s*[-–—]?\s*([\s\S]*?)(?=GEÇİCİ\s+MADDE\s+\d|(?:^|\n)MADDE\s+\d|EK\s+MADDE\s+\d|$)/gim,
      type: "normal",
      prefix: "Madde",
    },
  ];

  const found = new Set<string>();

  for (const pattern of patterns) {
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
    let match: RegExpExecArray | null;
    while ((match = regex.exec(cleanText)) !== null) {
      const articleNum = match[1].trim();
      let content = match[2].trim();
      if (content.length < 20) continue;
      if (content.length > 10_000) content = `${content.slice(0, 10_000)}...`;
      const key = `${pattern.type}-${articleNum}`;
      if (found.has(key)) continue;
      found.add(key);
      const articleNumber = `${pattern.prefix} ${articleNum}`;
      let actualType = pattern.type;
      if (articleNum.includes("/")) actualType = "mukerrer";
      const isRepealed = /\(Mülga\)|mülga edilmiştir/i.test(content);
      articles.push({
        article_number: articleNumber,
        article_title: articleNumber,
        content,
        article_type: actualType,
        is_repealed: isRepealed,
      });
    }
  }

  if (articles.length === 0 && cleanText.length > 200) {
    articles.push({
      article_number: "Giriş",
      article_title: docTitle,
      content: cleanText.slice(0, 10_000),
      article_type: "normal",
      is_repealed: false,
    });
  }

  return articles;
}

export function chunkPlainText(text: string, size = 10_000): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += size) {
    const part = text.slice(i, i + size).trim();
    if (part) chunks.push(part);
  }
  return chunks;
}
