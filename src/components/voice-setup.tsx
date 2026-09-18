"use client";

import { useEffect, useState } from "react";
import { Card, SectionTitle } from "./ui";

interface Setup {
  speicher: "supabase" | "datei";
  signaturGeprueft: boolean;
  oeffentlicheBasis: boolean;
  webhooks: { incoming: string; status: string };
}

function Zeile({ label, wert }: { label: string; wert: string }) {
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

/** Zeigt, was für den Telefonassistenten noch fehlt. */
export function VoiceSetup() {
  const [setup, setSetup] = useState<Setup | null>(null);

  useEffect(() => {
    fetch("/api/voice/setup")
      .then((r) => r.json())
      .then(setSetup)
      .catch(() => setSetup(null));
  }, []);

  if (!setup) return null;

  const punkte = [
    {
      ok: setup.oeffentlicheBasis,
      text: setup.oeffentlicheBasis
        ? "Öffentliche Adresse ist gesetzt (PUBLIC_BASE_URL)."
        : "PUBLIC_BASE_URL setzen, damit Twilio die Rückfragen an die richtige Adresse schickt.",
    },
    {
      ok: setup.signaturGeprueft,
      text: setup.signaturGeprueft
        ? "Anrufe werden per Twilio-Signatur geprüft."
        : "TWILIO_AUTH_TOKEN setzen – sonst kann jeder Anrufe vortäuschen. Pflicht vor dem Livegang.",
    },
    {
      ok: setup.speicher === "supabase",
      text:
        setup.speicher === "supabase"
          ? "Anrufe werden in Supabase gespeichert."
          : "Ohne Supabase liegen die Anrufe in einer Datei auf dem Server – für Tests in Ordnung, für den Betrieb nicht.",
    },
  ];

  return (
    <Card className="space-y-4 p-4 md:p-5">
      <SectionTitle hint="nimmt Anrufe an, wenn niemand rangeht">Telefonassistent</SectionTitle>

      <p className="text-sm text-ink-600">
        Diese beiden Adressen bei deiner Twilio-Rufnummer eintragen. Danach landet jeder Anruf,
        den du nicht annimmst, als aufgenommene Anfrage unter <strong>Anrufe</strong>.
      </p>

      <div className="space-y-2">
        <Zeile label="A call comes in" wert={setup.webhooks.incoming} />
        <Zeile label="Call status changes" wert={setup.webhooks.status} />
      </div>

      <ul className="space-y-2 border-t border-ink-100 pt-4">
        {punkte.map((punkt) => (
          <li key={punkt.text} className="flex items-start gap-2 text-sm">
            <span className={punkt.ok ? "text-emerald-600" : "text-amber-600"}>
              {punkt.ok ? "✓" : "!"}
            </span>
            <span className={punkt.ok ? "text-ink-600" : "text-ink-800"}>{punkt.text}</span>
          </li>
        ))}
      </ul>

      <p className="text-xs text-ink-400">
        Der Assistent nennt am Telefon keine Preise und sagt keine Termine zu. Er nimmt auf und
        kündigt den Rückruf an. Die vollständige Anleitung steht in TELEFON.md.
      </p>
    </Card>
  );
}
