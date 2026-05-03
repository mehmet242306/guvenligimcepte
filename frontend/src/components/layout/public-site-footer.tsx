import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Brand } from "@/components/layout/brand";

const linkClass = "text-sm text-slate-500 transition-colors hover:text-slate-300";

/** İç sayfalarda (privacy, terms) alt şerit — ana footer ile aynı yasal linkler */
export async function PublicLegalBar() {
  const t = await getTranslations("landing");

  return (
    <div className="border-t border-border/70 bg-background">
      <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-4 px-4 py-6 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <nav aria-label={t("footerLegal")} className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/privacy" className="font-medium text-foreground/90 underline-offset-4 hover:underline">
            {t("footerPrivacy")}
          </Link>
          <Link href="/terms" className="font-medium text-foreground/90 underline-offset-4 hover:underline">
            {t("footerTerms")}
          </Link>
          <Link href="/cookie-policy" className="text-muted-foreground underline-offset-4 hover:underline">
            {t("footerCookie")}
          </Link>
          <Link href="/refund-policy" className="text-muted-foreground underline-offset-4 hover:underline">
            {t("footerRefund")}
          </Link>
        </nav>
        <p className="text-xs text-muted-foreground">© 2026 RiskNova</p>
      </div>
    </div>
  );
}

/** Ana sayfa ve genel pazarlama gövdesi için tam footer */
export async function PublicSiteFooter() {
  const t = await getTranslations("landing");
  const tc = await getTranslations("common");
  const tn = await getTranslations("nav");

  const footerLinkGroups = [
    {
      title: t("footerProduct"),
      links: [
        { label: tn("features"), href: "/#features" },
        { label: tn("howItWorks"), href: "/#how-it-works" },
        { label: tn("pricing"), href: "/pricing" },
        { label: tn("application"), href: "/uygulama" },
        { label: tn("osgbSolution"), href: "/cozumler/osgb" },
        { label: tn("enterpriseSolution"), href: "/cozumler/kurumsal" },
      ],
    },
    {
      title: t("footerLegal"),
      links: [
        { label: t("footerPrivacy"), href: "/privacy" },
        { label: t("footerTerms"), href: "/terms" },
        { label: t("footerCookie"), href: "/cookie-policy" },
        { label: t("footerRefund"), href: "/refund-policy" },
      ],
    },
    {
      title: t("footerCompany"),
      links: [
        { label: t("footerHome"), href: "/" },
        { label: tc("login"), href: "/login" },
        { label: tc("register"), href: "/register" },
      ],
    },
    {
      title: t("footerSupport"),
      links: [
        { label: t("footerHelp"), href: "/login" },
        { label: t("footerContact"), href: "mailto:support@getrisknova.com" },
      ],
    },
  ];

  return (
    <footer className="mt-auto border-t border-white/[0.06] bg-[var(--navy-deep)]">
      <div className="page-shell py-12 sm:py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.35fr)_repeat(4,minmax(0,1fr))]">
          <div className="sm:col-span-2 lg:col-span-1">
            <Brand href="/" inverted />
            <p className="mt-4 max-w-sm text-sm leading-7 text-slate-500">{t("footerBlurb")}</p>
          </div>

          {footerLinkGroups.map((group) => (
            <div key={group.title}>
              <h2 className="text-sm font-semibold text-white">{group.title}</h2>
              <ul className="mt-4 space-y-3">
                {group.links.map((link) => (
                  <li key={link.href + link.label}>
                    <Link
                      href={link.href}
                      className={linkClass}
                      {...(link.href.startsWith("mailto:") ? { rel: "noopener noreferrer" } : {})}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 border-t border-white/[0.06] pt-6 sm:mt-12">
          <div className="flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-center">
            <p className="text-center text-xs text-slate-600 sm:text-left">
              © 2026 RiskNova. {t("footerRights")}
            </p>
            <nav
              aria-label={t("footerLegal")}
              className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 sm:justify-end"
            >
              <Link href="/privacy" className={`${linkClass} font-medium text-slate-400 hover:text-white`}>
                {t("footerPrivacy")}
              </Link>
              <Link href="/terms" className={`${linkClass} font-medium text-slate-400 hover:text-white`}>
                {t("footerTerms")}
              </Link>
              <Link href="/cookie-policy" className={linkClass}>
                {t("footerCookie")}
              </Link>
              <Link href="/refund-policy" className={linkClass}>
                {t("footerRefund")}
              </Link>
            </nav>
          </div>
        </div>
      </div>
    </footer>
  );
}
