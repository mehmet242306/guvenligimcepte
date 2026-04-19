import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/supabase/api-auth";
import {
  enforceRateLimit,
  logSecurityEvent,
  sanitizePlainText,
  validateUploadedFile,
} from "@/lib/security/server";

export const maxDuration = 60;

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);

function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Supabase service role yapilandirmasi eksik.");
  }

  return createSupabaseClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function extractText(buffer: ArrayBuffer, mimeType: string) {
  const decoder = new TextDecoder("utf-8", { fatal: false });
  if (mimeType === "text/plain") {
    return decoder.decode(buffer).trim();
  }

  const raw = decoder.decode(new Uint8Array(buffer));
  const textParts = raw.match(/>([^<]+)</g);
  if (textParts && textParts.length > 10) {
    return textParts
      .map((part) => part.slice(1, -1).trim())
      .filter((part) => part.length > 1)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  }

  return raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

async function ensureLegalDocumentVersion(
  supabase: ReturnType<typeof createServiceClient>,
  input: {
    documentId: string;
    versionLabel: string;
    officialUrl: string | null;
    fullText: string | null;
    sourceHash: string;
  },
) {
  const effectiveFrom = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("legal_document_versions")
    .insert({
      document_id: input.documentId,
      version_label: input.versionLabel,
      effective_from: effectiveFrom,
      publication_date: effectiveFrom,
      source_hash: input.sourceHash,
      raw_text: input.fullText,
      normalized_text: input.fullText,
      official_url: input.officialUrl,
      source_type: "tenant_private_upload",
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Belge surumu olusturulamadi: ${error.message}`);
  }

  return data.id as string;
}

async function resolveActiveWorkspaceContext(
  supabase: ReturnType<typeof createServiceClient>,
  authUserId: string,
  organizationId: string,
) {
  const { data: profile, error } = await supabase
    .from("user_profiles")
    .select(`
      active_workspace_id,
      active_workspace:nova_workspaces!user_profiles_active_workspace_id_fkey (
        id,
        organization_id,
        country_code,
        name
      )
    `)
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (error && !error.message.includes("active_workspace_id")) {
    throw new Error(`Aktif workspace baglami okunamadi: ${error.message}`);
  }

  if (error?.message.includes("active_workspace_id")) {
    const { data: membership } = await supabase
      .from("nova_workspace_members")
      .select(
        `
        workspace:nova_workspaces!inner (
          id,
          organization_id,
          country_code,
          name
        )
      `,
      )
      .eq("user_id", authUserId)
      .order("is_primary", { ascending: false })
      .order("joined_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    const rawWorkspace = membership?.workspace as
      | { id: string; organization_id: string; country_code: string; name: string }
      | { id: string; organization_id: string; country_code: string; name: string }[]
      | null
      | undefined;
    const workspace = Array.isArray(rawWorkspace) ? rawWorkspace[0] : rawWorkspace;

    if (workspace?.id && workspace.organization_id === organizationId) {
      return {
        workspaceId: workspace.id,
        jurisdictionCode: workspace.country_code,
        workspaceName: workspace.name,
      };
    }

    return {
      workspaceId: null,
      jurisdictionCode: "TR",
      workspaceName: null,
    };
  }

  const rawWorkspace = profile?.active_workspace as
    | { id: string; organization_id: string; country_code: string; name: string }
    | { id: string; organization_id: string; country_code: string; name: string }[]
    | null
    | undefined;
  const workspace = Array.isArray(rawWorkspace) ? rawWorkspace[0] : rawWorkspace;

  if (workspace?.id && workspace.organization_id === organizationId) {
    return {
      workspaceId: workspace.id,
      jurisdictionCode: workspace.country_code,
      workspaceName: workspace.name,
    };
  }

  return {
    workspaceId: null,
    jurisdictionCode: "TR",
    workspaceName: null,
  };
}

async function deleteStorageObjectIfPresent(
  supabase: ReturnType<typeof createServiceClient>,
  publicUrl: string | null | undefined,
) {
  if (!publicUrl) return;

  const marker = "/storage/v1/object/public/slide-media/";
  const index = publicUrl.indexOf(marker);
  if (index === -1) return;

  const storagePath = publicUrl.slice(index + marker.length);
  if (!storagePath) return;

  await supabase.storage.from("slide-media").remove([storagePath]);
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const supabase = createServiceClient();
    const workspaceContext = await resolveActiveWorkspaceContext(
      supabase,
      auth.userId,
      auth.organizationId,
    );

    const scope = request.nextUrl.searchParams.get("scope") || "tenant_private";

    let query = supabase
      .from("legal_documents")
      .select("id, title, doc_type, doc_number, source_url, updated_at, jurisdiction_code, corpus_scope, workspace_id")
      .eq("organization_id", auth.organizationId)
      .order("updated_at", { ascending: false })
      .limit(100);

    if (scope === "tenant_private") {
      query = query.eq("corpus_scope", "tenant_private");
      if (workspaceContext.workspaceId) {
        query = query.eq("workspace_id", workspaceContext.workspaceId);
      }
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      workspaceId: workspaceContext.workspaceId,
      workspaceName: workspaceContext.workspaceName,
      jurisdictionCode: workspaceContext.jurisdictionCode,
      items: data ?? [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bilinmeyen hata";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const docId = request.nextUrl.searchParams.get("id");
    if (!docId) {
      return NextResponse.json({ error: "Belge kimligi gerekli." }, { status: 400 });
    }

    const supabase = createServiceClient();
    const workspaceContext = await resolveActiveWorkspaceContext(
      supabase,
      auth.userId,
      auth.organizationId,
    );

    const { data: document, error: fetchError } = await supabase
      .from("legal_documents")
      .select("id, source_url, workspace_id, corpus_scope, organization_id")
      .eq("id", docId)
      .eq("organization_id", auth.organizationId)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!document) {
      return NextResponse.json({ error: "Belge bulunamadi." }, { status: 404 });
    }

    if (document.corpus_scope !== "tenant_private") {
      return NextResponse.json({ error: "Resmi mevzuat kaydi silinemez." }, { status: 403 });
    }

    if (workspaceContext.workspaceId && document.workspace_id !== workspaceContext.workspaceId) {
      return NextResponse.json({ error: "Bu belge aktif workspace'e ait degil." }, { status: 403 });
    }

    await deleteStorageObjectIfPresent(supabase, document.source_url);

    const { error: deleteError } = await supabase
      .from("legal_documents")
      .delete()
      .eq("id", docId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: docId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bilinmeyen hata";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const rateLimitResponse = await enforceRateLimit(request, {
      userId: auth.userId,
      organizationId: auth.organizationId,
      endpoint: "/api/legal-library-upload",
      scope: "api",
      limit: 60,
      windowSeconds: 60,
      metadata: { feature: "legal_library_upload" },
    });
    if (rateLimitResponse) return rateLimitResponse;

    const formData = await request.formData();
    const title = sanitizePlainText(String(formData.get("title") || ""), 250);
    const docType = sanitizePlainText(String(formData.get("docType") || ""), 40);
    const docNumber = sanitizePlainText(String(formData.get("docNumber") || ""), 80);
    const file = formData.get("file") as File | null;

    if (!title) {
      return NextResponse.json({ error: "Baslik gerekli." }, { status: 400 });
    }

    if (!["law", "regulation", "communique", "guide", "announcement", "circular"].includes(docType)) {
      return NextResponse.json({ error: "Gecersiz belge tipi." }, { status: 400 });
    }

    if (!file) {
      return NextResponse.json({ error: "Dosya gerekli." }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: `Desteklenmeyen dosya tipi: ${file.type}` }, { status: 400 });
    }

    const fileError = await validateUploadedFile(file, {
      allowedMimeTypes: [...ALLOWED_TYPES],
      maxBytes: 20 * 1024 * 1024,
      allowedExtensions: [".pdf", ".doc", ".docx", ".txt"],
    });
    if (fileError) {
      return NextResponse.json({ error: fileError }, { status: 400 });
    }

    const supabase = createServiceClient();
    const workspaceContext = await resolveActiveWorkspaceContext(
      supabase,
      auth.userId,
      auth.organizationId,
    );
    const safeName = file.name.replace(/[^a-z0-9.\-_]/gi, "_");
    const storagePath = `legal-library/${auth.organizationId}/${auth.userId}/${Date.now()}_${safeName}`;
    const buffer = await file.arrayBuffer();

    const { error: uploadError } = await supabase.storage.from("slide-media").upload(storagePath, buffer, {
      contentType: file.type,
      upsert: false,
    });

    if (uploadError) {
      return NextResponse.json({ error: `Dosya yuklenemedi: ${uploadError.message}` }, { status: 500 });
    }

    const { data: publicUrlData } = supabase.storage.from("slide-media").getPublicUrl(storagePath);
    const sourceUrl = publicUrlData.publicUrl;
    const fullText = extractText(buffer, file.type).slice(0, 40000) || null;
    const sourceHash = `${auth.organizationId}:${auth.userId}:${storagePath}`;

    const { data: asset } = await supabase
      .from("slide_media_assets")
      .insert({
        organization_id: auth.organizationId,
        uploaded_by: auth.userId,
        asset_type: "document",
        file_name: file.name,
        storage_path: storagePath,
        public_url: sourceUrl,
        file_size_bytes: file.size,
        mime_type: file.type,
        category: "legal-library",
      })
      .select("id")
      .maybeSingle();

    const { data: legalDoc, error: legalInsertError } = await supabase
      .from("legal_documents")
      .insert({
        organization_id: auth.organizationId,
        workspace_id: workspaceContext.workspaceId,
        jurisdiction_code: workspaceContext.jurisdictionCode,
        corpus_scope: "tenant_private",
        doc_type: docType,
        doc_number: docNumber || null,
        title,
        source_url: sourceUrl,
        full_text: fullText,
        source_hash: sourceHash,
        last_updated_at: new Date().toISOString(),
      })
      .select("id, title, doc_type, source_url")
      .single();

    if (legalInsertError) {
      return NextResponse.json({ error: `Kayit olusturulamadi: ${legalInsertError.message}` }, { status: 500 });
    }

    const versionId = await ensureLegalDocumentVersion(supabase, {
      documentId: legalDoc.id,
      versionLabel: docNumber || title,
      officialUrl: sourceUrl,
      fullText,
      sourceHash,
    });

    if (fullText && fullText.length > 80) {
      await supabase.from("legal_chunks").insert({
        document_id: legalDoc.id,
        version_id: versionId,
        chunk_index: 0,
        article_title: title,
        content: fullText.slice(0, 12000),
        metadata: {
          source: "manual_upload",
          uploaded_by: auth.userId,
          organization_id: auth.organizationId,
          workspace_id: workspaceContext.workspaceId,
          jurisdiction_code: workspaceContext.jurisdictionCode,
          corpus_scope: "tenant_private",
          workspace_name: workspaceContext.workspaceName,
          asset_id: asset?.id || null,
        },
      });
    }

    return NextResponse.json({
      id: legalDoc.id,
      title: legalDoc.title,
      docType: legalDoc.doc_type,
      sourceUrl: legalDoc.source_url,
      corpusScope: "tenant_private",
      jurisdictionCode: workspaceContext.jurisdictionCode,
      workspaceId: workspaceContext.workspaceId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bilinmeyen hata";
    await logSecurityEvent(request, "api.legal_upload.failed", {
      severity: "warning",
      userId: auth.userId,
      organizationId: auth.organizationId,
      details: { message: message.slice(0, 300) },
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
