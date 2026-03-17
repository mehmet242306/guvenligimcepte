import { NextResponse } from "next/server";

function safeHost(raw: string | undefined) {
  if (!raw) return null;

  try {
    return new URL(raw).host;
  } catch {
    return "INVALID_URL";
  }
}

export async function GET() {
  const checks = {
    NEXT_PUBLIC_SUPABASE_URL: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    ),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ),
    NEXT_PUBLIC_APP_URL: Boolean(process.env.NEXT_PUBLIC_APP_URL),
    BACKEND_API_URL: Boolean(process.env.BACKEND_API_URL),
  };

  return NextResponse.json({
    ok:
      checks.NEXT_PUBLIC_SUPABASE_URL &&
      (checks.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
        checks.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
    checks,
    derived: {
      appUrl: process.env.NEXT_PUBLIC_APP_URL ?? null,
      supabaseHost: safeHost(process.env.NEXT_PUBLIC_SUPABASE_URL),
    },
  });
}
