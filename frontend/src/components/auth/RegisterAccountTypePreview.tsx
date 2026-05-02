"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Globe2,
  Languages,
  MapPin,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { CommercialLeadDialog } from "@/components/auth/CommercialLeadDialog";
import { RegisterCommercialPlans } from "@/components/auth/RegisterCommercialPlans";
import { LandingRevealProvider } from "@/components/public/landing-reveal-provider";
import { type CommercialInterestType } from "@/lib/account/register-offers";
import { locales, type Locale } from "@/i18n/routing";

type AccountType = "individual" | "osgb" | "enterprise";
type WizardStep = "account" | "country" | "language" | "role";

const WIZARD_COUNTRY_CODES = [
  "TR",
  "AZ",
  "US",
  "GB",
  "DE",
  "FR",
  "ES",
  "RU",
  "SA",
  "AE",
  "CN",
  "JP",
  "KR",
  "IN",
  "ID",
] as const;

type WizardCountryCode = (typeof WIZARD_COUNTRY_CODES)[number];

const ROLE_KEYS = [
  "safety_professional",
  "occupational_physician",
  "safety_officer",
  "auditor",
  "workspace_admin",
] as const;

type RoleKey = (typeof ROLE_KEYS)[number];

type RegisterAccountTypePreviewProps = {
  children: ReactNode;
  initialCommercial?: CommercialInterestType;
};

type Choice<T extends string> = {
  value: T;
  title: string;
  description: string;
  icon?: typeof UserRound;
};

const countryDefaultLanguage: Record<string, Locale> = {
  TR: "tr",
  AZ: "az",
  US: "en",
  GB: "en",
  DE: "de",
  FR: "fr",
  ES: "es",
  RU: "ru",
  SA: "ar",
  AE: "ar",
  CN: "zh",
  JP: "ja",
  KR: "ko",
  IN: "hi",
  ID: "id",
};

const stepOrder: WizardStep[] = ["account", "country", "language", "role"];

function choiceButtonClass(active: boolean) {
  return `w-full rounded-2xl border p-4 text-left transition-colors ${
    active
      ? "border-[var(--gold)] bg-[var(--gold)]/10 ring-1 ring-[var(--gold)]/25"
      : "border-border bg-card hover:border-[var(--gold)]/40 hover:bg-[var(--gold)]/5"
  }`;
}

