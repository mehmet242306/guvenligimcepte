"use client";

/**
 * İSG görünürlüğü: uyarı şeridi hissi + güven kalkanı — düşük kontrast, animasyonlu.
 */
export function LandingIsgHeroDecorations() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* Çapraz uyarı şeritleri (iş güvenliği kodlarıyla uyumlu düşük yoğunluk) */}
      <div className="landing-isg-hazard-film" />

      {/* Merkez üst — yumuşak nabız halkaları kalkan çevresinde */}
      <div className="landing-isg-shield-anchor">
        <svg
          className="landing-isg-shield-ring"
          viewBox="0 0 120 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            cx="60"
            cy="60"
            r="52"
            stroke="url(#landingGoldStroke)"
            strokeWidth="1.2"
            opacity="0.35"
          />
          <circle
            cx="60"
            cy="60"
            r="44"
            stroke="url(#landingGoldStroke)"
            strokeWidth="1"
            opacity="0.22"
            className="landing-isg-shield-ring-inner"
          />
          <path
            d="M60 22 L88 36 V58 Q88 82 60 98 Q32 82 32 58 V36 Z"
            stroke="url(#landingGoldStroke)"
            strokeWidth="1.5"
            fill="none"
            opacity="0.28"
            className="landing-isg-shield-path"
          />
          <defs>
            <linearGradient id="landingGoldStroke" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FBBF24" />
              <stop offset="50%" stopColor="#D4A017" />
              <stop offset="100%" stopColor="#FDE68A" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}
