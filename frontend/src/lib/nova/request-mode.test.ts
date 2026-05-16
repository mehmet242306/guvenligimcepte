import { describe, expect, it } from "vitest";
import {
  isNovaRegulationQuery,
  resolveNovaApiEndpoint,
  resolveNovaRequestMode,
  shouldBypassNovaStaticRedirects,
  shouldPreferNovaLegalRagOverNavigation,
  shouldUseNovaLegalRag,
} from "./request-mode";
import { resolveNovaProductHelpIntent } from "./site-map";

describe("resolveNovaRequestMode", () => {
  it("always uses read mode for widget gateway", () => {
    expect(resolveNovaRequestMode("25 Haziran'a egitim planla")).toBe("read");
    expect(resolveNovaRequestMode("6331 sayili kanunda risk degerlendirmesi")).toBe("read");
  });
});

describe("resolveNovaApiEndpoint", () => {
  it("routes regulation questions to legal RAG", () => {
    expect(resolveNovaApiEndpoint("Yangin merdiveni en az kac cm genislikte olmali")).toBe(
      "/api/nova/legal-chat",
    );
    expect(resolveNovaApiEndpoint("egitim planla")).toBe("/api/nova/chat");
  });
});

describe("shouldUseNovaLegalRag", () => {
  it("detects technical ISG questions", () => {
    expect(shouldUseNovaLegalRag("Yangin mermotion en az kac cm genislikte olmali")).toBe(true);
    expect(shouldUseNovaLegalRag("merhaba")).toBe(false);
  });
});

describe("shouldPreferNovaLegalRagOverNavigation", () => {
  it("keeps explicit navigation requests on chat path", () => {
    expect(
      shouldPreferNovaLegalRagOverNavigation("plannera git ve egitim planla"),
    ).toBe(false);
    expect(
      shouldPreferNovaLegalRagOverNavigation("is kazasi tazminat sureci nasil isler"),
    ).toBe(true);
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
