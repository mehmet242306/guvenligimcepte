"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  professional: { id: string; name: string } | null;
};

function statusLabel(s: string) {
  switch (s) {
    case "invited":
      return "Bekliyor";
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

export default function OsgbManagedProfessionalsClient() {
  const [rows, setRows] = useState<AffiliationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
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

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    try {
      const res = await fetch("/api/account/osgb-affiliations", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), notes: notes.trim() || undefined }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setMessage({ tone: "danger", text: json.error || "Davet gonderilemedi." });
        return;
      }
      setMessage({ tone: "success", text: "Davet gonderildi." });
      setEmail("");
      setNotes("");
      await load();
    } catch {
      setMessage({ tone: "danger", text: "Davet gonderilemedi." });
    }
  }

  async function patchAction(id: string, action: "cancel" | "suspend" | "resume" | "end") {
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
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Bagli profesyoneller</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Bireysel RiskNova hesabi olan uzmanlari e-posta ile davet edin. Kabul sonrasi baglanti{" "}
          <strong>aktif</strong> olur; veri paylasimi ve raporlama kurallari ileride bu baglantiya gore
          genisletilebilir (su an rozet / yonetim amaclidir).
        </p>
      </div>

      {message ? <StatusAlert tone={message.tone}>{message.text}</StatusAlert> : null}

      <Card>
        <CardHeader>
          <CardTitle>Yeni davet</CardTitle>
          <CardDescription>
            Profesyonelin kayitli oldugu e-posta, kullanici profilindeki adres ile eslesmelidir.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end" onSubmit={(ev) => void invite(ev)}>
            <div className="min-w-0 flex-1 space-y-2">
              <Input
                label="E-posta"
                type="email"
                required
                value={email}
                onChange={(ev) => setEmail(ev.target.value)}
                placeholder="uzman@ornek.com"
              />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <Input
                label="Not (istege bagli)"
                value={notes}
                onChange={(ev) => setNotes(ev.target.value)}
                placeholder="Kisa aciklama"
              />
            </div>
            <Button type="submit" className="w-full sm:w-auto">
              Davet gonder
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Liste</CardTitle>
          <CardDescription>Tum baglanti durumlari asagida.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">Yukleniyor...</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Henuz baglanti yok.</p>
          ) : (
            <ul className="space-y-3">
              {rows.map((row) => {
                const name = row.professional?.name ?? row.professional_organization_id.slice(0, 8);
                const busy = busyId === row.id;
                return (
                  <li
                    key={row.id}
                    className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground">{name}</p>
                      <p className="text-xs text-muted-foreground">
                        Durum: {statusLabel(row.status)} · {new Date(row.invited_at).toLocaleString("tr-TR")}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {row.status === "invited" ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={busy}
                          onClick={() => void patchAction(row.id, "cancel")}
                        >
                          Iptal
                        </Button>
                      ) : null}
                      {row.status === "active" ? (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={busy}
                            onClick={() => void patchAction(row.id, "suspend")}
                          >
                            Askiya al
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            disabled={busy}
                            onClick={() => void patchAction(row.id, "end")}
                          >
                            Sonlandir
                          </Button>
                        </>
                      ) : null}
                      {row.status === "suspended" ? (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            disabled={busy}
                            onClick={() => void patchAction(row.id, "resume")}
                          >
                            Devam ettir
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            disabled={busy}
                            onClick={() => void patchAction(row.id, "end")}
                          >
                            Sonlandir
                          </Button>
                        </>
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
