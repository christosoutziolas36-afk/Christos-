# Telefonassistent

Nimmt Anrufe an, wenn im Betrieb niemand rangehen kann, fragt das Nötigste ab
und legt die Anfrage ins Dashboard. Ziel: **kein Anruf geht verloren.**

## Was der Assistent sagt

> Guten Tag, Sie sind bei *[Betrieb]*. *[Inhaber]* ist gerade im Einsatz und
> kann nicht ans Telefon. Ich nehme Ihre Anfrage auf, dann meldet er sich bei
> Ihnen zurück. Wie ist Ihr Name?

Danach fünf kurze Fragen: Name → Anliegen → Adresse → Zeitraum →
Rückrufnummer. Zum Schluss wiederholt er, was er verstanden hat, und kündigt
den Rückruf an.

**Der Assistent nennt keine Preise und sagt keine Termine zu.** Er nimmt auf,
mehr nicht — dieselbe Regel wie bei Peter im Dashboard.

## Kein Anruf geht verloren

- Nach **jeder** Antwort wird sofort gespeichert. Legt jemand nach der zweiten
  Frage auf, stehen Name und Anliegen trotzdem im Dashboard.
- Abgebrochene Gespräche erscheinen als „Aufgelegt" mit der Liste dessen, was
  nicht erfragt werden konnte.
- Versteht die Spracherkennung etwas nicht, fragt der Assistent einmal nach.
  Danach beendet er freundlich und verweist auf den Rückruf — statt zu raten.
- Selbst wer sofort auflegt, hinterlässt seine Rufnummer.

## Einrichtung mit Twilio

1. **Rufnummer kaufen** – Twilio Console → Phone Numbers → deutsche Nummer mit
   Voice-Funktion (für DE-Nummern ist ein Adressnachweis nötig).
2. **App öffentlich erreichbar machen** – z. B. Vercel-Deployment, für lokale
   Tests `ngrok http 3000`.
3. **`.env.local` füllen** (siehe `.env.example`):
   ```
   PUBLIC_BASE_URL=https://deine-adresse.de
   TWILIO_AUTH_TOKEN=...
   ```
4. **Webhooks eintragen** in den Voice-Einstellungen der Nummer:
   | Feld | Wert |
   |---|---|
   | A call comes in | `<PUBLIC_BASE_URL>/api/voice/incoming` (HTTP POST) |
   | Call status changes | `<PUBLIC_BASE_URL>/api/voice/status` (HTTP POST) |

   Die fertigen Adressen stehen auch unter *Einstellungen → Telefonassistent*
   zum Kopieren bereit.
5. **Rufumleitung im Betrieb** – die Festnetznummer nach 20 Sekunden ohne
   Annahme auf die Twilio-Nummer umleiten. Der Betrieb behält seine Nummer,
   der Assistent übernimmt nur, was sonst ins Leere gelaufen wäre.

## Ohne Telefon testen

```bash
npm run build && npm start
node e2e/anruf-simulieren.mjs            # vollständiges Gespräch
node e2e/anruf-simulieren.mjs --abbruch  # Anrufer legt mittendrin auf
node e2e/telefonassistent.mjs            # End-to-End inkl. Dashboard
```

Der Simulator spricht mit denselben Webhooks wie Twilio — er eignet sich auch
für die Vorführung beim Kunden.

## Vor dem Livegang

1. `TWILIO_AUTH_TOKEN` setzen. Ohne Signaturprüfung kann jeder Anrufe
   vortäuschen und Einträge im Dashboard erzeugen.
2. Supabase einrichten (`supabase/schema.sql`) und
   `SUPABASE_SERVICE_ROLE_KEY` hinterlegen. Ohne Supabase liegen Anrufe in
   einer Datei auf dem Server — bei serverlosem Hosting ist die nach dem
   nächsten Deploy weg.
3. Ansageband prüfen: Der Anrufer muss hören, dass er mit einem Assistenten
   spricht. Die Begrüßung tut das („Ich nehme Ihre Anfrage auf"). Eine
   Aufzeichnung des Gesprächs findet nicht statt; gespeichert wird nur das
   Transkript der Antworten. Bei echten Kundendaten gehört das in die
   Datenschutzerklärung des Betriebs.

## Anbieterwechsel

Die Telefonie steckt in `src/lib/voice/twiml.ts` (Antwortformat) und den
Routen unter `src/app/api/voice/`. Gesprächsführung (`dialog.ts`), Auswertung
(`extract.ts`) und Ablauf (`handler.ts`) sind anbieterunabhängig — ein Wechsel
zu sipgate, Telnyx oder Vonage betrifft nur die erste Schicht.
