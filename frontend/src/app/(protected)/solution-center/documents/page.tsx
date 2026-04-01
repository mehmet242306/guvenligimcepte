"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface DocumentRecord {
  id: string;
  query_id: string;
  doc_type: string;
  doc_title: string | null;
  doc_url: string | null;
  created_at: string;
}

const docTypeConfig: Record<string, { label: string; badge: "default" | "accent" | "success" | "warning" }> = {
  docx: { label: "Word", badge: "default" },
  xlsx: { label: "Excel", badge: "success" },
  pptx: { label: "PowerPoint", badge: "warning" },
  pdf: { label: "PDF", badge: "accent" },
};

/* ------------------------------------------------------------------ */
/* Document type icon                                                  */
/* ------------------------------------------------------------------ */

function DocIcon({ type }: { type: string }) {
  const colors: Record<string, string> = {
    docx: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    xlsx: "bg-green-500/10 text-green-600 dark:text-green-400",
    pptx: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    pdf: "bg-red-500/10 text-red-600 dark:text-red-400",
  };

  const labels: Record<string, string> = {
    docx: "W",
    xlsx: "X",
    pptx: "P",
    pdf: "PDF",
  };

  return (
    <div
      className={`flex h-12 w-12 items-center justify-center rounded-xl text-sm font-bold ${
        colors[type] || "bg-secondary text-muted-foreground"
      }`}
    >
      {labels[type] || type.toUpperCase().slice(0, 3)}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Documents page                                                      */
/* ------------------------------------------------------------------ */

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDocuments() {
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

      // Fetch documents that belong to user's queries
      const { data } = await supabase
        .from("solution_documents")
        .select(
          `
          id,
          query_id,
          doc_type,
          doc_title,
          doc_url,
          created_at,
          solution_queries!inner(user_id)
        `,
        )
        .eq("solution_queries.user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      setDocuments((data as unknown as DocumentRecord[]) || []);
      setLoading(false);
    }

    fetchDocuments();
  }, []);

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  return (
    <>
      <PageHeader
        eyebrow="Çözüm Merkezi"
        title="Dokümanlarım"
        description="Çözüm Merkezi aracılığıyla oluşturulan dokümanlarınız burada listelenir."
      />

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : documents.length === 0 ? (
        <EmptyState
          title="Henüz doküman yok"
          description="Çözüm Merkezi sohbetlerinde AI'dan doküman oluşturmasını istediğinizde, dokümanlarınız burada görünecektir."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc) => {
            const config = docTypeConfig[doc.doc_type] || {
              label: doc.doc_type,
              badge: "neutral" as const,
            };

            return (
              <Card key={doc.id}>
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <DocIcon type={doc.doc_type} />
                    <div className="min-w-0 flex-1">
                      <CardTitle className="truncate text-base">
                        {doc.doc_title || "İsimsiz Doküman"}
                      </CardTitle>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge variant={config.badge}>{config.label}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(doc.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                {doc.doc_url && (
                  <CardContent>
                    <a
                      href={doc.doc_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-secondary"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      İndir
                    </a>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
