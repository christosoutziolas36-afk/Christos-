"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card } from "./ui";
import { useStore } from "@/lib/store/store";
import { fehlendeAngaben, zusammenfassung } from "@/lib/voice/extract";
import { formatDateTime } from "@/lib/dates";
import type { CallStatus, VoiceCall } from "@/lib/voice/types";

/**
 * Ein angenommener Anruf im Dashboard.
 * Der Betrieb entscheidet, ob daraus eine Anfrage wird – der Assistent
 * legt nie selbst etwas an.
 */
export function CallCard({
  call,
  onStatus,
}: {
  call: VoiceCall;
  onStatus: (id: string, status: CallStatus, inquiryId?: string) => void;
}) {
  const router = useRouter();
  const { createInquiry } = useStore();
  const [transkript, setTranskript] = useState(false);

  const fehlt = fehlendeAngaben(call);
  const abgebrochen = call.status === "abgebrochen";

  function uebernehmen() {
    const inquiry = createInquiry({
      customer: {
        name: call.extracted.name?.trim() || `Anrufer ${call.from}`,
        phone: call.extracted.phone || call.from,
      },
      title: call.extracted.anliegen?.slice(0, 60) || "Telefonische Anfrage",
      description: call.extracted.anliegen || "Anrufer hat aufgelegt, bevor er das Anliegen nennen konnte.",
      source: "telefon",
      desiredPeriod: call.extracted.zeitraum,
      address: call.extracted.adresse,
      notes: `Vom Telefonassistenten aufgenommen am ${formatDateTime(call.startedAt)}.`,
      status: fehlt.length > 0 ? "rueckfrage" : "neu",
    });
    onStatus(call.id, "uebernommen", inquiry.id);
    router.push(`/anfragen/${inquiry.id}`);
  }

  return (
    <Card className="p-4 md:p-5" testId={`anruf-${call.id}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-ink-900">
              {call.extracted.name || "Name nicht genannt"}
            </span>
            {abgebrochen ? (
              <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">
                Aufgelegt
              </span>
            ) : (
              <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                Aufgenommen
              </span>
            )}
          </div>
          <a href={`tel:${call.from}`} className="mt-1 block text-sm font-semibold text-brand-600">
            {call.extracted.phone || call.from}
          </a>
          <p className="mt-2 text-sm text-ink-700">{zusammenfassung(call)}</p>
          <p className="mt-1 text-xs text-ink-400">{formatDateTime(call.startedAt)}</p>
        </div>
      </div>

      {fehlt.length > 0 ? (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Nicht erfragt: {fehlt.join(", ")}. Beim Rückruf nachholen.
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={uebernehmen}>Als Anfrage übernehmen</Button>
        <Button variant="ghost" onClick={() => setTranskript((v) => !v)}>
          {transkript ? "Gespräch ausblenden" : "Gespräch anzeigen"}
        </Button>
        <Button variant="ghost" onClick={() => onStatus(call.id, "erledigt")}>
          Erledigt
        </Button>
      </div>

      {transkript ? (
        <div className="mt-4 space-y-3 rounded-lg bg-ink-50 p-3 text-sm">
          {call.turns.map((turn, index) => (
            <div key={`${turn.at}_${index}`}>
              <p className="text-ink-500">Peter: {turn.frage}</p>
              {turn.antwort ? (
                <p className="mt-1 font-medium text-ink-900">Anrufer: {turn.antwort}</p>
              ) : turn.step === "abschluss" ? null : (
                <p className="mt-1 text-ink-400">Anrufer: (keine Antwort)</p>
              )}
            </div>
          ))}
          {call.turns.length === 0 ? (
            <p className="text-ink-500">Der Anrufer hat sofort aufgelegt.</p>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
