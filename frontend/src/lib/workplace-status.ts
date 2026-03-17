import type { CompanyRecord } from "@/lib/company-directory";

export type WorkplaceRiskState = {
  label: string;
  className: string;
  score: number | null;
  description: string;
  structural: number;
  coverage: number;
  maturity: number;
  openPressure: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function getStructuralRiskScore(company: CompanyRecord) {
  let score = 25;

  if (company.hazardClass === "Az Tehlikeli") score += 10;
  if (company.hazardClass === "Tehlikeli") score += 25;
  if (company.hazardClass === "Çok Tehlikeli") score += 38;

  if (company.employeeCount >= 200) score += 18;
  else if (company.employeeCount >= 100) score += 12;
  else if (company.employeeCount >= 50) score += 8;
  else if (company.employeeCount >= 20) score += 4;

  const sector = company.sector.toLowerCase();

  if (
    sector.includes("imalat") ||
    sector.includes("metal") ||
    sector.includes("yapı") ||
    sector.includes("inşaat")
  ) {
    score += 12;
  }

  return clamp(score, 0, 100);
}

export function getOverallRiskState(company: CompanyRecord): WorkplaceRiskState {
  const structural = getStructuralRiskScore(company);
  const coverage = clamp(company.completionRate, 0, 100);
  const maturity = clamp(company.maturityScore, 0, 100);
  const openPressure = clamp(company.openRiskScore, 0, 100);

  if (coverage < 35) {
    return {
      label: "Eksik Değerlendirilmiş",
      className: "border border-slate-200 bg-slate-50 text-slate-700",
      score: null,
      description:
        "Yeterli analiz ve veri girişi olmadığı için güvenilir genel durum henüz oluşmadı.",
      structural,
      coverage,
      maturity,
      openPressure,
    };
  }

  const totalScore =
    structural * 0.3 +
    (100 - coverage) * 0.2 +
    (100 - maturity) * 0.2 +
    openPressure * 0.3;

  const normalized = Math.round(clamp(totalScore, 0, 100));

  if (normalized >= 75) {
    return {
      label: "Kritik",
      className: "border border-red-200 bg-red-50 text-red-700",
      score: normalized,
      description:
        "Açık risk baskısı ve operasyonel yük yüksek. Öncelikli müdahale gerekiyor.",
      structural,
      coverage,
      maturity,
      openPressure,
    };
  }

  if (normalized >= 55) {
    return {
      label: "Yüksek",
      className: "border border-orange-200 bg-orange-50 text-orange-700",
      score: normalized,
      description:
        "Yüksek öncelikli iyileştirme gerektiren alanlar bulunuyor.",
      structural,
      coverage,
      maturity,
      openPressure,
    };
  }

  if (normalized >= 35) {
    return {
      label: "Orta",
      className: "border border-amber-200 bg-amber-50 text-amber-700",
      score: normalized,
      description:
        "Temel yapı var ancak aktif açıklar ve takip eksikleri devam ediyor.",
      structural,
      coverage,
      maturity,
      openPressure,
    };
  }

  return {
    label: "Kontrollü",
    className: "border border-emerald-200 bg-emerald-50 text-emerald-700",
    score: normalized,
    description:
      "İşyeri genel olarak kontrol altında görünüyor. Süreklilik takibi yapılmalı.",
    structural,
    coverage,
    maturity,
    openPressure,
  };
}

export function getGuidedTasks(company: CompanyRecord) {
  const tasks: Array<{
    title: string;
    description: string;
    priority: "high" | "medium" | "low";
    actionLabel: string;
    href: string;
  }> = [];

  if (company.openRiskAssessments === 0) {
    tasks.push({
      title: "İlk risk analizini oluştur",
      description:
        "Bu işyeri için kayıtlı risk analizi görünmüyor. Firma bağlamında ilk analiz başlatılmalı.",
      priority: "high",
      actionLabel: "Risk analizine git",
      href: "/risk-analysis",
    });
  }

  if (company.overdueActions > 0) {
    tasks.push({
      title: "Gecikmiş aksiyonları kapat",
      description: `${company.overdueActions} adet gecikmiş aksiyon kaydı bulunuyor.`,
      priority: "high",
      actionLabel: "Takip alanını aç",
      href: "#tracking",
    });
  }

  if (company.expiringTrainingCount > 0) {
    tasks.push({
      title: "Eğitim yenilemelerini planla",
      description: `${company.expiringTrainingCount} personelin eğitim yenilemesi yaklaşıyor.`,
      priority: "medium",
      actionLabel: "Takip alanını aç",
      href: "#tracking",
    });
  }

  if (company.overduePeriodicControlCount > 0) {
    tasks.push({
      title: "Periyodik kontrolleri doğrula",
      description: `${company.overduePeriodicControlCount} adet gecikmiş kontrol bulunuyor.`,
      priority: "high",
      actionLabel: "Takip alanını aç",
      href: "#tracking",
    });
  }

  if (company.completionRate < 60) {
    tasks.push({
      title: "Değerlendirme kapsamını genişlet",
      description:
        "Analiz, saha ve doküman kapsamı düşük görünüyor. Firma verisi güçlendirilmeli.",
      priority: "medium",
      actionLabel: "Genel duruma git",
      href: "#overview",
    });
  }

  if (tasks.length === 0) {
    tasks.push({
      title: "Bugün kritik görev görünmüyor",
      description:
        "Süreklilik, doğrulama ve saha gözlemi ile ilerleme korunmalı.",
      priority: "low",
      actionLabel: "Dokümanları aç",
      href: "#documents",
    });
  }

  return tasks.slice(0, 4);
}

export function getReminderItems(company: CompanyRecord) {
  const reminders: string[] = [];

  if (company.overdueActions > 0) {
    reminders.push(`${company.overdueActions} adet gecikmiş aksiyon bulunuyor.`);
  }

  if (company.completionRate < 60) {
    reminders.push("Risk analizi ve doküman kapsamı düşük görünüyor.");
  }

  if (company.maturityScore < 60) {
    reminders.push("İSG olgunluk skoru düşük, takip ve planlama güçlendirilmeli.");
  }

  if (company.openRiskScore >= 70) {
    reminders.push("Açık risk baskısı yüksek, yakın tarihli saha doğrulaması önerilir.");
  }

  if (!company.lastAnalysisDate) {
    reminders.push("Son risk analizi tarihi girilmedi.");
  }

  if (!company.lastInspectionDate) {
    reminders.push("Son denetim / kontrol tarihi girilmedi.");
  }

  if (reminders.length === 0) {
    reminders.push("Yakın vadede kritik hatırlatma bulunmuyor.");
  }

  return reminders;
}
