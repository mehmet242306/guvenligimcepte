/**
 * One-off maintenance: merge `legal.*` trees into en.json / tr.json from existing
 * public legal TSX sources. Run: node scripts/merge-legal-static-messages.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appPublic = path.join(__dirname, "..", "src", "app", "(public)");
const messagesDir = path.join(__dirname, "..", "messages");

function read(rel) {
  return fs.readFileSync(path.join(appPublic, rel), "utf8");
}

/** Extract `const name = [ ... ];` JavaScript array literal (first match). */
function extractConstArrayLiteral(src, constName) {
  const needle = `const ${constName} = `;
  const idx = src.indexOf(needle);
  if (idx === -1) throw new Error(`Missing ${constName}`);
  let i = idx + needle.length;
  while (i < src.length && /\s/.test(src[i])) i++;
  if (src[i] !== "[") throw new Error(`${constName} not an array`);
  let depth = 0;
  const start = i;
  for (; i < src.length; i++) {
    const c = src[i];
    if (c === "[" || c === "{") depth++;
    else if (c === "]" || c === "}") {
      depth--;
      if (depth === 0) {
        const slice = src.slice(start, i + 1);
        return new Function(`return (${slice})`)();
      }
    }
  }
  throw new Error(`Unclosed array ${constName}`);
}

function extractMainParagraphs(tsx) {
  const out = [];
  const re = /<p>\s*([\s\S]*?)\s*<\/p>/g;
  let m;
  while ((m = re.exec(tsx))) {
    const inner = m[1].replace(/\s+/g, " ").trim();
    if (inner.startsWith("{")) continue;
    out.push(inner);
  }
  return out;
}

function legalFromMessages(locale, branch, field) {
  const p = path.join(messagesDir, `${locale}.json`);
  if (!fs.existsSync(p)) return null;
  const j = JSON.parse(fs.readFileSync(p, "utf8"));
  const v = j.legal?.[branch]?.[field];
  return Array.isArray(v) && v.length ? v : null;
}

/** Prefer inline TSX literals when present; otherwise keep existing `messages/*.json` (pages may use i18n-only sources). */
function tryExtractSections(rel, constName) {
  try {
    const src = read(rel);
    if (!src.includes(`const ${constName}`)) return null;
    return extractConstArrayLiteral(src, constName);
  } catch {
    return null;
  }
}

function tryExtractParagraphs(rel) {
  try {
    const src = read(rel);
    const paras = extractMainParagraphs(src);
    return paras.length ? paras : null;
  } catch {
    return null;
  }
}

const privacyRel = "privacy" + path.sep + "page.tsx";
const termsRel = "terms" + path.sep + "page.tsx";
const privacyPolicyRel = "privacy-policy" + path.sep + "page.tsx";
const termsConditionsRel = "terms-and-conditions" + path.sep + "page.tsx";
const refundRel = "refund-policy" + path.sep + "page.tsx";

const privacySectionsTr =
  tryExtractSections(privacyRel, "sections") ?? legalFromMessages("tr", "privacy", "sections");
const termsSectionsTr =
  tryExtractSections(termsRel, "sections") ?? legalFromMessages("tr", "terms", "sections");
const privacySummaryEn =
  tryExtractParagraphs(privacyPolicyRel) ?? legalFromMessages("en", "privacySummary", "paragraphs");
const termsSummaryEn =
  tryExtractParagraphs(termsConditionsRel) ?? legalFromMessages("en", "termsSummary", "paragraphs");
const refundEn =
  tryExtractParagraphs(refundRel) ?? legalFromMessages("en", "refund", "paragraphs");

if (!privacySectionsTr?.length || !termsSectionsTr?.length)
  throw new Error("Missing Turkish legal sections (restore page.tsx arrays or keep legal.* in tr.json).");
if (!privacySummaryEn?.length || !termsSummaryEn?.length || !refundEn?.length)
  throw new Error("Missing English legal paragraphs (restore page.tsx <p> blocks or keep legal.* in en.json).");

const lastUpdatedTr = "Son güncelleme: 2 Mayıs 2026";
const lastUpdatedEn = "Last updated: 2 May 2026";