export function RegisterAccountTypePreview({
  children,
  initialCommercial,
}: RegisterAccountTypePreviewProps) {
  const t = useTranslations("auth.registerWizard");
  const tCountry = useTranslations("country");
  const tLang = useTranslations("lang");

  const [step, setStep] = useState<WizardStep>("account");
  const [mounted, setMounted] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [languageCode, setLanguageCode] = useState<Locale | null>(null);
  const [roleKey, setRoleKey] = useState<RoleKey | null>(null);
  const [activeLeadType, setActiveLeadType] =
    useState<CommercialInterestType | null>(null);
  const appliedCommercialRef = useRef(false);

  const accountChoices: Array<Choice<AccountType>> = useMemo(
    () => [
      {
        value: "individual",
        title: t("accounts.individual.title"),
        description: t("accounts.individual.description"),
        icon: UserRound,
      },
      {
        value: "osgb",
        title: t("accounts.osgb.title"),
        description: t("accounts.osgb.description"),
        icon: Building2,
      },
      {
        value: "enterprise",
        title: t("accounts.enterprise.title"),
        description: t("accounts.enterprise.description"),
        icon: Globe2,
      },
    ],
    [t],
  );

  const roleChoices = useMemo(
    () =>
      ROLE_KEYS.map((key) => ({
        value: key,
        title: t(`roles.${key}.title`),
        description: t(`roles.${key}.description`),
      })),
    [t],
  );

  const stepIndex = stepOrder.indexOf(step);
  const selectedAccount = accountChoices.find((item) => item.value === accountType) ?? null;
  const selectedCountry =
    countryCode && WIZARD_COUNTRY_CODES.includes(countryCode as WizardCountryCode)
      ? {
          value: countryCode as WizardCountryCode,
          title: tCountry(countryCode as WizardCountryCode),
          description: t(`countryHints.${countryCode}` as Parameters<typeof t>[0]),
        }
      : null;
  const selectedLanguage = languageCode ? tLang(languageCode) : null;
  const selectedRole = roleChoices.find((item) => item.value === roleKey) ?? null;

  const summary = useMemo(
    () =>
      [
        selectedAccount?.title,
        selectedCountry?.title,
        selectedLanguage,
        selectedRole?.title,
      ].filter(Boolean),
    [selectedAccount, selectedCountry, selectedLanguage, selectedRole],
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!initialCommercial || appliedCommercialRef.current) return;
    appliedCommercialRef.current = true;
    setAccountType(initialCommercial);
    setStep("country");
    setWizardOpen(true);
    setCompleted(false);
  }, [initialCommercial]);

  useEffect(() => {
    if (!accountType || !countryCode || !languageCode || !roleKey) return;

    window.localStorage.setItem(
      "risknova-register-context",
      JSON.stringify({
        accountType,
        countryCode,
        languageCode,
        roleKey,
      }),
    );
  }, [accountType, countryCode, languageCode, roleKey]);

  useEffect(() => {
    if (!wizardOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setWizardOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [wizardOpen]);

  function advance(nextStep: WizardStep) {
    window.setTimeout(() => setStep(nextStep), 120);
  }

  function finish(nextRole: RoleKey) {
    setRoleKey(nextRole);
    setCompleted(true);
    setWizardOpen(false);
  }

  function goBack() {
    const previous = stepOrder[Math.max(stepIndex - 1, 0)];
    setStep(previous);
  }

  function restartWizard() {
    setWizardOpen(true);
    setCompleted(false);
    setStep("account");
  }

  function renderStep() {
    if (step === "account") {
      return accountChoices.map((item) => {
        const Icon = item.icon ?? UserRound;
        const active = item.value === accountType;
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => {
              setAccountType(item.value);
              advance("country");
            }}
            className={choiceButtonClass(active)}
          >
            <span className="flex items-start gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--gold)]/12 text-[var(--gold)]">
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  {item.title}
                  {active ? <CheckCircle2 className="h-4 w-4 text-[var(--gold)]" /> : null}
                </span>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                  {item.description}
                </span>
              </span>
            </span>
          </button>
        );
      });
    }

    if (step === "country") {
      return WIZARD_COUNTRY_CODES.map((code) => {
        const active = code === countryCode;
        const title = tCountry(code);
        const description = t(`countryHints.${code}` as Parameters<typeof t>[0]);
        return (
          <button
            key={code}
            type="button"
            onClick={() => {
              setCountryCode(code);
              setLanguageCode(countryDefaultLanguage[code] ?? "en");
              advance("language");
            }}
            className={choiceButtonClass(active)}
          >
            <span className="flex items-start gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--gold)]/12 text-[var(--gold)]">
                <MapPin className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  {title}
                  {active ? <CheckCircle2 className="h-4 w-4 text-[var(--gold)]" /> : null}
                </span>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                  {description}
                </span>
              </span>
            </span>
          </button>
        );
      });
    }

    if (step === "language") {
      return locales.map((locale) => {
        const active = locale === languageCode;
        return (
          <button
            key={locale}
            type="button"
            onClick={() => {
              setLanguageCode(locale);
              advance("role");
            }}
            className={choiceButtonClass(active)}
          >
            <span className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--gold)]/12 text-[var(--gold)]">
                <Languages className="h-5 w-5" />
              </span>
              <span className="text-sm font-semibold text-foreground">{tLang(locale)}</span>
              {active ? <CheckCircle2 className="ml-auto h-4 w-4 text-[var(--gold)]" /> : null}
            </span>
          </button>
        );
      });
    }

    return roleChoices.map((item) => {
      const active = item.value === roleKey;
      return (
        <button
          key={item.value}
          type="button"
          onClick={() => finish(item.value)}
          className={choiceButtonClass(active)}
        >
          <span className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--gold)]/12 text-[var(--gold)]">
              <UserRound className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                {item.title}
                {active ? <CheckCircle2 className="h-4 w-4 text-[var(--gold)]" /> : null}
              </span>
              <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                {item.description}
              </span>
            </span>
          </span>
        </button>
      );
    });
  }

  const stepEyebrow = t(`steps.${step}.eyebrow` as Parameters<typeof t>[0]);
  const stepTitle = t(`steps.${step}.title` as Parameters<typeof t>[0]);
  const stepDescription = t(`steps.${step}.description` as Parameters<typeof t>[0]);

  const wizardModal =
    mounted && wizardOpen
      ? createPortal(
          <div className="fixed inset-0 z-[1000] flex items-start justify-center overflow-y-auto bg-slate-950/70 px-3 py-4 backdrop-blur-sm sm:items-center sm:px-6 sm:py-5">
            <div className="my-auto w-full max-w-xl rounded-3xl border border-[var(--gold)]/25 bg-background shadow-[0_30px_90px_rgba(0,0,0,0.35)]">
              <div className="border-b border-border px-5 py-4 sm:px-6">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--gold)]">
                    <ShieldCheck className="h-4 w-4" />
                    {stepEyebrow}
                  </div>
                  <div className="flex items-center gap-2">
                    {stepIndex > 0 ? (
                      <button
                        type="button"
                        onClick={goBack}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground"
                        aria-label={t("prevAria")}
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setWizardOpen(false)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:border-[var(--gold)]/50 hover:text-foreground"
                      aria-label={t("closeAria")}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <h2 className="text-2xl font-semibold leading-tight text-foreground">{stepTitle}</h2>
                  <p className="text-sm leading-6 text-muted-foreground">{stepDescription}</p>
                </div>

                <div className="mt-4 grid grid-cols-4 gap-2">
                  {stepOrder.map((item, index) => (
                    <span
                      key={item}
                      className={`h-1.5 rounded-full ${
                        index <= stepIndex ? "bg-[var(--gold)]" : "bg-border"
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="max-h-[min(70vh,calc(100dvh-7.5rem))] space-y-2 overflow-y-auto px-5 py-4 sm:max-h-[min(72vh,calc(100dvh-9rem))] sm:px-6">
                {renderStep()}
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      {wizardModal}

      {completed && accountType && countryCode && languageCode && roleKey ? (
        <div className="space-y-5">
          <div className="rounded-2xl border border-[var(--gold)]/25 bg-[var(--gold)]/8 px-4 py-3 text-sm leading-6 text-muted-foreground">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <div className="min-w-0">
                <div className="font-semibold text-foreground">{t("summaryTitle")}</div>
                <div className="mt-1 break-words">{summary.join(" / ")}</div>
              </div>
              <button
                type="button"
                onClick={restartWizard}
                className="shrink-0 self-start text-left text-xs font-semibold text-[var(--gold)] underline underline-offset-4 sm:self-auto sm:text-right"
              >
                {t("summaryChange")}
              </button>
            </div>
          </div>

          {accountType === "individual" ? (
            <>
              <input form="register-individual-form" type="hidden" name="accountType" value="individual" />
              <input form="register-individual-form" type="hidden" name="countryCode" value={countryCode} />
              <input form="register-individual-form" type="hidden" name="languageCode" value={languageCode} />
              <input form="register-individual-form" type="hidden" name="roleKey" value={roleKey} />
              {children}
            </>
          ) : (
            <div className="space-y-3">
              <div className="rounded-2xl border border-[var(--gold)]/20 bg-[var(--gold)]/6 px-4 py-3 text-sm leading-6 text-muted-foreground">
                <span className="font-semibold text-foreground">
                  {accountType === "osgb"
                    ? t("commercialIntroOsgbTitle")
                    : t("commercialIntroEnterpriseTitle")}
                </span>
                <span className="mt-1 block">{t("commercialIntroBody")}</span>
              </div>
              <LandingRevealProvider>
                <RegisterCommercialPlans
                  tone="light"
                  mode={accountType === "osgb" ? "osgb" : "enterprise"}
                  countryCode={countryCode ?? "TR"}
                  languageCode={languageCode ?? "tr"}
                  onRequestLead={(type) => setActiveLeadType(type)}
                />
              </LandingRevealProvider>
            </div>
          )}
        </div>
      ) : (
        <Button type="button" className="w-full" onClick={() => setWizardOpen(true)}>
          {t("startWizard")}
        </Button>
      )}

      <CommercialLeadDialog
        accountType={activeLeadType ?? "enterprise"}
        open={activeLeadType !== null}
        onClose={() => setActiveLeadType(null)}
        countryCode={countryCode ?? "TR"}
        languageCode={languageCode ?? "tr"}
        sourcePage="register"
      />
    </>
  );
}
