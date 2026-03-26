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
  { href: "/companies", label: "Firmalar" },
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
    <div className="app-shell">
      {/* ── Top Header ── */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[linear-gradient(90deg,#0b5fc1_0%,#0f6dd2_48%,#084c9a_100%)] backdrop-blur-xl">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Brand row */}
          <div className="flex h-16 items-center justify-between gap-4">
            <Brand href="/dashboard" compact inverted />

            <div className="hidden items-center gap-3 md:flex">
              <Badge className="border-white/20 bg-white/10 text-white">
                Kurumsal Çalışma Alanı
              </Badge>
              <Link
                href="/profile"
                className="inline-flex h-9 items-center justify-center rounded-xl border border-white/20 bg-white/10 px-4 text-sm font-medium text-white transition-colors hover:bg-white/18"
              >
                Profil
              </Link>
            </div>
          </div>

          {/* ── Desktop horizontal navigation ── */}
          <nav className="hidden md:block">
            <div className="-mb-px flex items-center gap-1 pb-0">
              {navigation.map((item) => {
                const active = isActivePath(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "inline-flex h-10 items-center rounded-t-xl px-4 text-sm font-medium transition-colors",
                      active
                        ? "bg-white/15 text-white shadow-[inset_0_-2px_0_0_rgba(255,255,255,0.9)]"
                        : "text-white/70 hover:bg-white/8 hover:text-white",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>
      </header>

      {/* ── Mobile horizontal navigation ── */}
      <div className="border-b border-border bg-card md:hidden">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
          <div className="flex gap-1.5 overflow-x-auto py-2.5">
            {navigation.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "inline-flex shrink-0 items-center rounded-xl px-3.5 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground shadow-[var(--shadow-soft)]"
                      : "border border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Main content — full width ── */}
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="page-stack">{children}</div>
      </main>
    </div>
  );
}
