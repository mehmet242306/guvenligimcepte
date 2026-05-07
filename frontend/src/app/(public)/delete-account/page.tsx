import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicLegalFooter } from "@/components/layout/public-legal-footer";

export const metadata: Metadata = {
  title: "Hesap ve Veri Silme Talebi",
  description:
    "RiskNova hesabınızı ve ilişkili kişisel verilerinizi silme talebi oluşturma adımları.",
  alternates: { canonical: "/delete-account" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "RiskNova Hesap ve Veri Silme Talebi",
    description:
      "RiskNova hesabınızı ve ilişkili kişisel verilerinizi silme talebi oluşturma adımları.",
    type: "article",
    url: "/delete-account",
  },
};

const steps = [
  "RiskNova hesabınızla giriş yapın.",
  "Profil sayfasında Gizlilik ve Onaylar sekmesine gidin.",
  "Verilerimi Sil bölümünde talep nedeninizi yazın.",
  "Silme talebi oluştur düğmesiyle talebinizi gönderin.",
];

export default function DeleteAccountPage() {
  return (
    <main className="flex min-h-screen flex-col bg-background">
      <PublicHeader />
      <section className="mx-auto w-full max-w-4xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold uppercase text-amber-700">RiskNova Veri Haklari</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground">
          Hesap ve Veri Silme Talebi
        </h1>
        <p className="mt-4 text-base leading-8 text-muted-foreground">
          RiskNova kullanicilari hesaplarinin ve hesapla iliskili kisisel verilerinin
          silinmesini uygulama icinden talep edebilir. Talep olusturulduktan sonra silme
          sureci idari kontrol ve saklama politikalarina gore islenir.
        </p>

        <section className="mt-10 rounded-lg border border-border bg-card p-6 shadow-sm">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Uygulama Icinden Silme Talebi
          </h2>
          <ol className="mt-5 space-y-3 text-base leading-7 text-muted-foreground">
            {steps.map((step) => (
              <li key={step} className="flex gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-amber-600" aria-hidden="true" />
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <Link
            href="/profile"
            className="mt-6 inline-flex rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700"
          >
            Profil sayfasina git
          </Link>
        </section>

        <section className="mt-8 space-y-4 text-base leading-8 text-muted-foreground">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Silinen ve Saklanabilen Veriler
          </h2>
          <p>
            Silme talebi; profil bilgileri, uygulama kayitlari, yuklenen dosyalar ve
            hesapla iliskili islem verileri icin degerlendirilir. Yasal yukumluluk,
            guvenlik kaydi, faturalama veya uyusmazlik cozumu icin saklanmasi gereken
            veriler ilgili mevzuat ve saklama politikasi kapsaminda sinirli sureyle
            korunabilir.
          </p>
          <p>
            Hesabiniza erisemiyorsaniz veya silme talebinizle ilgili yardima ihtiyaciniz
            varsa bizimle{" "}
            <a
              href="mailto:mehmet242306@gmail.com"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              mehmet242306@gmail.com
            </a>{" "}
            adresinden iletisime gecebilirsiniz.
          </p>
          <p>
            Gizlilik uygulamalarimiz hakkinda daha fazla bilgi icin{" "}
            <Link href="/privacy" className="font-medium text-foreground underline-offset-4 hover:underline">
              Gizlilik Politikasi
            </Link>{" "}
            sayfasini inceleyebilirsiniz.
          </p>
        </section>
      </section>
      <PublicLegalFooter />
    </main>
  );
}
