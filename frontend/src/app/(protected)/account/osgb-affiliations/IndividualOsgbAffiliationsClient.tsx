"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusAlert } from "@/components/ui/status-alert";

type AffiliationRow = {
  id: string;
  status: string;
  osgb_organization_id: string;
  professional_organization_id: string;
  invited_at: string;
  accepted_at: string | null;
  ended_at: string | null;
  notes: string | null;
  osgb: { id: string; name: string } | null;
};

function statusLabel(s: string) {
  switch (s) {
    case "invited":
      return "Davet bekliyor";
    case "active":
      return "Aktif";
    case "suspended":
      return "Askida";
    case "ended":
      return "Kapandi";
    default:
      return s;
  }
}

export default function IndividualOsgbAffiliationsClient() {
  const [rows, setRows] = useState<AffiliationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "danger" | "info"; text: string } | null>(
    null,
  );

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/account/osgb-affiliations", { credentials: "include" });
      const json = (await res.json()) as { ok?: boolean; affiliations?: AffiliationRow[]; error?: string };
      if (!res.ok) {
        setMessage({ tone: "danger", text: json.error || "Liste alinamadi." });
        setRows([]);
        return;
      }
      setRows(json.affiliations ?? []);
    } catch {
      setMessage({ tone: "danger", text: "Baglanti hatasi." });
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function patchAction(id: string, action: "accept" | "decline" | "end") {
    setBusyId(id);
    setMessage(null);
    try {
      const res = await fetch(`/api/account/osgb-affiliations/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setMessage({ tone: "danger", text: json.error || "Islem basarisiz." });
        return;
      }
      setMessage({ tone: "success", text: "Guncellendi." });
      await load();
    } catch {
      setMessage({ tone: "danger", text: "Islem basarisiz." });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">OSGB baglantilari</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Hangi OSGB catisi altinda calistiginizi yonetin.{" "}
            <Link href="/profile" className="font-medium text-primary underline underline-offset-4">
              Profile don
            </Link>
          </p>
        </div>
      </div>

      {message ? <StatusAlert tone={message.tone}>{message.text}</StatusAlert> : null}

      <Card>
        <CardHeader>
          <CardTitle>Durum</CardTitle>
          <CardDescription>
            Davetleri kabul veya reddedebilir; aktif baglantiyi sonlandirabilirsiniz. Veri erisim kurallari
            ileride bu kayda gore genisletilecektir.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Yukleniyor...</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Henuz OSGB daveti yok.</p>
          ) : (
            <ul className="space-y-3">
              {rows.map((row) => {
                const osgbName = row.osgb?.name ?? row.osgb_organization_id.slice(0, 8);
                const busy = busyId === row.id;
                return (
                  <li
                    key={row.id}
                    className="rounded-2xl border border-border bg-card p-4 space-y-3"
                  >
                    <div>
                      <p className="font-semibold text-foreground">{osgbName}</p>
                      <p className="text-xs text-muted-foreground">
                        {statusLabel(row.status)} · {new Date(row.invited_at).toLocaleString("tr-TR")}
                      </p>
                      {row.notes ? (
                        <p className="mt-2 text-xs text-muted-foreground">Not: {row.notes}</p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {row.status === "invited" ? (
                        <>
                          <Button type="button" size="sm" disabled={busy} onClick={() => void patchAction(row.id, "accept")}>
                            Kabul et
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={busy}
                            onClick={() => void patchAction(row.id, "decline")}
                          >
                            Reddet
                          </Button>
                        </>
                      ) : null}
                      {row.status === "active" || row.status === "suspended" ? (
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          disabled={busy}
                          onClick={() => void patchAction(row.id, "end")}
                        >
                          Baglantiyi sonlandir
                        </Button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
