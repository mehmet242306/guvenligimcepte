// =============================================================================
// Firma Dosyası — Veri Toplayıcı
// =============================================================================
// Aktif company_workspace_id için 7 kategori altındaki kayıtları RLS-güvenli
// sorgularla toplar. Her kategori için başlık + metadata döner; detaylı
// PDF üretimi company-file-generator.ts tarafında yapılır.
// =============================================================================

import { createClient } from "@/lib/supabase/client";

export type CompanyFileCategoryId =
  | "risk_assessments"
  | "findings"
  | "corrective_actions"
  | "incidents"
  | "documents"
  | "inspection_runs"
  | "isg_tasks";

export type CompanyFileItem = {
  id: string;
  title: string;
  code?: string | null;
  status?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  meta?: Record<string, unknown>;
};

export type CompanyFileCategory = {
  id: CompanyFileCategoryId;
  label: string;
  icon: string;
  count: number;
  items: CompanyFileItem[];
};

const CATEGORY_LABELS: Record<CompanyFileCategoryId, { label: string; icon: string }> = {
  risk_assessments: { label: "Risk Analizleri", icon: "🛡️" },
  findings: { label: "Tespitler", icon: "⚠️" },
  corrective_actions: { label: "DÖF Kayıtları", icon: "📝" },
  incidents: { label: "Olay ve Kazalar", icon: "🚨" },
  documents: { label: "Dokümanlar", icon: "📄" },
  inspection_runs: { label: "Saha Denetimleri", icon: "🔍" },
  isg_tasks: { label: "Ajanda / Görevler", icon: "🗓️" },
};

type LooseRow = Record<string, unknown>;

function toItem(row: LooseRow, opts: {
  titleKey?: string;
  codeKey?: string;
  statusKey?: string;
  dateKey?: string;
  updateKey?: string;
  metaKeys?: string[];
}): CompanyFileItem {
  const meta: Record<string, unknown> = {};
  for (const k of opts.metaKeys ?? []) {
    if (row[k] !== undefined && row[k] !== null) meta[k] = row[k];
  }
  return {
    id: row.id as string,
    title: (row[opts.titleKey ?? "title"] as string | undefined) ?? "(başlıksız)",
    code: opts.codeKey ? ((row[opts.codeKey] as string | null) ?? null) : null,
    status: opts.statusKey ? ((row[opts.statusKey] as string | null) ?? null) : null,
    createdAt: (row[opts.dateKey ?? "created_at"] as string) ?? new Date().toISOString(),
    updatedAt: opts.updateKey ? ((row[opts.updateKey] as string | null) ?? null) : null,
    meta,
  };
}

export async function collectCompanyFile(
  organizationId: string,
  companyWorkspaceId: string | null,
): Promise<CompanyFileCategory[]> {
  const client = createClient();
  if (!client) return [];
  const sb = client; // TypeScript narrowing'i nested function'a taşı

  type ChainBuilder = {
    eq: (k: string, v: string) => ChainBuilder;
    order: (k: string, o: { ascending: boolean }) => ChainBuilder;
    limit: (n: number) => Promise<{ data: LooseRow[] | null; error: unknown }>;
  };

  const runOrdered = async (
    table: string,
    columns: string,
    orderKey: string,
  ): Promise<LooseRow[]> => {
    let q = sb.from(table).select(columns).eq("organization_id", organizationId) as unknown as ChainBuilder;
    if (companyWorkspaceId) q = q.eq("company_workspace_id", companyWorkspaceId);
    const { data } = await q.order(orderKey, { ascending: false }).limit(500);
    return data ?? [];
  };

  const runQuery = (table: string, columns: string) => runOrdered(table, columns, "created_at");
  const runQueryOrdered = runOrdered;

  const [risks, findings, dofs, incidents, docs, runs, tasks] = await Promise.all([
    runQuery(
      "risk_assessments",
      "id, title, overall_risk_level, overall_score, status, created_at, updated_at",
    ),
    runQuery(
      "risk_assessment_findings",
      "id, title, category, severity, tracking_status, created_at",
    ),
    runQuery(
      "corrective_actions",
      "id, code, title, status, priority, deadline, created_at, updated_at",
    ),
    runQuery(
      "incidents",
      "id, incident_code, incident_type, incident_date, severity, status, created_at",
    ),
    runQueryOrdered(
      "editor_documents",
      "id, title, status, updated_at, created_at",
      "updated_at",
    ),
    runQueryOrdered(
      "inspection_runs",
      "id, code, site_label, status, readiness_score, started_at, completed_at",
      "started_at",
    ),
    runQuery(
      "isg_tasks",
      "id, title, status, start_date, end_date, category_id, created_at",
    ),
  ]);

  const build = (
    id: CompanyFileCategoryId,
    rows: LooseRow[],
    opts: Parameters<typeof toItem>[1],
  ): CompanyFileCategory => ({
    id,
    label: CATEGORY_LABELS[id].label,
    icon: CATEGORY_LABELS[id].icon,
    count: rows.length,
    items: rows.map((r) => toItem(r, opts)),
  });

  return [
    build("risk_assessments", risks, {
      statusKey: "status",
      metaKeys: ["overall_risk_level", "overall_score", "updated_at"],
    }),
    build("findings", findings, {
      statusKey: "tracking_status",
      metaKeys: ["category", "severity"],
    }),
    build("corrective_actions", dofs, {
      codeKey: "code",
      statusKey: "status",
      metaKeys: ["priority", "deadline", "updated_at"],
    }),
    build("incidents", incidents, {
      codeKey: "incident_code",
      statusKey: "status",
      metaKeys: ["incident_type", "incident_date", "severity"],
    }),
    build("documents", docs, {
      statusKey: "status",
      dateKey: "updated_at",
      metaKeys: ["created_at"],
    }),
    build("inspection_runs", runs, {
      codeKey: "code",
      statusKey: "status",
      dateKey: "started_at",
      metaKeys: ["site_label", "readiness_score", "completed_at"],
    }),
    build("isg_tasks", tasks, {
      statusKey: "status",
      metaKeys: ["start_date", "end_date"],
    }),
  ];
}
