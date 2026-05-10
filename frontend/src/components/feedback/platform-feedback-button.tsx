"use client";

import { type FormEvent, useCallback, useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { MessageSquarePlus } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type PlatformFeedbackButtonProps = {
  organizationId: string | null;
};

type FeedbackCategory = "bug" | "idea" | "usability" | "other";

const MIN_LEN = 10;
const MAX_LEN = 4000;

export function PlatformFeedbackButton({ organizationId }: PlatformFeedbackButtonProps) {
  const { t, locale } = useI18n();
  const pathname = usePathname();
  const panelId = useId();
  const openerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<FeedbackCategory>("usability");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    setDone(false);
    setError(null);
    openerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || openerRef.current?.contains(t)) return;
      close();
    }
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [open, close]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = message.trim();
    if (trimmed.length < MIN_LEN || trimmed.length > MAX_LEN) return;

    const supabase = createClient();
    if (!supabase) {
      setError(t("platformFeedback.error"));
      return;
    }

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) {
      setError(t("platformFeedback.error"));
      return;
    }

    setSubmitting(true);
    setError(null);

    const path =
      pathname && pathname.length > 2000 ? pathname.slice(0, 2000) : pathname || null;

    const { error: insErr } = await supabase.from("platform_user_feedback").insert({
      user_id: user.id,
      organization_id: organizationId,
      category,
      message: trimmed,
      page_path: path,
      locale: locale ?? null,
    });

    setSubmitting(false);

    if (insErr) {
      console.warn("[platform-feedback]", insErr);
      setError(t("platformFeedback.error"));
      return;
    }

    setDone(true);
    setMessage("");
    setCategory("usability");
  }

  const len = message.trim().length;
  const canSubmit = len >= MIN_LEN && len <= MAX_LEN && !submitting;

  return (
    <>
      <button
        ref={openerRef}
        type="button"
        className={cn(
          "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[14px] font-bold text-[var(--gold-light)] transition-all duration-200",
          "hover:bg-[var(--gold-glow)] hover:text-white",
          open && "bg-[var(--gold-glow)] text-white",
        )}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={t("platformFeedback.buttonAria")}
        title={t("platformFeedback.buttonTitle")}
        onClick={() => {
          setOpen((o) => !o);
          setDone(false);
          setError(null);
        }}
      >
        <MessageSquarePlus className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden />
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-3 backdrop-blur-[2px] sm:items-center sm:p-6"
          role="presentation"
        >
          <div
            ref={panelRef}
            id={panelId}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${panelId}-title`}
            className="flex max-h-[min(90vh,560px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[0_22px_56px_rgba(0,0,0,0.24)]"
          >
            <div className="border-b border-border px-4 py-3 sm:px-5">
              <h2 id={`${panelId}-title`} className="text-base font-semibold text-foreground">
                {t("platformFeedback.panelTitle")}
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {t("platformFeedback.panelSubtitle")}
              </p>
            </div>

            {done ? (
              <div className="flex flex-1 flex-col justify-center gap-3 px-4 py-8 text-center sm:px-5">
                <p className="text-sm font-medium text-foreground">{t("platformFeedback.success")}</p>
                <button
                  type="button"
                  className="mx-auto rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                  onClick={() => close()}
                >
                  {t("platformFeedback.close")}
                </button>
              </div>
            ) : (
              <form onSubmit={(e) => void handleSubmit(e)} className="flex min-h-0 flex-1 flex-col">
                <div className="space-y-3 overflow-y-auto px-4 py-4 sm:px-5">
                  <div>
                    <label htmlFor={`${panelId}-cat`} className="mb-1 block text-xs font-medium text-muted-foreground">
                      {t("platformFeedback.categoryLabel")}
                    </label>
                    <select
                      id={`${panelId}-cat`}
                      value={category}
                      onChange={(e) => setCategory(e.target.value as FeedbackCategory)}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
                    >
                      <option value="bug">{t("platformFeedback.categoryBug")}</option>
                      <option value="idea">{t("platformFeedback.categoryIdea")}</option>
                      <option value="usability">{t("platformFeedback.categoryUsability")}</option>
                      <option value="other">{t("platformFeedback.categoryOther")}</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor={`${panelId}-msg`} className="mb-1 block text-xs font-medium text-muted-foreground">
                      {t("platformFeedback.messageLabel")}
                    </label>
                    <textarea
                      id={`${panelId}-msg`}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={5}
                      maxLength={MAX_LEN}
                      placeholder={t("platformFeedback.messagePlaceholder")}
                      className="w-full resize-y rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                    />
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {len < MIN_LEN
                        ? t("platformFeedback.minLengthHint")
                        : `${len} / ${MAX_LEN}`}
                    </p>
                  </div>

                  {pathname ? (
                    <div className="rounded-xl border border-border/80 bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
                      <span className="font-medium text-foreground/80">{t("platformFeedback.pageContextLabel")}: </span>
                      <span className="break-all font-mono">{pathname}</span>
                    </div>
                  ) : null}

                  {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
                </div>

                <div className="mt-auto flex justify-end gap-2 border-t border-border px-4 py-3 sm:px-5">
                  <button
                    type="button"
                    className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
                    onClick={() => close()}
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting ? t("platformFeedback.submitting") : t("platformFeedback.submit")}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
