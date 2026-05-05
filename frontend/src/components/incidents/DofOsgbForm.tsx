"use client";

import { useTranslations } from "next-intl";
import { Trash2, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { exportDofPdf } from "@/lib/dof-pdf-template";
import type { CorrectiveActionAiSuggestion } from "@/lib/incidents/ai";

export type DofFormType = "duzeltici" | "onleyici" | "ramak_kala" | "kaza" | "uygunsuzluk" | "tehlike";
export type DofResult = "kaldirildi" | "kaldirilmadi" | "";

export interface DofOsgbExtra {
  formuDolduran?: { adSoyad: string; tc: string; firma: string; imza: string };
  formuTuru?: DofFormType[];
  formuTarihi?: string;
  formuYeri?: string;
  formuTanimi?: string;
  formuOnaylayan?: { adSoyad: string; tc: string; firmaGorev: string; imza: string; aksiyon: string; termin: string };
  sonuc?: DofResult;
  formuKapatan?: { adSoyad: string; tc: string; firmaGorev: string; imza: string };
}

export type DofFormData = CorrectiveActionAiSuggestion & DofOsgbExtra;

interface DofOsgbFormProps {
  index: number;
  data: DofFormData;
  onChange: (patch: Partial<DofFormData>) => void;
  onRemove: () => void;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[180px_1fr] border-t border-border">
      <div className="border-r border-border bg-muted/40 px-3 py-2 text-xs font-semibold text-foreground">{label}</div>
      <div className="px-3 py-2">{children}</div>
    </div>
  );
}

function TextField({ value, onChange, placeholder, type = "text" }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-8 w-full rounded border border-border bg-input px-2 text-xs text-foreground"
    />
  );
}

function TextArea({ value, onChange, placeholder, rows = 2 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full resize-y rounded border border-border bg-input px-2 py-1.5 text-xs leading-5 text-foreground"
    />
  );
}

