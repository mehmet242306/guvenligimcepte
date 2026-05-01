/**
 * Landing "Demo Talep Et", public demo-request API ve demo sonrası kopya tonları.
 * Prod'da geçici demo talebini kapatmak için: NEXT_PUBLIC_DEMO_PUBLIC_ENABLED=false
 * Tanımsız veya "true" → açık (yerel geliştirme ve geriye dönük uyum).
 */
export function isPublicDemoFeatureEnabled(): boolean {
  const raw = process.env.NEXT_PUBLIC_DEMO_PUBLIC_ENABLED;
  if (raw === undefined || raw === "") return true;
  const normalized = raw.trim().toLowerCase();
  return normalized !== "false" && normalized !== "0" && normalized !== "no";
}
