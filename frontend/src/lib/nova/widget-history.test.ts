import { describe, expect, it } from "vitest";
import {
  consolidateEphemeralDuplicateSessions,
  groupSolutionQueriesIntoSessions,
  resolveWidgetHistorySessionId,
  WIDGET_SESSION_INACTIVITY_MS,
} from "./widget-history";

const isUuid = (value: string | null | undefined): value is string =>
  !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

describe("groupSolutionQueriesIntoSessions", () => {
  it("groups rows with the same session_id into one conversation", () => {
    const sessionId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
    const sessions = groupSolutionQueriesIntoSessions([
      {
        id: "1",
        query_text: "Ilk soru",
        ai_response: "Ilk cevap",
        created_at: "2026-05-16T10:00:00.000Z",
        response_metadata: { session_id: sessionId, context_surface: "widget" },
      },
      {
        id: "2",
        query_text: "Takip sorusu",
        ai_response: "Takip cevabi",
        created_at: "2026-05-16T10:05:00.000Z",
        response_metadata: { session_id: sessionId, context_surface: "widget" },
      },
    ]);

    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.messages).toHaveLength(4);
    expect(sessions[0]?.title).toBe("Ilk soru");
  });

  it("groups orphan widget rows by inactivity gap", () => {
    const sessions = groupSolutionQueriesIntoSessions([
      {
        id: "1",
        query_text: "Ayni konu",
        ai_response: "Cevap 1",
        created_at: "2026-05-16T10:00:00.000Z",
        response_metadata: { context_surface: "widget" },
      },
      {
        id: "2",
        query_text: "Devam",
        ai_response: "Cevap 2",
        created_at: new Date(
          new Date("2026-05-16T10:00:00.000Z").getTime() + 5 * 60 * 1000,
        ).toISOString(),
        response_metadata: { context_surface: "widget" },
      },
      {
        id: "3",
        query_text: "Yeni oturum",
        ai_response: "Cevap 3",
        created_at: new Date(
          new Date("2026-05-16T10:05:00.000Z").getTime() + WIDGET_SESSION_INACTIVITY_MS + 60_000,
        ).toISOString(),
        response_metadata: { context_surface: "widget" },
      },
    ]);

    expect(sessions).toHaveLength(2);
    expect(sessions.find((session) => session.title === "Ayni konu")?.messages).toHaveLength(4);
    expect(sessions.find((session) => session.title === "Yeni oturum")?.messages).toHaveLength(2);
  });
});

describe("consolidateEphemeralDuplicateSessions", () => {
  it("merges same-title sessions that are close in time", () => {
    const merged = consolidateEphemeralDuplicateSessions([
      {
        id: "a",
        title: "15 Haziran egitim",
        createdAt: "2026-05-16T13:40:00.000Z",
        updatedAt: "2026-05-16T13:42:00.000Z",
        source: "local",
        messages: [
          { id: "1", role: "user", text: "15 Haziran egitim", createdAt: "2026-05-16T13:40:00.000Z" },
          { id: "2", role: "bot", text: "Cevap 1", createdAt: "2026-05-16T13:42:00.000Z" },
        ],
      },
      {
        id: "b",
        title: "15 Haziran egitim",
        createdAt: "2026-05-16T13:50:00.000Z",
        updatedAt: "2026-05-16T13:55:00.000Z",
        source: "local",
        messages: [
          { id: "3", role: "user", text: "Tekrar planla", createdAt: "2026-05-16T13:50:00.000Z" },
          { id: "4", role: "bot", text: "Cevap 2", createdAt: "2026-05-16T13:55:00.000Z" },
        ],
      },
    ]);

    expect(merged).toHaveLength(1);
    expect(merged[0]?.messages).toHaveLength(4);
  });
});

describe("resolveWidgetHistorySessionId", () => {
  it("reuses active stored session before creating a new id", () => {
    const stored = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
    const resolved = resolveWidgetHistorySessionId({
      preferredSessionId: null,
      activeStoredSessionId: stored,
      currentRefSessionId: "",
      isUuid,
    });
    expect(resolved).toBe(stored);
  });
});
