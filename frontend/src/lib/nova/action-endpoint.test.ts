import { describe, expect, it } from "vitest";
import {
  buildActionStateResponse,
  buildReplayResponse,
  type NovaStoredActionRun,
} from "./action-endpoint";

function makeActionRun(
  overrides: Partial<NovaStoredActionRun> = {},
): NovaStoredActionRun {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    user_id: "22222222-2222-2222-2222-222222222222",
    organization_id: "33333333-3333-3333-3333-333333333333",
    company_workspace_id: "44444444-4444-4444-4444-444444444444",
    session_id: "55555555-5555-5555-5555-555555555555",
    action_name: "create_incident_draft",
    action_title: "Olay taslagi",
    action_summary: "Nova olay taslagini hazirladi.",
    status: "pending",
    language: "tr",
    result_snapshot: null,
    executed_at: null,
    cancelled_at: null,
    expires_at: null,
    ...overrides,
  };
}

describe("buildActionStateResponse", () => {
  it("keeps pending actions in confirmation state", () => {
    const response = buildActionStateResponse(makeActionRun());

    expect(response.type).toBe("tool_preview");
    expect(response.tool_preview?.requiresConfirmation).toBe(true);
    expect(response.action_hint && typeof response.action_hint === "object"
      ? response.action_hint.execution_status
      : null).toBe("pending_confirmation");
  });

  it("maps confirmed queued actions to workflow state", () => {
    const response = buildActionStateResponse(
      makeActionRun({
        status: "confirmed",
        result_snapshot: {
          execution_state: "queued",
          queue_task_id: "task-123",
          summary: "Nova aksiyonu kuyruga alindi.",
        },
      }),
    );

    expect(response.type).toBe("workflow_started");
    expect(response.workflow).toMatchObject({
      status: "queued",
      queue_task_id: "task-123",
    });
  });
});

describe("buildReplayResponse", () => {
  it("replays failed actions as safety blocks", () => {
    const response = buildReplayResponse(
      makeActionRun({
        status: "failed",
        result_snapshot: {
          error: "Zaman asimi",
          summary: "Nova aksiyonu basarisiz oldu.",
        },
      }),
    );

    expect(response.type).toBe("safety_block");
    expect(response.safety_block?.code).toBe("nova_action_failed");
    expect(response.answer).toBe("Nova aksiyonu basarisiz oldu.");
  });

  it("replays completed actions idempotently", () => {
    const response = buildReplayResponse(
      makeActionRun({
        status: "completed",
        result_snapshot: {
          summary: "Nova aksiyonu tamamlandi.",
          queue_task_id: "task-999",
        },
      }),
    );

    expect(response.type).toBe("tool_preview");
    expect(response.answer).toBe("Nova aksiyonu tamamlandi.");
    expect(response.action_hint && typeof response.action_hint === "object"
      ? response.action_hint.idempotent_replay
      : null).toBe(true);
  });
});