/** English full privacy/terms sections (aligned with Turkish source pages). */
const privacySectionsEn = [
  {
    title: "Data controller and scope",
    content:
      "This policy describes how personal data is processed across the RiskNova website, registration, sign-in, subscription, OHS modules, document generation, field inspections, training/exams/surveys, Nova AI and support. For workplace and employee records uploaded by the customer to the platform, RiskNova generally acts as a processor; for its own account, security, billing and support processes it acts as a controller.",
  },
  {
    title: "Categories of personal data",
    content:
      "Name, surname, email, phone, account identifier, organisation and workspace details, role and permission records, session and security logs, usage metrics, support tickets, subscription and payment status, IP and device data may be processed. If users upload them, risk analyses, inspections, incident logs, training, exams, surveys, documents, personnel records and media or data files may also be stored on the platform.",
  },
  {
    title: "Purposes and legal bases",
    content:
      "Data are processed to perform the contract, deliver platform features, run occupational safety processes, authenticate users, prevent abuse, bill and support customers, meet legal obligations, improve the product and respect user choices. Where explicit consent is required, a separate consent text is shown; core service data may rely on contract, legal obligation or legitimate interest instead of consent.",
  },
  {
    title: "AI-assisted features",
    content:
      "Nova AI may process user inputs and related context when producing risk analyses, document drafts, training content or legislation-aware answers. Outputs are decision-support only; final professional and legal judgement remains with the user. Where content may include sensitive or special-category data, explicit consent and/or additional disclosure flows may be required before sending it to AI services.",
  },
  {
    title: "Third-party processors",
    content:
      "Hosting, database, authentication, email, payment, error monitoring and AI features may use providers such as Supabase, Vercel, Resend, Paddle, OpenAI, Anthropic and similar vendors. They process data only as needed to provide the service. Card data are not stored by RiskNova; payments and invoicing run on Paddle infrastructure.",
  },
  {
    title: "International transfers",
    content:
      "Cloud hosting, email, payment and AI services may technically run on infrastructure located abroad, so some data may be transferred to providers outside your country where the service requires it. Where transfers apply, disclosure and consent steps under applicable law (including KVKK where relevant) are managed in the product.",
  },
  {
    title: "Cookies and similar technologies",
    content:
      "RiskNova uses essential session, security, language preference and product cookies. If marketing or third-party tracking cookies are introduced, a separate cookie policy and consent mechanism will be provided as needed. Details are on the /cookie-policy page.",
  },
  {
    title: "Retention and security",
    content:
      "Data are kept for as long as needed to operate the service, meet contractual, security, legal and evidentiary requirements. The platform uses technical measures such as RLS, role checks, separation of service roles, webhook signature verification, rate limiting, audit trails and security event logging.",
  },
  {
    title: "Your rights",
    content:
      "Under applicable data-protection law (including KVKK Article 11 where it applies), you may request access, rectification, erasure, objection, restriction, portability and information via the Privacy / Data Rights area in your profile or at support@getrisknova.com. Erasure requests are balanced against legal retention and security logging requirements.",
  },
  {
    title: "Contact and updates",
    content:
      "This text may change over time. Material updates may require renewed acknowledgement or notice in the product. For privacy and data-protection requests, contact support@getrisknova.com.",
  },
];

