export async function downloadServerExport({
  url,
  payload,
  fallbackFileName,
}: {
  url: string;
  payload: unknown;
  fallbackFileName: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const response = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as {
        message?: string;
        error?: string;
      };
      return {
        ok: false,
        message: body.message || body.error || "Disari aktarma hazirlanamadi.",
      };
    }

    const blob = await response.blob();
    const disposition = response.headers.get("content-disposition") || "";
    const fileNameMatch = disposition.match(/filename\*=UTF-8''([^;]+)|filename="?([^"]+)"?/i);
    const fileName = decodeURIComponent(fileNameMatch?.[1] || fileNameMatch?.[2] || fallbackFileName);
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = fileName;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    return { ok: true };
  } catch {
    return {
      ok: false,
      message: "Baglanti hatasi. Disari aktarma hazirlanamadi.",
    };
  }
}
