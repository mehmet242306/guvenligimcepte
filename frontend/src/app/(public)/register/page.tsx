import Link from "next/link";
import { AuthShell } from "@/components/layout/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SocialLoginButtons } from "@/components/auth/social-login-buttons";
import { DemoSessionCleaner } from "@/components/auth/DemoSessionCleaner";
import { DemoExpiredModal } from "@/components/auth/DemoExpiredModal";
import { RegisterAccountTypePreview } from "@/components/auth/RegisterAccountTypePreview";
import { StatusAlert } from "@/components/ui/status-alert";
import { DEMO_ACCESS_WINDOW_HOURS } from "@/lib/platform-admin/demo-access";
import { signup } from "./actions";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    checkEmail?: string;
    fromDemo?: string;
    commercial?: string;
  }>;
}) {
  const params = await searchParams;
  const error = params?.error;
  const checkEmail = params?.checkEmail === "1";
  const fromDemo = params?.fromDemo;
  const demoExpired = fromDemo === "demo-expired" || fromDemo === "1";
  const demoDisabled = fromDemo === "demo-disabled";
  const commercialParam = params?.commercial?.toLowerCase();
  const initialCommercial =
    commercialParam === "osgb" || commercialParam === "enterprise"
      ? commercialParam
      : undefined;

  return (
    <AuthShell
      eyebrow="Yeni hesap"
      title="RiskNova hesabini olustur"
      description="Once hesap turunu, bolgeyi ve dili sec. Bireysel hesaplarda kayit formu hemen acilir; OSGB ve firma yapilarinda gelistirici ile iletisim akisi baslar."
      highlights={[
        {
          title: "Bireysel self-service",
          description:
            "Bolge ve dil seciminden sonra kaydi tamamlayip onboarding ile devam eder.",
        },
        {
          title: "Paketler ayri sayfada",
          description:
            "Tum fiyatlandirma ve paket karsilastirmasi Paketler sayfasinda merkezi olarak sunulur.",
        },
        {
          title: "Firma icin ozel teklif",
          description:
            "Cok lokasyonlu veya ozel ihtiyacli firma yapilari icin gelistirici ile iletisime gecilir.",
        },
      ]}
      footer={
        <p className="text-sm leading-7 text-muted-foreground">
          Hesabin var mi?{" "}
          <Link
            href="/login"
            className="font-medium text-primary underline underline-offset-4"
          >
            Giris yap
          </Link>
        </p>
      }
    >
      {demoExpired || demoDisabled ? (
        <>
          <DemoSessionCleaner />
          <DemoExpiredModal status={demoDisabled ? "disabled" : "expired"} />
          {demoExpired ? (
            <StatusAlert tone="warning">
              <span className="font-semibold text-foreground">Demo süren bitti.</span> RiskNova demo
              erişimi en fazla <strong>{DEMO_ACCESS_WINDOW_HOURS} saat</strong> için tanımlanır; süre
              dolunca oturum kapanır. Aşağıdan ücretsiz hesabını oluşturarak veya Google ile devam
              ederek kalıcı hesaba geçebilirsin.
            </StatusAlert>
          ) : (
            <StatusAlert tone="warning">
              <span className="font-semibold text-foreground">Demo erişimin kapatıldı.</span>{" "}
              Yönetici tarafından sonlandırılmış olabilir (demo hesaplar genelde{" "}
              <strong>{DEMO_ACCESS_WINDOW_HOURS} saat</strong> ile sınırlıdır). Kalıcı kullanım için
              aşağıdan hesap oluşturabilirsin.
            </StatusAlert>
          )}
        </>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}

      {checkEmail ? (
        <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          Kayit islemi baslatildi. Gerekliyse e-posta kutunu kontrol et.
        </div>
      ) : null}

      <RegisterAccountTypePreview initialCommercial={initialCommercial}>
        <SocialLoginButtons mode="register" />

        <form id="register-individual-form" className="space-y-5">
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            label="E-posta"
            placeholder="ornek@kurum.com"
            hint="Kayit sonrasi onboarding akisi ve erisim islemleri bu adres uzerinden yurur."
          />

          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            label="Sifre"
            placeholder="En az 8 karakter"
            hint="Guclu bir sifre belirle. Hesap tipi secimini kayit sonrasi yapacaksin."
          />

          <Button type="submit" formAction={signup} className="w-full" size="lg">
            Hesap Olustur
          </Button>
        </form>
      </RegisterAccountTypePreview>
    </AuthShell>
  );
}
