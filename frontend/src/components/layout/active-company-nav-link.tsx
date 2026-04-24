"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getActiveWorkspace, type WorkspaceRow } from "@/lib/supabase/workspace-api";

// =============================================================================
// "Firma" secondary-nav linki — aktif workspace'in detay sayfasına götürür.
// protected-shell'deki diğer secondary nav item'larıyla aynı CSS class'ları
// paylaşır, hover/active state aynı şekilde davranır.
// =============================================================================

type Props = {
  label?: string;
  locked?: boolean;
};

export function ActiveCompanyNavLink({ label = "Firma", locked }: Props) {
  const pathname = usePathname();
  const [ws, setWs] = useState<WorkspaceRow | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void getActiveWorkspace().then((row) => {
      if (!cancelled) {
        setWs(row);
        setLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const href = ws?.id ? `/companies/${ws.id}` : "/companies";
  const active = pathname.startsWith("/companies");

  // Tam olarak diğer secondary-nav Link item'larının kullandığı sınıfları
  // paylaşır — protected-shell.tsx içindeki .map() kalıbıyla görsel birebir.
  const classes = cn(
    "relative inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-[13px] font-semibold transition-all duration-200 xl:px-4 xl:text-[14px]",
    locked
      ? "cursor-not-allowed border border-white/8 bg-white/5 text-[var(--secondary-nav-text)] opacity-55"
      : active
        ? "text-[var(--secondary-nav-active)] bg-[var(--secondary-nav-hover-bg)]"
        : "text-[var(--secondary-nav-text)] hover:text-[var(--secondary-nav-hover-text)] hover:bg-[var(--secondary-nav-hover-bg)]",
  );

  // Workspace yoksa veya yükleniyorsa link göster ama disabled görün
  if (locked || !loaded) {
    return (
      <span
        className={classes}
        aria-disabled="true"
        title={
          locked
            ? "Bu modulu acmak icin once calisma alani olustur"
            : "Aktif firma yukleniyor..."
        }
      >
        <Building2 className="h-3.5 w-3.5" />
        {label}
      </span>
    );
  }

  return (
    <Link href={href} className={classes} title={ws?.name ?? "Firma sayfası"}>
      <Building2 className="h-3.5 w-3.5" />
      {label}
      {active && (
        <span className="absolute inset-x-1.5 bottom-0 h-0.5 rounded-full bg-[var(--secondary-nav-active)]" />
      )}
    </Link>
  );
}
