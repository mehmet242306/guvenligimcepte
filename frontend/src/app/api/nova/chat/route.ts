import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/supabase/api-auth";

const bodySchema = z.object({
  message: z.string().min(1).max(8000),
  language: z.string().min(2).max(10).optional().default("tr"),
  session_id: z.string().uuid().nullable().optional(),
  access_token: z.string().min(20).nullable().optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(8000),
      }),
    )
    .max(20)
    .optional()
    .default([]),
});

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

async function resolveAuthFromAccessToken(
  accessToken: string,
  supabaseServer: Awaited<ReturnType<typeof createClient>>,
) {
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

  const { data: profile } = await supabaseServer
    .from("user_profiles")
    .select("organization_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!profile?.organization_id) {
    return null;
  }

  return {
    userId: user.id,
    organizationId: profile.organization_id,
    accessToken,
  };
}

export async function POST(request: NextRequest) {
  try {
    const payload = bodySchema.parse(await request.json());
    const supabase = await createClient();

    let authContext =
      payload.access_token
        ? await resolveAuthFromAccessToken(payload.access_token, supabase)
        : null;

    if (!authContext) {
      const auth = await requireAuth(request);
      if (!auth.ok) return auth.response;

      const { data: refreshData, error: refreshError } =
        await supabase.auth.refreshSession();

      const accessToken =
        refreshData.session?.access_token ??
        (await supabase.auth.getSession()).data.session?.access_token ??
        null;

      if (!accessToken) {
        return NextResponse.json(
          {
            message:
              "Nova oturumunuzu dogrulayamadi. Lutfen cikis yapip tekrar girin ve yeniden deneyin.",
            detail: refreshError?.message ?? "access_token_missing",
          },
          { status: 401 },
        );
      }

      authContext = {
        userId: auth.userId,
        organizationId: auth.organizationId,
        accessToken,
      };
    }

    const response = await fetch(`${getSupabaseUrl()}/functions/v1/solution-chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authContext.accessToken}`,
        apikey: getPublishableKey(),
      },
      body: JSON.stringify({
        message: payload.message,
        organization_id: authContext.organizationId,
        ...(payload.session_id ? { session_id: payload.session_id } : {}),
        language: payload.language,
        history: payload.history,
      }),
      cache: "no-store",
    });

    const rawText = await response.text();

    try {
      const json = rawText ? JSON.parse(rawText) : {};
      return NextResponse.json(json, { status: response.status });
    } catch {
      return NextResponse.json(
        {
          message: rawText || "Nova servisi beklenmeyen bir yanit dondurdu.",
        },
        { status: response.status },
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bilinmeyen hata";
    return NextResponse.json({ message }, { status: 500 });
  }
}
