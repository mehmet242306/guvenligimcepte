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
import { isPublicDemoFeatureEnabled } from "@/lib/feature-flags";
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

  const demoPublicEnabled = isPublicDemoFeatureEnabled();
  const legacyDemoLanding = demoExpired || demoDisabled;

  return (
    <AuthShell
      eyebrow="Yeni hesap"
      title="RiskNova hesabini olustur"
      description="Önce hesap türünü, bölgeyi ve dili seçin. Bireysel hesaplarda kayıt formu hemen açılır; OSGB ve firma yapılarında iletişim ve teklif akışı başlar."
      highlights={[
        {
          title: "Bireysel self-servis",
          description:
            "Bölge ve dil seçiminden sonra kaydı tamamlayıp onboarding ile devam edersiniz.",
        },
        {
          title: "Paketler ayrı sayfada",
          description:
            "Fiyatlandırma ve paket karşılaştırması yalnızca Paketler sayfasında; kayıt ekranı sade kalır.",
        },
        {
          title: "Firma için özel teklif",
          description:
            "Çok lokasyonlu veya özel gereksinimli yapılar için iletişim ve teklif süreci işler.",
        },
      ]}
      footer={
        <p className="text-sm leading-7 text-muted-foreground">
          Hesabın var mı?{" "}
          <Link
            href="/login"
            className="font-medium text-primary underline underline-offset-4"
          >
            Giriş yap
          </Link>
        </p>
      }
    >
      {legacyDemoLanding ? (
        <>
          <DemoSessionCleaner />
          {demoPublicEnabled ? (
            <>
              <DemoExpiredModal status={demoDisabled ? "disabled" : "expired"} />
              {demoExpired ? (
                <StatusAlert tone="warning">
                  <span className="font-semibold text-foreground">Demo süren bitti.</span> RiskNova
                  demo erişimi en fazla <strong>{DEMO_ACCESS_WINDOW_HOURS} saat</strong> için
                  tanımlanır; süre dolunca oturum kapanır. Aşağıdan ücretsiz hesabını oluşturarak veya
                  Google ile devam ederek kalıcı hesaba geçebilirsin.
                </StatusAlert>
              ) : (
                <StatusAlert tone="warning">
                  <span className="font-semibold text-foreground">Demo erişimin kapatıldı.</span>{" "}
                  Yönetici tarafından sonlandırılmış olabilir (demo hesaplar genelde{" "}
                  <strong>{DEMO_ACCESS_WINDOW_HOURS} saat</strong> ile sınırlıdır). Kalıcı kullanım
                  için aşağıdan hesap oluşturabilirsin.
                </StatusAlert>
              )}
            </>
          ) : demoExpired ? (
            <StatusAlert tone="warning">
              <span className="font-semibold text-foreground">Demo oturumun sona erdi.</span>{" "}
              Geçici demo artık sunulmuyor. Kalıcı hesap için aşağıdan kayıt olabilir veya{" "}
              <Link href="/login" className="font-medium text-primary underline underline-offset-4">
                giriş yapabilirsin
              </Link>
              . Sorunda{" "}
              <a
                href="mailto:support@getrisknova.com"
                className="font-medium text-primary underline underline-offset-4"
              >
                support@getrisknova.com
              </a>{" "}
              adresine yazabilirsin.
            </StatusAlert>
          ) : (
            <StatusAlert tone="warning">
              <span className="font-semibold text-foreground">Demo erişimin kapatıldı.</span>{" "}
              Geçici demo artık sunulmuyor. Kalıcı kullanım için kayıt ol veya{" "}
              <Link href="/login" className="font-medium text-primary underline underline-offset-4">
                giriş yap
              </Link>
              . Yardım:{" "}
              <a
                href="mailto:support@getrisknova.com"
                className="font-medium text-primary underline underline-offset-4"
              >
                support@getrisknova.com
              </a>
              .
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
          Kayıt işlemi başlatıldı. Gerekirse e-posta kutunu kontrol et.
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
            hint="Kayıt sonrası onboarding ve erişim işlemleri bu adres üzerinden yürür."
          />

          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            label="Şifre"
            placeholder="En az 8 karakter"
            hint="Güçlü bir şifre belirleyin. Hesap türü seçimini kayıt sonrası tamamlayacaksınız."
          />

          <Button type="submit" formAction={signup} className="w-full" size="lg">
            Hesap oluştur
          </Button>
        </form>
      </RegisterAccountTypePreview>
    </AuthShell>
  );
}
