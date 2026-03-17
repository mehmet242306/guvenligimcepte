"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  loadCompanyDirectory,
  saveCompanyDirectory,
  type CompanyRecord,
} from "@/lib/company-directory";
import {
  getGuidedTasks,
  getOverallRiskState,
  getReminderItems,
} from "@/lib/workplace-status";

type WorkspaceTab =
  | "overview"
  | "structure"
  | "risk"
  | "people"
  | "tracking"
  | "documents"
  | "history"
  | "digital_twin";

function buildMockDocuments(company: CompanyRecord) {
  return [
    {
      title: `${company.shortName || company.name} Risk Analizi Raporu`,
      type: "Risk Analizi",
      status: "Güncel",
    },
    {
      title: `${company.shortName || company.name} Acil Durum Planı`,
      type: "Acil Durum",
      status: "Kontrol Gerekli",
    },
    {
      title: `${company.shortName || company.name} Eğitim Planı`,
      type: "Eğitim",
      status: "Aktif",
    },
    {
      title: `${company.shortName || company.name} Periyodik Kontrol Takibi`,
      type: "Periyodik Kontrol",
      status: "İzleniyor",
    },
  ];
}

function buildMockActivities(company: CompanyRecord) {
  return [
    {
      actor: "Mehmet Yıldırım",
      role: "İş Güvenliği Uzmanı",
      action: `${company.shortName || company.name} için risk analizi gözden geçirildi.`,
      time: "Bugün · 14:20",
    },
    {
      actor: "Ayşe Demir",
      role: "İşyeri Hekimi",
      action: "Sağlık gözetimi ve eğitim planı notları güncellendi.",
      time: "Bugün · 10:05",
    },
    {
      actor: "Ali Kaya",
      role: "İşveren Vekili",
      action: "2 adet aksiyon için termin onayı verildi.",
      time: "Dün · 16:40",
    },
  ];
}

function fieldClass() {
  return "h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-[0_4px_20px_rgba(15,23,42,0.03)]";
}

function sectionCardClass() {
  return "rounded-[28px] border border-slate-200/80 bg-white/88 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.05)] backdrop-blur sm:p-6";
}

