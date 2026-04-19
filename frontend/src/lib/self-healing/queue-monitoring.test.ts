import { describe, expect, it } from "vitest";
import {
  filterNovaOutboxRows,
  getNovaOutboxRiskTone,
  getNovaOutboxSummary,
  getTaskQueueSummary,
} from "./queue-monitoring";

describe("queue monitoring helpers", () => {
  const queueRows = [
    { status: "queued" },
    { status: "processing" },
    { status: "processing" },
    { status: "failed" },
    { status: "completed" },
  ];

  const outboxRows = [
    { status: "queued", retry_count: 0, max_retries: 5, last_error: null },
    { status: "processing", retry_count: 1, max_retries: 5, last_error: null },
    { status: "failed", retry_count: 3, max_retries: 5, last_error: "timeout" },
    { status: "dead_letter", retry_count: 5, max_retries: 5, last_error: "permanent" },
    { status: "succeeded", retry_count: 1, max_retries: 5, last_error: null },
    { status: "cancelled", retry_count: 0, max_retries: 5, last_error: null },
  ] as const;

  it("builds task queue summaries", () => {
    expect(getTaskQueueSummary(queueRows)).toEqual({
      queued: 1,
      processing: 2,
      failed: 1,
      completed: 1,
    });
  });

  it("builds nova outbox summaries", () => {
    expect(getNovaOutboxSummary(outboxRows)).toEqual({
      queued: 1,
      processing: 1,
      deadLetters: 1,
      failed: 1,
      completed: 1,
      cancelled: 1,
      needsAttention: 2,
    });
  });

  it("filters nova outbox rows by admin focus state", () => {
    expect(filterNovaOutboxRows(outboxRows, "attention")).toHaveLength(2);
    expect(filterNovaOutboxRows(outboxRows, "active")).toHaveLength(2);
    expect(filterNovaOutboxRows(outboxRows, "completed")).toHaveLength(2);
    expect(filterNovaOutboxRows(outboxRows, "all")).toHaveLength(6);
  });

  it("maps risk tones from nova outbox state", () => {
    expect(getNovaOutboxRiskTone(outboxRows[3])).toBe("danger");
    expect(getNovaOutboxRiskTone(outboxRows[2])).toBe("warning");
    expect(getNovaOutboxRiskTone(outboxRows[0])).toBe("info");
    expect(getNovaOutboxRiskTone(outboxRows[4])).toBe("neutral");
  });
});
