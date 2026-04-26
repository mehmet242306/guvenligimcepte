"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  Globe2,
  Languages,
  MapPin,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CommercialLeadDialog } from "@/components/auth/CommercialLeadDialog";
import { type CommercialInterestType } from "@/lib/account/register-offers";
import { locales, type Locale } from "@/i18n/routing";

type AccountType = "individual" | "osgb" | "enterprise";

type RegisterAccountTypePreviewProps = {
  children: ReactNode;
};

type Option<T extends string> = {
  value: T;
  title: string;
  description: string;
};

const accountCards: Array<Option<AccountType> & { icon: typeof UserRound }> = [
  {
    value: "individual",
    title: "Bireysel profesyonel",
    description: "Uzman, hekim, DSP, denetci veya tekil calisma alani ile basla.",
    icon: UserRound,
  },
  {
    value: "osgb",
    title: "OSGB",
    description: "Firma portfoyu, ekip, gorevlendirme ve hizmet surecleri icin.",
    icon: Building2,
  },
  {
    value: "enterprise",
    title: "Firma / Kurumsal",
    description: "Cok lokasyonlu, ozel mevzuat ihtiyacli veya kurumsal yapi.",
    icon: Globe2,
  },
];

const countryOptions = [
  { value: "TR", title: "Turkiye", description: "Turkiye mevzuati, ISG rolleri ve Turkce varsayilan." },
  { value: "AZ", title: "Azerbaycan", description: "Azerbaycan bolgesi ve Azerbaycanca dil tercihi." },
  { value: "US", title: "United States", description: "US operasyonlari ve English varsayilan." },
  { value: "GB", title: "United Kingdom", description: "UK operasyonlari ve English varsayilan." },
  { value: "DE", title: "Deutschland", description: "Almanya bolgesi ve Deutsch varsayilan." },
  { value: "FR", title: "France", description: "Fransa bolgesi ve Francais varsayilan." },
  { value: "ES", title: "Espana", description: "Ispanya bolgesi ve Espanol varsayilan." },
  { value: "RU", title: "Rossiya", description: "Rusca dil ve bolge hazirligi." },
  { value: "SA", title: "Saudi Arabia", description: "Arabic dil ve Korfez operasyon hazirligi." },
  { value: "AE", title: "United Arab Emirates", description: "English / Arabic ekipleri icin." },
  { value: "CN", title: "China", description: "Chinese dil ve Asya operasyon hazirligi." },
  { value: "JP", title: "Japan", description: "Japanese dil ve Asya operasyon hazirligi." },
  { value: "KR", title: "Korea", description: "Korean dil ve Asya operasyon hazirligi." },
  { value: "IN", title: "India", description: "Hindi / English ekipleri icin." },
  { value: "ID", title: "Indonesia", description: "Bahasa Indonesia dil tercihi." },
] as const;

