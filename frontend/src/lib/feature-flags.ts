/**
 * Eski public demo akışları için geriye dönük feature flag.
 * Varsayılan kapalıdır; artık kullanıcılar demo talep etmeden kayıt/giriş ile inceler.
 */
export function isPublicDemoFeatureEnabled(): boolean {
  const raw = process.env.NEXT_PUBLIC_DEMO_PUBLIC_ENABLED;
  if (raw === undefined || raw === "") return false;
  const normalized = raw.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}
