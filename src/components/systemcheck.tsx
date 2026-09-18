"use client";

import { useEffect, useState } from "react";
import { Card, SectionTitle } from "./ui";

interface CheckPunkt {
  id: string;
  titel: string;
  ok: boolean;
  pflicht: boolean;
  hinweis: string;
  todo?: string;
}

interface Systemcheck {
  bereit: boolean;
  offen: number;
  punkte: CheckPunkt[];
  webhooks: { incoming: string; status: string };
}

function KopierZeile({ label, wert }: { label: string; wert: string }) {
  const [kopiert, setKopiert] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-40 shrink-0 text-sm font-semibold text-ink-700">{label}</span>
      <code className="min-w-0 flex-1 truncate rounded-md bg-ink-50 px-2 py-1.5 text-xs text-ink-800">
        {wert}
      </code>
      <button
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(wert);
            setKopiert(true);
            setTimeout(() => setKopiert(false), 1500);
          } catch {
            setKopiert(false);
          }
        }}
        className="rounded-md border border-ink-200 px-2 py-1.5 text-xs font-semibold text-ink-600 hover:bg-ink-50"
      >
        {kopiert ? "Kopiert ✓" : "Kopieren"}
      </button>
    </div>
  );
}

/**
 * Zeigt an einer Stelle, was vor dem ersten echten Pilotbetrieb noch fehlt.
 * Ersetzt das Durchsuchen von Konfigurationsdateien.
 */
export function Systemcheck() {
  const [check, setCheck] = useState<Systemcheck | null>(null);

  useEffect(() => {
    fetch("/api/systemcheck")
      .then((r) => r.json())
      .then(setCheck)
      .catch(() => setCheck(null));
  }, []);

  if (!check) return null;

  return (
    <Card className="space-y-4 p-4 md:p-5">
      <SectionTitle hint={check.bereit ? "alles erledigt" : `${check.offen} offen`}>
        Bereit für den Pilotbetrieb?
      </SectionTitle>

      <div
        className={`rounded-lg px-4 py-3 text-sm font-semibold ${
          check.bereit ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"
        }`}
      >
        {check.bereit
          ? "Alles eingerichtet. Du kannst mit echten Kundendaten arbeiten."
          : `Noch ${check.offen} ${check.offen === 1 ? "Punkt" : "Punkte"} offen. Für Demos reicht der aktuelle Stand, für echte Kundendaten nicht.`}
      </div>

      <ul className="space-y-3">
        {check.punkte.map((punkt) => (
          <li key={punkt.id} className="flex items-start gap-3">
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                punkt.ok
                  ? "bg-emerald-100 text-emerald-700"
                  : punkt.pflicht
                    ? "bg-amber-100 text-amber-800"
                    : "bg-ink-100 text-ink-500"
              }`}
            >
              {punkt.ok ? "✓" : punkt.pflicht ? "!" : "–"}
            </span>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-ink-900">
                {punkt.titel}
                {!punkt.pflicht ? (
                  <span className="ml-2 text-xs font-medium text-ink-400">optional</span>
                ) : null}
              </div>
              <p className="text-sm text-ink-600">{punkt.hinweis}</p>
              {!punkt.ok && punkt.todo ? (
                <p className="mt-1 text-xs text-ink-500">Zu tun: {punkt.todo}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      <div className="space-y-2 border-t border-ink-100 pt-4">
        <p className="text-sm text-ink-600">
          Diese beiden Adressen bei deiner Twilio-Rufnummer eintragen:
        </p>
        <KopierZeile label="A call comes in" wert={check.webhooks.incoming} />
        <KopierZeile label="Call status changes" wert={check.webhooks.status} />
      </div>

      <p className="text-xs text-ink-400">
        Schritt-für-Schritt-Anleitung: START.md im Projekt. Telefondetails: TELEFON.md.
      </p>
    </Card>
  );
}
