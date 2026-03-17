import Link from "next/link";

export function PublicHeader() {
  return (
    <header className="relative z-50 border-b border-border bg-card/95 backdrop-blur">
      <div className="page-shell flex min-h-[72px] items-center justify-between gap-6 py-4">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-sm font-semibold text-primary-foreground shadow-[var(--shadow-soft)]">
            RN
          </div>

          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-foreground">
              RiskNova
            </p>
            <p className="truncate text-sm text-muted-foreground">
              AI destekli İSG karar destek platformu
            </p>
          </div>
        </Link>

        <div className="flex shrink-0 items-center gap-3">
          <nav className="hidden items-center gap-6 md:flex">
            <Link
              href="/"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Ana Sayfa
            </Link>
          </nav>

          <Link
            href="/login"
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-border bg-card px-5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          >
            Giriş Yap
          </Link>

          <Link
            href="/register"
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-primary px-5 text-sm font-medium text-primary-foreground shadow-[var(--shadow-soft)] transition-opacity hover:opacity-95"
          >
            Hesap Oluştur
          </Link>
        </div>
      </div>
    </header>
  );
}
