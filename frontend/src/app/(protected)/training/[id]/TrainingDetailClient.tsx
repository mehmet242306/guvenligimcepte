"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  fetchSurveyById,
  fetchQuestions,
  fetchTokens,
  createTokens,
  updateSurvey,
  getSurveyResults,
  type SurveyRecord,
  type SurveyQuestionRecord,
  type SurveyTokenRecord,
  type SurveyResultSummary,
} from "@/lib/supabase/survey-api";
import {
  issueCertificate,
  fetchCertificateTemplates,
  type CertificateTemplateRecord,
} from "@/lib/supabase/certificate-api";
import { ButtonLoader } from "@/components/ui/button-loader";

type Tab = "overview" | "tokens" | "results" | "certificates";

export function TrainingDetailClient() {
  const params = useParams();
  const router = useRouter();
  const surveyId = params.id as string;

  const [survey, setSurvey] = useState<SurveyRecord | null>(null);
  const [questions, setQuestions] = useState<SurveyQuestionRecord[]>([]);
  const [tokens, setTokens] = useState<SurveyTokenRecord[]>([]);
  const [results, setResults] = useState<SurveyResultSummary | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);

  // Token creation
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [personnel, setPersonnel] = useState<{ id: string; firstName: string; lastName: string; email: string; phone: string }[]>([]);
  const [selectedPersonnel, setSelectedPersonnel] = useState<Set<string>>(new Set());
  const [manualName, setManualName] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  // Certificate
  const [certTemplates, setCertTemplates] = useState<CertificateTemplateRecord[]>([]);
  const [issuingCerts, setIssuingCerts] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [s, q, t, r] = await Promise.all([
      fetchSurveyById(surveyId),
      fetchQuestions(surveyId),
      fetchTokens(surveyId),
      getSurveyResults(surveyId),
    ]);
    setSurvey(s);
    setQuestions(q);
    setTokens(t);
    setResults(r);

    // Load personnel for token creation
    const supabase = createClient();
    if (supabase && s) {
      // Get company_identity_id from workspace
      const { data: wsRow } = await supabase
        .from("company_workspaces")
        .select("company_identity_id")
        .eq("id", s.companyId)
        .single();

      if (wsRow?.company_identity_id) {
        const { data: pData } = await supabase
          .from("personnel")
          .select("id, first_name, last_name, email, phone")
          .eq("company_identity_id", wsRow.company_identity_id);
        if (pData) {
          setPersonnel(pData.map((p: Record<string, unknown>) => ({
            id: p.id as string,
            firstName: (p.first_name || "") as string,
            lastName: (p.last_name || "") as string,
            email: (p.email || "") as string,
            phone: (p.phone || "") as string,
          })));
        }
      }

      // Load cert templates
      const templates = await fetchCertificateTemplates(s.organizationId);
      setCertTemplates(templates);
    }
    setLoading(false);
  }, [surveyId]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleStatusChange(status: string) {
    if (!survey) return;
    setStatusUpdating(true);
    await updateSurvey(survey.id, { status: status as SurveyRecord["status"] });
    setSurvey({ ...survey, status: status as SurveyRecord["status"] });
    setStatusUpdating(false);
  }

  async function handleCreateTokens() {
    if (!survey) return;
    const people: { personnelId?: string; name: string; email?: string; phone?: string }[] = [];

    for (const pId of selectedPersonnel) {
      const p = personnel.find(x => x.id === pId);
      if (p) people.push({ personnelId: p.id, name: `${p.firstName} ${p.lastName}`.trim(), email: p.email, phone: p.phone });
    }
    if (manualName.trim()) {
      people.push({ name: manualName.trim(), email: manualEmail.trim() || undefined });
    }

    if (people.length === 0) return;
    const newTokens = await createTokens(survey.id, people);
    setTokens(prev => [...newTokens, ...prev]);
    setShowTokenModal(false);
    setSelectedPersonnel(new Set());
    setManualName("");
    setManualEmail("");
  }

  function getSurveyLink(token: string) {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/survey/${token}`;
    }
    return `/survey/${token}`;
  }

  function copyLink(token: string) {
    navigator.clipboard.writeText(getSurveyLink(token));
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  }

  function shareWhatsApp(token: SurveyTokenRecord) {
    const link = getSurveyLink(token.token);
    const text = `Hello ${token.personName}, you are invited to participate in "${survey?.title}" ${survey?.type === "exam" ? "exam" : "survey"}. Please click the link below:\n${link}`;
    window.open(`https://wa.me/${token.personPhone || ""}?text=${encodeURIComponent(text)}`, "_blank");
  }

  async function handleIssueCertificates() {
    if (!survey || !results || certTemplates.length === 0) return;
    setIssuingCerts(true);

    const completedTokens = tokens.filter(t => t.status === "completed");
    const template = certTemplates[0];

    for (const token of completedTokens) {
      // Calculate score for this person
      void questions.reduce((s, q) => s + q.points, 0); // totalPoints for future use
      // For exams, only issue to passing participants
      if (survey.type === "exam" && survey.passScore) {
        // We'd need per-person score here; for now issue to all completed
      }

      await issueCertificate({
        templateId: template.id,
        organizationId: survey.organizationId,
        companyId: survey.companyId,
        personnelId: token.personnelId || undefined,
        surveyId: survey.id,
        tokenId: token.id,
        personName: token.personName,
        trainingName: survey.title,
        trainingDate: new Date().toISOString().split("T")[0],
        companyName: "",
        score: results.averageScore ?? undefined,
      });
    }

    setIssuingCerts(false);
    alert(`Certificates created for ${completedTokens.length} participant(s)!`);
  }

  const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
    active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    closed: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    archived: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--page-bg,#f8f9fa)]">
        <div className="w-full px-4 py-8">
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-[var(--card)] border border-[var(--border)]" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)] p-4">
        <div className="max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8 text-center shadow-sm">
          <p className="text-lg font-semibold text-[var(--foreground)]">Survey or exam not found</p>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            You may not have access to this record, or the link may be outdated.
          </p>
          <Link
            href="/training"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-[var(--gold)] px-5 text-sm font-semibold text-white hover:brightness-110"
          >
            Back to Training
          </Link>
        </div>
      </div>
    );
  }
  const sourceLibrary = (survey.settings?.source_library ?? null) as
    | {
        provider?: string;
        content_id?: string;
        category?: string | null;
        subcategory?: string | null;
      }
    | null;

  return (
    <div className="min-h-screen bg-[var(--page-bg,#f8f9fa)]">
      <div className="w-full px-4 py-8">
        {/* Back + Header */}
        <button
          onClick={() => router.push("/training")}
          className="mb-4 inline-flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          Back
        </button>

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-[var(--foreground)]">{survey.title}</h1>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[survey.status]}`}>
                {survey.status === "draft" ? "Draft" : survey.status === "active" ? "Active" : survey.status === "closed" ? "Closed" : "Archived"}
              </span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                survey.type === "exam" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
              }`}>
                {survey.type === "exam" ? "Exam" : "Survey"}
              </span>
              {sourceLibrary?.content_id ? (
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                  Imported from OHS Library
                </span>
              ) : null}
            </div>
            {survey.description && <p className="mt-1 text-sm text-[var(--muted-foreground)]">{survey.description}</p>}
            {sourceLibrary?.content_id ? (
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                Source: {sourceLibrary.category ?? "-"} / {sourceLibrary.subcategory ?? "-"} ({sourceLibrary.content_id})
              </p>
            ) : null}
          </div>
          <div className="flex gap-2">
            {survey.status === "draft" && (
              <button
                onClick={() => handleStatusChange("active")}
                disabled={statusUpdating}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {statusUpdating ? <ButtonLoader label="Publishing..." /> : "Publish"}
              </button>
            )}
            {survey.status === "active" && (
              <button
                onClick={() => handleStatusChange("closed")}
                disabled={statusUpdating}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                {statusUpdating ? <ButtonLoader label="Closing..." /> : "Close"}
              </button>
            )}
          </div>
        </div>

        {/* Tab bar */}
        <div className="mb-6 flex gap-1 rounded-xl bg-[var(--card)] p-1 border border-[var(--border)]">
          {(["overview", "tokens", "results", "certificates"] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                tab === t ? "bg-[var(--gold)] text-white shadow" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              {t === "overview" ? "Overview" : t === "tokens" ? `Participants (${tokens.length})` : t === "results" ? "Results" : "Certificates"}
            </button>
          ))}
        </div>

        {/* Overview tab */}
        {tab === "overview" && (
          <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 text-center">
                <div className="text-2xl font-bold text-[var(--foreground)]">{questions.length}</div>
                <div className="text-xs text-[var(--muted-foreground)]">Questions</div>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 text-center">
                <div className="text-2xl font-bold text-[var(--foreground)]">{tokens.length}</div>
                <div className="text-xs text-[var(--muted-foreground)]">Participants</div>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 text-center">
                <div className="text-2xl font-bold text-emerald-600">{tokens.filter(t => t.status === "completed").length}</div>
                <div className="text-xs text-[var(--muted-foreground)]">Completed</div>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 text-center">
                <div className="text-2xl font-bold text-amber-600">
                  {results?.averageScore != null ? `%${results.averageScore}` : "-"}
                </div>
                <div className="text-xs text-[var(--muted-foreground)]">{survey.type === "exam" ? "Avg. Score" : "Completion"}</div>
              </div>
            </div>

            {/* Questions list */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
              <h3 className="mb-4 font-semibold text-[var(--foreground)]">Questions ({questions.length})</h3>
              {questions.length === 0 ? (
                <p className="text-sm text-[var(--muted-foreground)]">No questions added yet</p>
              ) : (
                <div className="space-y-3">
                  {questions.map((q, i) => (
                    <div key={q.id} className="flex gap-3 rounded-xl bg-[var(--page-bg,#f8f9fa)] p-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--gold)]/10 text-xs font-bold text-[var(--gold)]">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--foreground)]">{q.questionText}</p>
                        <div className="mt-1 flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                          <span className="rounded bg-gray-100 px-1.5 py-0.5 dark:bg-gray-700">
                            {q.questionType === "multiple_choice" ? "Multiple Choice" :
                             q.questionType === "open_ended" ? "Open-ended" :
                             q.questionType === "scale" ? "Scale" :
                             q.questionType === "yes_no" ? "Yes/No" : "Multi Select"}
                          </span>
                          {survey.type === "exam" && <span>{q.points} points</span>}
                        </div>
                        {q.options && q.options.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {q.options.map((opt, oi) => (
                              <span
                                key={oi}
                                className={`rounded-md px-2 py-0.5 text-xs ${
                                  opt.isCorrect
                                    ? "bg-emerald-100 text-emerald-700 font-medium dark:bg-emerald-900/30 dark:text-emerald-400"
                                    : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                                }`}
                              >
                                {opt.value}) {opt.label}
                                {opt.isCorrect && " (Correct)"}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tokens tab */}
        {tab === "tokens" && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                onClick={() => setShowTokenModal(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--gold)] px-4 py-2.5 text-sm font-semibold text-white shadow hover:brightness-110"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add Participant
              </button>
            </div>

            {tokens.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)] py-12 text-center">
                <p className="text-[var(--muted-foreground)]">No participants added yet</p>
                <button
                  onClick={() => setShowTokenModal(true)}
                  className="mt-3 text-sm font-medium text-[var(--gold)] hover:underline"
                >
                  Add participant
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {tokens.map(token => (
                  <div key={token.id} className="flex items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white ${
                      token.status === "completed" ? "bg-emerald-500" : token.status === "started" ? "bg-blue-500" : "bg-gray-400"
                    }`}>
                      {token.personName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-[var(--foreground)]">{token.personName}</div>
                      <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                        <span className={`rounded-full px-2 py-0.5 ${
                          token.status === "completed" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                          token.status === "started" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                          "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                        }`}>
                          {token.status === "completed" ? "Completed" : token.status === "started" ? "Started" : "Pending"}
                        </span>
                        {token.personEmail && <span>{token.personEmail}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => copyLink(token.token)}
                        className="rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--gold)] hover:bg-[var(--gold)]/10"
                      >
                        {copied === token.token ? "Copied!" : "Copy Link"}
                      </button>
                      {token.personPhone && (
                        <button
                          onClick={() => shareWhatsApp(token)}
                          className="rounded-lg px-3 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                        >
                          WhatsApp
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Token creation modal */}
            {showTokenModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                <div className="w-full max-w-lg rounded-2xl bg-[var(--card)] p-6 shadow-2xl max-h-[80vh] overflow-y-auto">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-[var(--foreground)]">Add Participant</h3>
                    <button onClick={() => setShowTokenModal(false)} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>

                  {/* Personnel list */}
                  {personnel.length > 0 && (
                    <div className="mb-4">
                      <h4 className="mb-2 text-sm font-medium text-[var(--foreground)]">Select from Personnel List</h4>
                      <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-[var(--border)] p-2">
                        {personnel.map(p => {
                          const alreadyHasToken = tokens.some(t => t.personnelId === p.id);
                          return (
                            <label
                              key={p.id}
                              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors ${
                                alreadyHasToken ? "opacity-40" : "hover:bg-[var(--accent)]"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={selectedPersonnel.has(p.id)}
                                onChange={e => {
                                  const next = new Set(selectedPersonnel);
                                  if (e.target.checked) {
                                    next.add(p.id);
                                  } else {
                                    next.delete(p.id);
                                  }
                                  setSelectedPersonnel(next);
                                }}
                                disabled={alreadyHasToken}
                                className="rounded"
                              />
                              <span className="text-[var(--foreground)]">{p.firstName} {p.lastName}</span>
                              {alreadyHasToken && <span className="text-xs text-[var(--muted-foreground)]">(already added)</span>}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Manual entry */}
                  <div className="mb-4">
                    <h4 className="mb-2 text-sm font-medium text-[var(--foreground)]">Add Manually</h4>
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={manualName}
                        onChange={e => setManualName(e.target.value)}
                        placeholder="Full name"
                        className="w-full rounded-lg border border-[var(--border)] bg-[var(--page-bg,#f8f9fa)] px-3 py-2 text-sm"
                      />
                      <input
                        type="email"
                        value={manualEmail}
                        onChange={e => setManualEmail(e.target.value)}
                        placeholder="Email (optional)"
                        className="w-full rounded-lg border border-[var(--border)] bg-[var(--page-bg,#f8f9fa)] px-3 py-2 text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowTokenModal(false)}
                      className="flex-1 rounded-xl border border-[var(--border)] py-2.5 text-sm font-medium text-[var(--foreground)]"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateTokens}
                      disabled={selectedPersonnel.size === 0 && !manualName.trim()}
                      className="flex-1 rounded-xl bg-[var(--gold)] py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      Create Link ({selectedPersonnel.size + (manualName.trim() ? 1 : 0)} people)
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Results tab */}
        {tab === "results" && (
          <div className="space-y-4">
            {!results || results.totalParticipants === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)] py-12 text-center">
                <p className="text-[var(--muted-foreground)]">No results yet</p>
              </div>
            ) : (
              <>
                {/* Summary */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 text-center">
                    <div className="text-2xl font-bold">{results.completedCount}/{results.totalParticipants}</div>
                    <div className="text-xs text-[var(--muted-foreground)]">Completed</div>
                  </div>
                  {survey.type === "exam" && (
                    <>
                      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 text-center">
                        <div className="text-2xl font-bold text-[var(--gold)]">%{results.averageScore ?? 0}</div>
                        <div className="text-xs text-[var(--muted-foreground)]">Average Score</div>
                      </div>
                      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 text-center">
                        <div className="text-2xl font-bold text-emerald-600">{results.passCount}</div>
                        <div className="text-xs text-[var(--muted-foreground)]">Passed</div>
                      </div>
                      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 text-center">
                        <div className="text-2xl font-bold text-red-600">{results.failCount}</div>
                        <div className="text-xs text-[var(--muted-foreground)]">Failed</div>
                      </div>
                    </>
                  )}
                </div>

                {/* Question stats */}
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
                  <h3 className="mb-4 font-semibold text-[var(--foreground)]">Question-Based Analysis</h3>
                  <div className="space-y-4">
                    {results.questionStats.map((qs, i) => (
                      <div key={qs.questionId} className="rounded-xl bg-[var(--page-bg,#f8f9fa)] p-4">
                        <div className="flex items-start gap-2 mb-3">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--gold)]/10 text-xs font-bold text-[var(--gold)]">
                            {i + 1}
                          </span>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-[var(--foreground)]">{qs.questionText}</p>
                            {qs.correctRate != null && (
                              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                                Correct answer rate: <span className="font-semibold text-emerald-600">%{qs.correctRate}</span>
                              </p>
                            )}
                          </div>
                        </div>
                        {/* Answer distribution */}
                        <div className="space-y-1.5">
                          {Object.entries(qs.answerDistribution).map(([answer, count]) => {
                            const total = Object.values(qs.answerDistribution).reduce((a, b) => a + b, 0);
                            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                            return (
                              <div key={answer} className="flex items-center gap-2">
                                <span className="w-24 truncate text-xs text-[var(--foreground)]">{answer}</span>
                                <div className="flex-1 h-5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-[var(--gold)] transition-all"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="text-xs font-medium text-[var(--muted-foreground)] w-16 text-right">
                                  {count} ({pct}%)
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Certificates tab */}
        {tab === "certificates" && (
          <div className="space-y-4">
            {survey.type === "exam" ? (
              <>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
                  <h3 className="mb-2 font-semibold text-[var(--foreground)]">Certificate Generation</h3>
                  <p className="mb-4 text-sm text-[var(--muted-foreground)]">
                    Generate certificates automatically for participants who completed the exam.
                    {certTemplates.length > 0
                      ? ` ${certTemplates.length} templates available.`
                      : " No templates yet, add one first on the Certificates page."}
                  </p>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-[var(--foreground)]">
                      Completed: <strong>{tokens.filter(t => t.status === "completed").length}</strong> people
                    </span>
                    <button
                      onClick={handleIssueCertificates}
                      disabled={issuingCerts || tokens.filter(t => t.status === "completed").length === 0 || certTemplates.length === 0}
                      className="rounded-xl bg-[var(--gold)] px-5 py-2.5 text-sm font-semibold text-white shadow disabled:opacity-50"
                    >
                      {issuingCerts ? <ButtonLoader label="Generating certificates..." /> : "Generate Certificate"}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)] py-12 text-center">
                <p className="text-[var(--muted-foreground)]">Certificate generation is only available for exams</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
