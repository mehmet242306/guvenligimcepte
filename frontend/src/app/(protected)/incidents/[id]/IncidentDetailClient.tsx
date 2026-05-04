"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchIncidentById,
  fetchWitnesses,
  fetchDof,
  fetchIshikawa,
  updateIncident,
  type IncidentRecord,
  type IncidentType,
  type IncidentStatus,
  type WitnessRecord,
  type DofRecord,
  type DofStatus,
  type IshikawaRecord,
} from "@/lib/supabase/incident-api";
import {
  ArrowLeft,
  FileText,
  GitBranch,
  ClipboardCheck,
  ChevronRight,
} from "lucide-react";

const typeBadgeVariant: Partial<Record<IncidentType, "danger" | "warning" | "accent">> = {
  work_accident: "danger",
  near_miss: "warning",
  occupational_disease: "accent",
};

const statusBadgeVariant: Record<IncidentStatus, "neutral" | "accent" | "warning" | "danger" | "success"> = {
  draft: "neutral",
  reported: "accent",
  investigating: "warning",
  dof_open: "danger",
  closed: "success",
};

function InfoRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="flex items-start gap-2 py-2 border-b border-border last:border-0">
      <span className="w-40 shrink-0 text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground">{value ?? "-"}</span>
    </div>
  );
}

