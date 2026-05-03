"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  validateToken,
  submitResponses,
  type SurveyRecord,
  type SurveyQuestionRecord,
  type SurveyTokenRecord,
} from "@/lib/supabase/survey-api";

type Phase = "loading" | "verify" | "fill" | "completed" | "expired" | "error";

export function SurveyFillClient() {
  const params = useParams();
  const token = params.token as string;
  const t = useTranslations("publicSurvey");

  const [phase, setPhase] = useState<Phase>("loading");
  const [survey, setSurvey] = useState<SurveyRecord | null>(null);
  const [questions, setQuestions] = useState<SurveyQuestionRecord[]>([]);
  const [tokenRecord, setTokenRecord] = useState<SurveyTokenRecord | null>(null);

  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [currentQ, setCurrentQ] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [passed, setPassed] = useState<boolean | null>(null);

  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const load = useCallback(async () => {
    const result = await validateToken(token);
    if (!result || !result.valid) {
      if (result?.tokenRecord?.status === "completed") {
        setTokenRecord(result.tokenRecord);
        setPhase("completed");
      } else if (result?.tokenRecord?.expiresAt && new Date(result.tokenRecord.expiresAt) < new Date()) {
        setPhase("expired");
      } else {
        setPhase("error");
      }
      return;
    }
    setSurvey(result.survey!);
    setQuestions(result.survey?.shuffleQuestions ? shuffleArray(result.questions!) : result.questions!);
    setTokenRecord(result.tokenRecord!);
    setPhase("verify");

    if (result.survey?.type === "exam" && result.survey.timeLimitMinutes) {
      setTimeLeft(result.survey.timeLimitMinutes * 60);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (timeLeft === null || phase !== "fill") return;
    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }
    const interval = setInterval(() => setTimeLeft(prev => (prev !== null ? prev - 1 : null)), 1000);
    return () => clearInterval(interval);
  }, [timeLeft, phase]);

  function shuffleArray<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function setAnswer(questionId: string, value: unknown) {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  }

  async function handleSubmit() {
    if (!survey || !tokenRecord) return;
    setSubmitting(true);
    setSubmitError(null);

    const responseData = questions.map(q => {
      const answer = answers[q.id];
      let isCorrect: boolean | undefined;
      let qScore = 0;

      if (survey.type === "exam" && q.options) {
        if (q.questionType === "multiple_choice") {
          const correctOpt = q.options.find(o => o.isCorrect);
          isCorrect = correctOpt?.value === answer;
          qScore = isCorrect ? q.points : 0;
        } else if (q.questionType === "yes_no") {
          const correctOpt = q.options.find(o => o.isCorrect);
          isCorrect = correctOpt?.value === answer;
          qScore = isCorrect ? q.points : 0;
        }
      }

      return {
        questionId: q.id,
        answer: { value: answer },
        isCorrect,
        score: qScore,
      };
    });

    const saved = await submitResponses(survey.id, tokenRecord.id, responseData);
    if (!saved) {
      setSubmitError(t("submitError"));
      setSubmitting(false);
      return;
    }

    if (survey.type === "exam") {
      const totalPoints = questions.reduce((s, q) => s + q.points, 0);
      const earnedPoints = responseData.reduce((s, r) => s + (r.score || 0), 0);
      const pct = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
      setScore(pct);
      setPassed(survey.passScore ? pct >= survey.passScore : true);
    }

    setPhase("completed");
    setSubmitting(false);
  }

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  if (phase === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-[#b8860b] border-t-transparent" />
          <p className="text-gray-500">{t("loading")}</p>
        </div>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900">{t("invalidTitle")}</h2>
          <p className="mt-2 text-gray-500">{t("invalidDesc")}</p>
        </div>
      </div>
    );
  }

  if (phase === "expired") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900">{t("expiredTitle")}</h2>
          <p className="mt-2 text-gray-500">{t("expiredDesc")}</p>
        </div>
      </div>
    );
  }

  if (phase === "verify") {
    const verifySubtitle = survey?.type === "exam" ? t("verifySubtitleExam") : t("verifySubtitleSurvey");
    const metaParts: string[] = [t("questionCount", { count: questions.length })];
    if (survey?.type === "exam" && survey.timeLimitMinutes) {
      metaParts.push(t("minutesPipe", { minutes: survey.timeLimitMinutes }));
    }
    if (survey?.type === "exam" && survey.passScore != null) {
      metaParts.push(t("passPipe", { score: survey.passScore }));
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#b8860b]/10">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#b8860b" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900">{t("verifyTitle")}</h2>
            <p className="mt-1 text-sm text-gray-500">{verifySubtitle}</p>
          </div>

          <div className="mb-6 rounded-xl bg-gray-50 p-4 text-center">
            <p className="text-sm text-gray-500">{t("participantLabel")}</p>
            <p className="text-lg font-bold text-gray-900">{tokenRecord?.personName}</p>
          </div>

          <div className="mb-6 rounded-xl border border-[#b8860b]/20 bg-[#b8860b]/5 p-4">
            <h3 className="font-semibold text-gray-900">{survey?.title}</h3>
            {survey?.description && <p className="mt-1 text-sm text-gray-600">{survey.description}</p>}
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
              {metaParts.map((part, i) => (
                <span key={i}>{part}</span>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setPhase("fill")}
            className="w-full rounded-xl bg-[#b8860b] py-3 text-sm font-semibold text-white shadow transition-colors hover:bg-[#9a7209]"
          >
            {t("startButton", { name: tokenRecord?.personName ?? "" })}
          </button>
        </div>
      </div>
    );
  }

  if (phase === "completed") {
    const passScore = survey?.passScore ?? 0;
    let heading: string;
    let description: string;
    if (score !== null) {
      heading = passed ? t("congrats") : t("sorry");
      description = passed
        ? t("examPassDesc", { score })
        : t("examFailDesc", { score, pass: passScore });
    } else {
      heading = t("thanks");
      description = t("surveyCompleteDesc");
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-lg">
          <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${
            passed === false ? "bg-red-100" : "bg-emerald-100"
          }`}>
            {passed === false ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            )}
          </div>
          <h2 className="text-xl font-bold text-gray-900">{heading}</h2>
          <p className="mt-2 text-gray-500">{description}</p>
          {score !== null && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-lg font-bold text-gray-900">
              {`${score}%`}
            </div>
          )}
        </div>
      </div>
    );
  }

  const q = questions[currentQ];
  const progress = ((currentQ + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <div className="text-sm font-medium text-gray-900">{survey?.title}</div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">{currentQ + 1}/{questions.length}</span>
            {timeLeft !== null && (
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                timeLeft < 60 ? "bg-red-100 text-red-700 animate-pulse" : "bg-gray-100 text-gray-700"
              }`}>
                {formatTime(timeLeft)}
              </span>
            )}
          </div>
        </div>
        <div className="h-1 bg-gray-200">
          <div className="h-full bg-[#b8860b] transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="rounded-2xl bg-white p-6 shadow-lg">
          <div className="mb-6">
            <span className="mb-2 inline-block rounded-full bg-[#b8860b]/10 px-3 py-1 text-xs font-medium text-[#b8860b]">
              {t("questionBadge", { n: currentQ + 1 })}
            </span>
            <h2 className="text-lg font-semibold text-gray-900">{q.questionText}</h2>
            {q.required && <span className="text-xs text-red-500">{t("required")}</span>}
          </div>

          {q.questionType === "multiple_choice" && q.options && (
            <div className="space-y-2">
              {q.options.map((opt, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setAnswer(q.id, opt.value)}
                  className={`flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-sm transition-colors ${
                    answers[q.id] === opt.value
                      ? "border-[#b8860b] bg-[#b8860b]/5"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    answers[q.id] === opt.value
                      ? "bg-[#b8860b] text-white"
                      : "bg-gray-100 text-gray-600"
                  }`}>
                    {opt.value}
                  </span>
                  <span className="text-gray-900">{opt.label}</span>
                </button>
              ))}
            </div>
          )}

          {q.questionType === "multi_select" && q.options && (
            <div className="space-y-2">
              {q.options.map((opt, i) => {
                const selected = Array.isArray(answers[q.id]) ? (answers[q.id] as string[]).includes(opt.value) : false;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      const current = Array.isArray(answers[q.id]) ? (answers[q.id] as string[]) : [];
                      setAnswer(q.id, selected ? current.filter(v => v !== opt.value) : [...current, opt.value]);
                    }}
                    className={`flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-sm transition-colors ${
                      selected ? "border-[#b8860b] bg-[#b8860b]/5" : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs ${
                      selected ? "bg-[#b8860b] text-white" : "bg-gray-100"
                    }`}>
                      {selected ? "✓" : ""}
                    </span>
                    <span className="text-gray-900">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {q.questionType === "yes_no" && (
            <div className="flex gap-3">
              {(["yes", "no"] as const).map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setAnswer(q.id, v)}
                  className={`flex-1 rounded-xl border-2 py-4 text-center text-sm font-medium transition-colors ${
                    answers[q.id] === v
                      ? "border-[#b8860b] bg-[#b8860b]/5 text-[#b8860b]"
                      : "border-gray-200 text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {v === "yes" ? t("yes") : t("no")}
                </button>
              ))}
            </div>
          )}

          {q.questionType === "scale" && (
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setAnswer(q.id, n)}
                  className={`flex-1 rounded-xl border-2 py-4 text-center text-lg font-bold transition-colors ${
                    answers[q.id] === n
                      ? "border-[#b8860b] bg-[#b8860b] text-white"
                      : "border-gray-200 text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          )}

          {q.questionType === "open_ended" && (
            <textarea
              value={(answers[q.id] as string) || ""}
              onChange={e => setAnswer(q.id, e.target.value)}
              placeholder={t("openEndedPlaceholder")}
              rows={4}
              className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#b8860b] focus:outline-none resize-none"
            />
          )}
        </div>

        {submitError ? (
          <p
            role="alert"
            className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-center text-sm text-red-900"
          >
            {submitError}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:gap-3">
          {currentQ > 0 && (
            <button
              type="button"
              onClick={() => setCurrentQ(prev => prev - 1)}
              className="flex-1 rounded-xl border border-gray-300 bg-white py-3 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              {t("prev")}
            </button>
          )}
          {currentQ < questions.length - 1 ? (
            <button
              type="button"
              onClick={() => setCurrentQ(prev => prev + 1)}
              className="flex-1 rounded-xl bg-[#b8860b] py-3 text-sm font-semibold text-white shadow hover:bg-[#9a7209]"
            >
              {t("next")}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white shadow hover:bg-emerald-700 disabled:opacity-50"
            >
              {submitting ? t("sending") : t("submit")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
