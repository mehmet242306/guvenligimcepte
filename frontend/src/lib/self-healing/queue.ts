import Anthropic from "@anthropic-ai/sdk";
import { createServiceClient } from "@/lib/security/server";
import { runSnapshotBackup } from "@/lib/self-healing/backup";
import { runSelfHealingHealthChecks } from "@/lib/self-healing/health";

type TaskQueueRow = {
  id: string;
  task_type: string;
  payload: Record<string, unknown> | null;
  retry_count: number;
  max_retries: number;
  created_by: string | null;
  organization_id: string | null;
  company_workspace_id: string | null;
};

const anthropicClient = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

async function completeTask(taskId: string, result: Record<string, unknown>) {
  const supabase = createServiceClient();
  await supabase.rpc("complete_task_queue", {
    p_task_id: taskId,
    p_result: result,
  });
}

async function failTask(taskId: string, message: string, retryDelaySeconds = 60) {
  const supabase = createServiceClient();
  await supabase.rpc("fail_task_queue", {
    p_task_id: taskId,
    p_error_message: message,
    p_retry_delay_seconds: retryDelaySeconds,
  });
}

async function reclaimStuckTasks() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
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

  if (error) {
    throw new Error(error.message);
  }

  return {
    reclaimed: (data ?? []).length,
  };
}

async function processTrainingGeneration(task: TaskQueueRow) {
  if (!anthropicClient) {
    throw new Error("ANTHROPIC_API_KEY tanimli degil.");
  }

  const topic = String(task.payload?.topic ?? "").trim();
  const questionCount = Number(task.payload?.questionCount ?? 10);
  const optionCount = Number(task.payload?.optionCount ?? 4);
  const type = String(task.payload?.type ?? "exam");
  const description = String(task.payload?.description ?? "");

  if (!topic) {
    throw new Error("Eksik training queue payload: topic");
  }

  const prompt = `Sen ISG egitim uzmanisin. Asagidaki konu icin ${type === "exam" ? "sinav sorulari" : "anket sorulari"} olustur.

KONU: ${topic}
${description ? `ACIKLAMA: ${description}` : ""}
SORU SAYISI: ${questionCount}
${type === "exam" ? `SIK SAYISI: ${optionCount}` : ""}

Sadece JSON dizisi dondur.`;

  const message = await anthropicClient.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0]?.type === "text" ? message.content[0].text : "";
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error("AI queue yanitindan soru JSON'u cikarilamadi.");
  }

  const questions = JSON.parse(jsonMatch[0]);
  await completeTask(task.id, {
    topic,
    type,
    questions,
    usage: message.usage,
  });
}

async function processDocumentGeneration(task: TaskQueueRow) {
  if (!anthropicClient) {
    throw new Error("ANTHROPIC_API_KEY tanimli degil.");
  }

  const prompt = String(task.payload?.prompt ?? "").trim();
  if (!prompt) {
    throw new Error("Eksik document queue payload: prompt");
  }

  const companyName = String(task.payload?.companyName ?? "");
  const companyData = (task.payload?.companyData ?? {}) as Record<string, unknown>;
  const documentTitle = String(task.payload?.documentTitle ?? "");
  const groupKey = String(task.payload?.groupKey ?? "");

  let contextInfo = "\n\nFIRMA BILGILERI:\n";
  if (companyName) contextInfo += `- Firma Adi: ${companyName}\n`;
  for (const [key, value] of Object.entries(companyData)) {
    if (value) contextInfo += `- ${key}: ${String(value)}\n`;
  }
  if (documentTitle) contextInfo += `\nDOKUMAN BASLIGI: ${documentTitle}\n`;
  if (groupKey) contextInfo += `DOKUMAN KATEGORISI: ${groupKey}\n`;

  const response = await anthropicClient.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [{ role: "user", content: `${contextInfo}\n\nISTEK:\n${prompt}` }],
  });

  const textBlock = response.content.find((item) => item.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Document queue icin AI metin uretmedi.");
  }

  await completeTask(task.id, {
    content: textBlock.text,
    usage: response.usage,
  });
}

async function processTask(task: TaskQueueRow) {
  switch (task.task_type) {
    case "health.run": {
      const result = await runSelfHealingHealthChecks({
        mode: "queued",
        createdBy: task.created_by,
      });
      await completeTask(task.id, result);
      return;
    }
    case "backup.snapshot": {
      const result = await runSnapshotBackup({
        backupType: String(task.payload?.backupType ?? "queued_snapshot"),
        initiatedBy: task.created_by,
        initiatedByName: String(task.payload?.initiatedByName ?? "Queue Worker"),
        source: "queued",
      });
      await completeTask(task.id, result);
      return;
    }
    case "system.recovery.reclaim_stuck": {
      const result = await reclaimStuckTasks();
      await completeTask(task.id, result);
      return;
    }
    case "ai.training.generate": {
      await processTrainingGeneration(task);
      return;
    }
    case "ai.document.generate": {
      await processDocumentGeneration(task);
      return;
    }
    default:
      throw new Error(`Desteklenmeyen queue task: ${task.task_type}`);
  }
}

export async function processSelfHealingQueue(options?: {
  batchSize?: number;
  workerId?: string;
}) {
  const supabase = createServiceClient();
  const batchSize = options?.batchSize ?? 5;
  const workerId = options?.workerId ?? "self-healing-worker";

  const { data, error } = await supabase.rpc("claim_task_queue", {
    p_batch_size: batchSize,
    p_worker_id: workerId,
  });

  if (error) {
    throw new Error(error.message);
  }

  const tasks = (data ?? []) as TaskQueueRow[];
  const results: Array<Record<string, unknown>> = [];

  for (const task of tasks) {
    try {
      await processTask(task);
      results.push({
        taskId: task.id,
        taskType: task.task_type,
        status: "completed",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Bilinmeyen queue hatasi";
      await failTask(task.id, message, 60 * (task.retry_count + 1));
      results.push({
        taskId: task.id,
        taskType: task.task_type,
        status: "failed",
        error: message,
      });
    }
  }

  return {
    processed: tasks.length,
    results,
  };
}