const termsSectionsEn = [
  {
    title: "Service scope",
    content:
      "RiskNova is a subscription SaaS platform for occupational health and safety professionals, OSGBs and enterprises, offering risk analysis, field inspections, document generation, training/exams/surveys, reporting, legislation-aware search and Nova AI decision-support features.",
  },
  {
    title: "Account, roles and security",
    content:
      "Users are responsible for the accuracy of account details, password strength and actions taken under their account. Organisation administrators must correctly configure users, roles, workspaces and company authorisations. Suspected unauthorised access must be reported to RiskNova without delay.",
  },
  {
    title: "Acceptable use",
    content:
      "The platform may be used only for lawful, professional and workplace-safety-related purposes. Attempting unauthorised access, reverse engineering, disrupting the service, uploading harmful content, infringing third-party rights, circumventing quotas or processing data unlawfully is prohibited.",
  },
  {
    title: "Customer data and content responsibility",
    content:
      "Risk analyses, inspection records, documents, personnel data, training/exam/survey content and uploaded files are customer content. Users must ensure data uploaded to the platform is lawful, necessary and limited to authorised persons.",
  },
  {
    title: "AI-assisted outputs",
    content:
      "Nova AI and other AI features provide decision support and drafts only. RiskNova does not warrant that outputs are error-free, complete or fit for a particular legal or technical outcome. Users must validate outputs against applicable law, internal procedures and professional judgement.",
  },
  {
    title: "Subscription, billing and limits",
    content:
      "Plan features, fees, usage limits and billing periods are shown on pricing or checkout screens. Individual plans may use self-service checkout; OSGB and enterprise models may follow quote and contact flows. Payments and invoicing may be handled by Paddle as Merchant of Record.",
  },
  {
    title: "Service changes and access",
    content:
      "RiskNova may update product features, plan limits, integrations and these terms over time. Access may be temporarily restricted for security, maintenance, legal compliance or abuse prevention.",
  },
  {
    title: "Limitation of responsibility",
    content:
      "The platform is designed to streamline processes; it does not remove legal duties of employers, safety professionals or organisations. Users remain responsible for field, regulatory and expert review before relying on platform outputs.",
  },
  {
    title: "Contact",
    content:
      "For questions about these terms, subscriptions or accounts, contact support@getrisknova.com.",
  },
];

const privacySummaryTr = [
  "Bu politika, RiskNova'nın hesap, çalışma alanı, faturalama ve ürün kullanımı için işlediği kişisel verileri açıklar.",
  "Bu bilgiler; kimlik doğrulama, abonelik özellikleri, ödeme, müşteri desteği, ürün iyileştirme ve güvenlik için kullanılır. Ödeme işlemleri Paddle üzerinden yürütülür; RiskNova tam kart bilgilerini saklamaz.",
  "Kullanıcılar risk analizi bilgisi, dokümanlar, eğitim materyalleri ve denetim notları gibi iş güvenliği içeriği yükleyebilir. Bu içerik talep edilen ürün özellikleri için kullanılır ve üçüncü taraflara satılmaz.",
  "Barındırma, kimlik doğrulama, analitik, KI işleme, e-posta ve faturalama için güvenilir hizmet sağlayıcıları kullanılırız. Bu sağlayıcılar hizmeti sunmak için gerekli ölçüde veri işler.",
  "Kullanıcılar; yasal, güvenlik ve operasyonel saklama gerekliliklerine tabi olarak kişisel verilerine erişim, düzeltme, dışa aktarma veya silme talep edebilir.",
  "Gizlilik soruları veya veri talepleri için RiskNova web sitesindeki iletişim kanalları üzerinden bize ulaşabilirsiniz.",
];

const termsSummaryTr = [
  "RiskNova, iş sağlığı ve güvenliği profesyonelleri için abonelik tabanlı bir SaaS platformudur. Hesap oluşturarak veya RiskNova'yı kullanarak hizmeti yalnızca yasal mesleki güvenlik, dokümantasyon, analiz ve iş akışı yönetimi amaçlarıyla kullanmayı kabul edersiniz.",
  "Bireysel planlar self-servis mesleki kullanım içindir. OSGB ve kurumsal senaryolar ayrı ticari sözleşme ve onboarding süreci gerektirebilir.",
  "RiskNova, KI destekli analiz ve belge üretimi içerebilir. Kullanıcılar çıktıları gözden geçirmek, kendi mesleki muhakemelerini uygulamak ve yürürlükteki mevzuat, standartlar ve işyeri prosedürlerine uymakla yükümlüdür.",
  "Abonelik erişimi, limitler, faturalama dönemleri ve özellikler ödeme öncesi fiyatlandırma sayfasında gösterilir. Planları veya özellikleri zaman içinde güncelleyebiliriz; mevcut abonelikler aksi bildirilmedikçe satın alma anındaki koşullarla devam eder.",
  "Hizmeti kötüye kullanmamalı, yetkisiz erişim denememeli, yasadışı içerik yüklememeli veya RiskNova'yı zorunlu hukuki, tıbbi, mühendislik veya düzenleyici mesleki incelemenin yerine geçecek şekilde kullanmamalısınız.",
  "Bu şartlarla ilgili sorular için RiskNova web sitesindeki iletişim kanalları üzerinden bize ulaşabilirsiniz.",
];

