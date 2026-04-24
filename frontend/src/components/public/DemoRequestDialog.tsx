"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Sparkles, X } from "lucide-react";

// =============================================================================
// Demo Talep Formu — Landing page'den açılır, auth gerektirmez
// =============================================================================
// POST /api/contact/demo-request → enterprise_leads (source_page='landing_demo')
// Admin, /platform-admin/leads sayfasında görür.
// =============================================================================

type Status = "idle" | "submitting" | "ok" | "error";

export function DemoRequestDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);

    const payload = {
      contactName: String(data.get("contactName") ?? "").trim(),
      email: String(data.get("email") ?? "").trim(),
      phone: String(data.get("phone") ?? "").trim() || null,
      companyName: String(data.get("companyName") ?? "").trim() || null,
      message: String(data.get("message") ?? "").trim() || null,
      accountTypeHint: String(data.get("accountTypeHint") ?? "").trim() || null,
      kvkkConsent: data.get("kvkkConsent") === "on",
    };

    if (!payload.kvkkConsent) {
      setErrorMsg("Lütfen KVKK aydınlatmasını onaylayın.");
      return;
    }

    setStatus("submitting");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/contact/demo-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text.slice(0, 240) || `HTTP ${res.status}`);
      }
      setStatus("ok");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Talep gönderilemedi.");
    }
  }

  if (!open || !mounted) return null;

  const content = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border-2 border-[var(--gold)]/40 bg-card shadow-[0_30px_80px_rgba(0,0,0,0.5)]"
      >
        {/* Header */}
        <div className="relative bg-gradient-to-br from-[var(--gold)]/20 via-[var(--gold)]/8 to-transparent px-6 py-5">
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--gold)]/20 ring-4 ring-[var(--gold)]/25">
              <Sparkles className="h-5 w-5 text-[var(--gold)]" />
            </span>
            <div>
              <h2 className="text-xl font-bold leading-tight text-foreground">
                Demo Talep Et
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                İhtiyacına özel kısa bir sunum planlayalım
              </p>
            </div>
          </div>
        </div>

        {/* Success state */}
        {status === "ok" ? (
          <div className="space-y-4 px-6 py-8 text-center">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">
              <Check className="h-7 w-7" />
            </span>
            <h3 className="text-lg font-bold text-foreground">
              Talebiniz alındı
            </h3>
            <p className="text-sm leading-6 text-muted-foreground">
              Kısa süre içinde ekibimiz sizinle iletişime geçecek. Geri bildirimin için teşekkürler.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mx-auto inline-flex h-10 items-center justify-center rounded-xl bg-[var(--gold)] px-6 text-sm font-semibold text-white hover:brightness-105"
            >
              Kapat
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
            <Field
              name="contactName"
              label="Ad Soyad *"
              required
              placeholder="Mehmet Yılmaz"
            />
            <Field
              name="email"
              label="E-posta *"
              type="email"
              required
              placeholder="ornek@firma.com"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field name="phone" label="Telefon" placeholder="+90 5xx xxx xx xx" />
              <Field
                name="companyName"
                label="Firma / Kurum"
                placeholder="XYZ Ltd. Şti."
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Hesap Tipi
              </label>
              <select
                name="accountTypeHint"
                className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
                defaultValue=""
              >
                <option value="">Bilmiyorum / Karar vermedim</option>
                <option value="bireysel">Bireysel (tek uzman)</option>
                <option value="osgb">OSGB</option>
                <option value="enterprise">Kurumsal / Firma</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Mesajın (opsiyonel)
              </label>
              <textarea
                name="message"
                rows={3}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                placeholder="Hangi modüllerle ilgileniyorsun? Kaç çalışanınız var? Uygun zamanların..."
              />
            </div>

            <label className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
              <input
                type="checkbox"
                name="kvkkConsent"
                className="mt-0.5"
                required
              />
              <span>
                <strong className="text-foreground">KVKK Aydınlatma:</strong>{" "}
                İletişim bilgilerimin yalnızca bu talebe yanıt için işlenmesini kabul ediyorum.
              </span>
            </label>

            {errorMsg ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-200">
                {errorMsg}
              </div>
            ) : null}

            <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
              >
                Vazgeç
              </button>
              <button
                type="submit"
                disabled={status === "submitting"}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-[var(--gold)] px-6 text-sm font-semibold text-white hover:brightness-105 disabled:opacity-60"
              >
                {status === "submitting" ? "Gönderiliyor..." : "Talebi Gönder"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

function Field({
  name,
  label,
  type = "text",
  required,
  placeholder,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
      >
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none transition focus:border-[var(--gold)]/50"
      />
    </div>
  );
}

// =============================================================================
// Trigger button — landing page'den import edip kullan
// =============================================================================

export function DemoRequestTrigger({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {children}
      </button>
      <DemoRequestDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
