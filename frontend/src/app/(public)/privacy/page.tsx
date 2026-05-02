import type { Metadata } from "next";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicLegalFooter } from "@/components/layout/public-legal-footer";

export const metadata: Metadata = {
  title: "Gizlilik Politikası",
  description:
    "RiskNova gizlilik politikası; hesap, Google OAuth, ürün kullanımı ve güvenlik verilerinin nasıl işlendiğini açıklar.",
  alternates: {
    canonical: "/privacy",
  },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Gizlilik Politikası | RiskNova",
    description:
      "RiskNova kişisel verilerinizi nasıl toplar, Google ile oturum ve üçüncü taraf hizmetlerle nasıl paylaşır.",
    type: "article",
    url: "/privacy",
  },
};

const sections = [
  {
    title: "Topladığımız bilgiler",
    content:
      "RiskNova; hesap oluşturma, oturum açma, abonelik, destek ve ürün kullanımı için gerekli olan ad, e-posta adresi, şirket bilgileri, çalışma alanı verileri, faturalama durumu ve güvenlik kayıtlarını işleyebilir.",
  },
  {
    title: "Google OAuth kullanımı",
    content:
      "Google ile oturum açmayı seçtiğinizde RiskNova, kimliğinizi doğrulamak ve hesabınızı yönetmek için Google hesabınızdan temel profil bilgilerinizi ve e-posta adresinizi kullanır. Bu veriler reklam amacıyla satılmaz veya üçüncü taraflara pazarlanmaz.",
  },
  {
    title: "Verileri nasıl kullanırız",
    content:
      "Veriler; kullanıcı kimlik doğrulaması, platform özelliklerinin sunulması, güvenlik kontrolleri, destek taleplerinin yönetimi, ürün iyileştirme, yasal yükümlülükler ve abonelik süreçleri için kullanılır.",
  },
  {
    title: "Üçüncü taraf hizmet sağlayıcılar",
    content:
      "RiskNova; barındırma, kimlik doğrulama, ödeme, e-posta, analiz ve AI destekli özellikler için güvenilir hizmet sağlayıcılarla çalışabilir. Bu sağlayıcılar verileri yalnızca hizmetin sunulması için gerekli ölçüde işler.",
  },
  {
    title: "Kullanıcı içerikleri",
    content:
      "Platforma yüklenen risk analizleri, denetim notları, dokümanlar, eğitim içerikleri ve iş güvenliği kayıtları müşteriye ait içerik olarak kabul edilir. Bu içerikler hizmetin sağlanması dışında satılmaz.",
  },
  {
    title: "Haklarınız ve iletişim",
    content:
      "Kişisel verilerinize erişim, düzeltme, dışa aktarma veya silme talepleri için bizimle support@getrisknova.com üzerinden iletişime geçebilirsiniz. Bazı kayıtlar yasal, güvenlik veya operasyonel saklama gereklilikleri nedeniyle sınırlı süre korunabilir.",
  },
];

export default async function PrivacyPage() {
  return (
    <main className="flex min-h-screen flex-col bg-background">
      <PublicHeader />
      <section className="mx-auto w-full max-w-4xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold uppercase text-amber-700">
          Gizlilik Politikası
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground">
          RiskNova Gizlilik Politikası
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
