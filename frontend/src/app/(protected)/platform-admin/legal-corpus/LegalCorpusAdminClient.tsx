"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";

type JurisdictionStat = {
  jurisdiction_code: string;
  document_count: number;
  active_document_count: number;
  official_document_count: number;
  tenant_private_document_count: number;
};

type LegalDocRow = {
  id: string;
  title: string;
  doc_number: string | null;
  doc_type: string;
  jurisdiction_code: string;
  corpus_scope: string;
  is_active: boolean;
  source_url: string | null;
  created_at: string;
};

export function LegalCorpusAdminClient() {
  const t = useTranslations("platformAdmin.legalCorpus");
  const [officialOnly, setOfficialOnly] = useState(true);
  const [jurisdiction, setJurisdiction] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<JurisdictionStat[]>([]);
  const [documents, setDocuments] = useState<LegalDocRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ingesting, setIngesting] = useState(false);
  const [ingestMessage, setIngestMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (!officialOnly) params.set("officialOnly", "0");
      const j = jurisdiction.trim().toUpperCase();
      if (j && /^[A-Z]{2}$/.test(j)) params.set("jurisdiction", j);
      if (j === "GLOBAL") params.set("jurisdiction", "GLOBAL");

      const res = await fetch(`/api/admin/legal-corpus?${params.toString()}`, {
        credentials: "include",
      });
      const json = (await res.json()) as {
        error?: string;
        stats?: JurisdictionStat[];
        documents?: LegalDocRow[];
      };
      if (!res.ok) {
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      setStats(json.stats ?? []);
      setDocuments(json.documents ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "load_failed");
      setStats([]);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [officialOnly, jurisdiction]);

  useEffect(() => {
    void load();
  }, [load]);

  async function runUkIngest() {
    setIngesting(true);
    setIngestMessage(null);
    try {
      const res = await fetch("/api/admin/legal-corpus/ingest", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connector: "uk_uksi_feed", limit: 15 }),
      });
      const json = (await res.json()) as {
        error?: string;
        inserted?: number;
        skipped?: number;
        errors?: string[];
      };
      if (!res.ok) {
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      setIngestMessage(
        t("ingestResult", {
          inserted: json.inserted ?? 0,
          skipped: json.skipped ?? 0,
        }),
      );
      if (json.errors?.length) {
        setIngestMessage((prev) => `${prev} — ${json.errors!.slice(0, 3).join("; ")}`);
      }
      await load();
    } catch (e) {
      setIngestMessage(e instanceof Error ? e.message : t("ingestError"));
    } finally {
      setIngesting(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <Link
          href="/platform-admin"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          {t("backLink")}
        </Link>
        <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted/40 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {t("refresh")}
        </button>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={officialOnly}
            onChange={(e) => setOfficialOnly(e.target.checked)}
            className="rounded border-border"
          />
          {t("officialOnly")}
        </label>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="text-xs font-semibold uppercase tracking-wide">{t("colJurisdiction")}</span>
          <input
            value={jurisdiction}
            onChange={(e) => setJurisdiction(e.target.value)}
            placeholder="TR / GB / GLOBAL…"
            className="w-36 rounded-lg border border-border bg-background px-2 py-1 text-sm text-foreground"
          />
        </label>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-200">
          {error}
        </div>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
          {t("statsHeading")}
        </h2>
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2.5">{t("colJurisdiction")}</th>
                <th className="px-3 py-2.5">Σ</th>
                <th className="px-3 py-2.5">{t("colActive")}</th>
                <th className="px-3 py-2.5">{t("scopeOfficial")}</th>
                <th className="px-3 py-2.5">{t("scopePrivate")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {stats.length === 0 && !loading ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                    —
                  </td>
                </tr>
              ) : (
                stats.map((row) => (
                  <tr key={row.jurisdiction_code}>
                    <td className="px-3 py-2 font-medium text-foreground">{row.jurisdiction_code}</td>
                    <td className="px-3 py-2 text-muted-foreground">{row.document_count}</td>
                    <td className="px-3 py-2 text-muted-foreground">{row.active_document_count}</td>
                    <td className="px-3 py-2 text-muted-foreground">{row.official_document_count}</td>
                    <td className="px-3 py-2 text-muted-foreground">{row.tenant_private_document_count}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-dashed border-amber-500/30 bg-amber-500/5 p-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
          {t("ingestHeading")}
        </h2>
        <p className="text-xs text-muted-foreground">{t("ingestUkHint")}</p>
        <button
          type="button"
          disabled={ingesting}
          onClick={() => void runUkIngest()}
          className="rounded-lg bg-[var(--gold)] px-4 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-50"
        >
          {ingesting ? t("ingesting") : t("ingestUkButton")}
        </button>
        {ingestMessage ? (
          <p className="text-xs text-muted-foreground">{ingestMessage}</p>
        ) : null}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
          {t("tableHeading")}
        </h2>
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="max-h-[560px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/90 text-left text-xs uppercase tracking-wider text-muted-foreground backdrop-blur">
                <tr>
                  <th className="px-3 py-2.5">{t("colTitle")}</th>
                  <th className="px-3 py-2.5">{t("colNumber")}</th>
                  <th className="px-3 py-2.5">{t("colType")}</th>
                  <th className="px-3 py-2.5">{t("colJurisdiction")}</th>
                  <th className="px-3 py-2.5">{t("colScope")}</th>
                  <th className="px-3 py-2.5">{t("colActive")}</th>
                  <th className="px-3 py-2.5">{t("colSource")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {documents.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                      {t("emptyDocuments")}
                    </td>
                  </tr>
                ) : (
                  documents.map((d) => (
                    <tr key={d.id} className="hover:bg-muted/20">
                      <td className="px-3 py-2 align-top font-medium text-foreground">{d.title}</td>
                      <td className="px-3 py-2 align-top text-xs text-muted-foreground">
                        {d.doc_number ?? "—"}
                      </td>
                      <td className="px-3 py-2 align-top text-xs text-muted-foreground">{d.doc_type}</td>
                      <td className="px-3 py-2 align-top text-xs text-muted-foreground">
                        {d.jurisdiction_code}
                      </td>
                      <td className="px-3 py-2 align-top text-xs text-muted-foreground">
                        {d.corpus_scope === "tenant_private" ? t("scopePrivate") : t("scopeOfficial")}
                      </td>
                      <td className="px-3 py-2 align-top text-xs text-muted-foreground">
                        {d.is_active ? t("yes") : t("no")}
                      </td>
                      <td className="px-3 py-2 align-top">
                        {d.source_url ? (
                          <a
                            href={d.source_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                            link
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
