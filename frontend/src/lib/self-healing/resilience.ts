import { NextResponse } from "next/server";
import {
  createServiceClient,
  logSecurityEventWithContext,
} from "@/lib/security/server";

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

type QueueTaskConfig = {
  taskType: string;
  payload: Record<string, unknown>;
  organizationId?: string | null;
  companyWorkspaceId?: string | null;
  createdBy?: string | null;
  priority?: number;
  maxRetries?: number;
};

type ResilienceExecutionOptions<T> = {
  serviceKey: string;
  displayName: string;
  serviceType: string;
  operationName: string;
  endpoint?: string | null;
  organizationId?: string | null;
  userId?: string | null;
  companyWorkspaceId?: string | null;
  timeoutMs?: number;
  retryDelaysMs?: number[];
  openAfterFailures?: number;
  cooldownSeconds?: number;
  fallbackMessage?: string;
  queueTask?: QueueTaskConfig;
  onFallback?: () => Promise<T> | T;
  operation: () => Promise<T>;
};

export type ResilienceResult<T> =
  | {
      ok: true;
      data: T;
      degraded: boolean;
      queuedTaskId?: string | null;
    }
  | {
      ok: false;
      error: string;
      degraded: boolean;
      queuedTaskId?: string | null;
      fallbackData?: T;
      fallbackMessage: string;
    };

