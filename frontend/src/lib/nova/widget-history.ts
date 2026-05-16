export const WIDGET_SESSION_INACTIVITY_MS = 30 * 60 * 1000;

export type WidgetHistoryMessage = {
  id: string;
  role: "user" | "bot";
  text: string;
  createdAt: string;
};

export type WidgetHistorySession = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  source: "local" | "server";
  messages: WidgetHistoryMessage[];
};

export type SolutionQueryHistoryRow = {
  id: string;
  query_text: string | null;
  ai_response: string | null;
  created_at: string | null;
  response_metadata: Record<string, unknown> | null;
};

function normalizeTitle(title: string) {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function mergeHistorySessionMessages(
  first: WidgetHistoryMessage[],
  second: WidgetHistoryMessage[],
  maxMessages = 80,
) {
  const seen = new Set<string>();
  return [...first, ...second]
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .filter((message) => {
      const key = `${message.role}\n${message.text}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(-maxMessages);
}

export function mergeHistorySessions(
  localSessions: WidgetHistorySession[],
  serverSessions: WidgetHistorySession[],
  maxSessions = 20,
) {
  const byId = new Map<string, WidgetHistorySession>();

  for (const session of [...localSessions, ...serverSessions]) {
    const existing = byId.get(session.id);
    if (!existing) {
      byId.set(session.id, session);
      continue;
    }

    const messages = mergeHistorySessionMessages(existing.messages, session.messages);
    byId.set(session.id, {
      ...existing,
      source: existing.source === "server" || session.source === "server" ? "server" : "local",
      title: existing.title || session.title,
      createdAt:
        new Date(existing.createdAt).getTime() <= new Date(session.createdAt).getTime()
          ? existing.createdAt
          : session.createdAt,
      updatedAt:
        new Date(existing.updatedAt).getTime() >= new Date(session.updatedAt).getTime()
          ? existing.updatedAt
          : session.updatedAt,
      messages,
    });
  }

  return Array.from(byId.values())
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, maxSessions);
}

/** Ayni baslikli ve yakin zamandaki bolunmus oturumlari tek sohbette birlestirir. */
export function consolidateEphemeralDuplicateSessions(
  sessions: WidgetHistorySession[],
): WidgetHistorySession[] {
  const sorted = [...sessions].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
  const merged: WidgetHistorySession[] = [];

  for (const session of sorted) {
    const titleKey = normalizeTitle(session.title);
    const existing = merged.find((candidate) => {
      if (normalizeTitle(candidate.title) !== titleKey) return false;
      const gap = Math.abs(
        new Date(candidate.updatedAt).getTime() - new Date(session.updatedAt).getTime(),
      );
      return gap <= WIDGET_SESSION_INACTIVITY_MS * 2;
    });

    if (!existing) {
      merged.push({ ...session, messages: [...session.messages] });
      continue;
    }

    existing.messages = mergeHistorySessionMessages(existing.messages, session.messages);
    existing.updatedAt =
      new Date(existing.updatedAt).getTime() >= new Date(session.updatedAt).getTime()
        ? existing.updatedAt
        : session.updatedAt;
    existing.createdAt =
      new Date(existing.createdAt).getTime() <= new Date(session.createdAt).getTime()
        ? existing.createdAt
        : session.createdAt;
    if (existing.source !== session.source) {
      existing.source = "server";
    }
  }

  return merged.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

function readMetadataSessionId(metadata: Record<string, unknown> | null) {
  const sessionId = metadata?.session_id;
  return typeof sessionId === "string" && sessionId.trim() ? sessionId.trim() : null;
}

function shouldGroupOrphanTurn(metadata: Record<string, unknown> | null) {
  return metadata?.context_surface !== "solution_center";
}

export function groupSolutionQueriesIntoSessions(
  rows: SolutionQueryHistoryRow[],
): WidgetHistorySession[] {
  const withSessionId = new Map<string, WidgetHistorySession>();
  const orphans: SolutionQueryHistoryRow[] = [];

  for (const item of rows) {
    const queryText = String(item.query_text || "").trim();
    const aiResponse = String(item.ai_response || "").trim();
    if (!queryText || !aiResponse) continue;

    const metadata =
      item.response_metadata && typeof item.response_metadata === "object"
        ? item.response_metadata
        : {};
    const sessionId = readMetadataSessionId(metadata);

    if (sessionId) {
      const createdAt = String(item.created_at || new Date().toISOString());
      const existing = withSessionId.get(sessionId);
      const nextMessages: WidgetHistoryMessage[] = [
        ...(existing?.messages ?? []),
        {
          id: `server-${item.id}-user`,
          role: "user",
          text: queryText,
          createdAt,
        },
        {
          id: `server-${item.id}-bot`,
          role: "bot",
          text: aiResponse,
          createdAt,
        },
      ];

      withSessionId.set(sessionId, {
        id: sessionId,
        title: existing?.title || queryText,
        createdAt:
          existing && new Date(existing.createdAt).getTime() <= new Date(createdAt).getTime()
            ? existing.createdAt
            : createdAt,
        updatedAt:
          existing && new Date(existing.updatedAt).getTime() >= new Date(createdAt).getTime()
            ? existing.updatedAt
            : createdAt,
        source: "server",
        messages: nextMessages,
      });
      continue;
    }

    orphans.push(item);
  }

  const gapSessions: WidgetHistorySession[] = [];
  const sortedOrphans = [...orphans].sort(
    (a, b) =>
      new Date(String(a.created_at || 0)).getTime() - new Date(String(b.created_at || 0)).getTime(),
  );

  for (const item of sortedOrphans) {
    const queryText = String(item.query_text || "").trim();
    const aiResponse = String(item.ai_response || "").trim();
    const metadata =
      item.response_metadata && typeof item.response_metadata === "object"
        ? item.response_metadata
        : {};
    const createdAt = String(item.created_at || new Date().toISOString());
    const createdAtMs = new Date(createdAt).getTime();
    const turnMessages: WidgetHistoryMessage[] = [
      {
        id: `server-${item.id}-user`,
        role: "user",
        text: queryText,
        createdAt,
      },
      {
        id: `server-${item.id}-bot`,
        role: "bot",
        text: aiResponse,
        createdAt,
      },
    ];

    const last = gapSessions[gapSessions.length - 1];
    const canAppend =
      last &&
      shouldGroupOrphanTurn(metadata) &&
      createdAtMs - new Date(last.updatedAt).getTime() <= WIDGET_SESSION_INACTIVITY_MS;

    if (canAppend) {
      last.messages = mergeHistorySessionMessages(last.messages, turnMessages);
      last.updatedAt = createdAt;
      continue;
    }

    gapSessions.push({
      id: `widget-thread-${item.id}`,
      title: queryText,
      createdAt,
      updatedAt: createdAt,
      source: "server",
      messages: turnMessages,
    });
  }

  const sessions = [...withSessionId.values(), ...gapSessions].map((session) => ({
    ...session,
    messages: session.messages.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    ),
  }));

  return consolidateEphemeralDuplicateSessions(sessions);
}

export function resolveWidgetHistorySessionId(options: {
  preferredSessionId?: string | null;
  activeStoredSessionId?: string | null;
  currentRefSessionId?: string | null;
  isUuid: (value: string | null | undefined) => value is string;
}): string {
  if (options.isUuid(options.preferredSessionId)) {
    return options.preferredSessionId;
  }
  if (options.isUuid(options.currentRefSessionId)) {
    return options.currentRefSessionId;
  }
  if (options.isUuid(options.activeStoredSessionId)) {
    return options.activeStoredSessionId;
  }
  return crypto.randomUUID();
}
