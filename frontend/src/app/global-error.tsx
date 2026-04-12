"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    void fetch("/api/admin-observability/error-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        level: "critical",
        source: "next.global_error",
        message: error.message || "Bilinmeyen istemci hatasi",
        stackTrace: error.stack ?? null,
        requestId: error.digest ?? null,
        endpoint: typeof window !== "undefined" ? window.location.pathname : null,
        context: {
          digest: error.digest ?? null,
          href: typeof window !== "undefined" ? window.location.href : null,
        },
      }),
    }).catch(() => undefined);
  }, [error]);

  return (
    <html lang="tr">
      <body className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 text-center">
          <div className="rounded-3xl border border-border bg-card p-8 shadow-[var(--shadow-soft)]">
            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">
              Kritik Hata
            </div>
            <h1 className="mt-4 text-3xl font-semibold">Beklenmeyen bir sorun olustu</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Hata kaydi yönetim paneline iletildi. Sayfayi yeniden denemek için asagidaki butonu kullanabilirsiniz.
            </p>
            <button
              type="button"
              onClick={() => reset()}
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
            >
              Tekrar Dene
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
