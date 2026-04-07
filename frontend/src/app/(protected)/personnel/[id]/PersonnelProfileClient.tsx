"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Tab = "info" | "training" | "accidents" | "nearMiss" | "health" | "ppe" | "documents";

interface PersonnelInfo {
  id: string;
  firstName: string;
  lastName: string;
  tcNo: string;
  department: string;
  position: string;
  hireDate: string;
  birthDate: string;
  phone: string;
  email: string;
  bloodType: string;
  emergencyContact: string;
  emergencyPhone: string;
  employmentStatus: string;
}

interface TrainingRecord {
  id: string;
  trainingName: string;
  trainingDate: string;
  duration: string;
  trainer: string;
  status: string;
  certificateNo: string | null;
}

interface IncidentRecord {
  id: string;
  type: string;
  date: string;
  description: string;
  severity: string;
  status: string;
}

interface HealthExamRecord {
  id: string;
  examType: string;
  examDate: string;
  doctor: string;
  result: string;
  nextExamDate: string | null;
  notes: string;
}

interface PPERecord {
  id: string;
  ppeName: string;
  issueDate: string;
  expiryDate: string | null;
  status: string;
  size: string;
}

interface DocumentRecord {
  id: string;
  name: string;
  type: string;
  uploadDate: string;
  expiryDate: string | null;
}

