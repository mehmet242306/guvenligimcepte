import { describe, expect, it } from "vitest";
import { getNovaQuotaRingPercent, getNovaQuotaTone } from "./message-quota";

describe("message-quota helpers", () => {
  it("computes ring percent from remaining quota", () => {
    expect(
      getNovaQuotaRingPercent({
        used: 7,
        limit: 10,
        remaining: 3,
        unlimited: false,
        percentUsed: 70,
      }),
    ).toBe(30);
  });

  it("flags critical tone when few messages remain", () => {
    expect(
      getNovaQuotaTone({
        used: 9,
        limit: 10,
        remaining: 1,
        unlimited: false,
        percentUsed: 90,
      }),
    ).toBe("critical");
  });

  it("treats unlimited plans as full ring", () => {
    expect(
      getNovaQuotaRingPercent({
        used: 100,
        limit: 999999,
        remaining: 999999,
        unlimited: true,
        percentUsed: 0,
      }),
    ).toBe(100);
    expect(
      getNovaQuotaTone({
        used: 100,
        limit: 999999,
        remaining: 999999,
        unlimited: true,
        percentUsed: 0,
      }),
    ).toBe("ok");
  });
});