const refundTr = [
  "RiskNova abonelikleri, ödeme sırasında seçilen plana göre aylık veya yıllık faturalandırılır.",
  "Hizmet önemli ölçüde kullanılmamışsa ve talep kötüye kullanım veya dolandırıcılık içermiyorsa, müşteriler ilk satın alma tarihinden itibaren 14 gün içinde iade talep edebilir.",
  "Yenileme ödemeleri genellikle yeni bir faturalama dönemi başladıktan sonra iade edilmez. Müşteriler gelecekteki yenilemeleri hesaplarından veya destekle iletişime geçerek iptal edebilir.",
  "Faturalama hatası, mükerrer tahsilat veya yetkisiz işlem doğrulanırsa Paddle ile birlikte sorunu düzeltiriz.",
  "İade kararları kullanım, abonelik türü, yasal gereklilikler ve Paddle faturalama kurallarına bağlı olabilir. Onaylanan iadeler Paddle aracılığıyla ödeme yöntemine iade edilir.",
  "İade talepleri için RiskNova web sitesindeki iletişim kanalları üzerinden bize ulaşın ve hesap e-postası ile sipariş ayrıntılarını ekleyin.",
];

function buildLegal(locale) {
  const isTr = locale === "tr";
  const privacySections = isTr ? privacySectionsTr : privacySectionsEn;
  const termsSections = isTr ? termsSectionsTr : termsSectionsEn;
  const privacySummary = isTr ? privacySummaryTr : privacySummaryEn;
  const termsSummary = isTr ? termsSummaryTr : termsSummaryEn;
  const refundParas = isTr ? refundTr : refundEn;

  return {
    privacy: {
      eyebrow: isTr ? "Gizlilik Politikası" : "Privacy policy",
      title: isTr ? "RiskNova Gizlilik Politikası" : "RiskNova Privacy Policy",
      lastUpdated: isTr ? lastUpdatedTr : lastUpdatedEn,
      metaTitle: isTr ? "Gizlilik Politikası" : "Privacy Policy",
      metaDescription: isTr
        ? "RiskNova gizlilik politikası; hesap, KVKK, ürün kullanımı, ödeme, e-posta, güvenlik ve AI destekli özelliklerde kişisel verilerin nasıl işlendiğini açıklar."
        : "RiskNova privacy policy: how we process personal data across accounts, product use, billing, email, security and AI-assisted features.",
      ogTitle: isTr ? "Gizlilik Politikası | RiskNova" : "Privacy Policy | RiskNova",
      ogDescription: isTr
        ? "RiskNova kişisel verileri hangi amaçlarla işler, hangi hizmet sağlayıcılarla paylaşır ve kullanıcı haklarını nasıl destekler."
        : "How RiskNova processes personal data, which processors we use and how we support user rights.",
      sections: privacySections,
    },
    privacySummary: {
      eyebrow: isTr ? "Gizlilik politikası" : "Privacy policy",
      title: isTr ? "RiskNova Gizlilik Politikası" : "RiskNova Privacy Policy",
      lastUpdated: isTr ? lastUpdatedTr : lastUpdatedEn,
      metaTitle: isTr ? "Gizlilik politikası (özet)" : "Privacy policy",
      metaDescription: isTr
        ? "RiskNova kişisel verileri nasıl toplar ve kullanır; özet gizlilik açıklaması."
        : "Summary of how RiskNova collects and uses personal data.",
      ogTitle: isTr ? "Gizlilik politikası | RiskNova" : "Privacy policy | RiskNova",
      ogDescription: isTr
        ? "Hesap, ürün kullanımı ve alt işlemciler hakkında kısa gizlilik özeti."
        : "Short privacy summary covering account, product use and subprocessors.",
      paragraphs: privacySummary,
    },
    terms: {
      eyebrow: isTr ? "Kullanım Şartları" : "Terms of use",
      title: isTr ? "RiskNova Kullanım Şartları" : "RiskNova Terms of Use",
      lastUpdated: isTr ? lastUpdatedTr : lastUpdatedEn,
      metaTitle: isTr ? "Kullanım Şartları" : "Terms of use",
      metaDescription: isTr
        ? "RiskNova kullanım şartları; hesap, abonelik, ödeme, kabul edilebilir kullanım, AI çıktıları ve müşteri verisi sorumluluklarını açıklar."
        : "RiskNova terms of use covering accounts, subscription, billing, acceptable use, AI outputs and customer data responsibilities.",
      ogTitle: isTr ? "Kullanım Şartları | RiskNova" : "Terms of use | RiskNova",
      ogDescription: isTr
        ? "RiskNova SaaS platformunun kullanım koşulları, abonelik, hesap güvenliği, AI çıktıları ve kabul edilebilir kullanım kuralları."
        : "Terms for the RiskNova SaaS platform: subscription, account security, AI outputs and acceptable use.",
      sections: termsSections,
    },
    termsSummary: {
      eyebrow: isTr ? "Hizmet şartları" : "Terms of service",
      title: isTr ? "RiskNova Hizmet Şartları" : "RiskNova Terms and Conditions",
      lastUpdated: isTr ? lastUpdatedTr : lastUpdatedEn,
      metaTitle: isTr ? "Hizmet şartları (özet)" : "Terms of service",
      metaDescription: isTr
        ? "RiskNova hizmet şartlarının özeti; kabul edilebilir kullanım ve abonelik."
        : "Summary of RiskNova terms of service, acceptable use and subscriptions.",
      ogTitle: isTr ? "Hizmet şartları | RiskNova" : "Terms of service | RiskNova",
      ogDescription: isTr
        ? "Abonelik, KI destekli özellikler ve kabul edilebilir kullanım özeti."
        : "Summary of subscription, AI-assisted features and acceptable use.",
      paragraphs: termsSummary,
    },
    refund: {
      eyebrow: isTr ? "İade politikası" : "Refund policy",
      title: isTr ? "RiskNova İade Politikası" : "RiskNova Refund Policy",
      lastUpdated: isTr ? lastUpdatedTr : lastUpdatedEn,
      metaTitle: isTr ? "İade politikası" : "Refund policy",
      metaDescription: isTr
        ? "RiskNova abonelik iadeleri, yenilemeler ve Paddle faturalama kurallarına ilişkin özet."
        : "How RiskNova handles subscription refunds, renewals and Paddle billing rules.",
      ogTitle: isTr ? "İade politikası | RiskNova" : "Refund policy | RiskNova",
      ogDescription: isTr
        ? "İade penceresi, yenilemeler ve faturalama düzeltmeleri."
        : "Refund window, renewals and billing corrections.",
      paragraphs: refundParas,
    },
  };
}

