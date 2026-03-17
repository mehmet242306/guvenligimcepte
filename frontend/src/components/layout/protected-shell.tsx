"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brand } from "./brand";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type ProtectedShellProps = {
  children: ReactNode;
};

const navigation = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/companies", label: "Firmalar / Kurumlar" },
  { href: "/risk-analysis", label: "Risk Analizi" },
  { href: "/score-history", label: "Skor Geçmişi" },
  { href: "/reports", label: "Raporlar" },
  { href: "/profile", label: "Profil" },
  { href: "/settings", label: "Ayarlar" },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }

  return pathname.startsWith(href);
}

export function ProtectedShell({ children }: ProtectedShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.08),transparent_26%),linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)]">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-[1680px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Brand href="/dashboard" compact />

          <div className="hidden items-center gap-3 md:flex">
            <Badge variant="neutral">Kurumsal Çalışma Alanı</Badge>

            <Link
              href="/profile"
              className="inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Profil
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1680px] px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <div className="mb-4 overflow-x-auto lg:hidden">
          <div className="flex min-w-max gap-2 pb-1">
            {navigation.map((item) => {
              const active = isActivePath(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "inline-flex items-center rounded-2xl px-4 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground shadow-[var(--shadow-soft)]"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] xl:gap-8">
          <aside className="hidden lg:block">
            <div className="sticky top-24 rounded-[28px] border border-slate-200/80 bg-white/78 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.06)] backdrop-blur">
              <div className="mb-5 rounded-3xl border border-slate-200 bg-slate-50/90 p-4">
                <Badge className="mb-3 w-fit">RiskNova Paneli</Badge>
                <p className="text-sm leading-7 text-slate-600">
                  Tüm işyeri operasyonlarını sade ve odaklı bir çalışma alanında
                  yönet.
                </p>
              </div>

              <nav className="space-y-1.5">
                {navigation.map((item) => {
                  const active = isActivePath(pathname, item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center rounded-2xl px-4 py-3 text-sm font-medium transition-all",
                        active
                          ? "bg-primary text-primary-foreground shadow-[var(--shadow-soft)]"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-950",
                      )}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </aside>

          <main className="min-w-0">
            <div className="space-y-6">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}