import { describe, expect, it, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { isSelfHealingCronAuthorized } from "./self-healing-cron-auth";

describe("isSelfHealingCronAuthorized", () => {
  const originalSecret = process.env.SELF_HEALING_CRON_SECRET;

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.SELF_HEALING_CRON_SECRET;
    } else {
      process.env.SELF_HEALING_CRON_SECRET = originalSecret;
    }
  });

  it("returns false when env secret is unset", () => {
    delete process.env.SELF_HEALING_CRON_SECRET;
    const req = new NextRequest("http://localhost/api/health", {
      headers: { "x-self-healing-key": "any" },
    });
    expect(isSelfHealingCronAuthorized(req)).toBe(false);
  });

  it("returns true when header matches trimmed secret", () => {
    process.env.SELF_HEALING_CRON_SECRET = "cron-secret";
    const req = new NextRequest("http://localhost/api/health", {
      headers: { "x-self-healing-key": "  cron-secret  " },
    });
    expect(isSelfHealingCronAuthorized(req)).toBe(true);
  });

  it("returns false on mismatch", () => {
    process.env.SELF_HEALING_CRON_SECRET = "a";
    const req = new NextRequest("http://localhost/api/health", {
      headers: { "x-self-healing-key": "b" },
    });
    expect(isSelfHealingCronAuthorized(req)).toBe(false);
  });
});
