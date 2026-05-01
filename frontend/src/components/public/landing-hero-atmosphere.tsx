"use client";

/**
 * Dekoratif hero katmanı — içerik okunabilirliği için düşük opaklık, premium derinlik.
 */
export function LandingHeroAtmosphere() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="landing-hero-orb landing-hero-orb--1" />
      <div className="landing-hero-orb landing-hero-orb--2" />
      <div className="landing-hero-orb landing-hero-orb--3" />
      <div className="landing-hero-mesh" />
      <div className="landing-hero-beam" />
      <div className="landing-hero-noise" />
    </div>
  );
}