const DEFAULT_RETRY_DELAYS = [1000, 2000, 4000];
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_OPEN_AFTER_FAILURES = 3;
const DEFAULT_COOLDOWN_SECONDS = 5 * 60;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`timeout_${timeoutMs}`)), timeoutMs);
  });

  try {
    return (await Promise.race([promise, timeout])) as T;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

async function getServiceState(serviceKey: string) {
  const supabase = createServiceClient();
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
  const supabase = createServiceClient();
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

  await supabase
    .from("service_resilience_states")
    .upsert(payload, { onConflict: "service_key" });
}

async function recordServiceSuccess(
  serviceKey: string,
  displayName: string,
  serviceType: string,
) {
  const current = await getServiceState(serviceKey);
  await upsertServiceState(serviceKey, displayName, serviceType, {
    circuit_state: current?.circuit_state === "half_open" ? "closed" : "closed",
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

async function recordServiceFailure({
  serviceKey,
  displayName,
  serviceType,
  errorMessage,
  openAfterFailures,
  cooldownSeconds,
}: {
  serviceKey: string;
  displayName: string;
  serviceType: string;
  errorMessage: string;
  openAfterFailures: number;
  cooldownSeconds: number;
}) {
  const current = await getServiceState(serviceKey);
  const nextFailureCount = (current?.failure_count ?? 0) + 1;
  const shouldOpen = nextFailureCount >= openAfterFailures;
  const openUntil = shouldOpen
    ? new Date(Date.now() + cooldownSeconds * 1000).toISOString()
    : null;

  await upsertServiceState(serviceKey, displayName, serviceType, {
    circuit_state: shouldOpen ? "open" : "closed",
    failure_count: nextFailureCount,
    open_until: openUntil,
    last_failure_at: new Date().toISOString(),
    last_error: errorMessage.slice(0, 1000),
    metadata: {
      ...(current?.metadata ?? {}),
      openedAt: shouldOpen ? new Date().toISOString() : current?.metadata?.openedAt,
    },
  });

  return {
    nextFailureCount,
    shouldOpen,
    openUntil,
  };
}

export async function enqueueSelfHealingTask(config: QueueTaskConfig) {
  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("enqueue_task", {
    p_task_type: config.taskType,
    p_payload: config.payload,
    p_scheduled_at: new Date().toISOString(),
    p_organization_id: config.organizationId ?? null,
    p_company_workspace_id: config.companyWorkspaceId ?? null,
    p_created_by: config.createdBy ?? null,
    p_priority: config.priority ?? 50,
    p_max_retries: config.maxRetries ?? 5,
  });

  if (error) {
    throw new Error(error.message);
  }

  return String(data);
}

function isCircuitOpen(state: CircuitStateRow | null) {
  if (!state || state.circuit_state !== "open" || !state.open_until) {
    return false;
  }

  return new Date(state.open_until).getTime() > Date.now();
}

export async function executeWithResilience<T>(
  options: ResilienceExecutionOptions<T>,
): Promise<ResilienceResult<T>> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retryDelaysMs = options.retryDelaysMs ?? DEFAULT_RETRY_DELAYS;
  const openAfterFailures = options.openAfterFailures ?? DEFAULT_OPEN_AFTER_FAILURES;
  const cooldownSeconds = options.cooldownSeconds ?? DEFAULT_COOLDOWN_SECONDS;

  const currentState = await getServiceState(options.serviceKey);
  if (isCircuitOpen(currentState)) {
    let queuedTaskId: string | null = null;

    if (options.queueTask) {
      queuedTaskId = await enqueueSelfHealingTask(options.queueTask);
    }

    await logSecurityEventWithContext({
      eventType: "self_healing.circuit_open",
      endpoint: options.endpoint ?? null,
      userId: options.userId ?? null,
      organizationId: options.organizationId ?? null,
      severity: "warning",
      details: {
        serviceKey: options.serviceKey,
        operationName: options.operationName,
        openUntil: currentState?.open_until ?? null,
        queuedTaskId,
      },
    });

    if (options.onFallback) {
      const fallbackData = await options.onFallback();
      return {
        ok: false,
        error: currentState?.last_error ?? "Servis gecici olarak devre disi.",
        degraded: true,
        queuedTaskId,
        fallbackData,
        fallbackMessage:
          options.fallbackMessage ?? "Servis gecici olarak devre disi. Manuel olarak devam edebilirsiniz.",
      };
    }

    return {
      ok: false,
      error: currentState?.last_error ?? "Servis gecici olarak devre disi.",
      degraded: true,
      queuedTaskId,
      fallbackMessage:
        options.fallbackMessage ?? "Servis gecici olarak devre disi. Manuel olarak devam edebilirsiniz.",
    };
  }

  let lastError = "Bilinmeyen hata";

  for (let attempt = 0; attempt < retryDelaysMs.length; attempt += 1) {
    try {
      const data = await withTimeout(options.operation(), timeoutMs);
      await recordServiceSuccess(options.serviceKey, options.displayName, options.serviceType);
      return {
        ok: true,
        data,
        degraded: attempt > 0,
      };
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Bilinmeyen hata";
      if (attempt < retryDelaysMs.length - 1) {
        await sleep(retryDelaysMs[attempt]);
      }
    }
  }

  const failureState = await recordServiceFailure({
    serviceKey: options.serviceKey,
    displayName: options.displayName,
    serviceType: options.serviceType,
    errorMessage: lastError,
    openAfterFailures,
    cooldownSeconds,
  });

  let queuedTaskId: string | null = null;
  if (options.queueTask) {
    queuedTaskId = await enqueueSelfHealingTask(options.queueTask);
  }

  await logSecurityEventWithContext({
    eventType: "self_healing.retry_exhausted",
    endpoint: options.endpoint ?? null,
    userId: options.userId ?? null,
    organizationId: options.organizationId ?? null,
    severity: failureState.shouldOpen ? "critical" : "warning",
    details: {
      serviceKey: options.serviceKey,
      operationName: options.operationName,
      queuedTaskId,
      failureCount: failureState.nextFailureCount,
      openUntil: failureState.openUntil,
      error: lastError.slice(0, 500),
    },
  });

  if (options.onFallback) {
    const fallbackData = await options.onFallback();
    return {
      ok: false,
      error: lastError,
      degraded: true,
      queuedTaskId,
      fallbackData,
      fallbackMessage:
        options.fallbackMessage ?? "Servis gecici olarak devre disi. Manuel olarak devam edebilirsiniz.",
    };
  }

  return {
    ok: false,
    error: lastError,
    degraded: true,
    queuedTaskId,
    fallbackMessage:
      options.fallbackMessage ?? "Servis gecici olarak devre disi. Manuel olarak devam edebilirsiniz.",
  };
}

export function buildManualFallbackResponse(options: {
  message: string;
  queueTaskId?: string | null;
  manualActionLabel?: string;
  status?: number;
  extra?: Record<string, unknown>;
}) {
  return NextResponse.json(
    {
      error: options.message,
      degraded: true,
      queuedTaskId: options.queueTaskId ?? null,
      fallback: {
        type: "manual",
        label: options.manualActionLabel ?? "Manuel girisle devam et",
      },
      ...(options.extra ?? {}),
    },
    { status: options.status ?? 503 },
  );
}
