"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface QueryRecord {
  id: string;
  query_text: string;
  ai_response: string | null;
  sources_used: Array<{
    doc_title: string;
    article_number: string;
    article_title: string;
  }> | null;
  tags: string[] | null;
  is_saved: boolean;
  response_tokens: number | null;
  created_at: string;
}

export default function HistoryPage() {
  const [queries, setQueries] = useState<QueryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "saved">("all");
  const [search, setSearch] = useState("");

  const fetchQueries = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) {
      setLoading(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    let query = supabase
      .from("solution_queries")
      .select("id, query_text, ai_response, sources_used, tags, is_saved, response_tokens, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (filter === "saved") {
      query = query.eq("is_saved", true);
    }

    const { data } = await query;
    setQueries((data as QueryRecord[]) || []);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    void Promise.resolve().then(fetchQueries);
  }, [fetchQueries]);

  async function toggleSave(id: string) {
    const supabase = createClient();
    if (!supabase) return;

    const item = queries.find((q) => q.id === id);
    if (!item) return;

    await supabase.from("solution_queries").update({ is_saved: !item.is_saved }).eq("id", id);

    setQueries((prev) =>
      prev.map((q) => (q.id === id ? { ...q, is_saved: !q.is_saved } : q)),
    );
  }

  const filtered = queries.filter((q) => {
    if (search.trim()) {
      const s = search.toLowerCase();
      return q.query_text.toLowerCase().includes(s);
    }
    return true;
  });

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <>
      <PageHeader
        eyebrow="Nova"
        title="Nova Gecmisi"
        description="Daha once Nova'ya sordugunuz sorulari, aldiginiz yanitlari ve kaydedilen referanslari buradan inceleyin."
        actions={
          <div className="flex gap-2">
            <Button
              variant={filter === "all" ? "primary" : "outline"}
              size="sm"
              onClick={() => setFilter("all")}
            >
              Tumu
            </Button>
            <Button
              variant={filter === "saved" ? "primary" : "outline"}
              size="sm"
              onClick={() => setFilter("saved")}
            >
              Kaydedilenler
            </Button>
          </div>
        }
      />

      <div className="relative">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Nova gecmisinde ara..."
          className={cn(
            "h-12 w-full rounded-2xl border pl-11 pr-4 text-sm text-foreground transition-colors transition-shadow",
            "border-border bg-card shadow-[var(--shadow-soft)]",
            "hover:border-primary/40",
            "focus-visible:border-primary focus-visible:shadow-[0_0_0_4px_var(--ring)] focus-visible:outline-none",
          )}
        />
      </div>

      {loading ? (
        <div className="grid gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={filter === "saved" ? "Kaydedilen sorgu yok" : "Henuz sorgu yok"}
          description={
            filter === "saved"
              ? "Yanitlari kaydetmek icin sohbet sirasinda kaydet butonunu kullanabilirsiniz."
              : "Nova ile ilk konusmanizi baslattiginizda gecmis burada gorunur."
          }
        />
      ) : (
        <div className="grid gap-3">
          {filtered.map((q) => (
            <Card
              key={q.id}
              className="cursor-pointer transition-shadow hover:shadow-[var(--shadow-elevated)]"
              onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-4">
                  <CardTitle className="text-base">{q.query_text}</CardTitle>
                  <div className="flex shrink-0 items-center gap-2">
                    {q.is_saved && <Badge variant="warning">Kaydedildi</Badge>}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSave(q.id);
                      }}
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                        q.is_saved
                          ? "text-warning hover:text-warning/70"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill={q.is_saved ? "currentColor" : "none"}
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
                      </svg>
                    </button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{formatDate(q.created_at)}</p>
              </CardHeader>

              {expandedId === q.id && q.ai_response && (
                <CardContent>
                  <div className="rounded-xl border border-border bg-secondary/30 p-4">
                    <p className="whitespace-pre-wrap text-sm leading-7 text-foreground">
                      {q.ai_response}
                    </p>
                  </div>

                  {q.sources_used && q.sources_used.length > 0 && (
                    <div className="mt-3">
                      <p className="mb-2 text-xs font-medium text-muted-foreground">
                        Kullanilan kaynaklar:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {q.sources_used.map((s, i) => (
                          <Badge key={i} variant="neutral">
                            {s.doc_title}
                            {s.article_number ? ` - Md.${s.article_number}` : ""}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {q.response_tokens && (
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      {q.response_tokens} token kullanildi
                    </p>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
