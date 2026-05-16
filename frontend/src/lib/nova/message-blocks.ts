export type NovaMessageTableBlock = {
  type: "table";
  headers: string[];
  rows: string[][];
};

export type NovaMessageBlock =
  | { type: "paragraph"; lines: string[] }
  | NovaMessageTableBlock
  | { type: "heading"; text: string }
  | { type: "rule" };

function isTableRow(line: string) {
  const trimmed = line.trim();
  return trimmed.startsWith("|") && trimmed.endsWith("|");
}

function isTableSeparatorRow(line: string) {
  return /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line.trim());
}

export function cleanNovaInlineText(text: string) {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .trim();
}

function parseTableRow(line: string) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cleanNovaInlineText(cell));
}

function isHeadingLine(line: string) {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (/^#{1,6}\s+/.test(trimmed)) return true;
  if (/^[-*_]{3,}$/.test(trimmed)) return false;
  return /^[\p{Extended_Pictographic}\u2600-\u27BF]/u.test(trimmed) && trimmed.length < 120;
}

function normalizeHeading(line: string) {
  return cleanNovaInlineText(line.replace(/^#{1,6}\s+/, ""));
}

export function parseNovaMessageBlocks(text: string): NovaMessageBlock[] {
  if (!text.trim()) return [];

  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: NovaMessageBlock[] = [];
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    blocks.push({ type: "paragraph", lines: [...paragraph] });
    paragraph = [];
  };

  let index = 0;
  while (index < lines.length) {
    const line = lines[index] ?? "";
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      index += 1;
      continue;
    }

    if (/^[-*_]{3,}$/.test(trimmed)) {
      flushParagraph();
      blocks.push({ type: "rule" });
      index += 1;
      continue;
    }

    if (isTableRow(line)) {
      const tableLines: string[] = [];
      while (index < lines.length && isTableRow(lines[index] ?? "")) {
        tableLines.push(lines[index] ?? "");
        index += 1;
      }

      const parsedRows = tableLines
        .filter((row) => !isTableSeparatorRow(row))
        .map((row) => parseTableRow(row));

      if (parsedRows.length > 0) {
        flushParagraph();
        const [headers, ...rows] = parsedRows;
        blocks.push({
          type: "table",
          headers: headers ?? [],
          rows,
        });
        continue;
      }
    }

    if (isHeadingLine(line)) {
      flushParagraph();
      blocks.push({ type: "heading", text: normalizeHeading(line) });
      index += 1;
      continue;
    }

    paragraph.push(line);
    index += 1;
  }

  flushParagraph();
  return blocks;
}
