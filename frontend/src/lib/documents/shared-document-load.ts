/** Sunucu bileşenleri / Route Handler için — istemci bundle'a aktarılmamalı. */
import { createServiceClient } from "@/lib/security/server";

export type SharedSignaturePublic = {
  id: string;
  signer_name: string;
  signer_role: string;
  signed_at: string;
  certificate_hash: string | null;
};

export type SharedEditorDocumentPayload = {
  title: string;
  contentJson: Record<string, unknown>;
  companyName: string;
  status: string;
  createdAt: string;
  signatures: SharedSignaturePublic[];
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Paylaşım linki: yalnızca geçerli token + is_shared + silinmemiş kayıt.
 * Servis rolü ile okunur; org / imza içindeki hassas alanlar elenir.
 */
export async function loadEditorDocumentForShare(
  token: string,
): Promise<SharedEditorDocumentPayload | null> {
  if (!UUID_RE.test(token.trim())) return null;

  let supabase;
  try {
    supabase = createServiceClient();
  } catch {
    return null;
  }

  const { data: doc, error: docError } = await supabase
    .from("editor_documents")
    .select("id, title, content_json, status, created_at, organization_id")
    .eq("share_token", token.trim())
    .eq("is_shared", true)
    .is("deleted_at", null)
    .maybeSingle();

  if (docError || !doc) return null;

  const { data: sigRows } = await supabase
    .from("document_signatures")
    .select("id, signer_name, signer_role, signed_at, certificate_hash")
    .eq("document_id", doc.id)
    .order("signed_at", { ascending: true });

  const signatures: SharedSignaturePublic[] = (sigRows ?? []).map((row) => ({
    id: row.id as string,
    signer_name: row.signer_name as string,
    signer_role: row.signer_role as string,
    signed_at: row.signed_at as string,
    certificate_hash: (row.certificate_hash as string | null) ?? null,
  }));

  let companyName = "";
  if (doc.organization_id) {
    const { data: workspaces } = await supabase
      .from("company_workspaces")
      .select("company_identity_id, display_name")
      .eq("organization_id", doc.organization_id)
      .limit(1);

    if (workspaces && workspaces.length > 0) {
      const ws = workspaces[0];
      const { data: company } = await supabase
        .from("company_identities")
        .select("official_name")
        .eq("id", ws.company_identity_id)
        .maybeSingle();
      companyName = company?.official_name || ws.display_name || "";
    }
  }

  return {
    title: doc.title as string,
    contentJson: (doc.content_json ?? {}) as Record<string, unknown>,
    companyName,
    status: doc.status as string,
    createdAt: doc.created_at as string,
    signatures,
  };
}
