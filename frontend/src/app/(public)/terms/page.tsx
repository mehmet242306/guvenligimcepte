import type { Metadata } from "next";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicLegalFooter } from "@/components/layout/public-legal-footer";

export const metadata: Metadata = {
  title: "Kullanım Şartları",
  description:
    "RiskNova kullanım şartları; platform erişimi, abonelik, kullanıcı sorumlulukları ve AI destekli özelliklerin kullanım koşullarını açıklar.",
  alternates: {
    canonical: "/terms",
  },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Kullanım Şartları | RiskNova",
    description:
      "RiskNova SaaS platformunun kullanım koşulları, hesap güvenliği ve kabul edilebilir kullanım kuralları.",
    type: "article",
    url: "/terms",
  },
};

const sections = [
  {
    title: "Hizmet kapsamı",
    content:
      "RiskNova, iş sağlığı ve güvenliği profesyonelleri için risk analizi, saha takibi, dokümantasyon, eğitim ve operasyon yönetimi özellikleri sunan abonelik tabanlı bir SaaS platformudur.",
  },
  {
    title: "Hesap ve erişim",
    content:
      "Kullanıcılar hesap bilgilerinin doğruluğundan, oturum güvenliğinden ve hesapları üzerinden yapılan işlemlerden sorumludur. Yetkisiz erişim şüphesi durumunda RiskNova ile derhal iletişime geçilmelidir.",
  },
  {
    title: "Kabul edilebilir kullanım",
    content:
      "Platform yalnızca yasal, profesyonel ve iş güvenliğiyle ilişkili amaçlarla kullanılmalıdır. Yetkisiz erişim denemeleri, zararlı içerik yükleme, hizmeti kötüye kullanma veya üçüncü taraf haklarını ihlal eden işlemler yasaktır.",
  },
  {
    title: "AI destekli çıktılar",
    content:
      "RiskNova AI destekli analiz ve doküman üretimi içerebilir. Bu çıktılar karar destek amacı taşır. Kullanıcılar sonuçları kendi mesleki değerlendirmeleriyle incelemekten ve geçerli mevzuata uygun hareket etmekten sorumludur.",
  },
  {
    title: "Abonelik ve ödeme",
    content:
      "Plan özellikleri, kullanım limitleri, ücretler ve faturalama dönemleri satın alma veya abonelik ekranlarında gösterilir. Ödeme işlemleri yetkili ödeme altyapıları üzerinden yürütülür.",
  },
  {
    title: "Değişiklikler ve iletişim",
    content:
      "RiskNova, ürün özelliklerini ve bu şartları zaman içinde güncelleyebilir. Önemli değişiklikler uygun kanallarla duyurulur. Sorularınız için support@getrisknova.com adresinden bizimle iletişime geçebilirsiniz.",
  },
];

export default function TermsPage() {
  return (
    <main className="flex min-h-screen flex-col bg-background">
      <PublicHeader />
      <section className="mx-auto w-full max-w-4xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold uppercase text-amber-700">
          Kullanım Şartları
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground">
          RiskNova Kullanım Şartları
        </h1>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          Son güncelleme: 30 Nisan 2026
        </p>
        <div className="mt-8 space-y-7 text-base leading-8 text-muted-foreground">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                {section.title}
              </h2>
              <p className="mt-2">{section.content}</p>
            </section>
          ))}
        </div>
      </section>
      <PublicLegalFooter />
    </main>
  );
}
