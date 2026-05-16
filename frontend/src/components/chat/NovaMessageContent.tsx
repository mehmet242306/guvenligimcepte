"use client";

import {
  cleanNovaInlineText,
  parseNovaMessageBlocks,
  type NovaMessageTableBlock,
} from "@/lib/nova/message-blocks";

function renderParagraphLine(line: string, key: string) {
  const trimmed = line.trim();
  if (!trimmed) return <br key={key} />;

  const bulletMatch = trimmed.match(/^[-*•]\s+(.+)$/);
  if (bulletMatch) {
    return (
      <p key={key} className="flex gap-2 pl-1">
        <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/70" aria-hidden />
        <span>{cleanNovaInlineText(bulletMatch[1] ?? "")}</span>
      </p>
    );
  }

  return <p key={key}>{cleanNovaInlineText(line)}</p>;
}

function TableShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-2 overflow-x-auto rounded-xl border border-border/80 bg-card shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      {children}
    </div>
  );
}

function NovaTable({ block }: { block: NovaMessageTableBlock }) {
  const columnCount = Math.max(block.headers.length, ...block.rows.map((row) => row.length), 1);
  const headers = Array.from({ length: columnCount }, (_, index) => block.headers[index] ?? "");

  return (
    <TableShell>
      <table className="w-full min-w-[min(100%,20rem)] border-collapse text-[13px] leading-snug sm:text-sm">
        <thead>
          <tr className="border-b border-border/90 bg-gradient-to-r from-primary/12 via-primary/8 to-transparent">
            {headers.map((header, index) => (
              <th
                key={`h-${index}`}
                className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-foreground/80 first:rounded-tl-xl last:rounded-tr-xl"
              >
                {header || " "}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, rowIndex) => {
            const cells = Array.from({ length: columnCount }, (_, index) => row[index] ?? "");
            return (
              <tr
                key={`r-${rowIndex}`}
                className={`border-b border-border/60 last:border-0 ${
                  rowIndex % 2 === 0 ? "bg-card" : "bg-muted/35"
                }`}
              >
                {cells.map((cell, cellIndex) => (
                  <td
                    key={`c-${rowIndex}-${cellIndex}`}
                    className="px-3 py-2.5 align-top text-foreground/90"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </TableShell>
  );
}

export function NovaMessageContent({
  text,
  variant = "bot",
}: {
  text: string;
  variant?: "bot" | "user";
}) {
  if (variant === "user") {
    const lines = text.split("\n");
    return (
      <>
        {lines.map((line, index) => (
          <span key={index}>
            {cleanNovaInlineText(line)}
            {index < lines.length - 1 ? <br /> : null}
          </span>
        ))}
      </>
    );
  }

  const blocks = parseNovaMessageBlocks(text);

  return (
    <div className="space-y-2.5">
      {blocks.map((block, index) => {
        if (block.type === "rule") {
          return <hr key={`rule-${index}`} className="border-border/70" />;
        }

        if (block.type === "heading") {
          return (
            <h4
              key={`heading-${index}`}
              className="text-[15px] font-semibold tracking-tight text-foreground sm:text-base"
            >
              {block.text}
            </h4>
          );
        }

        if (block.type === "table") {
          return <NovaTable key={`table-${index}`} block={block} />;
        }

        return (
          <div key={`p-${index}`}>
            <div className="space-y-1.5">
              {block.lines.map((line, lineIndex) =>
                renderParagraphLine(line, `line-${index}-${lineIndex}`),
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
