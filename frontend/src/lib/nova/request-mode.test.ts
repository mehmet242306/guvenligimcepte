import { describe, expect, it } from "vitest";

import {
  isNovaAgentControlQuery,
  isNovaOperationalCommandQuery,
  resolveNovaApiEndpoint,
  resolveNovaRequestMode,
} from "./request-mode";

describe("resolveNovaRequestMode", () => {
  it("routes operational commands to agent mode", () => {
    expect(resolveNovaRequestMode("25 Haziran'a egitim planla")).toBe("agent");
    expect(resolveNovaApiEndpoint("25 Haziran'a egitim planla")).toBe("/api/nova/chat");
  });

  it("routes confirmation and workflow follow-ups to agent mode", () => {
    expect(resolveNovaRequestMode("onayliyorum")).toBe("agent");
    expect(resolveNovaRequestMode("iptal et")).toBe("agent");
    expect(resolveNovaRequestMode("sirada ne var")).toBe("agent");
    expect(resolveNovaRequestMode("evet")).toBe("agent");
    expect(resolveNovaApiEndpoint("evet")).toBe("/api/nova/chat");
  });

  it("keeps pure regulation questions on legal-chat", () => {
    expect(resolveNovaRequestMode("6331 sayili kanunda risk degerlendirmesi ne zaman yenilenir?")).toBe(
      "read",
    );
    expect(
      resolveNovaApiEndpoint("6331 sayili kanunda risk degerlendirmesi ne zaman yenilenir?"),
    ).toBe("/api/nova/legal-chat");
  });
});

describe("isNovaAgentControlQuery", () => {
  it("does not treat long regulation questions as control queries", () => {
    expect(
      isNovaAgentControlQuery(
        "6331 sayili kanunda is guvenligi uzmani icin bildirim suresi ve calisan sayisi esikleri nelerdir?",
      ),
    ).toBe(false);
    expect(isNovaOperationalCommandQuery("risk analizi olustur ve 6331 madde 10")).toBe(true);
  });
});
