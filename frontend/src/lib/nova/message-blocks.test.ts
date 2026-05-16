import { describe, expect, it } from "vitest";
import { parseNovaMessageBlocks } from "./message-blocks";

describe("parseNovaMessageBlocks", () => {
  it("parses markdown tables into table blocks", () => {
    const blocks = parseNovaMessageBlocks(
      [
        "Risk Seviyeleri",
        "| Renk | Puan | Seviye |",
        "|------|------|--------|",
        "| Yesil | 1-4 | Dusuk |",
      ].join("\n"),
    );

    const table = blocks.find((block) => block.type === "table");
    expect(table).toMatchObject({
      type: "table",
      headers: ["Renk", "Puan", "Seviye"],
      rows: [["Yesil", "1-4", "Dusuk"]],
    });
  });
});
