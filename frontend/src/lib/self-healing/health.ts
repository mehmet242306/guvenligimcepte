import Anthropic from "@anthropic-ai/sdk";
import { randomUUID } from "crypto";
import {
  createServiceClient,
  logSecurityEventWithContext,
} from "@/lib/security/server";

type HealthStatus = "healthy" | "degraded" | "down";
export type HealthMode = "manual" | "scheduled" | "queued" | "automatic";

export type HealthCheckResult = {
  componentKey: string;
  componentName: string;
  status: HealthStatus;
  latencyMs: number;
  summary: string;
  details?: Record<string, unknown>;
};

const anthropicClient = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

function nowMs() {
  return Date.now();
}

async function measure<T>(fn: () => Promise<T>) {
  const started = nowMs();
  const data = await fn();
  return {
    data,
    latencyMs: nowMs() - started,
  };
}

async function insertHealthCheck(
  runId: string,
  mode: HealthMode,
  result: HealthCheckResult,
  createdBy?: string | null,
) {
  const supabase = createServiceClient();
  await supabase.from("health_checks").insert({
    run_id: runId,
    component_key: result.componentKey,
    component_name: result.componentName,
    status: result.status,
    check_mode: mode,
    latency_ms: result.latencyMs,
    summary: result.summary,
    details: result.details ?? {},
    created_by: createdBy ?? null,
  });
}

async function checkDatabase() {
  const supabase = createServiceClient();
  const { latencyMs } = await measure(async () => {
    const { error } = await supabase.from("service_resilience_states").select("id").limit(1);
    if (error) throw new Error(error.message);
  });

  return {
    componentKey: "database.primary",
    componentName: "Veritabani",
    status: "healthy" as const,
    latencyMs,
    summary: "Veritabani baglantisi saglikli.",
  };
}

async function checkStorage() {
  const supabase = createServiceClient();
  const { data, latencyMs } = await measure(async () => {
    const { data, error } = await supabase.storage.listBuckets();
    if (error) throw new Error(error.message);
    return data ?? [];
  });

  return {
    componentKey: "supabase.storage",
    componentName: "Supabase Storage",
    status: "healthy" as const,
    latencyMs,
    summary: "Storage erisimi calisiyor.",
    details: {
      bucketCount: data.length,
    },
  };
}

async function checkAnthropic() {
  if (!anthropicClient) {
    return {
      componentKey: "anthropic.api",
      componentName: "Anthropic API",
      status: "degraded" as const,
      latencyMs: 0,
      summary: "ANTHROPIC_API_KEY tanimli degil.",
      details: {
        configured: false,
      },
    };
  }

  const { latencyMs } = await measure(async () => {
    await anthropicClient.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8,
      messages: [{ role: "user", content: "Saglik kontrolu: sadece ok yaz." }],
    });
  });

  return {
    componentKey: "anthropic.api",
    componentName: "Anthropic API",
    status: "healthy" as const,
    latencyMs,
    summary: "Anthropic API yanit veriyor.",
  };
}