export function CompanyWorkspaceClient({
  companyId,
}: {
  companyId: string;
}) {
  const [companies, setCompanies] = useState<CompanyRecord[]>([]);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("overview");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");

  useEffect(() => {
    setCompanies(loadCompanyDirectory());
  }, []);

  const company = useMemo(
    () => companies.find((item) => item.id === companyId) ?? null,
    [companies, companyId],
  );

  const riskState = useMemo(
    () => (company ? getOverallRiskState(company) : null),
    [company],
  );

  const guidedTasks = useMemo(
    () => (company ? getGuidedTasks(company) : []),
    [company],
  );

  const reminders = useMemo(
    () => (company ? getReminderItems(company) : []),
    [company],
  );

  const documents = useMemo(
    () => (company ? buildMockDocuments(company) : []),
    [company],
  );

  const activities = useMemo(
    () => (company ? buildMockActivities(company) : []),
    [company],
  );

  function updateTextField(
    field:
      | "name"
      | "shortName"
      | "kind"
      | "address"
      | "sector"
      | "naceCode"
      | "hazardClass"
      | "shiftModel"
      | "phone"
      | "email"
      | "contactPerson"
      | "employerName"
      | "employerRepresentative"
      | "notes"
      | "lastAnalysisDate"
      | "lastInspectionDate"
      | "lastDrillDate",
    value: string,
  ) {
    setCompanies((prev) =>
      prev.map((item) =>
        item.id === companyId
          ? {
              ...item,
              [field]: value,
            }
          : item,
      ),
    );
    setMessage("");
    setMessageType("");
  }

  function updateNumberField(
    field:
      | "employeeCount"
      | "activeProfessionals"
      | "employeeRepresentativeCount"
      | "supportStaffCount"
      | "openActions"
      | "overdueActions"
      | "openRiskAssessments"
      | "documentCount"
      | "completionRate"
      | "maturityScore"
      | "openRiskScore"
      | "last30DayImprovement"
      | "completedTrainingCount"
      | "expiringTrainingCount"
      | "periodicControlCount"
      | "overduePeriodicControlCount",
    value: number,
  ) {
    setCompanies((prev) =>
      prev.map((item) =>
        item.id === companyId
          ? {
              ...item,
              [field]: Number.isFinite(value) ? value : 0,
            }
          : item,
      ),
    );
    setMessage("");
    setMessageType("");
  }

  function updateArrayField(
    field: "locations" | "departments",
    index: number,
    value: string,
  ) {
    setCompanies((prev) =>
      prev.map((item) => {
        if (item.id !== companyId) {
          return item;
        }

        const nextValues = [...item[field]];
        nextValues[index] = value;

        return {
          ...item,
          [field]: nextValues,
        };
      }),
    );
    setMessage("");
    setMessageType("");
  }

  function addArrayItem(field: "locations" | "departments") {
    setCompanies((prev) =>
      prev.map((item) =>
        item.id === companyId
          ? {
              ...item,
              [field]: [...item[field], ""],
            }
          : item,
      ),
    );
    setMessage("");
    setMessageType("");
  }

  function removeArrayItem(field: "locations" | "departments", index: number) {
    setCompanies((prev) =>
      prev.map((item) => {
        if (item.id !== companyId) {
          return item;
        }

        const nextValues = item[field].filter((_, i) => i !== index);

        return {
          ...item,
          [field]: nextValues.length > 0 ? nextValues : [""],
        };
      }),
    );
    setMessage("");
    setMessageType("");
  }

  function handleSave() {
    if (!company) return;

    if (!company.name.trim()) {
      setMessage("Firma / kurum adı boş bırakılamaz.");
      setMessageType("error");
      return;
    }

    saveCompanyDirectory(companies);
    setMessage("İşyeri çalışma alanı bilgileri kaydedildi.");
    setMessageType("success");
  }

  const tabs: Array<{ id: WorkspaceTab; label: string }> = [
    { id: "overview", label: "Genel Durum" },
    { id: "structure", label: "Yerleşke / Yapı" },
    { id: "risk", label: "Risk ve Saha" },
    { id: "people", label: "Personel" },
    { id: "tracking", label: "Takip" },
    { id: "documents", label: "Dokümanlar" },
    { id: "history", label: "Geçmiş" },
    { id: "digital_twin", label: "Dijital İkiz" },
  ];

  if (!company) {
    return (
      <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_24px_60px_rgba(15,23,42,0.06)]">
        <h1 className="text-3xl font-semibold text-slate-950">Kayıt bulunamadı</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          İstenen firma / kurum kaydı bulunamadı.
        </p>
        <Link
          href="/companies"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-2xl bg-primary px-5 text-sm font-medium text-primary-foreground shadow-[var(--shadow-soft)] transition-opacity hover:opacity-95"
        >
          Firma Listesine Dön
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[34px] border border-slate-200/80 bg-white/90 shadow-[0_24px_70px_rgba(15,23,42,0.06)]">
        <div className="border-b border-slate-200/70 bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.10),transparent_34%),linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-6 sm:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-4xl space-y-4">
              <span className="inline-flex rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                İşyeri çalışma alanı
              </span>

              <div className="space-y-3">
                <h1 className="max-w-4xl text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                  {company.name}
                </h1>

                <p className="max-w-3xl text-sm leading-8 text-slate-600 sm:text-base">
                  {company.notes ||
                    "Bu ekran işyerinin İSG operasyon merkezi olarak kullanılır."}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                  {company.kind || "Tür yok"}
                </span>
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                  {company.hazardClass || "Tehlike sınıfı yok"}
                </span>
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                  Çalışan: {company.employeeCount}
                </span>
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                  Lokasyon: {company.locations.filter(Boolean).length}
                </span>
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                  Bölüm: {company.departments.filter(Boolean).length}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row xl:justify-end">
              <Link
                href="/risk-analysis"
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-primary px-5 text-sm font-medium text-primary-foreground shadow-[var(--shadow-soft)] transition-opacity hover:opacity-95"
              >
                Risk Analizi Başlat
              </Link>

              <Link
                href="/reports"
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                Dokümanlar
              </Link>

              <Link
                href="/companies"
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                Listeye Dön
              </Link>
            </div>
          </div>
        </div>

        <div className="grid gap-0 md:grid-cols-2 xl:grid-cols-4">
          <div className="border-b border-slate-200/70 p-5 md:border-r xl:border-b-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Genel Durum
            </p>
            <div className="mt-3 flex items-center gap-3">
              {riskState ? (
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${riskState.className}`}
                >
                  {riskState.label}
                  {riskState.score !== null ? ` · ${riskState.score}/100` : ""}
                </span>
              ) : null}
            </div>
          </div>

          <div className="border-b border-slate-200/70 p-5 xl:border-b-0 xl:border-r">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Açık Aksiyon
            </p>
            <p className="mt-3 text-2xl font-semibold text-slate-950">
              {company.openActions}
            </p>
          </div>

          <div className="border-b border-slate-200/70 p-5 md:border-r xl:border-b-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Geciken İş
            </p>
            <p className="mt-3 text-2xl font-semibold text-slate-950">
              {company.overdueActions}
            </p>
          </div>

          <div className="p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Son Risk Analizi
            </p>
            <p className="mt-3 text-base font-semibold text-slate-950">
              {company.lastAnalysisDate || "-"}
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="space-y-6">
          <div className={sectionCardClass()}>
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-slate-950">
                  Bugün ne yapmalıyım?
                </h2>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  Sistem bu işyeri için öncelikli işleri öne çıkarır.
                </p>
              </div>

              {riskState ? (
                <span
                  className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${riskState.className}`}
                >
                  {riskState.label}
                  {riskState.score !== null ? ` · ${riskState.score}/100` : ""}
                </span>
              ) : null}
            </div>

            <div className="space-y-4">
              {guidedTasks.map((task, index) => (
                <div
                  key={`${task.title}-${index}`}
                  className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-2">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          task.priority === "high"
                            ? "border border-red-200 bg-red-50 text-red-700"
                            : task.priority === "medium"
                              ? "border border-amber-200 bg-amber-50 text-amber-700"
                              : "border border-emerald-200 bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {task.priority === "high"
                          ? "Yüksek Öncelik"
                          : task.priority === "medium"
                            ? "Orta Öncelik"
                            : "Düşük Öncelik"}
                      </span>

                      <p className="text-base font-semibold text-slate-950">
                        {task.title}
                      </p>

                      <p className="text-sm leading-7 text-slate-600">
                        {task.description}
                      </p>
                    </div>

                    <Link
                      href={task.href}
                      className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      {task.actionLabel}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={sectionCardClass()}>
            <div className="mb-5 flex flex-wrap gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex h-10 items-center rounded-2xl px-4 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? "bg-primary text-primary-foreground shadow-[var(--shadow-soft)]"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === "overview" ? (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    label="Firma / Kurum Adı"
                    value={company.name}
                    onChange={(event) => updateTextField("name", event.target.value)}
                  />
                  <Input
                    label="Kısa Ad"
                    value={company.shortName}
                    onChange={(event) => updateTextField("shortName", event.target.value)}
                  />
                  <Input
                    label="Tür"
                    value={company.kind}
                    onChange={(event) => updateTextField("kind", event.target.value)}
                  />
                  <Input
                    label="Sektör / Faaliyet"
                    value={company.sector}
                    onChange={(event) => updateTextField("sector", event.target.value)}
                  />
                  <Input
                    label="NACE Kodu"
                    value={company.naceCode}
                    onChange={(event) => updateTextField("naceCode", event.target.value)}
                  />

                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-slate-900">
                      Tehlike Sınıfı
                    </label>
                    <select
                      value={company.hazardClass}
                      onChange={(event) =>
                        updateTextField("hazardClass", event.target.value)
                      }
                      className={fieldClass()}
                    >
                      <option value="">Seç</option>
                      <option value="Az Tehlikeli">Az Tehlikeli</option>
                      <option value="Tehlikeli">Tehlikeli</option>
                      <option value="Çok Tehlikeli">Çok Tehlikeli</option>
                    </select>
                  </div>

                  <Input
                    label="Adres / İl / Bölge"
                    value={company.address}
                    onChange={(event) => updateTextField("address", event.target.value)}
                  />
                  <Input
                    label="Çalışan Sayısı"
                    type="number"
                    value={String(company.employeeCount)}
                    onChange={(event) =>
                      updateNumberField("employeeCount", Number(event.target.value))
                    }
                  />
                  <Input
                    label="Vardiya Düzeni"
                    value={company.shiftModel}
                    onChange={(event) =>
                      updateTextField("shiftModel", event.target.value)
                    }
                  />
                  <Input
                    label="İletişim Kişisi"
                    value={company.contactPerson}
                    onChange={(event) =>
                      updateTextField("contactPerson", event.target.value)
                    }
                  />
                  <Input
                    label="İşveren"
                    value={company.employerName}
                    onChange={(event) =>
                      updateTextField("employerName", event.target.value)
                    }
                  />
                  <Input
                    label="İşveren Vekili"
                    value={company.employerRepresentative}
                    onChange={(event) =>
                      updateTextField("employerRepresentative", event.target.value)
                    }
                  />
                  <Input
                    label="Telefon"
                    value={company.phone}
                    onChange={(event) => updateTextField("phone", event.target.value)}
                  />
                  <Input
                    label="E-posta"
                    value={company.email}
                    onChange={(event) => updateTextField("email", event.target.value)}
                  />
                </div>

                <Textarea
                  label="Firma / Kurum Notu"
                  rows={5}
                  value={company.notes}
                  onChange={(event) => updateTextField("notes", event.target.value)}
                />
              </div>
            ) : null}

            {activeTab === "structure" ? (
              <div className="grid gap-5 lg:grid-cols-2">
                <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-base font-semibold text-slate-950">
                      Lokasyonlar
                    </h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addArrayItem("locations")}
                    >
                      Lokasyon Ekle
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {company.locations.map((location, index) => (
                      <div key={`loc-${index}`} className="flex gap-2">
                        <input
                          value={location}
                          onChange={(event) =>
                            updateArrayField("locations", index, event.target.value)
                          }
                          className={fieldClass()}
                          placeholder="Lokasyon adı"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => removeArrayItem("locations", index)}
                        >
                          Sil
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-base font-semibold text-slate-950">
                      Bölümler / Birimler
                    </h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addArrayItem("departments")}
                    >
                      Bölüm Ekle
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {company.departments.map((department, index) => (
                      <div key={`dep-${index}`} className="flex gap-2">
                        <input
                          value={department}
                          onChange={(event) =>
                            updateArrayField("departments", index, event.target.value)
                          }
                          className={fieldClass()}
                          placeholder="Bölüm / birim adı"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => removeArrayItem("departments", index)}
                        >
                          Sil
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {activeTab === "risk" ? (
              <div className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Açık Risk Analizi
                    </p>
                    <p className="mt-3 text-2xl font-semibold text-slate-950">
                      {company.openRiskAssessments}
                    </p>
                  </div>

                  <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Açık Aksiyon
                    </p>
                    <p className="mt-3 text-2xl font-semibold text-slate-950">
                      {company.openActions}
                    </p>
                  </div>

                  <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Gecikmiş Aksiyon
                    </p>
                    <p className="mt-3 text-2xl font-semibold text-slate-950">
                      {company.overdueActions}
                    </p>
                  </div>

                  <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Açık Risk Baskısı
                    </p>
                    <p className="mt-3 text-2xl font-semibold text-slate-950">
                      %{company.openRiskScore}
                    </p>
                  </div>
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-5">
                  <h3 className="text-base font-semibold text-slate-950">
                    Risk ve saha yönetimi
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    Risk analizi, saha tespiti, görsel yükleme ve ileride canlı saha taraması bu işyeri bağlamında çalışır.
                  </p>

                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <Link
                      href="/risk-analysis"
                      className="inline-flex h-11 items-center justify-center rounded-2xl bg-primary px-5 text-sm font-medium text-primary-foreground shadow-[var(--shadow-soft)] transition-opacity hover:opacity-95"
                    >
                      Risk Analizi Modülüne Git
                    </Link>

                    <span className="inline-flex h-11 items-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-500">
                      Canlı saha taraması · Yakında
                    </span>
                  </div>
                </div>
              </div>
            ) : null}

            {activeTab === "people" ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Input
                  label="Aktif Profesyonel"
                  type="number"
                  value={String(company.activeProfessionals)}
                  onChange={(event) =>
                    updateNumberField("activeProfessionals", Number(event.target.value))
                  }
                />
                <Input
                  label="Çalışan Temsilcisi"
                  type="number"
                  value={String(company.employeeRepresentativeCount)}
                  onChange={(event) =>
                    updateNumberField(
                      "employeeRepresentativeCount",
                      Number(event.target.value),
                    )
                  }
                />
                <Input
                  label="Destek Elemanı"
                  type="number"
                  value={String(company.supportStaffCount)}
                  onChange={(event) =>
                    updateNumberField("supportStaffCount", Number(event.target.value))
                  }
                />
                <Input
                  label="İletişim Kişisi"
                  value={company.contactPerson}
                  onChange={(event) =>
                    updateTextField("contactPerson", event.target.value)
                  }
                />
              </div>
            ) : null}

            {activeTab === "tracking" ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Input
                  label="Tamamlanan Eğitim"
                  type="number"
                  value={String(company.completedTrainingCount)}
                  onChange={(event) =>
                    updateNumberField(
                      "completedTrainingCount",
                      Number(event.target.value),
                    )
                  }
                />
                <Input
                  label="Yenileme Yaklaşan Eğitim"
                  type="number"
                  value={String(company.expiringTrainingCount)}
                  onChange={(event) =>
                    updateNumberField(
                      "expiringTrainingCount",
                      Number(event.target.value),
                    )
                  }
                />
                <Input
                  label="Periyodik Kontrol Sayısı"
                  type="number"
                  value={String(company.periodicControlCount)}
                  onChange={(event) =>
                    updateNumberField(
                      "periodicControlCount",
                      Number(event.target.value),
                    )
                  }
                />
                <Input
                  label="Geciken Periyodik Kontrol"
                  type="number"
                  value={String(company.overduePeriodicControlCount)}
                  onChange={(event) =>
                    updateNumberField(
                      "overduePeriodicControlCount",
                      Number(event.target.value),
                    )
                  }
                />
                <Input
                  label="Son Risk Analizi Tarihi"
                  type="date"
                  value={company.lastAnalysisDate}
                  onChange={(event) =>
                    updateTextField("lastAnalysisDate", event.target.value)
                  }
                />
                <Input
                  label="Son Denetim Tarihi"
                  type="date"
                  value={company.lastInspectionDate}
                  onChange={(event) =>
                    updateTextField("lastInspectionDate", event.target.value)
                  }
                />
                <Input
                  label="Son Tatbikat Tarihi"
                  type="date"
                  value={company.lastDrillDate}
                  onChange={(event) =>
                    updateTextField("lastDrillDate", event.target.value)
                  }
                />
                <Input
                  label="Doküman Sayısı"
                  type="number"
                  value={String(company.documentCount)}
                  onChange={(event) =>
                    updateNumberField("documentCount", Number(event.target.value))
                  }
                />
              </div>
            ) : null}

            {activeTab === "documents" ? (
              <div className="space-y-4">
                {documents.map((document) => (
                  <div
                    key={document.title}
                    className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-base font-semibold text-slate-950">
                          {document.title}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          Tür: {document.type}
                        </p>
                      </div>

                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700">
                        {document.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {activeTab === "history" ? (
              <div className="space-y-4">
                {activities.map((activity, index) => (
                  <div
                    key={`${activity.actor}-${index}`}
                    className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4"
                  >
                    <p className="text-base font-semibold text-slate-950">
                      {activity.actor}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {activity.role}
                    </p>
                    <p className="mt-3 text-sm leading-7 text-slate-700">
                      {activity.action}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      {activity.time}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}

            {activeTab === "digital_twin" ? (
              <div className="space-y-4">
                <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-5">
                  <h3 className="text-base font-semibold text-slate-950">
                    Dijital ikiz yaklaşımı
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    Bu işyeri için dijital ikiz; lokasyon, bölüm, risk analizi, saha taraması, doküman ve işlem geçmişinin tek kurumsal hafızada birleşmesiyle kurulacaktır.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-[24px] border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Bugün
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-950">
                      Operasyonel dijital ikiz temeli
                    </p>
                  </div>

                  <div className="rounded-[24px] border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Sonraki Aşama
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-950">
                      Canlı saha taraması + alan eşleme
                    </p>
                  </div>

                  <div className="rounded-[24px] border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Nihai Hedef
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-950">
                      Dinamik risk haritası
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button type="button" size="lg" onClick={handleSave}>
                Değişiklikleri Kaydet
              </Button>

              <Link
                href="/companies"
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                Listeye Dön
              </Link>
            </div>

            {message ? (
              <div
                className={`mt-5 rounded-2xl px-4 py-3 text-sm font-medium ${
                  messageType === "success"
                    ? "border border-green-200 bg-green-50 text-green-700"
                    : "border border-red-200 bg-red-50 text-red-700"
                }`}
              >
                {message}
              </div>
            ) : null}
          </div>
        </section>

        <aside className="space-y-6">
          {riskState ? (
            <div className={sectionCardClass()}>
              <h2 className="text-xl font-semibold text-slate-950">
                İşyeri Durumu
              </h2>

              <div
                className={`mt-4 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${riskState.className}`}
              >
                {riskState.label}
                {riskState.score !== null ? ` · ${riskState.score}/100` : ""}
              </div>

              <p className="mt-4 text-sm leading-7 text-slate-600">
                {riskState.description}
              </p>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Yapısal Risk
                  </p>
                  <p className="mt-2 text-xl font-semibold text-slate-950">
                    {riskState.structural}/100
                  </p>
                </div>

                <div className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Kapsam
                  </p>
                  <p className="mt-2 text-xl font-semibold text-slate-950">
                    %{riskState.coverage}
                  </p>
                </div>

                <div className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Olgunluk
                  </p>
                  <p className="mt-2 text-xl font-semibold text-slate-950">
                    %{riskState.maturity}
                  </p>
                </div>

                <div className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Açık Risk Baskısı
                  </p>
                  <p className="mt-2 text-xl font-semibold text-slate-950">
                    %{riskState.openPressure}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <div className={sectionCardClass()}>
            <h2 className="text-xl font-semibold text-slate-950">
              Yaklaşan İşler
            </h2>

            <div className="mt-4 space-y-3">
              {reminders.map((item, index) => (
                <div
                  key={`${item}-${index}`}
                  className="rounded-[22px] border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm leading-7 text-slate-700"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className={sectionCardClass()}>
            <h2 className="text-xl font-semibold text-slate-950">
              Son Hareketler
            </h2>

            <div className="mt-4 space-y-3">
              {activities.map((activity, index) => (
                <div
                  key={`side-${activity.actor}-${index}`}
                  className="rounded-[22px] border border-slate-200 bg-slate-50/70 px-4 py-4"
                >
                  <p className="text-sm font-semibold text-slate-950">
                    {activity.actor}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {activity.role}
                  </p>
                  <p className="mt-2 text-sm leading-7 text-slate-700">
                    {activity.action}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    {activity.time}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}