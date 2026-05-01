"use client";

import { useEffect, type ReactNode } from "react";

/**
 * [data-landing-reveal] öğelerine görünür olunca landing-reveal-is-visible ekler.
 * Scroll-driven CSS animasyonunun desteklenmediği ortamlarda gerçek giriş animasyonu sağlar.
 */
export function LandingRevealProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced) {
      document.querySelectorAll("[data-landing-reveal]").forEach((el) => {
        el.classList.add("landing-reveal-is-visible");
      });
      return;
    }

    const nodes = Array.from(document.querySelectorAll("[data-landing-reveal]"));

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("landing-reveal-is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { root: null, rootMargin: "0px 0px -10% 0px", threshold: 0.06 },
    );

    nodes.forEach((n) => io.observe(n));

    return () => {
      io.disconnect();
    };
  }, []);

  return <>{children}</>;
}