function patchLocale(fileName) {
  const p = path.join(messagesDir, fileName);
  const j = JSON.parse(fs.readFileSync(p, "utf8"));
  j.legal = buildLegal(fileName.replace(".json", ""));
  fs.writeFileSync(p, JSON.stringify(j, null, 2) + "\n");
}

for (const loc of ["en", "tr"]) {
  patchLocale(`${loc}.json`);
}

const enPath = path.join(messagesDir, "en.json");
const enLegal = JSON.parse(fs.readFileSync(enPath, "utf8")).legal;
const bootstrapLocales = ["ar", "az", "de", "es", "fr", "hi", "id", "ja", "ko", "ru", "zh"];
for (const loc of bootstrapLocales) {
  const p = path.join(messagesDir, `${loc}.json`);
  const j = JSON.parse(fs.readFileSync(p, "utf8"));
  j.legal = structuredClone(enLegal);
  fs.writeFileSync(p, JSON.stringify(j, null, 2) + "\n");
}

const enFull = JSON.parse(fs.readFileSync(enPath, "utf8"));
const demoModal = enFull.auth.demoModal;
const commonExtra = {
  retry: enFull.common.retry,
  genericError: enFull.common.genericError,
  emptyTitle: enFull.common.emptyTitle,
  emptyDescription: enFull.common.emptyDescription,
};
for (const loc of bootstrapLocales) {
  const p = path.join(messagesDir, `${loc}.json`);
  const j = JSON.parse(fs.readFileSync(p, "utf8"));
  j.auth.demoModal = structuredClone(demoModal);
  Object.assign(j.common, commonExtra);
  fs.writeFileSync(p, JSON.stringify(j, null, 2) + "\n");
}

console.log(
  "Merged legal.* into en/tr; bootstrapped legal + auth.demoModal + common keys for:",
  bootstrapLocales.join(", "),
);
