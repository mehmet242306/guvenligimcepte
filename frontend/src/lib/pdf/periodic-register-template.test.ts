import { describe, expect, it } from "vitest";
import { normalizePdfText, PERIODIC_PDF_TEMPLATE, scaleColumnWidths } from "./periodic-register-template";

describe("periodic-register-template", () => {
  it("keeps scaled column widths within content width", () => {
    const contentWidth = 760;
    const widths = scaleColumnWidths(contentWidth);
    const total = widths.reduce((acc, w) => acc + w, 0);
    expect(total).toBeLessThanOrEqual(contentWidth);
  });

  it("returns width for every table column", () => {
    const widths = scaleColumnWidths(760);
    expect(widths).toHaveLength(PERIODIC_PDF_TEMPLATE.table.columnRatios.length);
    expect(widths.every((w) => w > 0)).toBe(true);
  });

  it("normalizes whitespace and preserves Turkish characters", () => {
    const raw = "  İş  sağlığı\nve\tgüvenliği  çerçevesi  ";
    expect(normalizePdfText(raw)).toBe("İş sağlığı ve güvenliği çerçevesi");
  });
});
