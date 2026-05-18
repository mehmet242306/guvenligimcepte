/**
 * İnşaat sahası — analiz başarısız/kısmi durumda minimum saha doğrulama listesi.
 */

export const CONSTRUCTION_MANDATORY_RISK_HEADINGS = [
  "Yüksekten düşme",
  "Açık kenar / korkuluk eksikliği",
  "Geçici platform / iskele / kalıp güvenliği",
  "Merdiven ve güvenli erişim",
  "Donatı uçları / saplanma riski",
  "Düşen cisim riski",
  "KKD eksikliği",
  "Düzensiz çalışma zemini",
  "Alt-üst kotta eş zamanlı çalışma",
  "Yetkisiz/belgesiz çalışma — doküman kontrolü",
] as const;

export const CONSTRUCTION_SCENE_KEYWORDS =
  /inşaat|insaat|şantiye|santiye|iskele|kalıp|kalip|yüksekte|yuksekte|donatı|donati|kazı|kazi|beton|platform|merdiven|construction|scaffold/i;

export function looksLikeConstructionContext(...texts: (string | undefined)[]): boolean {
  const blob = texts.filter(Boolean).join(" ").toLowerCase();
  return CONSTRUCTION_SCENE_KEYWORDS.test(blob);
}

export function buildConstructionVerificationChecklist(): string[] {
  return CONSTRUCTION_MANDATORY_RISK_HEADINGS.map(
    (h) => `${h}: değerlendirilemedi — otomatik analiz başarısız; saha doğrulaması zorunlu`,
  );
}

export function buildConstructionDocumentChecks(): string[] {
  return [
    "MYK / mesleki yeterlilik belgesi kontrolü (görselden doğrulanamaz)",
    "Yüksekte çalışma eğitimi ve yetki belgesi kontrolü",
    "İşe giriş/periyodik sağlık raporu kontrolü",
    "Saha emniyet planı ve iş izinleri (yüksekte çalışma, sıcak iş vb.)",
  ];
}

export function buildFailureRecoveryActions(fileName: string): string[] {
  return [
    `Görseli yeniden analiz edin: ${fileName}`,
    "Manuel risk girişi (pin modu) ile saha doğrulaması yapın",
    "Görseli sıkıştırıp tekrar yükleyin veya daha net açıdan çekin",
    "İnşaat sahası ise zorunlu risk başlıklarını saha kontrol listesi ile doğrulayın",
  ];
}
