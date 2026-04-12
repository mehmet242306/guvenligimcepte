import { createHash, randomUUID } from "crypto";
import {
  createServiceClient,
  logSecurityEventWithContext,
} from "@/lib/security/server";

const BACKUP_BUCKET = "system-backups";
const SNAPSHOT_TABLES = [
  "organizations",
  "company_workspaces",
  "user_profiles",
  "risk_assessments",
] as const;

type SnapshotTable = (typeof SNAPSHOT_TABLES)[number];

type BackupSummary = {
  runId: string;
  backupType: string;
  bucket: string;
  manifestPath: string;
  checksum: string;
  exportedAt: string;
  tables: Array<{
    table: SnapshotTable;
    rowCount: number;
    path: string;
  }>;
};

type RestoreSummary = {
  runId: string;
  sourceBackupRunId: string;
  dryRun: boolean;
  restoredAt: string;
  tables: Array<{
    table: SnapshotTable;
    sourceRowCount: number;
    restoredRowCount: number;
  }>;
  checksumVerified: boolean;
};

function chunkArray<T>(items: T[], chunkSize: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }
  return chunks;
}

async function ensureBackupBucket() {
  const supabase = createServiceClient();
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = (buckets ?? []).some((bucket) => bucket.name === BACKUP_BUCKET);

  if (!exists) {
    await supabase.storage.createBucket(BACKUP_BUCKET, {
      public: false,
      fileSizeLimit: 25 * 1024 * 1024,
    });
  }
}

async function insertBackupRun(params: {
  backupType: string;
  initiatedBy?: string | null;
  initiatedByName?: string | null;
  details?: Record<string, unknown>;
}) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("backup_runs")
    .insert({
      backup_type: params.backupType,
      status: "running",
      initiated_by: params.initiatedBy ?? null,
      initiated_by_name: params.initiatedByName ?? null,
      details: params.details ?? {},
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    throw new Error(error?.message ?? "Yedek kaydi olusturulamadi.");
  }

  return data.id as string;
}

async function updateBackupRun(
  runId: string,
  patch: Record<string, unknown>,
) {
  const supabase = createServiceClient();
  await supabase.from("backup_runs").update(patch).eq("id", runId);
}

async function downloadJsonFromStorage<T>(bucket: string, path: string): Promise<T> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.storage.from(bucket).download(path);

  if (error || !data) {
    throw new Error(`${path}: ${error?.message ?? "Storage indirilemedi."}`);
  }

  const text = await data.text();
  return JSON.parse(text) as T;
}

async function fetchSnapshotTable(table: SnapshotTable) {
  const supabase = createServiceClient();
  const { data, error } = await supabase.from(table).select("*");
  if (error) {
    throw new Error(`${table}: ${error.message}`);
  }
  return data ?? [];
}

function buildChecksum(payload: string) {
  return createHash("sha256").update(payload).digest("hex");
}

export async function runSnapshotBackup(options?: {
  backupType?: string;
  initiatedBy?: string | null;
  initiatedByName?: string | null;
  source?: "manual" | "scheduled" | "queued";
}) {
  const backupType = options?.backupType ?? "manual_snapshot";
  const runId = await insertBackupRun({
    backupType,
    initiatedBy: options?.initiatedBy ?? null,
    initiatedByName: options?.initiatedByName ?? null,
    details: {
      source: options?.source ?? "manual",
    },
  });

  try {
    await ensureBackupBucket();
    const supabase = createServiceClient();
    const exportedAt = new Date().toISOString();
    const folder = `snapshots/${exportedAt.slice(0, 10)}/${runId}`;

    const tables: BackupSummary["tables"] = [];
    const manifestPayload: Record<string, unknown> = {
      id: runId,
      exportedAt,
      backupType,
      source: options?.source ?? "manual",
      tables: [],
    };

    for (const table of SNAPSHOT_TABLES) {
      const rows = await fetchSnapshotTable(table);
      const body = JSON.stringify(
        {
          exportedAt,
          table,
          rowCount: rows.length,
          rows,
        },
        null,
        2,
      );
      const path = `${folder}/${table}.json`;

      const { error } = await supabase.storage
        .from(BACKUP_BUCKET)
        .upload(path, Buffer.from(body, "utf-8"), {
          contentType: "application/json",
          upsert: true,
        });

      if (error) {
        throw new Error(`${table} upload: ${error.message}`);
      }

      tables.push({
        table,
        rowCount: rows.length,
        path,
      });
    }

    manifestPayload.tables = tables;
    const manifestText = JSON.stringify(manifestPayload, null, 2);
    const checksum = buildChecksum(manifestText);
    const manifestPath = `${folder}/manifest.json`;

    const { error: manifestError } = await supabase.storage
      .from(BACKUP_BUCKET)
      .upload(manifestPath, Buffer.from(manifestText, "utf-8"), {
        contentType: "application/json",
        upsert: true,
      });

    if (manifestError) {
      throw new Error(`manifest upload: ${manifestError.message}`);
    }

    await updateBackupRun(runId, {
      status: "completed",
      storage_bucket: BACKUP_BUCKET,
      storage_path: manifestPath,
      checksum,
      result: {
        exportedAt,
        tables,
      },
      completed_at: new Date().toISOString(),
    });

    await logSecurityEventWithContext({
      eventType: "self_healing.backup.completed",
      userId: options?.initiatedBy ?? null,
      severity: "info",
      details: {
        runId,
        backupType,
        manifestPath,
        checksum,
      },
    });

    const summary: BackupSummary = {
      runId,
      backupType,
      bucket: BACKUP_BUCKET,
      manifestPath,
      checksum,
      exportedAt,
      tables,
    };

    return summary;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Yedek bilinmeyen hatayla durdu.";

    await updateBackupRun(runId, {
      status: "failed",
      result: {
        error: message,
        failedAt: new Date().toISOString(),
      },
      completed_at: new Date().toISOString(),
    });

    await logSecurityEventWithContext({
      eventType: "self_healing.backup.failed",
      userId: options?.initiatedBy ?? null,
      severity: "warning",
      details: {
        runId,
        backupType,
        error: message,
        traceId: randomUUID(),
      },
    });

    throw error;
  }
}

