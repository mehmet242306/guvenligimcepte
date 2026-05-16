import { describe, expect, it } from "vitest";
import {
  isNovaRegulationQuery,
  resolveNovaApiEndpoint,
  resolveNovaRequestMode,
  shouldBypassNovaStaticRedirects,
} from "./request-mode";
import { resolveNovaProductHelpIntent } from "./site-map";

describe("resolveNovaRequestMode", () => {
  it("always uses read mode for widget gateway", () => {
    expect(resolveNovaRequestMode("25 Haziran'a egitim planla")).toBe("read");
    expect(resolveNovaRequestMode("6331 sayili kanunda risk degerlendirmesi")).toBe("read");
  });
});

describe("resolveNovaApiEndpoint", () => {
  it("always routes through /api/nova/chat", () => {
    expect(resolveNovaApiEndpoint("egitim planla")).toBe("/api/nova/chat");
  });
});

describe("shouldBypassNovaStaticRedirects", () => {
  it("never bypasses static redirects", () => {
    expect(shouldBypassNovaStaticRedirects("15 Haziran'a is guvenligi egitimi planla")).toBe(
      false,
    );
  });
});

describe("isNovaRegulationQuery", () => {
  it("detects regulation questions", () => {
    expect(isNovaRegulationQuery("6331 sayili kanunda risk degerlendirmesi ne zaman yenilenir?")).toBe(
      true,
    );
  });
});

describe("resolveNovaProductHelpIntent with navigation-only Nova", () => {
  it("redirects training plan requests to planner", () => {
    const intent = resolveNovaProductHelpIntent("15 Haziran'a is guvenligi egitimi planla");
    expect(intent?.navigation?.url).toBe("/planner");
  });

  it("redirects generic training discovery to training module", () => {
    const intent = resolveNovaProductHelpIntent("egitim modulu nerede");
    expect(intent?.navigation?.url).toBe("/training");
  });
});
