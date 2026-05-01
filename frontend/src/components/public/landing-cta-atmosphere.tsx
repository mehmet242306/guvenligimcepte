"use client";

/** Alt CTA şeridi için hafif aurora — hero ile aynı dil, daha sakin. */
export function LandingCtaAtmosphere() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="landing-cta-aurora" />
      <div className="landing-cta-ring" />
    </div>
  );
}
