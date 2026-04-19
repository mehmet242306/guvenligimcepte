import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/supabase/api-auth";
import { enforceRateLimit, parseJsonBody, resolveAiDailyLimit } from "@/lib/security/server";
import {
  normalizeNovaAgentResponse,
  novaChatRequestSchema,
  type NovaAgentResponse,
} from "@/lib/nova/agent";

function getSupabaseUrl() {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!value) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL tanimli degil.");
  }
  return value.replace(/\/+$/, "");
}

function getPublishableKey() {
  const value =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    "";

  if (!value) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY veya NEXT_PUBLIC_SUPABASE_ANON_KEY tanimli degil.",
    );
  }

  return value;
}

function resolveWorkspaceCountryCode(
  rawWorkspace:
    | { country_code?: string | null }
    | { country_code?: string | null }[]
    | null
    | undefined,
) {
  const workspace = Array.isArray(rawWorkspace) ? rawWorkspace[0] : rawWorkspace;
  return workspace?.country_code ?? "TR";
}

async function resolveWorkspaceFallback(
  client: SupabaseClient,
  userId: string,
) {
  const { data } = await client
    .from("nova_workspace_members")
    .select(
      `
      workspace:nova_workspaces!inner (
        id,
        country_code
      )
    `,
    )
    .eq("user_id", userId)
    .order("is_primary", { ascending: false })
    .order("joined_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const row = data as
    | {
        workspace?:
          | { id?: string | null; country_code?: string | null }
          | { id?: string | null; country_code?: string | null }[]
          | null;
      }
    | null;

  const rawWorkspace = row?.workspace as
    | { id?: string | null; country_code?: string | null }
    | { id?: string | null; country_code?: string | null }[]
    | null
    | undefined;
  const workspace = Array.isArray(rawWorkspace) ? rawWorkspace[0] : rawWorkspace;

  return {
    workspaceId: workspace?.id ?? null,
    jurisdictionCode: workspace?.country_code ?? "TR",
  };
}

async function resolveAuthFromAccessToken(accessToken: string) {
  const tokenClient = createSupabaseClient(getSupabaseUrl(), getPublishableKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });

  const {
    data: { user },
    error,
  } = await tokenClient.auth.getUser(accessToken);

  if (error || !user) {
    return null;
  }

  // tokenClient RLS passes (auth.uid() === user.id); supabaseServer cookie
  // yoksa RLS profile'i gizliyor ve Nova 401 donuyordu.
  const { data: profile, error: profileError } = await tokenClient
    .from("user_profiles")
    .select(`
      organization_id,
      active_workspace_id,
      active_workspace:nova_workspaces!user_profiles_active_workspace_id_fkey (
        country_code
      )
    `)
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (profileError && !profileError.message.includes("active_workspace_id")) {
    return null;
  }

  if (profileError?.message.includes("active_workspace_id")) {
    const { data: orgProfile } = await tokenClient
      .from("user_profiles")
      .select("organization_id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (!orgProfile?.organization_id) {
      return null;
    }

    const fallback = await resolveWorkspaceFallback(tokenClient, user.id);
    return {
      userId: user.id,
      organizationId: orgProfile.organization_id,
      workspaceId: fallback.workspaceId,
      jurisdictionCode: fallback.jurisdictionCode,
      accessToken,
    };
  }

  if (!profile?.organization_id) {
    return null;
  }

  return {
    userId: user.id,
    organizationId: profile.organization_id,
    workspaceId: profile.active_workspace_id ?? null,
    jurisdictionCode: resolveWorkspaceCountryCode(
      profile.active_workspace as
        | { country_code?: string | null }
        | { country_code?: string | null }[]
        | null
        | undefined,
    ),
    accessToken,
  };
}

async function hasAiUsePermission(accessToken: string) {
  const tokenClient = createSupabaseClient(getSupabaseUrl(), getPublishableKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });

  const { data, error } = await tokenClient.rpc("user_has_permission", {
    p_permission_code: "ai.use",
  });

  if (error) {
    return false;
  }

  return data === true;
}

