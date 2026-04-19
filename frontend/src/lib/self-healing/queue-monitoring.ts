export type QueueTaskStatus = string;

export type QueueTaskRowLike = {
  status: QueueTaskStatus;
};

export type NovaOutboxStatus =
  | "queued"
  | "processing"
  | "succeeded"
  | "failed"
  | "dead_letter"
  | "cancelled";

export type NovaOutboxRowLike = {
  status: NovaOutboxStatus;
  retry_count: number;
  max_retries: number;
  last_error: string | null;
};

export type NovaOutboxFilter = "all" | "attention" | "active" | "completed";

export function getTaskQueueSummary(rows: readonly QueueTaskRowLike[]) {
  return {
    processing: rows.filter((row) => row.status === "processing").length,
    failed: rows.filter((row) => row.status === "failed").length,
    queued: rows.filter((row) => row.status === "queued").length,
    completed: rows.filter((row) => row.status === "completed").length,
  };
}

export function getNovaOutboxSummary(rows: readonly NovaOutboxRowLike[]) {
  return {
    queued: rows.filter((row) => row.status === "queued").length,
    processing: rows.filter((row) => row.status === "processing").length,
    deadLetters: rows.filter((row) => row.status === "dead_letter").length,
    failed: rows.filter((row) => row.status === "failed").length,
    completed: rows.filter((row) => row.status === "succeeded").length,
    cancelled: rows.filter((row) => row.status === "cancelled").length,
    needsAttention: rows.filter(
      (row) =>
        row.status === "dead_letter" ||
        row.status === "failed" ||
        Boolean(row.last_error),
    ).length,
  };
}

export function filterNovaOutboxRows<T extends NovaOutboxRowLike>(
  rows: readonly T[],
  filter: NovaOutboxFilter,
) {
  switch (filter) {
    case "attention":
      return rows.filter(
        (row) =>
          row.status === "dead_letter" ||
          row.status === "failed" ||
          Boolean(row.last_error),
      );
    case "active":
      return rows.filter((row) => row.status === "queued" || row.status === "processing");
    case "completed":
      return rows.filter((row) => row.status === "succeeded" || row.status === "cancelled");
    case "all":
    default:
      return rows;
  }
}

export function getNovaOutboxRiskTone(row: NovaOutboxRowLike) {
  if (row.status === "dead_letter") return "danger";
  if (row.status === "failed") return "warning";
  if (row.status === "processing" || row.status === "queued") return "info";
  return "neutral";
}
