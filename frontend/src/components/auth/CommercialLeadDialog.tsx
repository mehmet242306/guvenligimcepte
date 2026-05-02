"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, Sparkles, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { CommercialInterestType } from "@/lib/account/register-offers";

type CommercialLeadDialogProps = {
  accountType: CommercialInterestType;
  open: boolean;
  onClose: () => void;
  countryCode?: string;
  languageCode?: string;
  sourcePage?: "register" | "cozumler_kurumsal" | "cozumler_osgb" | "landing_demo";
};

type FormState = {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  estimatedCompanyCount: string;
  estimatedEmployeeCount: string;
  estimatedProfessionalCount: string;
  message: string;
};

const initialState: FormState = {
  companyName: "",
  contactName: "",
  email: "",
  phone: "",
  estimatedCompanyCount: "",
  estimatedEmployeeCount: "",
  estimatedProfessionalCount: "",
  message: "",
};

function toOptionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function CommercialLeadDialog({
  accountType,
  open,
  onClose,
  countryCode,
  languageCode,
  sourcePage,
}: CommercialLeadDialogProps) {
  const t = useTranslations("solutions.leadDialog");
  const prefix = accountType === "osgb" ? "osgb" : "enterprise";

  const copy = useMemo(
    () => ({
      badge: t(`${prefix}.badge`),
      title: t(`${prefix}.title`),
      description: t(`${prefix}.description`),
      primaryCta: t(`${prefix}.primaryCta`),
      companyLabel: t(`${prefix}.companyLabel`),
      scaleLabel: t(`${prefix}.scaleLabel`),
      employeeLabel: t(`${prefix}.employeeLabel`),
      professionalLabel: t(`${prefix}.professionalLabel`),
    }),
    [t, prefix],
  );

  const fieldPrefix = `commercial-${accountType}`;
  const [mounted, setMounted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(initialState);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting) {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, submitting]);

  useEffect(() => {
    if (!open) {
      setSubmitted(false);
      setError(null);
      setSubmitting(false);
      setForm(initialState);
    }
  }, [open]);

  if (!open || !mounted) return null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/contact/commercial-lead", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accountType,
          companyName: form.companyName,
          contactName: form.contactName,
          email: form.email,
          phone: form.phone || null,
          estimatedCompanyCount: toOptionalNumber(form.estimatedCompanyCount),
          estimatedEmployeeCount: toOptionalNumber(form.estimatedEmployeeCount),
          estimatedProfessionalCount: toOptionalNumber(
            form.estimatedProfessionalCount,
          ),
          ...(sourcePage ? { sourcePage } : {}),
          message:
            [
              countryCode ? t("regionChip", { code: countryCode }) : null,
              languageCode ? t("languageChip", { code: languageCode.toUpperCase() }) : null,
              form.message || null,
            ]
              .filter(Boolean)
              .join("\n\n") || null,
        }),
      });

      const data = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        throw new Error(data?.error || t("errorUnexpected"));
      }

      setSubmitted(true);
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : t("errorFailed"),
      );
    } finally {
      setSubmitting(false);
    }
  }

  const modal = (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={() => {
        if (!submitting) onClose();
      }}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-[2rem] border border-amber-500/20 bg-card shadow-[0_32px_80px_rgba(15,23,42,0.38)]"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="commercial-lead-title"
      >
        <div className="relative border-b border-border bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.16),transparent_32%),linear-gradient(180deg,rgba(15,23,42,0.94),rgba(15,23,42,0.84))] px-6 py-6 text-white">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="absolute right-4 top-4 rounded-full p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
            aria-label={t("closeAria")}
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-start gap-3 pr-10">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400/15 text-amber-200 ring-1 ring-amber-300/20">
              <Sparkles className="h-5 w-5" />
            </span>
            <div className="space-y-2">
              <div className="inline-flex rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-100">
                {copy.badge}
              </div>
              <h2
                id="commercial-lead-title"
                className="text-2xl font-semibold tracking-tight text-white"
              >
                {copy.title}
              </h2>
              <p className="max-w-2xl text-sm leading-7 text-white/82">{copy.description}</p>
              {countryCode || languageCode ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  {countryCode ? (
                    <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-[11px] font-semibold text-amber-100">
                      {t("regionChip", { code: countryCode })}
                    </span>
                  ) : null}
                  {languageCode ? (
                    <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-[11px] font-semibold text-amber-100">
                      {t("languageChip", { code: languageCode.toUpperCase() })}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="space-y-5 px-6 py-6">
          {submitted ? (
            <div className="space-y-4">
              <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/8 p-5">
                <p className="text-lg font-semibold text-foreground">{t("submittedTitle")}</p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{t("submittedBody")}</p>
              </div>
              <div className="flex justify-end">
                <Button onClick={onClose}>{t("okButton")}</Button>
              </div>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  id={`${fieldPrefix}-company`}
                  name="companyName"
                  label={copy.companyLabel}
                  value={form.companyName}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      companyName: event.target.value,
                    }))
                  }
                  placeholder={t("companyPlaceholder")}
                  required
                />
                <Input
                  id={`${fieldPrefix}-contact`}
                  name="contactName"
                  label={t("contactLabel")}
                  value={form.contactName}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      contactName: event.target.value,
                    }))
                  }
                  placeholder={t("contactPlaceholder")}
                  required
                />
                <Input
                  id={`${fieldPrefix}-email`}
                  name="email"
                  label={t("workEmailLabel")}
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  placeholder={t("workEmailPlaceholder")}
                  required
                />
                <Input
                  id={`${fieldPrefix}-phone`}
                  name="phone"
                  label={t("phoneLabel")}
                  value={form.phone}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      phone: event.target.value,
                    }))
                  }
                  placeholder={t("phonePlaceholder")}
                />
                <Input
                  id={`${fieldPrefix}-scale`}
                  name="estimatedCompanyCount"
                  label={copy.scaleLabel}
                  type="number"
                  min={1}
                  inputMode="numeric"
                  value={form.estimatedCompanyCount}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      estimatedCompanyCount: event.target.value,
                    }))
                  }
                  placeholder={t("scalePlaceholder")}
                />
                <Input
                  id={`${fieldPrefix}-employees`}
                  name="estimatedEmployeeCount"
                  label={copy.employeeLabel}
                  type="number"
                  min={1}
                  inputMode="numeric"
                  value={form.estimatedEmployeeCount}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      estimatedEmployeeCount: event.target.value,
                    }))
                  }
                  placeholder={t("employeePlaceholder")}
                />
                {accountType === "osgb" ? (
                  <Input
                    id={`${fieldPrefix}-professionals`}
                    name="estimatedProfessionalCount"
                    label={copy.professionalLabel}
                    type="number"
                    min={1}
                    inputMode="numeric"
                    value={form.estimatedProfessionalCount}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        estimatedProfessionalCount: event.target.value,
                      }))
                    }
                    placeholder={t("professionalPlaceholder")}
                    containerClassName="md:col-span-2"
                  />
                ) : null}
              </div>

              <Textarea
                id={`${fieldPrefix}-message`}
                name="message"
                label={t("messageLabel")}
                value={form.message}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    message: event.target.value,
                  }))
                }
                placeholder={t("messagePlaceholder")}
                hint={t("messageHint")}
                rows={5}
              />

              {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {error}
                </div>
              ) : null}

              <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
                  {t("cancelButton")}
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("submitting")}
                    </>
                  ) : (
                    copy.primaryCta
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