export function PersonnelProfileClient() {
  const params = useParams();
  const router = useRouter();
  const personnelId = params.id as string;

  const [tab, setTab] = useState<Tab>("info");
  const [loading, setLoading] = useState(true);
  const [person, setPerson] = useState<PersonnelInfo | null>(null);
  const [trainings, setTrainings] = useState<TrainingRecord[]>([]);
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [healthExams, setHealthExams] = useState<HealthExamRecord[]>([]);
  const [ppeRecords, setPpeRecords] = useState<PPERecord[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    if (!supabase) { setLoading(false); return; }

    // Load personnel info
    const { data: pData } = await supabase.from("personnel").select("*").eq("id", personnelId).single();
    if (pData) {
      setPerson({
        id: pData.id,
        firstName: pData.first_name || "",
        lastName: pData.last_name || "",
        tcNo: pData.tc_no || "",
        department: pData.department || "",
        position: pData.position || "",
        hireDate: pData.hire_date || "",
        birthDate: pData.birth_date || "",
        phone: pData.phone || "",
        email: pData.email || "",
        bloodType: pData.blood_type || "",
        emergencyContact: pData.emergency_contact_name || "",
        emergencyPhone: pData.emergency_contact_phone || "",
        employmentStatus: pData.employment_status || "active",
      });
    }

    // Load trainings
    const { data: tData } = await supabase.from("personnel_trainings").select("*").eq("personnel_id", personnelId).order("training_date", { ascending: false });
    if (tData) {
      setTrainings(tData.map((t: Record<string, unknown>) => ({
        id: t.id as string,
        trainingName: (t.training_name || "") as string,
        trainingDate: (t.training_date || "") as string,
        duration: (t.duration || "") as string,
        trainer: (t.trainer_name || "") as string,
        status: (t.status || "completed") as string,
        certificateNo: (t.certificate_no || null) as string | null,
      })));
    }

    // Load incidents
    const { data: iPersonnel } = await supabase.from("incident_personnel").select("incident_id").eq("personnel_id", personnelId);
    if (iPersonnel && iPersonnel.length > 0) {
      const incidentIds = iPersonnel.map((ip: Record<string, unknown>) => ip.incident_id as string);
      const { data: iData } = await supabase.from("incidents").select("*").in("id", incidentIds).order("incident_date", { ascending: false });
      if (iData) {
        setIncidents(iData.map((i: Record<string, unknown>) => ({
          id: i.id as string,
          type: (i.incident_type || "work_accident") as string,
          date: (i.incident_date || "") as string,
          description: (i.description || "") as string,
          severity: (i.severity || "") as string,
          status: (i.status || "reported") as string,
        })));
      }
    }

    // Load health exams
    const { data: hData } = await supabase.from("personnel_health_exams").select("*").eq("personnel_id", personnelId).order("exam_date", { ascending: false });
    if (hData) {
      setHealthExams(hData.map((h: Record<string, unknown>) => ({
        id: h.id as string,
        examType: (h.exam_type || "") as string,
        examDate: (h.exam_date || "") as string,
        doctor: (h.doctor_name || "") as string,
        result: (h.result || "") as string,
        nextExamDate: (h.next_exam_date || null) as string | null,
        notes: (h.notes || "") as string,
      })));
    }

    // Load PPE records
    const { data: ppData } = await supabase.from("personnel_ppe_records").select("*").eq("personnel_id", personnelId).order("issue_date", { ascending: false });
    if (ppData) {
      setPpeRecords(ppData.map((p: Record<string, unknown>) => ({
        id: p.id as string,
        ppeName: (p.ppe_name || "") as string,
        issueDate: (p.issue_date || "") as string,
        expiryDate: (p.expiry_date || null) as string | null,
        status: (p.status || "active") as string,
        size: (p.size || "") as string,
      })));
    }

    // Load documents
    const { data: dData } = await supabase.from("personnel_documents").select("*").eq("personnel_id", personnelId).order("created_at", { ascending: false });
    if (dData) {
      setDocuments(dData.map((d: Record<string, unknown>) => ({
        id: d.id as string,
        name: (d.document_name || "") as string,
        type: (d.document_type || "") as string,
        uploadDate: (d.created_at || "") as string,
        expiryDate: (d.expiry_date || null) as string | null,
      })));
    }

    setLoading(false);
  }, [personnelId]);

  useEffect(() => { loadData(); }, [loadData]);

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "info", label: "Genel Bilgiler" },
    { key: "training", label: "Eğitimler", count: trainings.length },
    { key: "accidents", label: "İş Kazaları", count: incidents.filter(i => i.type === "work_accident").length },
    { key: "nearMiss", label: "Ramak Kala", count: incidents.filter(i => i.type === "near_miss").length },
    { key: "health", label: "Sağlık/Muayene", count: healthExams.length },
    { key: "ppe", label: "KKD Zimmet", count: ppeRecords.length },
    { key: "documents", label: "Belgeler", count: documents.length },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--page-bg,#f8f9fa)]">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-[var(--card)] border border-[var(--border)]" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!person) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-[var(--muted-foreground)]">Personel bulunamadı</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--page-bg,#f8f9fa)]">
      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* Back */}
        <button
          onClick={() => router.back()}
          className="mb-4 inline-flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          Geri
        </button>

        {/* Profile header */}
        <div className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--gold)] text-xl font-bold text-white">
              {person.firstName.charAt(0)}{person.lastName.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--foreground)]">{person.firstName} {person.lastName}</h1>
              <div className="flex items-center gap-3 text-sm text-[var(--muted-foreground)]">
                {person.department && <span>{person.department}</span>}
                {person.position && <span>| {person.position}</span>}
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  person.employmentStatus === "active"
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                }`}>
                  {person.employmentStatus === "active" ? "Aktif" : "Ayrılmış"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="mb-6 flex overflow-x-auto gap-1 rounded-xl bg-[var(--card)] p-1 border border-[var(--border)]">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`whitespace-nowrap rounded-lg px-3 py-2.5 text-xs font-medium transition-colors ${
                tab === t.key ? "bg-[var(--gold)] text-white shadow" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              {t.label}
              {t.count !== undefined && <span className="ml-1 opacity-75">({t.count})</span>}
            </button>
          ))}
        </div>

        {/* Info tab */}
        {tab === "info" && (
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { label: "TC Kimlik No", value: person.tcNo },
              { label: "Departman", value: person.department },
              { label: "Pozisyon", value: person.position },
              { label: "İşe Giriş Tarihi", value: person.hireDate ? new Date(person.hireDate).toLocaleDateString("tr-TR") : "-" },
              { label: "Doğum Tarihi", value: person.birthDate ? new Date(person.birthDate).toLocaleDateString("tr-TR") : "-" },
              { label: "Telefon", value: person.phone },
              { label: "E-posta", value: person.email },
              { label: "Kan Grubu", value: person.bloodType },
              { label: "Acil Durumda Aranacak", value: person.emergencyContact },
              { label: "Acil Telefon", value: person.emergencyPhone },
            ].map((item, i) => (
              <div key={i} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
                <div className="text-xs text-[var(--muted-foreground)]">{item.label}</div>
                <div className="mt-1 font-medium text-[var(--foreground)]">{item.value || "-"}</div>
              </div>
            ))}
          </div>
        )}

        {/* Training tab */}
        {tab === "training" && (
          <div className="space-y-3">
            {trainings.length === 0 ? (
              <EmptyTab message="Eğitim kaydı yok" />
            ) : (
              trainings.map(t => (
                <div key={t.id} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium text-[var(--foreground)]">{t.trainingName}</div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                        <span>{t.trainingDate ? new Date(t.trainingDate).toLocaleDateString("tr-TR") : "-"}</span>
                        {t.duration && <span>| {t.duration}</span>}
                        {t.trainer && <span>| {t.trainer}</span>}
                      </div>
                    </div>
                    {t.certificateNo && (
                      <span className="rounded-full bg-[var(--gold)]/10 px-2.5 py-0.5 text-xs font-medium text-[var(--gold)]">
                        Sertifikalı
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Accidents tab */}
        {tab === "accidents" && (
          <div className="space-y-3">
            {incidents.filter(i => i.type === "work_accident").length === 0 ? (
              <EmptyTab message="İş kazası kaydı yok" />
            ) : (
              incidents.filter(i => i.type === "work_accident").map(inc => (
                <IncidentCard key={inc.id} incident={inc} />
              ))
            )}
          </div>
        )}

        {/* Near miss tab */}
        {tab === "nearMiss" && (
          <div className="space-y-3">
            {incidents.filter(i => i.type === "near_miss").length === 0 ? (
              <EmptyTab message="Ramak kala kaydı yok" />
            ) : (
              incidents.filter(i => i.type === "near_miss").map(inc => (
                <IncidentCard key={inc.id} incident={inc} />
              ))
            )}
          </div>
        )}

        {/* Health tab */}
        {tab === "health" && (
          <div className="space-y-3">
            {healthExams.length === 0 ? (
              <EmptyTab message="Sağlık muayene kaydı yok" />
            ) : (
              healthExams.map(h => (
                <div key={h.id} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium text-[var(--foreground)]">{h.examType}</div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                        <span>{h.examDate ? new Date(h.examDate).toLocaleDateString("tr-TR") : "-"}</span>
                        {h.doctor && <span>| Dr. {h.doctor}</span>}
                      </div>
                      {h.notes && <p className="mt-1 text-xs text-[var(--muted-foreground)]">{h.notes}</p>}
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      h.result === "fit" ? "bg-emerald-100 text-emerald-700" : h.result === "unfit" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"
                    }`}>
                      {h.result === "fit" ? "Uygun" : h.result === "unfit" ? "Uygun Değil" : h.result || "-"}
                    </span>
                  </div>
                  {h.nextExamDate && (
                    <div className="mt-2 text-xs text-[var(--muted-foreground)]">
                      Sonraki muayene: {new Date(h.nextExamDate).toLocaleDateString("tr-TR")}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* PPE tab */}
        {tab === "ppe" && (
          <div className="space-y-3">
            {ppeRecords.length === 0 ? (
              <EmptyTab message="KKD zimmet kaydı yok" />
            ) : (
              ppeRecords.map(p => (
                <div key={p.id} className="flex items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-[var(--foreground)]">{p.ppeName}</div>
                    <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                      <span>Teslim: {p.issueDate ? new Date(p.issueDate).toLocaleDateString("tr-TR") : "-"}</span>
                      {p.expiryDate && <span>| Son kullanma: {new Date(p.expiryDate).toLocaleDateString("tr-TR")}</span>}
                      {p.size && <span>| Beden: {p.size}</span>}
                    </div>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    p.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-700"
                  }`}>
                    {p.status === "active" ? "Aktif" : "İade"}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {/* Documents tab */}
        {tab === "documents" && (
          <div className="space-y-3">
            {documents.length === 0 ? (
              <EmptyTab message="Belge kaydı yok" />
            ) : (
              documents.map(d => (
                <div key={d.id} className="flex items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-[var(--foreground)]">{d.name}</div>
                    <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                      <span>{d.type}</span>
                      <span>| {d.uploadDate ? new Date(d.uploadDate).toLocaleDateString("tr-TR") : "-"}</span>
                      {d.expiryDate && <span>| Geçerlilik: {new Date(d.expiryDate).toLocaleDateString("tr-TR")}</span>}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyTab({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)] py-12 text-center">
      <p className="text-[var(--muted-foreground)]">{message}</p>
    </div>
  );
}

function IncidentCard({ incident }: { incident: IncidentRecord }) {
  const severityColors: Record<string, string> = {
    low: "bg-blue-100 text-blue-700",
    medium: "bg-amber-100 text-amber-700",
    high: "bg-red-100 text-red-700",
    critical: "bg-red-200 text-red-800",
  };
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-medium text-[var(--foreground)]">
            {incident.date ? new Date(incident.date).toLocaleDateString("tr-TR") : "-"}
          </div>
          {incident.description && (
            <p className="mt-1 text-sm text-[var(--muted-foreground)] line-clamp-2">{incident.description}</p>
          )}
        </div>
        {incident.severity && (
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${severityColors[incident.severity] || "bg-gray-100 text-gray-700"}`}>
            {incident.severity === "low" ? "Düşük" : incident.severity === "medium" ? "Orta" : incident.severity === "high" ? "Yüksek" : "Kritik"}
          </span>
        )}
      </div>
    </div>
  );
}