const languageLabels: Record<Locale, string> = {
  tr: "Turkce",
  en: "English",
  ar: "Arabic",
  ru: "Russian",
  de: "Deutsch",
  fr: "Francais",
  es: "Espanol",
  zh: "Chinese",
  ja: "Japanese",
  ko: "Korean",
  hi: "Hindi",
  az: "Azerbaycanca",
  id: "Bahasa Indonesia",
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

const roleOptions = [
  {
    value: "safety_professional",
    title: "ISG uzmani",
    description: "Risk analizi, saha denetimi, aksiyon ve mevzuat takibi.",
  },
  {
    value: "occupational_physician",
    title: "Isyeri hekimi",
    description: "Saglik gozetimi, hekim surecleri ve calisan kayitlari.",
  },
  {
    value: "safety_officer",
    title: "DSP / saglik personeli",
    description: "Saglik ekibi, saha destek ve takip gorevleri.",
  },
  {
    value: "auditor",
    title: "Denetci",
    description: "Saha denetimi, uygunsuzluk ve raporlama odakli rol.",
  },
  {
    value: "workspace_admin",
    title: "Calisma alani yoneticisi",
    description: "Kullanici, firma, rol ve workspace ayarlarini yonetir.",
  },
] as const;

function SelectionCard<T extends string>({
  option,
  active,
  onSelect,
  icon: Icon,
}: {
  option: Option<T>;
  active: boolean;
  onSelect: () => void;
  icon?: typeof UserRound;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-2xl border p-3 text-left transition-colors ${
        active
          ? "border-[var(--gold)] bg-[var(--gold)]/10 ring-1 ring-[var(--gold)]/25"
          : "border-border bg-card hover:border-[var(--gold)]/40 hover:bg-[var(--gold)]/5"
      }`}
    >
      <span className="flex items-start gap-3">
        {Icon ? (
          <span
            className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
              active ? "bg-[var(--gold)] text-white" : "bg-muted text-muted-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
          </span>
        ) : null}
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
            {option.title}
            {active ? <CheckCircle2 className="h-4 w-4 text-[var(--gold)]" /> : null}
          </span>
          <span className="mt-1 block text-xs leading-5 text-muted-foreground">
            {option.description}
          </span>
        </span>
      </span>
    </button>
  );
}

export function RegisterAccountTypePreview({ children }: RegisterAccountTypePreviewProps) {
  const [accountType, setAccountType] = useState<AccountType>("individual");
  const [countryCode, setCountryCode] = useState("TR");
  const [languageCode, setLanguageCode] = useState<Locale>("tr");
  const [roleKey, setRoleKey] = useState<(typeof roleOptions)[number]["value"]>(
    "safety_professional",
  );
  const [activeLeadType, setActiveLeadType] =
    useState<CommercialInterestType | null>(null);

  const selectedAccount = useMemo(
    () => accountCards.find((item) => item.value === accountType) ?? accountCards[0],
    [accountType],
  );
  const selectedCountry = countryOptions.find((item) => item.value === countryCode) ?? countryOptions[0];
  const selectedRole = roleOptions.find((item) => item.value === roleKey) ?? roleOptions[0];

  useEffect(() => {
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

  function handleCountryChange(nextCountry: string) {
    setCountryCode(nextCountry);
    setLanguageCode(countryDefaultLanguage[nextCountry] ?? "en");
  }

  return (
    <>
      <div className="space-y-5 rounded-3xl border border-[var(--gold)]/20 bg-[var(--gold)]/5 p-3 sm:p-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[var(--gold)]" />
          <div>
            <div className="text-sm font-semibold text-foreground">
              Baslangic calisma alani bilgileri
            </div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Bu secimler workspace, mevzuat/RAG kapsami, varsayilan dil ve ilk rol icin temel veri olarak kaydedilir.
            </p>
          </div>
        </div>

        <section className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <BriefcaseBusiness className="h-4 w-4 text-[var(--gold)]" />
            Hesap turu
          </div>
          <div className="grid gap-2">
            {accountCards.map((item) => (
              <SelectionCard
                key={item.value}
                option={item}
                icon={item.icon}
                active={item.value === accountType}
                onSelect={() => setAccountType(item.value)}
              />
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <MapPin className="h-4 w-4 text-[var(--gold)]" />
            Ulke / bolge
          </div>
          <div className="grid max-h-72 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
            {countryOptions.map((item) => (
              <SelectionCard
                key={item.value}
                option={item}
                active={item.value === countryCode}
                onSelect={() => handleCountryChange(item.value)}
              />
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <Languages className="h-4 w-4 text-[var(--gold)]" />
            Dil
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {locales.map((locale) => (
              <button
                key={locale}
                type="button"
                onClick={() => setLanguageCode(locale)}
                className={`h-11 rounded-xl border px-3 text-sm font-semibold transition-colors ${
                  locale === languageCode
                    ? "border-[var(--gold)] bg-[var(--gold)]/12 text-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-[var(--gold)]/40"
                }`}
              >
                {languageLabels[locale]}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <UserRound className="h-4 w-4 text-[var(--gold)]" />
            Ilk rol
          </div>
          <div className="grid gap-2">
            {roleOptions.map((item) => (
              <SelectionCard
                key={item.value}
                option={item}
                active={item.value === roleKey}
                onSelect={() => setRoleKey(item.value)}
              />
            ))}
          </div>
        </section>

        <div className="rounded-2xl border border-[var(--gold)]/20 bg-card/75 px-3 py-2 text-xs leading-5 text-muted-foreground">
          Secim: <span className="font-semibold text-foreground">{selectedAccount.title}</span>
          {" / "}
          <span className="font-semibold text-foreground">{selectedCountry.title}</span>
          {" / "}
          <span className="font-semibold text-foreground">{languageLabels[languageCode]}</span>
          {" / "}
          <span className="font-semibold text-foreground">{selectedRole.title}</span>
        </div>
      </div>

      {accountType === "individual" ? (
        <div className="space-y-5">
          <input form="register-individual-form" type="hidden" name="accountType" value="individual" />
          <input form="register-individual-form" type="hidden" name="countryCode" value={countryCode} />
          <input form="register-individual-form" type="hidden" name="languageCode" value={languageCode} />
          <input form="register-individual-form" type="hidden" name="roleKey" value={roleKey} />
          {children}
        </div>
      ) : (
        <div className="rounded-3xl border border-[var(--gold)]/25 bg-card p-4 shadow-[var(--shadow-soft)]">
          <div className="text-sm font-semibold text-foreground">
            {accountType === "osgb" ? "OSGB icin kurulum gorusmesi" : "Firma / kurumsal kurulum gorusmesi"}
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Secilen ulke, dil ve rol bilgisiyle gelistirici ekibe kisa bir talep birakabilirsiniz.
          </p>
          <Button
            type="button"
            className="mt-4 w-full"
            onClick={() => setActiveLeadType(accountType === "osgb" ? "osgb" : "enterprise")}
          >
            Gelistirici ile iletisime gec
          </Button>
        </div>
      )}

      <CommercialLeadDialog
        accountType={activeLeadType ?? "enterprise"}
        open={activeLeadType !== null}
        onClose={() => setActiveLeadType(null)}
        countryCode={countryCode}
        languageCode={languageCode}
      />
    </>
  );
}