export function DofOsgbForm({ index, data, onChange, onRemove }: DofOsgbFormProps) {
  const t = useTranslations("incidents.dofOsgbForm");
  const dolduran = data.formuDolduran ?? { adSoyad: "", tc: "", firma: "", imza: "" };
  const onaylayan = data.formuOnaylayan ?? { adSoyad: "", tc: "", firmaGorev: "", imza: "", aksiyon: "", termin: "" };
  const kapatan = data.formuKapatan ?? { adSoyad: "", tc: "", firmaGorev: "", imza: "" };
  const formTuru = data.formuTuru ?? [];
  const sonuc = data.sonuc ?? "";
  const formTypes: { key: DofFormType; label: string }[] = [
    { key: "duzeltici", label: t("formTypes.duzeltici") },
    { key: "onleyici", label: t("formTypes.onleyici") },
    { key: "ramak_kala", label: t("formTypes.ramakKala") },
    { key: "kaza", label: t("formTypes.kaza") },
    { key: "uygunsuzluk", label: t("formTypes.uygunsuzluk") },
    { key: "tehlike", label: t("formTypes.tehlike") },
  ];

  function handleExportPdf() {
    exportDofPdf([data], t("titleWithIndex", { index: index + 1 }));
  }

  return (
    <div className="overflow-hidden rounded-2xl border-2 border-border bg-card">
      {/* Başlık */}
      <div className="flex items-center justify-between border-b-2 border-border bg-[var(--gold)]/10 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-foreground">{t("titleWithIndex", { index: index + 1 })}</span>
          <Badge variant={data.priority === "Kritik" ? "danger" : data.priority === "Yüksek" ? "warning" : "neutral"}>
            {data.priority}
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={handleExportPdf} className="flex items-center gap-1 text-xs text-primary hover:underline">
            <Download className="size-3.5" /> {t("actions.pdf")}
          </button>
          <button type="button" onClick={onRemove} className="flex items-center gap-1 text-xs text-danger hover:underline">
            <Trash2 className="size-3.5" /> {t("actions.delete")}
          </button>
        </div>
      </div>

      {/* FORMU DOLDURAN */}
      <div className="border-b border-border bg-muted/20 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {t("sections.filledBy")}
      </div>
      <Row label={t("fields.fullName")}>
        <TextField value={dolduran.adSoyad} onChange={(v) => onChange({ formuDolduran: { ...dolduran, adSoyad: v } })} />
      </Row>
      <Row label={t("fields.tcId")}>
        <TextField value={dolduran.tc} onChange={(v) => onChange({ formuDolduran: { ...dolduran, tc: v } })} />
      </Row>
      <Row label={t("fields.company")}>
        <TextField value={dolduran.firma} onChange={(v) => onChange({ formuDolduran: { ...dolduran, firma: v } })} />
      </Row>
      <Row label={t("fields.signature")}>
        <TextField value={dolduran.imza} onChange={(v) => onChange({ formuDolduran: { ...dolduran, imza: v } })} placeholder={t("placeholders.signature")} />
      </Row>

      {/* FORMUN */}
      <div className="border-b border-t border-border bg-muted/20 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {t("sections.form")}
      </div>
      <Row label={t("fields.type")}>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          {formTypes.map((item) => {
            const checked = formTuru.includes(item.key);
            return (
              <label key={item.key} className="flex cursor-pointer items-center gap-1.5 text-xs text-foreground">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? [...formTuru, item.key]
                      : formTuru.filter((x) => x !== item.key);
                    onChange({ formuTuru: next });
                  }}
                  className="size-3.5"
                />
                {item.label}
              </label>
            );
          })}
        </div>
      </Row>
      <Row label={t("fields.date")}>
        <TextField type="date" value={data.formuTarihi ?? ""} onChange={(v) => onChange({ formuTarihi: v })} />
      </Row>
      <Row label={t("fields.place")}>
        <TextField value={data.formuYeri ?? ""} onChange={(v) => onChange({ formuYeri: v })} placeholder={t("placeholders.locationUnit")} />
      </Row>
      <Row label={t("fields.description")}>
        <TextArea value={data.formuTanimi ?? ""} onChange={(v) => onChange({ formuTanimi: v })} placeholder={t("placeholders.incidentDesc")} />
      </Row>
      <Row label={t("fields.rootCause")}>
        <TextArea value={data.root_cause} onChange={(v) => onChange({ root_cause: v })} />
      </Row>
      <Row label={t("fields.solutionProposal")}>
        <TextArea
          value={[data.corrective_action, data.preventive_action].filter(Boolean).join("\n\n")}
          onChange={(v) => {
            const parts = v.split(/\n\n+/);
            onChange({ corrective_action: parts[0] ?? "", preventive_action: parts.slice(1).join("\n\n") });
          }}
          placeholder={t("placeholders.solutionProposal")}
          rows={4}
        />
      </Row>

      {/* FORMU ONAYLAYAN */}
      <div className="border-b border-t border-border bg-muted/20 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {t("sections.approvedBy")}
      </div>
      <Row label={t("fields.fullName")}>
        <TextField value={onaylayan.adSoyad} onChange={(v) => onChange({ formuOnaylayan: { ...onaylayan, adSoyad: v } })} />
      </Row>
      <Row label={t("fields.tcId")}>
        <TextField value={onaylayan.tc} onChange={(v) => onChange({ formuOnaylayan: { ...onaylayan, tc: v } })} />
      </Row>
      <Row label={t("fields.companyRole")}>
        <TextField value={onaylayan.firmaGorev} onChange={(v) => onChange({ formuOnaylayan: { ...onaylayan, firmaGorev: v } })} placeholder={data.suggested_role} />
      </Row>
      <Row label={t("fields.signature")}>
        <TextField value={onaylayan.imza} onChange={(v) => onChange({ formuOnaylayan: { ...onaylayan, imza: v } })} />
      </Row>
      <Row label={t("fields.actionsToTake")}>
        <TextArea value={onaylayan.aksiyon} onChange={(v) => onChange({ formuOnaylayan: { ...onaylayan, aksiyon: v } })} />
      </Row>
      <Row label={t("fields.deadlinePeriod")}>
        <TextField value={onaylayan.termin} onChange={(v) => onChange({ formuOnaylayan: { ...onaylayan, termin: v } })} placeholder={t("placeholders.days", { days: data.suggested_deadline_days })} />
      </Row>

      {/* SONUÇ */}
      <div className="border-b border-t border-border bg-muted/20 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {t("sections.result")}
      </div>
      <Row label={t("fields.status")}>
        <div className="flex flex-wrap gap-x-6 gap-y-1.5">
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-foreground">
            <input type="radio" checked={sonuc === "kaldirildi"} onChange={() => onChange({ sonuc: "kaldirildi" })} className="size-3.5" />
            {t("resultOptions.removed")}
          </label>
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-foreground">
            <input type="radio" checked={sonuc === "kaldirilmadi"} onChange={() => onChange({ sonuc: "kaldirilmadi" })} className="size-3.5" />
            {t("resultOptions.notRemoved")}
          </label>
        </div>
      </Row>

      {/* FORMU KAPATAN */}
      <div className="border-b border-t border-border bg-muted/20 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {t("sections.closedBy")}
      </div>
      <Row label={t("fields.fullName")}>
        <TextField value={kapatan.adSoyad} onChange={(v) => onChange({ formuKapatan: { ...kapatan, adSoyad: v } })} />
      </Row>
      <Row label={t("fields.tcId")}>
        <TextField value={kapatan.tc} onChange={(v) => onChange({ formuKapatan: { ...kapatan, tc: v } })} />
      </Row>
      <Row label={t("fields.companyRole")}>
        <TextField value={kapatan.firmaGorev} onChange={(v) => onChange({ formuKapatan: { ...kapatan, firmaGorev: v } })} />
      </Row>
      <Row label={t("fields.signature")}>
        <TextField value={kapatan.imza} onChange={(v) => onChange({ formuKapatan: { ...kapatan, imza: v } })} />
      </Row>
    </div>
  );
}
