# Angebotsmeister

Software für kleine, inhabergeführte Maler- und Lackiererbetriebe.
Ein Prozess, den sie wirklich jeden Tag brauchen:

**Anfrage → Angebot → Follow-up**

Kundenanfragen festhalten, schneller Angebote vorbereiten und offene Angebote
nicht mehr vergessen. Kein ERP, keine Buchhaltung, kein Lager.

## Loslegen

- **[START.md](START.md)** – die Schritte, die nur ein Mensch machen kann
  (Datenbank, Deployment, Telefonnummer). Rund 90 Minuten.
- **[AKQUISE.md](AKQUISE.md)** – Telefonleitfaden, Nachrichtvorlagen,
  Demo-Ablauf, Pilotvereinbarung.
- **[PILOT.md](PILOT.md)** – Ablauf des vierwöchigen Tests.
- **[TELEFON.md](TELEFON.md)** – Telefonassistent einrichten und testen.

## Schnellstart

```bash
git clone -b claude/angebotsmeister-saas-handoff-vft1ab \
  https://github.com/christosoutziolas36-afk/Christos-.git angebotsmeister
cd angebotsmeister
npm install
npm run dev        # http://localhost:3000
```

Einen Anruf vorführen (App muss laufen, zweites Terminal):

```bash
npm run demo           # vollständiges Gespräch
npm run demo:abbruch   # Anrufer legt mittendrin auf
```

Beim ersten Start legt die App den Demo-Betrieb „Malerbetrieb Farbwerk – Demo“
(Duisburg) mit Beispielkunden, Leistungskatalog und offenen Angeboten an – ideal
für eine Demo beim Kunden.

## Der Kernprozess

1. **Anfrage erfassen** – auch als Telefonnotiz; Peter sortiert Name, Nummer,
   Adresse und Zeitraum in die Felder.
2. **Angebot erstellen** – Peter schlägt Positionen aus dem hinterlegten
   Leistungskatalog vor und übernimmt Flächen aus dem Anfragetext.
3. **Versenden** – als PDF drucken oder per Gmail/E-Mail/WhatsApp verschicken.
4. **Follow-up** – beim Markieren als „gesendet“ entsteht automatisch ein
   Follow-up-Termin (Standard: 3 Werktage, Feiertage in NRW berücksichtigt).
   Am Stichtag steht das Angebot wieder auf *Heute*.
5. **Entscheidung** – angenommen oder abgelehnt, mit Rückfrage vor jedem Schritt.

## Telefonassistent

Ruft jemand an und im Betrieb geht niemand ran, nimmt der Assistent das
Gespräch an, fragt Name, Anliegen, Adresse und Zeitraum ab und legt die
Anfrage ins Dashboard. Jede Antwort wird sofort gespeichert – auch ein
abgebrochener Anruf landet vollständig unter *Anrufe*, mit dem Hinweis, was
noch fehlt. Von dort wird mit einem Klick eine Anfrage daraus.

Einrichtung und Test ohne Telefon: siehe [TELEFON.md](TELEFON.md).

## Peter

Der eingebaute Assistent arbeitet ausschließlich mit den gespeicherten Daten
des Betriebs.

Peter darf **nicht**: Preise oder Leistungen erfinden, Angebote verschicken,
Kunden kontaktieren, Aufträge eigenständig als gewonnen oder verloren
markieren oder Termine erzeugen. Alles mit Außenwirkung muss der Nutzer
bestätigen.

Preise stammen immer aus dem Leistungskatalog unter *Einstellungen*. Fehlt eine
Menge, sagt Peter das, statt zu schätzen.

Ohne Konfiguration beantwortet Peter alle eingebauten Fragen regelbasiert
(schnell, nachvollziehbar, offline). Ist ein `ANTHROPIC_API_KEY` gesetzt,
beantwortet zusätzlich ein Sprachmodell freie Fragen – mit denselben Regeln im
System-Prompt.

## Datenhaltung

| Modus | Wann aktiv | Eigenschaften |
|---|---|---|
| Demo-Modus | keine Supabase-Variablen gesetzt | Daten liegen im Browser, reload-fest, an das Gerät gebunden |
| Supabase | `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` | echte Datenbank, mehrere Geräte, RLS pro Betrieb |

Schema anlegen: `supabase/schema.sql` im Supabase SQL-Editor ausführen,
danach `.env.local` aus `.env.example` befüllen.

## Tests

```bash
npm test                     # Unit-Tests: Werktage, Summen, Peter, Telefonassistent
npm run build && npm start
node e2e/kernprozess.mjs     # End-to-End: Anfrage -> Angebot -> Follow-up
node e2e/telefonassistent.mjs # End-to-End: Anruf -> Dashboard -> Anfrage
node e2e/anruf-simulieren.mjs # Anruf zum Vorführen simulieren
```

## Stack

Next.js 15 (App Router), TypeScript, Tailwind CSS 4, Framer Motion, Supabase.