export function IncidentDetailClient() {
  const t = useTranslations("incidents");
  const td = useTranslations("incidents.detail");
  const tdof = useTranslations("incidents.dof.status");
  const params = useParams();
  const id = params.id as string;

  const [incident, setIncident] = useState<IncidentRecord | null>(null);
  const [witnesses, setWitnesses] = useState<WitnessRecord[]>([]);
  const [dof, setDof] = useState<DofRecord | null>(null);
  const [ishikawa, setIshikawa] = useState<IshikawaRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetchIncidentById(id),
      fetchWitnesses(id),
      fetchDof(id),
      fetchIshikawa(id),
    ]).then(([inc, wit, d, ish]) => {
      setIncident(inc);
      setWitnesses(wit);
      setDof(d);
      setIshikawa(ish);
      setLoading(false);
    });
  }, [id]);

  function dofStatusLabel(s: DofStatus) {
    return tdof(s);
  }

  if (loading) {
    return (
      <div className="page-stack">
        <Skeleton className="h-12 w-64 rounded-2xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="page-stack">
        <PageHeader title={td("notFoundTitle")} />
        <Link href="/incidents" className="text-sm text-primary underline">{td("backToList")}</Link>
      </div>
    );
  }

  async function handleStatusChange(newStatus: IncidentStatus) {
    if (!incident) return;
    await updateIncident(incident.id, { status: newStatus });
    setIncident({ ...incident, status: newStatus });
  }

  const typeKey = `types.${incident.incidentType}` as const;
  const statusKey = `statuses.${incident.status}` as const;

  return (
    <div className="page-stack">
      <PageHeader
        title={incident.incidentCode}
        meta={
          <Link href="/incidents" className="text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-1 inline size-4" /> {td("incidentList")}
          </Link>
        }
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={typeBadgeVariant[incident.incidentType] ?? "neutral"}>
              {t(typeKey)}
            </Badge>
            <Badge variant={statusBadgeVariant[incident.status]}>
              {t(statusKey)}
            </Badge>
          </div>
        }
      />

      {/* DÖF / Analiz CTA Banner */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href={`/incidents/${id}/dof`}>
          <Card className={`cursor-pointer border-2 transition-all hover:shadow-[var(--shadow-elevated)] ${dof ? "border-primary/30 bg-primary/5" : "border-dashed border-border hover:border-primary/30"}`}>
            <CardContent className="flex items-center gap-4 p-6">
              <span className="inline-flex size-12 items-center justify-center rounded-xl bg-[var(--gold-glow)]">
                <ClipboardCheck className="size-6 text-[var(--gold)]" strokeWidth={1.5} />
              </span>
              <div className="flex-1">
                <p className="text-base font-semibold text-foreground">
                  {dof ? td("dofCtaWithCode", { code: dof.dofCode }) : td("dofCtaStart")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {dof
                    ? td("dofCtaStatusLine", { status: dofStatusLabel(dof.status) })
                    : td("dofCtaSub")}
                </p>
              </div>
              <ChevronRight className="size-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>

        <Link href={`/incidents/${id}/ishikawa`}>
          <Card className={`cursor-pointer border-2 transition-all hover:shadow-[var(--shadow-elevated)] ${ishikawa ? "border-primary/30 bg-primary/5" : "border-dashed border-border hover:border-primary/30"}`}>
            <CardContent className="flex items-center gap-4 p-6">
              <span className="inline-flex size-12 items-center justify-center rounded-xl bg-[var(--gold-glow)]">
                <GitBranch className="size-6 text-[var(--gold)]" strokeWidth={1.5} />
              </span>
              <div className="flex-1">
                <p className="text-base font-semibold text-foreground">
                  {ishikawa ? td("ishikawaCtaHas") : td("ishikawaCtaEmpty")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {ishikawa?.rootCauseConclusion || td("ishikawaSubDefault")}
                </p>
              </div>
              <ChevronRight className="size-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.4fr]">
        {/* Sol: Detaylar */}
        <div className="space-y-6">
          {/* Olay Detayları */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="size-5 text-[var(--gold)]" />
                {td("sectionDetails")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <InfoRow label={td("fields.incidentDate")} value={incident.incidentDate} />
              <InfoRow label={td("fields.incidentTime")} value={incident.incidentTime} />
              <InfoRow label={td("fields.location")} value={incident.incidentLocation} />
              <InfoRow label={td("fields.department")} value={incident.incidentDepartment} />
              <InfoRow label={td("fields.shift")} value={incident.shiftStartTime && incident.shiftEndTime ? `${incident.shiftStartTime} - ${incident.shiftEndTime}` : null} />
              <InfoRow label={td("fields.generalActivity")} value={incident.generalActivity} />
              <InfoRow label={td("fields.specificActivity")} value={incident.specificActivity} />
              <InfoRow label={td("fields.toolUsed")} value={incident.toolUsed} />
              <InfoRow label={td("fields.company")} value={incident.companyName} />
              <InfoRow label={td("fields.personnel")} value={incident.personnelName} />
            </CardContent>
          </Card>

          {/* Açıklama */}
          {incident.description && (
            <Card>
              <CardHeader><CardTitle>{td("sectionDescription")}</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm leading-7 text-foreground">{incident.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Yaralanma / Hastalık */}
          {incident.incidentType !== "near_miss" && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {incident.incidentType === "occupational_disease" ? td("sectionOccupationalDisease") : td("sectionInjury")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {incident.incidentType === "work_accident" ? (
                  <>
                    <InfoRow label={td("fields.injuryType")} value={incident.injuryType} />
                    <InfoRow label={td("fields.injuryBodyPart")} value={incident.injuryBodyPart} />
                    <InfoRow label={td("fields.injuryCauseEvent")} value={incident.injuryCauseEvent} />
                    <InfoRow label={td("fields.injuryCauseTool")} value={incident.injuryCauseTool} />
                    <InfoRow label={td("fields.workDisability")} value={incident.workDisability ? td("yes") : td("no")} />
                    <InfoRow label={td("fields.daysLost")} value={incident.daysLost} />
                  </>
                ) : (
                  <>
                    <InfoRow label={td("fields.diseaseAgent")} value={incident.diseaseAgent} />
                    <InfoRow label={td("fields.diseaseAgentDuration")} value={incident.diseaseAgentDuration} />
                    <InfoRow label={td("fields.diseaseDiagnosis")} value={incident.diseaseDiagnosis} />
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Tıbbi Müdahale */}
          {incident.medicalIntervention && (
            <Card>
              <CardHeader><CardTitle>{td("sectionMedical")}</CardTitle></CardHeader>
              <CardContent>
                <InfoRow label={td("fields.medicalPerson")} value={incident.medicalPerson} />
                <InfoRow label={td("fields.medicalLocation")} value={incident.medicalLocation} />
                <InfoRow label={td("fields.medicalCity")} value={incident.medicalCity} />
                <InfoRow label={td("fields.medicalDate")} value={incident.medicalDate} />
              </CardContent>
            </Card>
          )}

          {/* Şahitler */}
          {witnesses.length > 0 && (
            <Card>
              <CardHeader><CardTitle>{td("sectionWitnesses", { count: witnesses.length })}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {witnesses.map((w) => (
                  <div key={w.id} className="rounded-xl border border-border bg-muted/50 p-4">
                    <p className="text-sm font-medium text-foreground">{w.fullName}</p>
                    <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {w.tcIdentity && <span>{td("witnessTc")}: {w.tcIdentity}</span>}
                      {w.phone && <span>{td("witnessTel")}: {w.phone}</span>}
                      {w.email && <span>{w.email}</span>}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sağ: Aksiyonlar */}
        <div className="space-y-4">
          {/* Durum Değiştir */}
          <Card>
            <CardHeader><CardTitle>{td("sectionStatusMgmt")}</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {(["reported", "investigating", "dof_open", "closed"] as IncidentStatus[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={incident.status === s}
                  onClick={() => handleStatusChange(s)}
                  className={`w-full rounded-xl border px-4 py-2.5 text-left text-sm font-medium transition-all ${
                    incident.status === s
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-foreground hover:border-primary/30"
                  }`}
                >
                  {t(`statuses.${s}`)}
                </button>
              ))}
            </CardContent>
          </Card>

          {/* DÖF */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><ClipboardCheck className="size-4 text-[var(--gold)]" /> {td("sidebarDof")}</CardTitle></CardHeader>
            <CardContent>
              {dof ? (
                <Link href={`/incidents/${id}/dof`} className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{dof.dofCode}</p>
                    <Badge variant={dof.status === "completed" ? "success" : dof.status === "open" ? "danger" : "warning"}>
                      {dofStatusLabel(dof.status)}
                    </Badge>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Link>
              ) : (
                <Link href={`/incidents/${id}/dof`}>
                  <Button variant="outline" className="w-full">{td("createDof")}</Button>
                </Link>
              )}
            </CardContent>
          </Card>

          {/* İshikawa */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><GitBranch className="size-4 text-[var(--gold)]" /> {td("sidebarIshikawa")}</CardTitle></CardHeader>
            <CardContent>
              {ishikawa ? (
                <Link href={`/incidents/${id}/ishikawa`} className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{td("fishboneAnalysis")}</p>
                    <p className="text-xs text-muted-foreground">{ishikawa.rootCauseConclusion || td("ishikawaSubProgress")}</p>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Link>
              ) : (
                <Link href={`/incidents/${id}/ishikawa`}>
                  <Button variant="outline" className="w-full">{td("createIshikawa")}</Button>
                </Link>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
