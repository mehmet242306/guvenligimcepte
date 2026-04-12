import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logErrorEvent } from "@/lib/admin-observability/server";
import { getClientIp, getUserAgent, parseJsonBody, sanitizePlainText } from "@/lib/security/server";

const bodySchema = z.object({
  level: z.enum(["info", "warn", "error", "critical"]).optional().default("error"),
  source: z.string().trim().min(2).max(120),
  message: z.string().trim().min(2).max(4000),
  stackTrace: z.string().max(12000).optional().nullable(),
  requestId: z.string().trim().max(160).optional().nullable(),
  endpoint: z.string().trim().max(400).optional().nullable(),
  context: z.record(z.string(), z.unknown()).optional().default({}),
});

export async function POST(request: NextRequest) {
  const parsed = await parseJsonBody(request, bodySchema);
  if (!parsed.ok) return parsed.response;

  await logErrorEvent({
    level: parsed.data.level,
    source: parsed.data.source,
    message: sanitizePlainText(parsed.data.message, 2000),
    stackTrace: parsed.data.stackTrace ? parsed.data.stackTrace.slice(0, 12000) : null,
    requestId: parsed.data.requestId ?? null,
    endpoint: parsed.data.endpoint ?? request.nextUrl.pathname,
    context: {
      ...(parsed.data.context ?? {}),
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
      reportedBy: "client_route",
    },
  });

  return NextResponse.json({ ok: true });
}
