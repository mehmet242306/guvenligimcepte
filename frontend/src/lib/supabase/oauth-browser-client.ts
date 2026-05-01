"use client";

import { createClient } from "@/lib/supabase/client";

/**
 * OAuth (Google) ile ayni tarayici singleton'ini kullanir.
 * Ayri bir supabase-js istemcisi PKCE code_verifier'i farkli depoda tutabiliyordu;
 * exchangeCodeForSession basarisiz oluyordu.
 */
export function createOAuthBrowserClient() {
  return createClient();
}
