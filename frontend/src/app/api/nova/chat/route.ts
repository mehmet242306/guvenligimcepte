import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  message: z.string().min(1).max(8000),
  language: z.string().min(2).max(10).optional().default("tr"),
  session_id: z.string().uuid().nullable().optional(),
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

function getFunctionUrl() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL tanımlı değil.");
  }

  return `${supabaseUrl.replace(/\/+$/, "")}/functions/v1/solution-chat`;
}

export async function POST(request: NextRequest) {
  try {
    const payload = bodySchema.parse(await request.json());
    const supabase = await createClient();

    const [
      {
        data: { user },
      },
      {
        data: { session },
      },
    ] = await Promise.all([supabase.auth.getUser(), supabase.auth.getSession()]);

    const accessToken = session?.access_token ?? null;

    if (!user || !accessToken) {
      return NextResponse.json(
        { message: "Nova oturumunuzu doğrulayamadı. Lütfen çıkış yapıp tekrar girin ve yeniden deneyin." },
        { status: 401 },
      );
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("organization_id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    const organizationId = profile?.organization_id ?? null;

    if (!organizationId) {
      return NextResponse.json(
        { message: "Nova için şirket bağlamı bulunamadı. Lütfen profilinizi kontrol edin." },
        { status: 400 },
      );
    }

    const response = await fetch(getFunctionUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        message: payload.message,
        organization_id: organizationId,
        session_id: payload.session_id ?? null,
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
          message: rawText || "Nova servisi beklenmeyen bir yanıt döndürdü.",
        },
        { status: response.status },
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bilinmeyen hata";
    return NextResponse.json({ message }, { status: 500 });
  }
}
