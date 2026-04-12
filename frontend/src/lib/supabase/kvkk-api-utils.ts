export type KvkkApiErrorLike = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
};

const KVKK_SCHEMA_ERROR_CODES = new Set([
  "42P01",
  "42703",
  "42883",
  "PGRST202",
  "PGRST204",
]);

const KVKK_SCHEMA_ERROR_MARKERS = [
  "does not exist",
  "could not find the function",
  "schema cache",
  "relation",
  "column",
  "function",
];

export function isKvkkSchemaUnavailableError(error: KvkkApiErrorLike | null | undefined) {
  if (!error) return false;

  if (error.code && KVKK_SCHEMA_ERROR_CODES.has(error.code)) {
    return true;
  }

  const combinedMessage = [error.message, error.details, error.hint]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(" ")
    .toLowerCase();

  return KVKK_SCHEMA_ERROR_MARKERS.some((marker) => combinedMessage.includes(marker));
}

export function logKvkkApiError(scope: string, error: KvkkApiErrorLike | null | undefined) {
  if (isKvkkSchemaUnavailableError(error)) {
    return;
  }

  console.error(scope, error);
}
