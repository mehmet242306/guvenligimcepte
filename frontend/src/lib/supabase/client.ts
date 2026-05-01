import { createBrowserClient } from "@supabase/ssr";
import { processLock } from "@supabase/auth-js";
import type { SupabaseClient } from "@supabase/supabase-js";

// Singleton: birden fazla GoTrue örneği "Failed to fetch" hatasına yol açar
// (navigator.locks üzerinde yarışan _useSession çağrıları birbirini abort eder).
let browserClient: SupabaseClient | null = null;

export function createClient() {
  if (browserClient) return browserClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || null;
  const supabasePublishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    null;

  if (!supabaseUrl || !supabasePublishableKey) {
    return null;
  }

  // GoTrue lock stratejisi — default navigatorLock (navigator.locks API) yerine
  // processLock (in-memory Promise chain). Bu 3 pozitif sonuç doğuruyor:
  //  1. React Strict Mode'da effect çift fire edince orphan-lock "5000ms
  //     içinde bırakılmadı" uyarıları artık oluşmuyor.
  //  2. protected-shell + workspace-api + DemoSessionGuard + useIsAdmin
  //     + DemoSessionCleaner — hepsi getUser/getSession çağırıyordu, lock
  //     contention'ı sebebiyle "Lock broken by steal" AbortError'larla
  //     birbirini patlatıyorlardı. Process lock bu component'leri aynı
  //     promise zincirinde sıraya koyup tek tek serve ediyor.
  //  3. Dev'de ve production'da çok daha sessiz console.
  //
  // Tradeoff: tab'lar arası token refresh senkronu kaybolur (iki sekmede
  // aynı anda refresh olursa biri tamamlar, diğeri retry'da yakalar —
  // veri kaybı yok, sadece hafif fazladan call).
  browserClient = createBrowserClient(supabaseUrl, supabasePublishableKey, {
    auth: {
      lock: processLock,
      flowType: "pkce",
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  return browserClient;
}
