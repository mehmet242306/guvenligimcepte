import { describe, expect, it } from "vitest";

import { extractNovaTrainingTitle, parseNovaNaturalDate } from "./natural-date";

describe("parseNovaNaturalDate", () => {
  it("parses Turkish month dates", () => {
    expect(parseNovaNaturalDate("15 Haziran'a is guvenligi egitimi planla", new Date("2026-05-15"))).toBe(
      "2026-06-15",
    );
  });

  it("parses ISO dates", () => {
    expect(parseNovaNaturalDate("egitim 2026-06-15")).toBe("2026-06-15");
  });
});

describe("extractNovaTrainingTitle", () => {
  it("extracts training subject from natural language", () => {
    expect(extractNovaTrainingTitle("15 Haziran'a is guvenligi egitimi planla")).toContain(
      "is guvenligi",
    );
  });
});
