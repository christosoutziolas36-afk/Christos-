import { NextResponse } from "next/server";
import { speicherArt } from "@/lib/voice/call-store";
import { basisUrl } from "../voice/incoming/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface CheckPunkt {
  id: string;
  titel: string;
  ok: boolean;
  /** Blockiert den echten Pilotbetrieb, nicht nur ein Nice-to-have. */
  pflicht: boolean;
  hinweis: string;
  /** Was konkret zu tun ist, wenn es nicht erfüllt ist. */
  todo?: string;
}

/**
 * Bereitschaftsprüfung für den Pilotbetrieb.
 * Zeigt an einer Stelle, was vor dem ersten echten Kunden noch fehlt –
 * damit niemand Konfigurationsdateien durchsuchen muss.
 */
export async function GET(request: Request) {
  const basis = basisUrl(request);

  const supabaseUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const supabaseAnon = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const serviceKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const twilioToken = Boolean(process.env.TWILIO_AUTH_TOKEN);
  const publicBase = Boolean(process.env.PUBLIC_BASE_URL);
  const anthropic = Boolean(process.env.ANTHROPIC_API_KEY);

  const punkte: CheckPunkt[] = [
    {
      id: "supabase",
      titel: "Datenbank",
      ok: supabaseUrl && supabaseAnon,
      pflicht: true,
      hinweis:
        supabaseUrl && supabaseAnon
          ? "Supabase ist verbunden. Daten liegen zentral und sind auf allen Geräten verfügbar."
          : "Ohne Supabase liegen alle Daten nur im Browser dieses Geräts. Für eine Demo in Ordnung, für einen echten Betrieb nicht.",
      todo: "supabase/schema.sql im Supabase SQL-Editor ausführen, dann NEXT_PUBLIC_SUPABASE_URL und NEXT_PUBLIC_SUPABASE_ANON_KEY setzen.",
    },
    {
      id: "voice_speicher",
      titel: "Anrufe werden dauerhaft gespeichert",
      ok: speicherArt() === "supabase",
      pflicht: true,
      hinweis:
        speicherArt() === "supabase"
          ? "Aufgenommene Anrufe liegen in Supabase."
          : "Anrufe liegen in einer Datei auf dem Server. Bei Vercel und ähnlichem Hosting ist sie nach dem nächsten Deploy weg.",
      todo: "SUPABASE_SERVICE_ROLE_KEY setzen (nur serverseitig, nie im Browser).",
    },
    {
      id: "twilio",
      titel: "Anrufe sind gegen Missbrauch geschützt",
      ok: twilioToken,
      pflicht: true,
      hinweis: twilioToken
        ? "Eingehende Anrufe werden per Twilio-Signatur geprüft."
        : "Ohne Signaturprüfung kann jeder gefälschte Anrufe in dein Dashboard schreiben.",
      todo: "TWILIO_AUTH_TOKEN aus der Twilio-Konsole in die Umgebungsvariablen eintragen.",
    },
    {
      id: "basis",
      titel: "Öffentliche Adresse gesetzt",
      ok: publicBase,
      pflicht: true,
      hinweis: publicBase
        ? `Twilio schickt Rückfragen an ${basis}.`
        : "Ohne feste Adresse rät die App anhand des aufrufenden Hosts – hinter einem Proxy kann das schiefgehen.",
      todo: `PUBLIC_BASE_URL auf die Live-Adresse setzen (aktuell erkannt: ${basis}).`,
    },
    {
      id: "serviceKey",
      titel: "Telefon-Webhook darf schreiben",
      ok: !supabaseUrl || serviceKey,
      pflicht: true,
      hinweis:
        !supabaseUrl || serviceKey
          ? "Der Telefon-Webhook kann Anrufe speichern."
          : "Supabase ist verbunden, aber der Service-Role-Key fehlt. Anrufe können nicht gespeichert werden.",
      todo: "SUPABASE_SERVICE_ROLE_KEY setzen.",
    },
    {
      id: "peter_modell",
      titel: "Peter beantwortet freie Fragen",
      ok: anthropic,
      pflicht: false,
      hinweis: anthropic
        ? "Ein Sprachmodell ist hinterlegt."
        : "Peter beantwortet alle eingebauten Fragen auch ohne Sprachmodell. Freie Fragen führen zur Hilfe-Antwort.",
      todo: "ANTHROPIC_API_KEY setzen (optional).",
    },
  ];

  const offenePflicht = punkte.filter((p) => p.pflicht && !p.ok);

  return NextResponse.json({
    bereit: offenePflicht.length === 0,
    offen: offenePflicht.length,
    punkte,
    webhooks: {
      incoming: `${basis}/api/voice/incoming`,
      status: `${basis}/api/voice/status`,
    },
  });
}
