"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Brand } from "./brand";
import { LanguageSelector } from "./language-selector";
import { useI18n } from "@/lib/i18n";

const navLinkClass =
  "text-sm font-medium text-white/70 transition-colors hover:text-white";

const ghostButtonClass =
  "inline-flex h-10 shrink-0 items-center justify-center whitespace-nowrap rounded-xl border border-white/15 bg-white/[0.06] px-3 text-sm font-medium text-white transition-colors hover:bg-white/[0.10] sm:h-11 sm:rounded-2xl sm:px-5";

const accentFillClass =
  "inline-flex h-11 items-center justify-center rounded-2xl border border-amber-500/30 bg-[linear-gradient(135deg,#B8860B_0%,#D4A017_50%,#FBBF24_100%)] px-5 text-sm font-medium text-white shadow-[0_16px_34px_rgba(184,134,11,0.28)] transition-colors hover:brightness-[1.05]";

/** Masaüstü üst çubukta — mobilde drawer içinde `accentFillClass` kullanılır */
const accentButtonClass = `${accentFillClass} hidden lg:inline-flex`;

export function PublicHeader() {
  const { t } = useI18n();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  const mobileNavClass =
    "flex items-center rounded-xl px-3 py-3 text-base font-medium text-white/90 hover:bg-white/[0.06]";

  return (
    <header className="sticky top-0 z-30 w-full overflow-x-clip border-b border-white/[0.08] bg-[var(--navy-deep)]/95 backdrop-blur-xl">
      <div className="mx-auto w-full max-w-[1480px] px-3 py-3 sm:px-4 lg:px-8 lg:py-4 2xl:px-10">
        <div className="flex min-w-0 items-center justify-between gap-2 lg:gap-4">
          <Brand href="/" iconOnly inverted className="shrink-0" />

          <div className="flex min-w-0 max-w-[calc(100vw-72px)] shrink-0 items-center justify-end gap-1.5 overflow-hidden sm:gap-2 lg:max-w-none lg:gap-3">
            <nav className="hidden items-center gap-6 lg:flex" aria-label="Ana gezinme">
              <Link href="/#features" className={navLinkClass}>
                {t("nav.features")}
              </Link>
              <Link href="/#how-it-works" className={navLinkClass}>
                {t("nav.howItWorks")}
              </Link>
              <Link href="/pricing" className={navLinkClass}>
                {t("nav.pricing")}
              </Link>
            </nav>

            <LanguageSelector variant="dark" />

            <button
              type="button"
              className="inline-flex h-10 items-center justify-center rounded-xl border border-white/15 bg-white/[0.06] px-3 text-white lg:hidden"
              aria-expanded={mobileOpen}
              aria-controls="public-mobile-nav"
              aria-label={mobileOpen ? "Menüyü kapat" : "Menüyü aç"}
              onClick={() => setMobileOpen((v) => !v)}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            <Link href="/login" className={`${ghostButtonClass} hidden lg:inline-flex`}>
              {t("common.login")}
            </Link>

            <Link href="/register" className={accentButtonClass}>
              {t("common.register")}
            </Link>
          </div>
        </div>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-[100] lg:hidden" id="public-mobile-nav">
          <button
            type="button"
            className="absolute inset-0 bg-black/55 backdrop-blur-sm"
            aria-label="Menüyü kapat"
            onClick={() => setMobileOpen(false)}
          />
          <nav
            className="absolute right-0 top-0 flex h-full w-[min(100%,320px)] flex-col border-l border-white/10 bg-[var(--navy-deep)] shadow-2xl"
            aria-label="Mobil ana gezinme"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <span className="text-sm font-semibold text-white">Menü</span>
              <button
                type="button"
                className="rounded-lg p-2 text-white/80 hover:bg-white/10"
                aria-label="Kapat"
                onClick={() => setMobileOpen(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex flex-col gap-1 overflow-y-auto px-3 py-4">
              <Link href="/#features" className={mobileNavClass} onClick={() => setMobileOpen(false)}>
                {t("nav.features")}
              </Link>
              <Link href="/#how-it-works" className={mobileNavClass} onClick={() => setMobileOpen(false)}>
                {t("nav.howItWorks")}
              </Link>
              <Link href="/pricing" className={mobileNavClass} onClick={() => setMobileOpen(false)}>
                {t("nav.pricing")}
              </Link>
              <Link href="/cozumler/osgb" className={mobileNavClass} onClick={() => setMobileOpen(false)}>
                OSGB çözümü
              </Link>
              <Link href="/cozumler/kurumsal" className={mobileNavClass} onClick={() => setMobileOpen(false)}>
                Kurumsal çözüm
              </Link>
            </div>
            <div className="mt-auto flex flex-col gap-2 border-t border-white/10 p-4">
              <Link
                href="/login"
                className={ghostButtonClass}
                onClick={() => setMobileOpen(false)}
              >
                {t("common.login")}
              </Link>
              <Link
                href="/register"
                className={`${accentFillClass} w-full justify-center`}
                onClick={() => setMobileOpen(false)}
              >
                {t("common.register")}
              </Link>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
