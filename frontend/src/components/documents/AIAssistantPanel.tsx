'use client';

import { useCallback, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { useLocale, useTranslations } from 'next-intl';
import {
  AlertTriangle,
  BookOpen,
  Check,
  CheckCircle2,
  Copy,
  FileText,
  Maximize2,
  MessageSquare,
  RotateCcw,
  Scale,
  Scissors,
  Send,
  Sparkles,
  Wand2,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { markdownToTipTapJSON } from '@/lib/markdown-to-tiptap';

interface CompanyDataForAI {
  sector?: string;
  hazard_class?: string;
  nace_code?: string;
  address?: string;
  city?: string;
  district?: string;
  tax_number?: string;
  employee_count?: number;
  specialist_name?: string;
}

interface AIAssistantPanelProps {
  editor: Editor | null;
  documentTitle: string;
  groupKey: string;
  companyName: string;
  companyData?: CompanyDataForAI;
}

type DocumentAiResponse = {
  content?: string;
  analysis?: string;
  response?: string;
  message?: string;
  error?: string;
  degraded?: boolean;
  queuedTaskId?: string | null;
  fallback?: {
    type?: string;
    label?: string;
  };
};

const QUICK_KEYS = ['fullDoc', 'intro', 'legal', 'regs'] as const;
const QUICK_ICONS: Record<(typeof QUICK_KEYS)[number], LucideIcon> = {
  fullDoc: Wand2,
  intro: FileText,
  legal: AlertTriangle,
  regs: BookOpen,
};

const IMPROVE_KEYS = ['professionalize', 'shorten', 'detail', 'legal'] as const;
const IMPROVE_ICONS: Record<(typeof IMPROVE_KEYS)[number], LucideIcon> = {
  professionalize: Wand2,
  shorten: Scissors,
  detail: Maximize2,
  legal: Scale,
};

function buildClientFallbackDocument(
  tf: (key: string, values?: Record<string, string>) => string,
  params: {
    documentTitle: string;
    companyName: string;
    companyData?: CompanyDataForAI;
    today: string;
  },
) {
  const { documentTitle, companyName, companyData, today } = params;
  const effectiveCompany = companyName || tf('placeholderCompany');

  return [
    `# ${documentTitle || tf('untitled')}`,
    '',
    `## ${tf('sectionCompany')}`,
    '',
    `| ${tf('tableHeaderField')} | ${tf('tableHeaderValue')} |`,
    '| --- | --- |',
    `| ${tf('rowCompany')} | ${effectiveCompany} |`,
    `| ${tf('rowSector')} | ${companyData?.sector || tf('placeholderSector')} |`,
    `| ${tf('rowHazard')} | ${companyData?.hazard_class || tf('placeholderHazard')} |`,
    `| ${tf('rowNace')} | ${companyData?.nace_code || tf('placeholderNace')} |`,
    `| ${tf('rowEmployees')} | ${companyData?.employee_count != null ? String(companyData.employee_count) : tf('placeholderEmployees')} |`,
    `| ${tf('rowDate')} | ${today} |`,
    '',
    `## ${tf('sectionPurpose')}`,
    '',
    tf('paragraphScope', { company: effectiveCompany }),
    '',
    `## ${tf('sectionImplementation')}`,
    '',
    `- ${tf('bullet1')}`,
    `- ${tf('bullet2')}`,
    `- ${tf('bullet3')}`,
    `- ${tf('bullet4')}`,
    '',
    `## ${tf('sectionLegal')}`,
    '',
    `- ${tf('legal1')}`,
    `- ${tf('legal2')}`,
    '',
    `## ${tf('sectionSignature')}`,
    '',
    `| ${tf('tableHeaderParty')} | ${tf('tableHeaderName')} | ${tf('tableHeaderSign')} | ${tf('tableHeaderDate')} |`,
    '| --- | --- | --- | --- |',
    `| ${tf('rowPreparer')} | ${companyData?.specialist_name || tf('specialistFallback')} |  | ${today} |`,
    `| ${tf('rowEmployer')} |  |  |  |`,
    '',
  ].join('\n');
}

function extractContent(data: DocumentAiResponse) {
  return data.content || data.analysis || data.response || '';
}

function extractAiMessage(data: DocumentAiResponse, fallbackMessage: string) {
  return data.message || data.error || fallbackMessage;
}

async function readDocumentAiResponse(response: Response) {
  return (await response.json().catch(() => ({}))) as DocumentAiResponse;
}

export function AIAssistantPanel({
  editor,
  documentTitle,
  groupKey,
  companyName,
  companyData,
}: AIAssistantPanelProps) {
  const locale = useLocale();
  const t = useTranslations('documentEditor.ai');
  const tf = useTranslations('documentEditor.ai.fallback');
  const tim = useTranslations('documentEditor.ai.improve');
  const terr = useTranslations('documentEditor.ai.errors');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [degraded, setDegraded] = useState(false);
  const [queueTaskId, setQueueTaskId] = useState<string | null>(null);
  const [inserted, setInserted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [savedSelection, setSavedSelection] = useState<{ text: string; from: number; to: number } | null>(null);
  const [showImproveDialog, setShowImproveDialog] = useState(false);
  const [customImprovePrompt, setCustomImprovePrompt] = useState('');

  const captureSelection = useCallback(() => {
    if (!editor) return null;

    const { from, to } = editor.state.selection;
    if (from === to) return null;

    const text = editor.state.doc.textBetween(from, to, ' ');
    if (!text || text.trim().length <= 3) return null;

    const selection = { text, from, to };
    setSavedSelection(selection);
    return selection;
  }, [editor]);

  const insertToEditor = useCallback(
    (markdown: string) => {
      if (!editor || !markdown) return;

      try {
        const json = markdownToTipTapJSON(markdown);
        if (json.content && json.content.length > 0) {
          const isEmpty = editor.state.doc.textContent.trim().length === 0;
          if (isEmpty) {
            editor.commands.setContent(json);
          } else {
            editor.chain().focus().insertContent(json.content).run();
          }
        }
        setInserted(true);
      } catch (error) {
        console.error('Markdown conversion error:', error);
        editor.chain().focus().insertContent(markdown).run();
        setInserted(true);
      }
    },
    [editor],
  );

  const replaceSelection = useCallback(
    (markdown: string, from: number, to: number) => {
      if (!editor || !markdown) return;

      try {
        const json = markdownToTipTapJSON(markdown);
        if (json.content && json.content.length > 0) {
          editor
            .chain()
            .focus()
            .setTextSelection({ from, to })
            .deleteSelection()
            .insertContent(json.content)
            .run();
        }
      } catch (error) {
        console.error('Replace error:', error);
        editor.chain().focus().setTextSelection({ from, to }).deleteSelection().insertContent(markdown).run();
      }
    },
    [editor],
  );

  const resetRunState = useCallback(() => {
    setResult(null);
    setDegraded(false);
    setQueueTaskId(null);
    setInserted(false);
  }, []);

  const applyAiError = useCallback((data: DocumentAiResponse, fallbackMessage: string) => {
    const content = extractContent(data);
    setDegraded(Boolean(data.degraded));
    setQueueTaskId(typeof data.queuedTaskId === 'string' ? data.queuedTaskId : null);
    setResult(content || extractAiMessage(data, fallbackMessage));
    return content;
  }, []);

  const applyClientFallback = useCallback(
    (message: string, autoInsert: boolean) => {
      const fallbackContent = buildClientFallbackDocument(tf, {
        documentTitle,
        companyName,
        companyData,
        today: new Date().toLocaleDateString(locale),
      });

      setDegraded(true);
      setQueueTaskId(null);
      setResult(`${message}\n\n${fallbackContent}`);

      if (autoInsert) {
        insertToEditor(fallbackContent);
      }
    },
    [companyData, companyName, documentTitle, insertToEditor, tf, locale],
  );

  const requestDocumentAi = useCallback(
    async (prompt: string, signal: AbortSignal) => {
      const response = await fetch('/api/document-ai', {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, companyName, companyData, documentTitle, groupKey }),
        signal,
      });

      return {
        response,
        data: await readDocumentAiResponse(response),
      };
    },
    [companyData, companyName, documentTitle, groupKey],
  );

  const generateContent = async (prompt: string, autoInsert = true) => {
    if (loading) return;

    setLoading(true);
    resetRunState();
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 75000);

    try {
      const { response: res, data } = await requestDocumentAi(prompt, controller.signal);

      if (!res.ok) {
        if (res.status === 402) {
          setDegraded(false);
          setQueueTaskId(null);
          const quotaMsg =
            typeof data.message === "string"
              ? data.message
              : typeof data.error === "string"
                ? data.error
                : terr('quotaDefault');
          setResult(quotaMsg);
          return;
        }
        const fallbackContent = applyAiError(
          data,
          terr('serviceUnavailable'),
        );
        if (autoInsert && fallbackContent) {
          insertToEditor(fallbackContent);
        }
        return;
      }

      const content = extractContent(data);
      setDegraded(Boolean(data.degraded));
      setQueueTaskId(typeof data.queuedTaskId === 'string' ? data.queuedTaskId : null);
      setResult(content);
      if (autoInsert && content) {
        insertToEditor(content);
      }
      if (!content) {
        applyClientFallback(terr('emptyResponseWithFallback'), autoInsert);
      }
    } catch (error) {
      const isAbort = error instanceof DOMException && error.name === 'AbortError';
      applyClientFallback(
        isAbort ? terr('abortWithFallback') : terr('connectionWithFallback'),
        autoInsert,
      );
    } finally {
      window.clearTimeout(timeout);
      setLoading(false);
    }
  };

  const generateImprovement = async (improvePrompt: string) => {
    if (!savedSelection) return;

    setShowImproveDialog(false);
    setLoading(true);
    resetRunState();
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 75000);

    const fullPrompt = `${improvePrompt}\n\n${t('improveTextBlockLabel')}\n"${savedSelection.text}"`;

    try {
      const { response: res, data } = await requestDocumentAi(fullPrompt, controller.signal);

      if (!res.ok) {
        if (res.status === 402) {
          setDegraded(false);
          setQueueTaskId(null);
          setResult(
            typeof data.message === "string"
              ? data.message
              : typeof data.error === "string"
                ? data.error
                : terr('quotaShort'),
          );
          return;
        }
        applyAiError(data, terr('serviceUnavailableImprove'));
        return;
      }

      const content = extractContent(data);
      setDegraded(Boolean(data.degraded));
      setQueueTaskId(typeof data.queuedTaskId === 'string' ? data.queuedTaskId : null);
      setResult(content);

      if (content) {
        replaceSelection(content, savedSelection.from, savedSelection.to);
        setInserted(true);
      } else {
        setResult(terr('emptyResponseImprove'));
      }
    } catch (error) {
      const isAbort = error instanceof DOMException && error.name === 'AbortError';
      setResult(
        isAbort ? terr('abortImprove') : terr('connectionImprove'),
      );
    } finally {
      window.clearTimeout(timeout);
      setLoading(false);
      setSavedSelection(null);
    }
  };

  const handleCustomPrompt = () => {
    if (!customPrompt.trim()) return;
    void generateContent(customPrompt.trim(), true);
    setCustomPrompt('');
  };

  return (
    <div className="flex h-full flex-col bg-[var(--card)] text-[var(--text-primary)]">
      <div className="border-b border-[var(--gold)]/25 bg-gradient-to-r from-[var(--gold)]/14 to-transparent px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-[var(--gold)]" />
          <h3 className="text-sm font-bold text-[var(--text-primary)]">{t('title')}</h3>
        </div>
        <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
          {companyName ? t('subtitleWithCompany', { company: companyName }) : t('subtitleNoCompany')}
        </p>
      </div>

      <div className="space-y-2 border-b border-[var(--gold)]/20 px-4 py-3">
        {QUICK_KEYS.map((key) => {
          const Icon = QUICK_ICONS[key];
          const isPrimary = key === 'fullDoc';
          return (
            <button
              key={key}
              onClick={() => void generateContent(t(`quick.${key}.prompt`), true)}
              disabled={loading}
              className={`w-full rounded-lg px-3 py-2 text-xs font-semibold transition-colors disabled:cursor-wait disabled:opacity-70 ${
                isPrimary
                  ? 'flex items-center gap-2 bg-[var(--gold)] text-[var(--primary-foreground)] shadow-sm shadow-[var(--gold-glow)] hover:bg-[var(--gold-hover)]'
                  : 'flex items-center gap-2 border border-[var(--gold)]/30 bg-[var(--gold)]/6 text-[var(--text-primary)] hover:border-[var(--gold)]/60 hover:bg-[var(--gold)]/14'
              }`}
            >
              <Icon size={14} />
              {t(`quick.${key}.label`)}
            </button>
          );
        })}
      </div>

      <div className="border-b border-[var(--gold)]/20 px-4 py-3">
        <label className="mb-1.5 block text-[11px] font-medium text-[var(--text-secondary)]">{t('customRequestLabel')}</label>
        <div className="flex gap-2">
          <input
            value={customPrompt}
            onChange={(event) => setCustomPrompt(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                handleCustomPrompt();
              }
            }}
            placeholder={t('customRequestPlaceholder')}
            className="flex-1 rounded-lg border border-[var(--gold)]/30 bg-[var(--bg-primary)] px-2.5 py-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-1 focus:ring-[var(--gold)]"
          />
          <button
            onClick={handleCustomPrompt}
            disabled={!customPrompt.trim() || loading}
            className="shrink-0 rounded-lg bg-[var(--gold)] p-2 text-[var(--primary-foreground)] transition-colors hover:bg-[var(--gold-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send size={13} />
          </button>
        </div>
      </div>

      <div className="border-b border-[var(--gold)]/20 px-4 py-3">
        <button
          onMouseDown={(event) => {
            event.preventDefault();
            captureSelection();
          }}
          onClick={() => {
            if (savedSelection) {
              setShowImproveDialog(true);
            }
          }}
          disabled={loading}
          className={`w-full rounded-lg border px-3 py-2 text-xs font-medium transition-colors disabled:opacity-50 ${
            savedSelection
              ? 'flex items-center gap-2 border-[var(--gold)]/60 bg-[var(--gold)]/12 text-[var(--gold)]'
              : 'flex items-center gap-2 border-[var(--gold)]/30 bg-[var(--gold)]/5 text-[var(--text-secondary)] hover:border-[var(--gold)]/60 hover:text-[var(--gold)]'
          }`}
        >
          <Wand2 size={13} />
          {t('improveSelected')}
          {savedSelection ? (
            <span className="ml-auto max-w-[120px] truncate text-[10px] text-[var(--gold)]/70">
              &ldquo;{savedSelection.text.slice(0, 25)}...&rdquo;
            </span>
          ) : null}
        </button>
        <p className="mt-1 text-[10px] text-[var(--text-secondary)]">{t('improveHint')}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {loading ? (
          <div className="rounded-xl border border-[var(--gold)]/25 bg-[var(--gold)]/8 px-3 py-6">
            <div className="flex items-center justify-center gap-2">
            <RotateCcw size={16} className="animate-spin text-[var(--gold)]" />
            <span className="text-sm text-[var(--text-secondary)]">{t('generating')}</span>
            </div>
            <p className="mt-2 text-center text-[11px] leading-5 text-[var(--text-secondary)]">
              {t('generatingMobileNote')}
            </p>
          </div>
        ) : null}

        {!loading && !result ? (
          <div className="py-8 text-center">
            <Sparkles size={28} className="mx-auto mb-3 text-[var(--gold)]/55" />
            <p className="text-xs text-[var(--text-secondary)]">{t('emptyState')}</p>
          </div>
        ) : null}

        {!loading && result ? (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span
                className={`text-[11px] font-medium ${
                inserted
                  ? 'text-green-600'
                  : degraded
                      ? 'text-amber-700 dark:text-amber-300'
                      : 'text-[var(--gold)]'
                }`}
              >
                {inserted ? t('resultInserted') : degraded ? t('resultDegraded') : t('resultDefault')}
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(result);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
              >
                {copied ? <Check size={10} /> : <Copy size={10} />}
                {t('copy')}
              </button>
            </div>

            <div
              className={`max-h-[250px] overflow-y-auto whitespace-pre-wrap rounded-lg border p-3 text-xs leading-relaxed text-[var(--text-primary)] ${
                inserted
                  ? 'border-green-200 bg-green-50 dark:border-green-800/30 dark:bg-green-900/10'
                  : degraded
                    ? 'border-[var(--gold)]/40 bg-[var(--gold)]/10'
                    : 'border-[var(--gold)]/30 bg-[var(--gold)]/8'
              }`}
            >
              {result}
            </div>

            {degraded ? (
              <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800 dark:border-amber-800/40 dark:bg-amber-950/20 dark:text-amber-200">
                {t('degradedNotice')}
                {queueTaskId ? ` ${t('degradedQueue', { taskId: queueTaskId })}` : ` ${t('degradedQueueHint')}`}
              </div>
            ) : null}

            {!inserted ? (
              <button
                onClick={() => insertToEditor(result)}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--gold)] px-3 py-2 text-xs font-semibold text-[var(--primary-foreground)] transition-colors hover:bg-[var(--gold-hover)]"
              >
                <FileText size={14} />
                {degraded ? t('addDegradedToEditor') : t('addToEditor')}
              </button>
            ) : null}

            {inserted ? (
              <div className="mt-2 flex items-center justify-center gap-1.5 py-1.5 text-xs text-green-600 dark:text-green-400">
                <CheckCircle2 size={13} />
                {t('insertedSuccess')}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {showImproveDialog && savedSelection ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-[380px] max-w-[95vw] rounded-xl border border-[var(--gold)]/20 bg-white shadow-2xl dark:bg-[#1e293b]">
            <div className="flex items-center justify-between border-b border-[var(--gold)]/20 px-4 py-3">
              <div className="flex items-center gap-2">
                <Wand2 size={16} className="text-[var(--gold)]" />
                <h3 className="text-sm font-bold text-[var(--text-primary)]">{t('improveDialogTitle')}</h3>
              </div>
              <button
                onClick={() => {
                  setShowImproveDialog(false);
                  setSavedSelection(null);
                }}
                className="rounded-md p-1 text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/10"
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-4 py-3">
              <p className="mb-1 text-[11px] text-[var(--text-secondary)]">{t('improveSelectedLabel')}</p>
              <p className="mb-4 max-h-[80px] overflow-y-auto rounded-lg bg-[var(--gold)]/5 p-2 text-xs italic text-[var(--text-primary)]">
                &ldquo;{savedSelection.text.slice(0, 200)}
                {savedSelection.text.length > 200 ? '...' : ''}&rdquo;
              </p>

              <p className="mb-2 text-[11px] font-medium text-[var(--text-secondary)]">{t('improveChooseType')}</p>
              <div className="space-y-1.5">
                {IMPROVE_KEYS.map((key) => {
                  const Icon = IMPROVE_ICONS[key];
                  return (
                    <button
                      key={key}
                      onClick={() => void generateImprovement(tim(`${key}.prompt`))}
                      className="flex w-full items-center gap-2 rounded-lg border border-[var(--gold)]/20 px-3 py-2 text-xs font-medium text-[var(--text-primary)] transition-colors hover:border-[var(--gold)]/40 hover:bg-[var(--gold)]/10"
                    >
                      <Icon size={13} className="text-[var(--gold)]" />
                      {tim(`${key}.label`)}
                    </button>
                  );
                })}
              </div>

              <div className="mt-3">
                <div className="flex gap-2">
                  <input
                    value={customImprovePrompt}
                    onChange={(event) => setCustomImprovePrompt(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && customImprovePrompt.trim()) {
                        void generateImprovement(customImprovePrompt.trim());
                        setCustomImprovePrompt('');
                      }
                    }}
                    placeholder={t('improveCustomPlaceholder')}
                    className="flex-1 rounded-lg border border-[var(--gold)]/20 bg-white px-2.5 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--gold)] dark:bg-[#0f172a]"
                  />
                  <button
                    onClick={() => {
                      if (customImprovePrompt.trim()) {
                        void generateImprovement(customImprovePrompt.trim());
                        setCustomImprovePrompt('');
                      }
                    }}
                    disabled={!customImprovePrompt.trim()}
                    className="rounded-lg bg-[var(--gold)] p-2 text-white transition-colors hover:bg-[var(--gold-hover)] disabled:opacity-40"
                  >
                    <MessageSquare size={13} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