export async function restoreSnapshotBackup(options: {
  sourceBackupRunId: string;
  initiatedBy?: string | null;
  initiatedByName?: string | null;
  dryRun?: boolean;
}) {
  const dryRun = options.dryRun ?? false;
  const supabase = createServiceClient();
  const restoredAt = new Date().toISOString();

  const { data: sourceRun, error: sourceError } = await supabase
    .from("backup_runs")
    .select("id, status, storage_bucket, storage_path, checksum, details, result")
    .eq("id", options.sourceBackupRunId)
    .maybeSingle();

  if (sourceError) {
    throw new Error(sourceError.message);
  }

  if (!sourceRun?.id || sourceRun.status !== "completed") {
    throw new Error("Geri yüklenecek yedek kaydı tamamlanmış durumda bulunamadı.");
  }

  if (!sourceRun.storage_bucket || !sourceRun.storage_path) {
    throw new Error("Kaynak yedek için storage yolu bulunamadı.");
  }

  const restoreRunId = await insertBackupRun({
    backupType: dryRun ? "restore_snapshot_dry_run" : "restore_snapshot",
    initiatedBy: options.initiatedBy ?? null,
    initiatedByName: options.initiatedByName ?? null,
    details: {
      sourceBackupRunId: options.sourceBackupRunId,
      dryRun,
    },
  });

  try {
    const manifest = await downloadJsonFromStorage<BackupSummary>(
      sourceRun.storage_bucket,
      sourceRun.storage_path,
    );
    const manifestText = JSON.stringify({
      id: manifest.runId,
      exportedAt: manifest.exportedAt,
      backupType: manifest.backupType,
      source: sourceRun.details?.source ?? "unknown",
      tables: manifest.tables,
    }, null, 2);
    const checksumVerified =
      !sourceRun.checksum || buildChecksum(manifestText) === sourceRun.checksum;

    if (!checksumVerified) {
      throw new Error("Yedek checksum doğrulaması başarısız oldu.");
    }

    const restoredTables: RestoreSummary["tables"] = [];

    for (const tableEntry of manifest.tables) {
      if (!SNAPSHOT_TABLES.includes(tableEntry.table)) {
        continue;
      }

      const payload = await downloadJsonFromStorage<{
        exportedAt: string;
        table: SnapshotTable;
        rowCount: number;
        rows: Array<Record<string, unknown>>;
      }>(sourceRun.storage_bucket, tableEntry.path);

      const rows = Array.isArray(payload.rows) ? payload.rows : [];
      let restoredRowCount = 0;

      if (!dryRun && rows.length > 0) {
        for (const chunk of chunkArray(rows, 200)) {
          const { error } = await supabase
            .from(tableEntry.table)
            .upsert(chunk, { onConflict: "id" });

          if (error) {
            throw new Error(`${tableEntry.table}: ${error.message}`);
          }

          restoredRowCount += chunk.length;
        }
      } else {
        restoredRowCount = rows.length;
      }

      restoredTables.push({
        table: tableEntry.table,
        sourceRowCount: rows.length,
        restoredRowCount,
      });
    }

    await updateBackupRun(restoreRunId, {
      status: "completed",
      storage_bucket: sourceRun.storage_bucket,
      storage_path: sourceRun.storage_path,
      checksum: sourceRun.checksum,
      result: {
        sourceBackupRunId: options.sourceBackupRunId,
        checksumVerified,
        dryRun,
        restoredAt,
        tables: restoredTables,
      },
      completed_at: restoredAt,
    });

    await logSecurityEventWithContext({
      eventType: dryRun ? "self_healing.backup.restore_dry_run" : "self_healing.backup.restored",
      userId: options.initiatedBy ?? null,
      severity: "warning",
      details: {
        restoreRunId,
        sourceBackupRunId: options.sourceBackupRunId,
        dryRun,
        checksumVerified,
      },
    });

    const summary: RestoreSummary = {
      runId: restoreRunId,
      sourceBackupRunId: options.sourceBackupRunId,
      dryRun,
      restoredAt,
      tables: restoredTables,
      checksumVerified,
    };

    return summary;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Yedek geri yükleme bilinmeyen hatayla durdu.";

    await updateBackupRun(restoreRunId, {
      status: "failed",
      result: {
        sourceBackupRunId: options.sourceBackupRunId,
        error: message,
        failedAt: new Date().toISOString(),
      },
      completed_at: new Date().toISOString(),
    });

    await logSecurityEventWithContext({
      eventType: "self_healing.backup.restore_failed",
      userId: options.initiatedBy ?? null,
      severity: "warning",
      details: {
        restoreRunId,
        sourceBackupRunId: options.sourceBackupRunId,
        dryRun,
        error: message,
      },
    });

    throw error;
  }
}
