# Pilot-Leitfaden

Für das erste Gespräch mit einem Malerbetrieb. Ziel ist kein Softwareverkauf,
sondern ein risikoarmer Test mit echten Anfragen des Betriebs.

## Vorbereitung (5 Minuten)

1. `npm run dev` starten, unter *Einstellungen* den Betriebsnamen, den Inhaber
   und die Grußformel des Kunden eintragen.
2. Leistungskatalog auf die Preise des Betriebs anpassen. Fragen, die dabei
   helfen: „Was rechnest du pro m² beim zweifachen Anstrich?“, „Was nimmst du
   für Anfahrt und Material?“
3. Haken bei „Preise als Demo-/Beispielpreise kennzeichnen“ entfernen, sobald
   echte Preise hinterlegt sind.

## Die Demo (10 Minuten)

Genau der Weg, den der Betrieb jeden Tag geht:

1. **Anfrage** – eine echte Anfrage des Betriebs aufnehmen, am besten als
   Telefonnotiz in die Schnellerfassung tippen.
2. **Angebot** – „Angebot aus Anfrage erstellen“, Peters Vorschlag zeigen,
   Mengen korrigieren, drucken.
3. **Follow-up** – als gesendet markieren und zeigen, dass das Angebot am
   Stichtag von selbst wieder auf *Heute* steht.
4. **Nachfassen** – „Nachricht vorbereiten“, Text anpassen, per Gmail oder
   WhatsApp verschicken.

Der Satz, auf den es ankommt: *„Kein offenes Angebot geht mehr unter.“*

## Der Pilot

- Laufzeit: vier Wochen, kostenlos.
- Der Betrieb erfasst jede neue Anfrage.
- Wöchentlich kurz nachfragen: Was nervt? Was fehlt?
- Erfolgskriterium: Der Inhaber öffnet die App morgens von selbst.

## Vor dem ersten echten Pilotbetrieb

- Supabase einrichten (`supabase/schema.sql`), damit Daten nicht nur auf
  einem Gerät liegen.
- Supabase-Auth aktivieren, damit die Row-Level-Security greift.
- Auftragsverarbeitung nach DSGVO klären, sobald echte Kundendaten erfasst
  werden.
