import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

type CircuitStateRow = {
  service_key: string;
  display_name: string;
  service_type: string;
  circuit_state: "closed" | "open" | "half_open";
  failure_count: number;
  success_count: number;
  open_until: string | null;
  last_failure_at: string | null;
  last_success_at: string | null;
  last_error: string | null;
  metadata: Record<string, unknown> | null;
};

type ResilienceExecutionOptions<T> = {
  serviceKey: string;
  displayName: string;
  serviceType: string;
  operationName: string;
  timeoutMs?: number;
  retryDelaysMs?: number[];
  openAfterFailures?: number;
  cooldownSeconds?: number;
  fallbackMessage?: string;
  onFallback?: () => Promise<T> | T;
  operation: (signal: AbortSignal) => Promise<T>;
};

export type EdgeResilienceResult<T> =
  | {
      ok: true;
      data: T;
      degraded: boolean;
    }
  | {
      ok: false;
      error: string;
      degraded: true;
      fallbackData?: T;
      fallbackMessage: string;
    };

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_RETRY_DELAYS = [1000, 2000, 4000];
const DEFAULT_OPEN_AFTER_FAILURES = 3;
const DEFAULT_COOLDOWN_SECONDS = 5 * 60;

function getServiceClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getServiceState(serviceKey: string) {
  const supabase = getServiceClient();
  const { data } = await supabase
    .from("service_resilience_states")
    .select("*")
    .eq("service_key", serviceKey)
    .maybeSingle();

  return (data as CircuitStateRow | null) ?? null;
}

async function upsertServiceState(
  serviceKey: string,
  displayName: string,
  serviceType: string,
  patch: Partial<CircuitStateRow> & { metadata?: Record<string, unknown> },
) {
  const supabase = getServiceClient();
  const current = await getServiceState(serviceKey);

  const payload = {
    service_key: serviceKey,
    display_name: current?.display_name ?? displayName,
    service_type: current?.service_type ?? serviceType,
    circuit_state: patch.circuit_state ?? current?.circuit_state ?? "closed",
    failure_count: patch.failure_count ?? current?.failure_count ?? 0,
    success_count: patch.success_count ?? current?.success_count ?? 0,
    open_until: patch.open_until ?? current?.open_until ?? null,
    last_failure_at: patch.last_failure_at ?? current?.last_failure_at ?? null,
    last_success_at: patch.last_success_at ?? current?.last_success_at ?? null,
    last_error: patch.last_error ?? current?.last_error ?? null,
    metadata: patch.metadata ?? current?.metadata ?? {},
  };

  await supabase.from("service_resilience_states").upsert(payload, {
    onConflict: "service_key",
  });
}

async function recordServiceSuccess(
  serviceKey: string,
  displayName: string,
  serviceType: string,
) {
  const current = await getServiceState(serviceKey);
  await upsertServiceState(serviceKey, displayName, serviceType, {
    circuit_state: "closed",
    failure_count: 0,
    success_count: (current?.success_count ?? 0) + 1,
    open_until: null,
    last_error: null,
    last_success_at: new Date().toISOString(),
    metadata: {
      ...(current?.metadata ?? {}),
      healedAt: new Date().toISOString(),
    },
  });
}

async function recordServiceFailure(params: {
  serviceKey: string;
  displayName: string;
  serviceType: string;
  errorMessage: string;
  openAfterFailures: number;
  cooldownSeconds: number;
}) {
  const current = await getServiceState(params.serviceKey);
  const nextFailureCount = (current?.failure_count ?? 0) + 1;
  const shouldOpen = nextFailureCount >= params.openAfterFailures;
  const openUntil = shouldOpen
    ? new Date(Date.now() + params.cooldownSeconds * 1000).toISOString()
    : null;

  await upsertServiceState(params.serviceKey, params.displayName, params.serviceType, {
    circuit_state: shouldOpen ? "open" : "closed",
    failure_count: nextFailureCount,
    open_until: openUntil,
    last_failure_at: new Date().toISOString(),
    last_error: params.errorMessage.slice(0, 1000),
    metadata: {
      ...(current?.metadata ?? {}),
      openedAt: shouldOpen ? new Date().toISOString() : current?.metadata?.openedAt,
    },
  });
}

