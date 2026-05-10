"use client";

import { FormEvent, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

type FormState = "idle" | "sending" | "sent" | "error";

export function SupportForm() {
  const t = useTranslations("support.form");
  const locale = useLocale();
  const [state, setState] = useState<FormState>("idle");
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("sending");
    setError("");

    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      topic: String(formData.get("topic") ?? ""),
      accountEmail: String(formData.get("accountEmail") ?? ""),
      companyName: String(formData.get("companyName") ?? ""),
      message: String(formData.get("message") ?? ""),
      website: String(formData.get("website") ?? ""),
      locale,
    };

    try {
      const response = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(data?.error || t("genericError"));
      }

      form.reset();
      setState("sent");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t("genericError"));
      setState("error");
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <input type="text" name="website" className="hidden" tabIndex={-1} autoComplete="off" />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-foreground">
          {t("name")}
          <input
            name="name"
            required
            minLength={2}
            maxLength={120}
            className="h-11 rounded-lg border border-border bg-background px-3 text-sm outline-none ring-amber-400/30 transition focus:ring-4"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-foreground">
          {t("email")}
          <input
            name="email"
            type="email"
            required
            maxLength={200}
            className="h-11 rounded-lg border border-border bg-background px-3 text-sm outline-none ring-amber-400/30 transition focus:ring-4"
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-foreground">
          {t("topic")}
          <select
            name="topic"
            required
            className="h-11 rounded-lg border border-border bg-background px-3 text-sm outline-none ring-amber-400/30 transition focus:ring-4"
            defaultValue=""
          >
            <option value="" disabled>
              {t("topicPlaceholder")}
            </option>
            <option value={t("topics.account")}>{t("topics.account")}</option>
            <option value={t("topics.mobile")}>{t("topics.mobile")}</option>
            <option value={t("topics.billing")}>{t("topics.billing")}</option>
            <option value={t("topics.privacy")}>{t("topics.privacy")}</option>
            <option value={t("topics.other")}>{t("topics.other")}</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium text-foreground">
          {t("accountEmail")}
          <input
            name="accountEmail"
            type="email"
            maxLength={200}
            className="h-11 rounded-lg border border-border bg-background px-3 text-sm outline-none ring-amber-400/30 transition focus:ring-4"
          />
        </label>
      </div>

      <label className="grid gap-2 text-sm font-medium text-foreground">
        {t("companyName")}
        <input
          name="companyName"
          maxLength={180}
          className="h-11 rounded-lg border border-border bg-background px-3 text-sm outline-none ring-amber-400/30 transition focus:ring-4"
        />
      </label>

      <label className="grid gap-2 text-sm font-medium text-foreground">
        {t("message")}
        <textarea
          name="message"
          required
          minLength={10}
          maxLength={5000}
          rows={6}
          className="resize-y rounded-lg border border-border bg-background px-3 py-3 text-sm outline-none ring-amber-400/30 transition focus:ring-4"
        />
      </label>

      {state === "sent" ? (
        <p className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
          {t("success")}
        </p>
      ) : null}
      {state === "error" ? (
        <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
          {error || t("genericError")}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={state === "sending"}
        className="inline-flex h-11 items-center justify-center rounded-lg bg-amber-500 px-5 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {state === "sending" ? t("sending") : t("submit")}
      </button>
    </form>
  );
}