export async function POST(request: NextRequest) {
  try {
    const parsed = await parseJsonBody(request, novaChatRequestSchema);
    if (!parsed.ok) return parsed.response;

    const payload = parsed.data;
    const supabase = await createClient();
    const internalServiceSecret =
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || null;

    let authContext =
      payload.access_token
        ? await resolveAuthFromAccessToken(payload.access_token)
        : null;

    let useInternalNovaAuth = false;

    if (!authContext) {
      const auth = await requirePermission(request, "ai.use");
      if (!auth.ok) return auth.response;

      const { data: refreshData, error: refreshError } =
        await supabase.auth.refreshSession();

      const accessToken =
        refreshData.session?.access_token ??
        (await supabase.auth.getSession()).data.session?.access_token ??
        null;

      authContext = {
        userId: auth.userId,
        organizationId: auth.organizationId,
        workspaceId: null,
        jurisdictionCode: "TR",
        accessToken: accessToken ?? "",
      };

      const { data: profile } = await supabase
        .from("user_profiles")
        .select(`
          active_workspace_id,
          active_workspace:nova_workspaces!user_profiles_active_workspace_id_fkey (
            country_code
          )
        `)
        .eq("auth_user_id", auth.userId)
        .maybeSingle();
      if (profile?.active_workspace_id !== undefined) {
        authContext.workspaceId = profile?.active_workspace_id ?? null;
        authContext.jurisdictionCode = resolveWorkspaceCountryCode(
          profile?.active_workspace as
            | { country_code?: string | null }
            | { country_code?: string | null }[]
            | null
            | undefined,
        );
      } else {
        const fallbackClient = createSupabaseClient(getSupabaseUrl(), getPublishableKey(), {
          auth: { persistSession: false, autoRefreshToken: false },
          global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
        });
        const fallback = await resolveWorkspaceFallback(fallbackClient, auth.userId);
        authContext.workspaceId = fallback.workspaceId;
        authContext.jurisdictionCode = fallback.jurisdictionCode;
      }

      useInternalNovaAuth = !accessToken;

      if (useInternalNovaAuth && !internalServiceSecret) {
        return NextResponse.json(
          {
            message:
              "Nova sunucu dogrulama katmani su an hazir degil. Lutfen daha sonra tekrar deneyin.",
            detail: refreshError?.message ?? "internal_auth_secret_missing",
          },
          { status: 500 },
        );
      }
    } else if (!(await hasAiUsePermission(payload.access_token!))) {
      return NextResponse.json(
        { message: "Bu islem icin gerekli yetki bulunmuyor. (ERR_AUTH_006)" },
        { status: 403 },
      );
    }

    const plan = await resolveAiDailyLimit(authContext.userId);
    const rateLimitResponse = await enforceRateLimit(request, {
      userId: authContext.userId,
      organizationId: authContext.organizationId,
      endpoint: "/api/nova/chat",
      scope: "ai",
      limit: plan.dailyLimit,
      windowSeconds: 24 * 60 * 60,
      planKey: plan.planKey,
      metadata: {
        feature: "nova_agent",
        context_surface: payload.context_surface,
        mode: payload.mode,
      },
    });

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      apikey: getPublishableKey(),
    };

    if (authContext.accessToken) {
      headers.Authorization = `Bearer ${authContext.accessToken}`;
    }

    if (useInternalNovaAuth && internalServiceSecret) {
      headers["x-nova-internal-auth"] = internalServiceSecret;
      headers["x-nova-user-id"] = authContext.userId;
      headers["x-nova-organization-id"] = authContext.organizationId;
    }

    const response = await fetch(`${getSupabaseUrl()}/functions/v1/solution-chat`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        message: payload.message,
        organization_id: authContext.organizationId,
        ...(payload.workspace_id || authContext.workspaceId
          ? { workspace_id: payload.workspace_id ?? authContext.workspaceId }
          : {}),
        jurisdiction_code: payload.jurisdiction_code ?? authContext.jurisdictionCode ?? "TR",
        ...(payload.session_id ? { session_id: payload.session_id } : {}),
        language: payload.language,
        as_of_date: payload.as_of_date ?? new Date().toISOString().slice(0, 10),
        answer_mode: payload.answer_mode,
        mode: payload.mode,
        context_surface: payload.context_surface,
        confirmation_token: payload.confirmation_token ?? null,
        history: payload.history,
      }),
      cache: "no-store",
    });

    const rawText = await response.text();

    try {
      const json = rawText ? JSON.parse(rawText) : {};
      const normalized: NovaAgentResponse = normalizeNovaAgentResponse({
        ...json,
        telemetry: {
          ...(json?.telemetry && typeof json.telemetry === "object" ? json.telemetry : {}),
          gateway_mode: payload.mode,
          context_surface: payload.context_surface,
          plan_key: plan.planKey,
        },
      });
      return NextResponse.json(normalized, { status: response.status });
    } catch {
      return NextResponse.json(
        normalizeNovaAgentResponse({
          type: "safety_block",
          message: rawText || "Nova servisi beklenmeyen bir yanit dondurdu.",
          safety_block: {
            code: "invalid_nova_payload",
            title: "Nova yaniti okunamadi",
            message: rawText || "Nova servisi beklenmeyen bir yanit dondurdu.",
          },
        }),
        { status: response.status },
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bilinmeyen hata";
    return NextResponse.json({ message }, { status: 500 });
  }
}
