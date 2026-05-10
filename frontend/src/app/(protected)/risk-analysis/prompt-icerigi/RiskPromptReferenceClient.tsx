"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ALL_RISK_ANALYSIS_METHODS,
  getRiskAnalysisPromptBundle,
  type RiskAnalysisMethod,
  RISK_ANALYSIS_PROMPT_VERSION,
} from "@/lib/ai/analyze-risk-prompts";

export function RiskPromptReferenceClient() {
  const [method, setMethod] = useState<RiskAnalysisMethod>("r_skor");
  const [locale, setLocale] = useState("tr");
  const bundle = useMemo(
    () => getRiskAnalysisPromptBundle(method, locale),
    [method, locale],
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 pb-16">
      <div className="space-y-2">
        <p className="text-muted-foreground text-sm">
          <Link href="/risk-analysis" className="text-primary underline-offset-4 hover:underline">
            ← Risk analizi
          </Link>
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">AI görsel analizi — tam prompt metni</h1>
        <p className="text-muted-foreground max-w-3xl text-sm leading-relaxed">
          Aşağıdaki bloklar,{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">POST /api/analyze-risk</code> için kodda
          üretilen <strong>sistem</strong> ve <strong>kullanıcı</strong> prompt’larıdır. Gerçek istekte buna{" "}
          <strong>firma bağlamı</strong> (varsa) ve <strong>base64 görsel</strong> eklenir; süre sınırı (
          <code className="rounded bg-muted px-1 py-0.5 text-xs">executeWithResilience</code> içindeki{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">timeoutMs</code>) Anthropic yanıtı gelmeden önce
          kesilirse &quot;geçici olarak kullanılamıyor (zaman aşımı)&quot; mesajını görürsünüz — bu, modelin
          yanıt süresinin üretimde uzun olmasından kaynaklanır; Vercel{' '}
          <strong>Function max duration</strong> ayarı da toplam süreyi sınırlar.
        </p>
        <p className="text-muted-foreground text-xs">
          Prompt sürümü:{" "}
          <code className="rounded bg-muted px-1 py-0.5">{bundle.promptVersion}</code> · Repoda{" "}
          <code className="rounded bg-muted px-1 py-0.5">RISK_ANALYSIS_PROMPT_VERSION</code> ile aynı tutulmalıdır.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Analiz yöntemi</span>
          <select
            className="border-input bg-background ring-offset-background focus-visible:ring-ring rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2"
            value={method}
            onChange={(e) => setMethod(e.target.value as RiskAnalysisMethod)}
          >
            {ALL_RISK_ANALYSIS_METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Arayüz dili (çıktı dili)</span>
          <select
            className="border-input bg-background ring-offset-background focus-visible:ring-ring rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2"
            value={locale}
            onChange={(e) => setLocale(e.target.value)}
          >
            <option value="tr">tr</option>
            <option value="en">en</option>
          </select>
        </label>
      </div>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Sistem prompt</h2>
        <pre className="border-border bg-muted/40 max-h-[min(70vh,560px)] overflow-auto rounded-lg border p-4 text-xs leading-relaxed whitespace-pre-wrap">
          {bundle.systemPrompt}
        </pre>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Kullanıcı prompt (metin; görsel ayrı eklenir)</h2>
        <pre className="border-border bg-muted/40 max-h-[min(70vh,560px)] overflow-auto rounded-lg border p-4 text-xs leading-relaxed whitespace-pre-wrap">
          {bundle.userPrompt}
        </pre>
      </section>

      <p className="text-muted-foreground text-xs">
        Sabit sürüm anahtarı (observability):{" "}
        <code className="rounded bg-muted px-1 py-0.5">{RISK_ANALYSIS_PROMPT_VERSION}</code>
      </p>
    </div>
  );
}
