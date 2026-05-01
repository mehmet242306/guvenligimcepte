/**
 * Sunucu `POST /api/documents/export-quota` ile `export` paket kotasını düşürür.
 * Doküman editörü ve risk analizi raporları (PDF/Word/Excel) için ortak.
 */
export type ConsumeExportQuotaResult =
  | { ok: true }
  | { ok: false; message: string };

export async function consumeExportQuotaClient(): Promise<ConsumeExportQuotaResult> {
  try {
    const res = await fetch("/api/documents/export-quota", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    const body = (await res.json().catch(() => ({}))) as {
      message?: string;
      error?: string;
    };
    if (res.status === 402) {
      return {
        ok: false,
        message:
          body.message ||
          "Dışa aktarma paket limitiniz doldu. Paketinizi yükselterek devam edebilirsiniz.",
      };
    }
    if (!res.ok) {
      return {
        ok: false,
        message: body.error || body.message || "Dışa aktarma kotası doğrulanamadı.",
      };
    }
    return { ok: true };
  } catch {
    return {
      ok: false,
      message: "Bağlantı hatası. Dışa aktarma kotası doğrulanamadı.",
    };
  }
}
