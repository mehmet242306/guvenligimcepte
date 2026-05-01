import Link from "next/link";
import { AuthShell } from "@/components/layout/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SocialLoginButtons } from "@/components/auth/social-login-buttons";
import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; reset?: string; passwordUpdated?: string; next?: string }>;
}) {
  const params = await searchParams;
  const error = params?.error;
  const reset = params?.reset === "1" || params?.passwordUpdated === "1";
  const next = params?.next || "/dashboard";

  return (
    <AuthShell
      eyebrow="Giriş"
      title="Hesabına giriş yap"
      description="RiskNova hesabına giriş yapın. Platform yöneticileri yönetim paneline, diğer kullanıcılar hesap türüne uygun ekrana yönlendirilir."
      highlights={[
        {
          title: "Bireysel giriş",
          description:
            "Kendi firmalarını, kurumlarını ve çalışma alanlarını yöneten bireysel profesyoneller için.",
        },
        {
          title: "OSGB girişi",
          description:
            "Firma, personel, görevlendirme ve risk süreçlerini yöneten OSGB ekipleri için.",
        },
        {
          title: "Platform yönetimi",
          description:
            "Platform yöneticisi rolü herkese açık bir hesap türü değildir; giriş sonrası yönetim paneline yönlendirilir.",
        },
      ]}
      spotlight={
        <div className="space-y-3 text-sm leading-7 text-white/92">
          <p>
            Giriş ekranı tüm kullanıcılar için ortaktır; ayrım, oturum sonrası hesap
            bağlamına göre yapılır.
          </p>
          <p>
            Platform yöneticisi rolü herkese açık kayıt akışında sunulmaz. Bireysel,
            OSGB ve kurumsal dışında ayrı bir müşteri hesap türü gösterilmez.
          </p>
        </div>
      }
      footer={
        <p className="text-sm leading-7 text-muted-foreground">
          Hesabın yok mu?{" "}
          <Link
            href="/register"
            className="font-medium text-primary underline underline-offset-4"
          >
            Kayit ol
          </Link>
        </p>
      }
    >
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}

      {reset ? (
        <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          Şifren güncellendi. Yeni şifrenle giriş yapabilirsin.
        </div>
      ) : null}

      <SocialLoginButtons mode="login" nextPath={next} />

      <form className="space-y-5">
        <input type="hidden" name="next" value={next} />

        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          label="E-posta"
          placeholder="ornek@kurum.com"
        />

        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          label="Şifre"
          placeholder="Şifreni gir"
        />

        <div className="text-right">
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-primary underline underline-offset-4"
          >
            Şifremi unuttum
          </Link>
        </div>

        <Button type="submit" formAction={login} className="w-full" size="lg">
          Giriş yap
        </Button>
      </form>
    </AuthShell>
  );
}
