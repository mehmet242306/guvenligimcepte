import { createClient } from "./client";
import { logKvkkApiError } from "./kvkk-api-utils";

export type ConsentType =
  | "aydinlatma"
  | "acik_riza"
  | "kvkk"
  | "yurt_disi_aktarim"
  | "pazarlama";

export type ConsentScopeContext =
  | "platform"
  | "photo_upload"
  | "live_scan"
  | "international_transfer"
  | "marketing";

export type ConsentRequirementRow = {
  document_id: string;
  consent_type: ConsentType;
  title: string;
  description: string | null;
  scope_context: ConsentScopeContext;
  is_required: boolean;
  version_id: string;
  version: string;
  version_summary: string | null;
  content_markdown: string;
  granted_at: string | null;
  revoked_at: string | null;
  is_granted: boolean;
};

export type ConsentDocumentRow = {
  id: string;
  organization_id: string | null;
  consent_type: ConsentType;
  title: string;
  description: string | null;
  scope_context: ConsentScopeContext;
  is_required: boolean;
  is_active: boolean;
  display_order: number;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  versions?: ConsentDocumentVersionRow[];
};

export type ConsentDocumentVersionRow = {
  id: string;
  document_id: string;
  version: string;
  summary: string | null;
  content_markdown: string;
  is_published: boolean;
  published_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type DataProcessingInventoryRow = {
  id: string;
  organization_id: string | null;
  title: string;
  data_category: string;
  processing_purpose: string;
  legal_basis: string;
  data_subject_categories: string[];
  retention_summary: string;
  access_roles: string[];
  international_transfer: boolean;
  transfer_regions: string[];
  notes: string | null;
  is_active: boolean;
  display_order: number;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export async function listActiveConsentRequirements(
  scopeContext: ConsentScopeContext = "platform",
  companyWorkspaceId?: string | null,
): Promise<ConsentRequirementRow[]> {
  const supabase = createClient();
  if (!supabase) return [];

  const { data, error } = await supabase.rpc("list_active_consent_requirements", {
    p_scope_context: scopeContext,
    p_company_workspace_id: companyWorkspaceId ?? null,
  });

  if (error) {
    logKvkkApiError("[consent-api] listActiveConsentRequirements:", error);
    return [];
  }

  return (data ?? []) as ConsentRequirementRow[];
}

export async function recordUserConsent(input: {
  versionId: string;
  companyWorkspaceId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  sourceContext?: ConsentScopeContext;
}): Promise<boolean> {
  const supabase = createClient();
  if (!supabase) return false;

  const { error } = await supabase.rpc("record_user_consent", {
    p_version_id: input.versionId,
    p_company_workspace_id: input.companyWorkspaceId ?? null,
    p_ip_address: input.ipAddress ?? null,
    p_user_agent: input.userAgent ?? null,
    p_source_context: input.sourceContext ?? "platform",
  });

  if (error) {
    logKvkkApiError("[consent-api] recordUserConsent:", error);
    return false;
  }

  return true;
}

export async function fetchConsentDocuments(): Promise<ConsentDocumentRow[]> {
  const supabase = createClient();
  if (!supabase) return [];

  const [{ data: documents, error: documentsError }, { data: versions, error: versionsError }] =
    await Promise.all([
      supabase
        .from("consent_documents")
        .select("*")
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false }),
      supabase
        .from("consent_document_versions")
        .select("*")
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false }),
    ]);

  if (documentsError || versionsError) {
    logKvkkApiError("[consent-api] fetchConsentDocuments:", documentsError ?? versionsError);
    return [];
  }

  const versionsByDocument = new Map<string, ConsentDocumentVersionRow[]>();
  for (const row of (versions ?? []) as ConsentDocumentVersionRow[]) {
    const current = versionsByDocument.get(row.document_id) ?? [];
    current.push(row);
    versionsByDocument.set(row.document_id, current);
  }

  return ((documents ?? []) as ConsentDocumentRow[]).map((document) => ({
    ...document,
    versions: (versionsByDocument.get(document.id) ?? []).sort((a, b) => {
      if (a.is_published !== b.is_published) return a.is_published ? -1 : 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }),
  }));
}

export async function saveConsentDocument(
  input: Partial<ConsentDocumentRow> & Pick<ConsentDocumentRow, "consent_type" | "title" | "scope_context">,
): Promise<ConsentDocumentRow | null> {
  const supabase = createClient();
  if (!supabase) return null;

  const payload = {
    consent_type: input.consent_type,
    title: input.title,
    description: input.description ?? null,
    scope_context: input.scope_context,
    is_required: input.is_required ?? true,
    is_active: input.is_active ?? true,
    display_order: input.display_order ?? 100,
  };

  const query = input.id
    ? supabase.from("consent_documents").update(payload).eq("id", input.id)
    : supabase.from("consent_documents").insert(payload);

  const { data, error } = await query.select().single();

  if (error) {
    logKvkkApiError("[consent-api] saveConsentDocument:", error);
    return null;
  }

  return data as ConsentDocumentRow;
}

export async function createConsentDocumentVersion(input: {
  documentId: string;
  version: string;
  summary?: string | null;
  contentMarkdown: string;
}): Promise<ConsentDocumentVersionRow | null> {
  const supabase = createClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("consent_document_versions")
    .insert({
      document_id: input.documentId,
      version: input.version,
      summary: input.summary ?? null,
      content_markdown: input.contentMarkdown,
      is_published: false,
    })
    .select()
    .single();

  if (error) {
    logKvkkApiError("[consent-api] createConsentDocumentVersion:", error);
    return null;
  }

  return data as ConsentDocumentVersionRow;
}

export async function publishConsentDocumentVersion(versionId: string): Promise<boolean> {
  const supabase = createClient();
  if (!supabase) return false;

  const { error } = await supabase.rpc("publish_consent_document_version", {
    p_version_id: versionId,
  });

  if (error) {
    logKvkkApiError("[consent-api] publishConsentDocumentVersion:", error);
    return false;
  }

  return true;
}

export async function fetchDataProcessingInventory(): Promise<DataProcessingInventoryRow[]> {
  const supabase = createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("data_processing_inventory")
    .select("*")
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    logKvkkApiError("[consent-api] fetchDataProcessingInventory:", error);
    return [];
  }

  return (data ?? []) as DataProcessingInventoryRow[];
}

export async function saveDataProcessingInventory(
  input: Partial<DataProcessingInventoryRow> &
    Pick<
      DataProcessingInventoryRow,
      "title" | "data_category" | "processing_purpose" | "legal_basis" | "retention_summary"
    >,
): Promise<DataProcessingInventoryRow | null> {
  const supabase = createClient();
  if (!supabase) return null;

  const payload = {
    title: input.title,
    data_category: input.data_category,
    processing_purpose: input.processing_purpose,
    legal_basis: input.legal_basis,
    data_subject_categories: input.data_subject_categories ?? [],
    retention_summary: input.retention_summary,
    access_roles: input.access_roles ?? [],
    international_transfer: input.international_transfer ?? false,
    transfer_regions: input.transfer_regions ?? [],
    notes: input.notes ?? null,
    is_active: input.is_active ?? true,
    display_order: input.display_order ?? 100,
  };

  const query = input.id
    ? supabase.from("data_processing_inventory").update(payload).eq("id", input.id)
    : supabase.from("data_processing_inventory").insert(payload);

  const { data, error } = await query.select().single();

  if (error) {
    logKvkkApiError("[consent-api] saveDataProcessingInventory:", error);
    return null;
  }

  return data as DataProcessingInventoryRow;
}
