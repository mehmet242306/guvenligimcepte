import { describe, expect, it } from "vitest";

import { normalizeNovaAgentResponse, novaChatRequestSchema } from "./agent";

describe("novaChatRequestSchema", () => {
  it("applies agent defaults for first-phase requests", () => {
    const parsed = novaChatRequestSchema.parse({
      message: "6331 sayili Kanun kapsaminda risk degerlendirmesi ne zaman yenilenir?",
    });

    expect(parsed.mode).toBe("agent");
    expect(parsed.context_surface).toBe("solution_center");
    expect(parsed.answer_mode).toBe("extractive");
    expect(parsed.history).toEqual([]);
  });
});

describe("normalizeNovaAgentResponse", () => {
  it("converts navigation responses into tool previews", () => {
    const normalized = normalizeNovaAgentResponse({
      answer: "Seni ilgili modula goturuyorum.",
      navigation: {
        action: "navigate",
        url: "/companies/123?tab=planner",
        label: "Planner sekmesini ac",
        reason: "Takvim ve takip adimlari burada.",
        destination: "company_planner",
        auto_navigate: false,
      },
    });

    expect(normalized.type).toBe("tool_preview");
    expect(normalized.tool_preview?.toolName).toBe("navigate_to_page");
    expect(normalized.tool_preview?.actionSurface).toBe("read");
  });

  it("converts pending action hints into controlled draft previews", () => {
    const normalized = normalizeNovaAgentResponse({
      answer: "Nova bu is icin kontrollu bir sonraki adim hazirladi.",
      action_hint: {
        action_name: "create_incident_draft",
        action_title: "Olay taslagi hazir",
        action_summary: "Kullanici onayi sonrasi olay taslagi ilerletilebilir.",
      },
    });

    expect(normalized.type).toBe("tool_preview");
    expect(normalized.tool_preview?.toolName).toBe("create_incident_draft");
    expect(normalized.tool_preview?.requiresConfirmation).toBe(true);
    expect(normalized.tool_preview?.actionSurface).toBe("draft");
  });

  it("does not keep confirmation buttons after an action is queued", () => {
    const normalized = normalizeNovaAgentResponse({
      answer: "Nova aksiyonu kuyruga alindi.",
      action_hint: {
        action_name: "create_incident_draft",
        action_title: "Olay taslagi hazir",
        action_summary: "Nova bu aksiyonu arka planda surduruyor.",
        execution_status: "queued",
      },
    });

    expect(normalized.tool_preview?.requiresConfirmation).toBe(false);
  });

  it("marks document payloads as draft-ready", () => {
    const normalized = normalizeNovaAgentResponse({
      answer: "Dokuman taslagi hazir.",
      documents: [
        {
          title: "Acil Durum Plani Taslagi",
        },
      ],
    });

    expect(normalized.type).toBe("draft_ready");
    expect(normalized.draft?.kind).toBe("document");
    expect(normalized.draft?.title).toBe("Acil Durum Plani Taslagi");
  });
});
