import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { consumeEntitlement } from "@/lib/billing/entitlements";
import { requireAuth } from "@/lib/supabase/api-auth";

export const maxDuration = 60;

const exportSchema = z.object({
  title: z.string().min(1).max(200),
  json: z.unknown(),
  companyData: z.record(z.string(), z.unknown()).optional(),
  companyName: z.string().max(200).optional(),
});

function safeFilePart(value: string) {
  return value
    .replace(/[^a-zA-Z0-9\u00C0-\u024F\u0400-\u04FF\u0600-\u06FF\u4E00-\u9FFF\u3040-\u30FF\s_-]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 100);
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const quota = await consumeEntitlement(auth, "export");
  if (quota) return quota;

  const parsed = exportSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Gecersiz export istegi." }, { status: 400 });
  }

  try {
    const { generateDocxFromTipTapBlob } = await import("@/lib/document-generator");
    const blob = await generateDocxFromTipTapBlob(parsed.data as never);
    const fileName = `${safeFilePart(parsed.data.title)}.docx`;

    return new NextResponse(new Uint8Array(await blob.arrayBuffer()), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      },
    });
  } catch (error) {
    console.error("[documents.docx-export] failed:", error);
    return NextResponse.json({ error: "Export hazirlanamadi." }, { status: 500 });
  }
}