function isCircuitOpen(state: CircuitStateRow | null) {
  if (!state || state.circuit_state !== "open" || !state.open_until) {
    return false;
  }

  return new Date(state.open_until).getTime() > Date.now();
}

export async function executeWithResilience<T>(
  options: ResilienceExecutionOptions<T>,
): Promise<EdgeResilienceResult<T>> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retryDelaysMs = options.retryDelaysMs ?? DEFAULT_RETRY_DELAYS;
  const openAfterFailures = options.openAfterFailures ?? DEFAULT_OPEN_AFTER_FAILURES;
  const cooldownSeconds = options.cooldownSeconds ?? DEFAULT_COOLDOWN_SECONDS;

  const currentState = await getServiceState(options.serviceKey);
  if (isCircuitOpen(currentState)) {
    if (options.onFallback) {
      const fallbackData = await options.onFallback();
      return {
        ok: false,
        error: currentState?.last_error ?? "Servis gecici olarak devre disi.",
        degraded: true,
        fallbackData,
        fallbackMessage:
          options.fallbackMessage ?? "Servis gecici olarak devre disi. Manuel olarak devam edin.",
      };
    }

    return {
      ok: false,
      error: currentState?.last_error ?? "Servis gecici olarak devre disi.",
      degraded: true,
      fallbackMessage:
        options.fallbackMessage ?? "Servis gecici olarak devre disi. Manuel olarak devam edin.",
    };
  }

  let lastError = "Bilinmeyen hata";

  for (let attempt = 0; attempt < retryDelaysMs.length; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(`timeout_${timeoutMs}`), timeoutMs);

    try {
      const data = await options.operation(controller.signal);
      clearTimeout(timeoutId);
      await recordServiceSuccess(options.serviceKey, options.displayName, options.serviceType);
      return {
        ok: true,
        data,
        degraded: attempt > 0,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error instanceof Error ? error.message : "Bilinmeyen hata";
      if (attempt < retryDelaysMs.length - 1) {
        await sleep(retryDelaysMs[attempt]);
      }
    }
  }

  await recordServiceFailure({
    serviceKey: options.serviceKey,
    displayName: options.displayName,
    serviceType: options.serviceType,
    errorMessage: lastError,
    openAfterFailures,
    cooldownSeconds,
  });

  if (options.onFallback) {
    const fallbackData = await options.onFallback();
    return {
      ok: false,
      error: lastError,
      degraded: true,
      fallbackData,
      fallbackMessage:
        options.fallbackMessage ?? "Servis gecici olarak devre disi. Manuel olarak devam edin.",
    };
  }

  return {
    ok: false,
    error: lastError,
    degraded: true,
    fallbackMessage:
      options.fallbackMessage ?? "Servis gecici olarak devre disi. Manuel olarak devam edin.",
  };
}

export async function resilientFetch(
  input: string | URL | Request,
  init: RequestInit | undefined,
  options: {
    serviceKey: string;
    displayName: string;
    serviceType?: string;
    operationName: string;
    timeoutMs?: number;
    retryDelaysMs?: number[];
    fallbackMessage?: string;
  },
) {
  return executeWithResilience<Response>({
    serviceKey: options.serviceKey,
    displayName: options.displayName,
    serviceType: options.serviceType ?? "external_http",
    operationName: options.operationName,
    timeoutMs: options.timeoutMs,
    retryDelaysMs: options.retryDelaysMs,
    fallbackMessage: options.fallbackMessage,
    operation: async (signal) => {
      const response = await fetch(input, { ...(init ?? {}), signal });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response;
    },
  });
}