async function checkEdgeFunctions() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceKey) {
    return {
      componentKey: "edge.sync_mevzuat",
      componentName: "Edge Function",
      status: "degraded" as const,
      latencyMs: 0,
      summary: "Edge function testi icin ortam degiskenleri eksik.",
      details: {
        configured: false,
      },
    };
  }

  const { data, latencyMs } = await measure(async () => {
    const response = await fetch(`${supabaseUrl}/functions/v1/sync-mevzuat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
      body: JSON.stringify({ action: "test" }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error((payload as { error?: string }).error ?? `HTTP ${response.status}`);
    }
    return payload;
  });

  return {
    componentKey: "edge.sync_mevzuat",
    componentName: "Edge Function",
    status: "healthy" as const,
    latencyMs,
    summary: "Edge function saglikli cevap verdi.",
    details: data as Record<string, unknown>,
  };
}

async function checkCriticalWrite() {
  const supabase = createServiceClient();
  const { data, latencyMs } = await measure(async () => {
    const { data, error } = await supabase
      .from("task_queue")
      .insert({
        task_type: "system.health.write_probe",
        payload: { probe: true },
        status: "completed",
        priority: 100,
        retry_count: 0,
        max_retries: 1,
        completed_at: new Date().toISOString(),
        result: { probe: true, checkedAt: new Date().toISOString() },
      })
      .select("id")
      .single();

    if (error || !data?.id) throw new Error(error?.message ?? "Probe yazilamadi.");
    return data;
  });

  return {
    componentKey: "database.write_probe",
    componentName: "Kritik Yazma Testi",
    status: "healthy" as const,
    latencyMs,
    summary: "Kritik tablo yazma testi basarili.",
    details: {
      probeTaskId: data.id,
    },
  };
}

async function markServiceCircuitOpen(params: {
  serviceKey: string;
  displayName: string;
  serviceType: string;
  cooldownSeconds: number;
  reason: string;
}) {
  const supabase = createServiceClient();
  await supabase.from("service_resilience_states").upsert(
    {
      service_key: params.serviceKey,
      display_name: params.displayName,
      service_type: params.serviceType,
      circuit_state: "open",
      open_until: new Date(Date.now() + params.cooldownSeconds * 1000).toISOString(),
      last_failure_at: new Date().toISOString(),
      last_error: params.reason,
      metadata: {
        openedBy: "health_recovery",
        reason: params.reason,
      },
    },
    { onConflict: "service_key" },
  );
}

async function evaluateRecoveryScenarios(runId: string) {
  const supabase = createServiceClient();
  const { data: scenarios, error } = await supabase
    .from("recovery_scenarios")
    .select("*")
    .eq("is_active", true)
    .order("created_at");

  if (error || !scenarios) return [];

  const { data: healthRows } = await supabase
    .from("health_checks")
    .select("component_key, status, details, checked_at")
    .eq("run_id", runId);

  const byComponent = new Map(
    (healthRows ?? []).map((row) => [row.component_key, row]),
  );
  const recoveryResults: Array<Record<string, unknown>> = [];

  for (const scenario of scenarios) {
    try {
      let triggered = false;

      if (scenario.condition_key === "anthropic.api:down") {
        const check = byComponent.get("anthropic.api");
        triggered = check?.status === "down";
        if (triggered) {
          const cooldownSeconds = Number(
            (scenario.action_config as { cooldown_seconds?: number })?.cooldown_seconds ?? 300,
          );
          await markServiceCircuitOpen({
            serviceKey: "anthropic.api",
            displayName: "Anthropic API",
            serviceType: "external_api",
            cooldownSeconds,
            reason: "Health check algisi: Anthropic down",
          });
        }
      } else if (
        scenario.condition_key === "supabase.storage:down" ||
        scenario.condition_key === "storage.primary:down"
      ) {
        const check =
          byComponent.get("supabase.storage") ??
          byComponent.get("storage.primary");
        triggered = check?.status === "down";
        if (triggered) {
          await markServiceCircuitOpen({
            serviceKey: "storage.primary",
            displayName: "Supabase Storage",
            serviceType: "storage",
            cooldownSeconds: 300,
            reason: "Storage down; text-only moda gecildi.",
          });
        }
      } else if (
        scenario.condition_key === "task_queue:processing_stuck" ||
        scenario.condition_key === "task_queue:stuck"
      ) {
        const { data: reclaimed } = await supabase
          .from("task_queue")
          .update({
            status: "pending",
            locked_by: null,
            processing_started_at: null,
            scheduled_at: new Date().toISOString(),
          })
          .eq("status", "processing")
          .lt(
            "processing_started_at",
            new Date(Date.now() - 15 * 60 * 1000).toISOString(),
          )
          .select("id");

        triggered = (reclaimed ?? []).length > 0;
      } else if (scenario.condition_key === "backup.storage:warning") {
        const check =
          byComponent.get("supabase.storage") ??
          byComponent.get("storage.primary");
        triggered = check?.status === "degraded" || check?.status === "down";
      }

      await supabase
        .from("recovery_scenarios")
        .update({
          last_status: triggered ? "triggered" : "skipped",
          last_triggered_at: triggered ? new Date().toISOString() : scenario.last_triggered_at,
          run_count: Number(scenario.run_count ?? 0) + (triggered ? 1 : 0),
        })
        .eq("id", scenario.id);

      recoveryResults.push({
        scenarioKey: scenario.scenario_key,
        status: triggered ? "triggered" : "skipped",
      });
    } catch (scenarioError) {
      await supabase
        .from("recovery_scenarios")
        .update({
          last_status: "failed",
        })
        .eq("id", scenario.id);

      recoveryResults.push({
        scenarioKey: scenario.scenario_key,
        status: "failed",
        error:
          scenarioError instanceof Error ? scenarioError.message : "Bilinmeyen recovery hatasi",
      });
    }
  }

  return recoveryResults;
}

export async function runSelfHealingHealthChecks(options?: {
  mode?: HealthMode;
  createdBy?: string | null;
}) {
  const runId = randomUUID();
  const mode = options?.mode ?? "manual";
  const results: HealthCheckResult[] = [];

  const checks = [
    checkDatabase,
    checkStorage,
    checkAnthropic,
    checkEdgeFunctions,
    checkCriticalWrite,
  ];

  // Paralel çalıştır — sıralı versiyon Vercel function 10s timeout'unu
  // cron cold-start'larda aşıyordu (5 check × ~1-2s + Anthropic ping 1.3s).
  // Promise.allSettled ile her check ayrı hata yakalanıp tek tek raporlanır.
  const settled = await Promise.allSettled(checks.map((runCheck) => runCheck()));

  for (let i = 0; i < settled.length; i++) {
    const outcome = settled[i];
    const runCheck = checks[i];
    if (outcome.status === "fulfilled") {
      results.push(outcome.value);
    } else {
      const error = outcome.reason;
      const message = error instanceof Error ? error.message : "Bilinmeyen hata";
      results.push({
        componentKey: runCheck.name.replace(/^check/, "").toLowerCase() || "unknown",
        componentName: runCheck.name || "Unknown",
        status: "down",
        latencyMs: 0,
        summary: message,
        details: { error: message },
      });
    }
  }

  // DB insert'leri de paralel — 5 sıralı write'ı tek paralel batch'e çevirir.
  await Promise.all(
    results.map((result) =>
      insertHealthCheck(runId, mode, result, options?.createdBy ?? null),
    ),
  );

  const recoveryResults = await evaluateRecoveryScenarios(runId);
  const overallStatus = results.some((item) => item.status === "down")
    ? "down"
    : results.some((item) => item.status === "degraded")
      ? "degraded"
      : "healthy";

  await logSecurityEventWithContext({
    eventType: "self_healing.health_check.completed",
    userId: options?.createdBy ?? null,
    severity: overallStatus === "down" ? "warning" : "info",
    details: {
      runId,
      mode,
      overallStatus,
      recoveryResults,
    },
  });

  return {
    runId,
    overallStatus,
    results,
    recoveryResults,
  };
}
