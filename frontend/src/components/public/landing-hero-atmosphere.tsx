"use client";

/**
 * Hero arka planı — sade ızgara + düşük gürültü; hareketli orb/kalkan ile çakışmayı önler.
 */
export function LandingHeroAtmosphere() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="landing-hero-mesh landing-hero-mesh--calm" />
      <div className="landing-hero-noise landing-hero-noise--calm" />
    </div>
  );
}
