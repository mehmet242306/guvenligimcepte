import Link from "next/link";
import { Brand } from "@/components/layout/brand";

const footerLinkGroups = [
  {
    title: "Ürün",
    links: [
      { label: "Özellikler", href: "/#features" },
      { label: "Nasıl Çalışır", href: "/#how-it-works" },
      { label: "Paketler", href: "/pricing" },
    ],
  },
  {
    title: "Yasal",
    links: [
      { label: "Gizlilik Politikası", href: "/privacy" },
      { label: "Kullanım Şartları", href: "/terms" },
      { label: "İade Politikası", href: "/refund-policy" },
    ],
  },
  {
    title: "Şirket",
    links: [
      { label: "Ana Sayfa", href: "/" },
      { label: "Giriş", href: "/login" },
      { label: "Kayıt Ol", href: "/register" },
    ],
  },
  {
    title: "Destek",
    links: [
      { label: "Yardım", href: "/login" },
      { label: "İletişim", href: "mailto:support@getrisknova.com" },
    ],
  },
];

const linkClass = "text-sm text-slate-500 transition-colors hover:text-slate-300";

/** İç sayfalarda (privacy, terms) alt şerit — ana footer ile aynı yasal linkler */
export function PublicLegalBar() {
  return (
    <div className="border-t border-border/70 bg-background">
      <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-4 px-4 py-6 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <nav aria-label="Yasal" className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/privacy" className="font-medium text-foreground/90 underline-offset-4 hover:underline">
            Gizlilik Politikası
          </Link>
          <Link href="/terms" className="font-medium text-foreground/90 underline-offset-4 hover:underline">
            Kullanım Şartları
          </Link>
          <Link href="/refund-policy" className="text-muted-foreground underline-offset-4 hover:underline">
            İade Politikası
          </Link>
        </nav>
        <p className="text-xs text-muted-foreground">© 2026 RiskNova</p>
      </div>
    </div>
  );
}

/** Ana sayfa ve genel pazarlama gövdesi için tam footer */
export function PublicSiteFooter() {
  return (
    <footer className="mt-auto border-t border-white/[0.06] bg-[var(--navy-deep)]">
      <div className="page-shell py-12 sm:py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.35fr)_repeat(4,minmax(0,1fr))]">
          <div className="sm:col-span-2 lg:col-span-1">
            <Brand href="/" inverted />
            <p className="mt-4 max-w-sm text-sm leading-7 text-slate-500">
              AI destekli İSG risk analizi ve operasyon platformu. Profesyonel, güvenilir, modern.
            </p>
          </div>

          {footerLinkGroups.map((group) => (
            <div key={group.title}>
              <h2 className="text-sm font-semibold text-white">{group.title}</h2>
              <ul className="mt-4 space-y-3">
                {group.links.map((link) => (
                  <li key={link.label}>
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
              © 2026 RiskNova. Tüm hakları saklıdır.
            </p>
            <nav
              aria-label="Yasal bağlantılar"
              className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 sm:justify-end"
            >
              <Link href="/privacy" className={`${linkClass} font-medium text-slate-400 hover:text-white`}>
                Gizlilik Politikası
              </Link>
              <Link href="/terms" className={`${linkClass} font-medium text-slate-400 hover:text-white`}>
                Kullanım Şartları
              </Link>
              <Link href="/refund-policy" className={linkClass}>
                İade Politikası
              </Link>
            </nav>
          </div>
        </div>
      </div>
    </footer>
  );
}
