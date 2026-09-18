"use client";

import { useState } from "react";
import { Button, Card, EmptyState, PageHeader, SectionTitle } from "@/components/ui";
import { CallCard } from "@/components/call-card";
import { useVoiceCalls } from "@/lib/voice/use-calls";
import { useStore } from "@/lib/store/store";
import { formatDateTime } from "@/lib/dates";
import { zusammenfassung } from "@/lib/voice/extract";

export default function AnrufePage() {
  const { ready } = useStore();
  const { calls, offene, geladen, fehler, statusSetzen } = useVoiceCalls();
  const [zeigeAlle, setZeigeAlle] = useState(false);

  const erledigte = calls.filter((c) => c.status === "uebernommen" || c.status === "erledigt");

  if (!ready || !geladen) return <div className="py-20 text-center text-ink-400">Wird geladen…</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Anrufe"
        subtitle="Was der Telefonassistent aufgenommen hat, während niemand rangehen konnte."
      />

      {fehler ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Anrufe konnten nicht geladen werden ({fehler}). Läuft der Server?
        </p>
      ) : null}

      {offene.length === 0 ? (
        <EmptyState
          title="Keine offenen Anrufe"
          text="Sobald jemand anruft und niemand rangeht, nimmt der Assistent die Anfrage auf und sie erscheint hier."
          action={<Button href="/einstellungen">Telefonassistent einrichten</Button>}
        />
      ) : (
        <section className="space-y-3">
          <SectionTitle hint={`${offene.length} offen`}>Neu aufgenommen</SectionTitle>
          {offene.map((call) => (
            <CallCard key={call.id} call={call} onStatus={statusSetzen} />
          ))}
        </section>
      )}

      {erledigte.length > 0 ? (
        <section>
          <SectionTitle hint={`${erledigte.length}`}>Bereits bearbeitet</SectionTitle>
          <Card className="divide-y divide-ink-100">
            {(zeigeAlle ? erledigte : erledigte.slice(0, 5)).map((call) => (
              <div key={call.id} className="px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-ink-900">
                    {call.extracted.name || call.from}
                  </span>
                  <span className="text-xs text-ink-400">{formatDateTime(call.startedAt)}</span>
                </div>
                <p className="mt-0.5 text-sm text-ink-500">{zusammenfassung(call)}</p>
                {call.inquiryId ? (
                  <Button href={`/anfragen/${call.inquiryId}`} variant="ghost" size="sm" className="mt-2">
                    Zur Anfrage
                  </Button>
                ) : null}
              </div>
            ))}
          </Card>
          {erledigte.length > 5 ? (
            <Button variant="ghost" size="sm" className="mt-3" onClick={() => setZeigeAlle((v) => !v)}>
              {zeigeAlle ? "Weniger anzeigen" : `Alle ${erledigte.length} anzeigen`}
            </Button>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
