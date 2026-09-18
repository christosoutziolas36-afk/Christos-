# Start – was nur du machen kannst

Alles Technische ist gebaut und getestet. Was hier steht, braucht deinen
Ausweis, deine Kreditkarte oder deine Stimme – deshalb kann es dir niemand
abnehmen. Zeitaufwand insgesamt: **rund 90 Minuten.**

Nach jedem Schritt prüfst du das Ergebnis in der App unter
*Einstellungen → Bereit für den Pilotbetrieb?* Dort steht grün oder gelb,
nichts musst du im Code suchen.

---

## Schritt 1 · Datenbank (15 Minuten)

1. [supabase.com](https://supabase.com) → **New project**
   Region: *Frankfurt (eu-central-1)* – wichtig, damit die Kundendaten in der EU liegen.
2. Links im Menü **SQL Editor** → **New query**
3. Den kompletten Inhalt von `supabase/schema.sql` einfügen → **Run**
4. **Project Settings → API**, dort drei Werte kopieren:

   | Supabase nennt es | Trägst du ein als |
   |---|---|
   | Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
   | anon public | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
   | service_role | `SUPABASE_SERVICE_ROLE_KEY` |

   Der `service_role`-Key darf **nie** in den Browser – er steht nur in den
   Server-Umgebungsvariablen. Die App benutzt ihn ausschließlich für den
   Telefon-Webhook.

**Fertig, wenn:** Im Systemcheck sind „Datenbank" und „Anrufe werden dauerhaft
gespeichert" grün.

---

## Schritt 2 · Online stellen (15 Minuten)

1. [vercel.com](https://vercel.com) → **Add New Project** → dieses GitHub-Repository
2. Branch: `claude/angebotsmeister-saas-handoff-vft1ab`
3. Unter **Environment Variables** die Werte aus Schritt 1 eintragen,
   dazu `PUBLIC_BASE_URL` mit der Adresse, die Vercel dir gibt
   (z. B. `https://angebotsmeister.vercel.app`)
4. **Deploy**

**Fertig, wenn:** Du die Adresse am Handy öffnest und das Dashboard siehst.

Ab hier kannst du Demos halten, auch ohne Telefonanschluss.

---

## Schritt 3 · Telefonnummer (30 Minuten, braucht deinen Ausweis)

Nur nötig, wenn der Assistent echte Anrufe annehmen soll.

1. [twilio.com](https://twilio.com) → Konto anlegen, Guthaben aufladen (20 € genügen für den Anfang)
2. **Phone Numbers → Buy a number** → Land *Germany*, Fähigkeit *Voice*
   Für deutsche Nummern verlangt Twilio eine Adressbestätigung
   (Ausweis oder Gewerbeanmeldung). Die Freigabe dauert manchmal einen Tag.
3. Die gekaufte Nummer öffnen, unter **Voice Configuration** eintragen –
   beide Adressen stehen in der App zum Kopieren bereit:

   | Feld | Wert |
   |---|---|
   | A call comes in | `<deine-adresse>/api/voice/incoming` (HTTP POST) |
   | Call status changes | `<deine-adresse>/api/voice/status` (HTTP POST) |

4. **Account Info → Auth Token** kopieren und bei Vercel als
   `TWILIO_AUTH_TOKEN` eintragen. Ohne diesen Wert kann jeder gefälschte
   Anrufe in dein Dashboard schreiben.

**Fertig, wenn:** Du deine Twilio-Nummer anrufst und der Assistent rangeht.

---

## Schritt 4 · Rufumleitung beim Pilotbetrieb (5 Minuten, beim Kunden)

Der Betrieb behält seine eigene Nummer. Eingerichtet wird nur:
**Anrufweiterleitung bei Nichtmelden nach ca. 20 Sekunden → Twilio-Nummer.**

Bei den meisten Anbietern heißt das „Rufumleitung bei Nichtmelden" und lässt
sich im Kundenportal oder per Tastenkombination am Telefon einstellen. Bei
Mobilfunk: `**61*<Twilio-Nummer>*11*20#` und Anrufen-Taste.

So gehen nur die Anrufe an den Assistenten, die sonst ins Leere gelaufen wären.

---

## Was du dann noch selbst tun musst

1. **Anrufen und Termine machen.** Der Leitfaden steht in `AKQUISE.md`.
2. **Die Demo halten.** Ablauf in `PILOT.md`, dauert 15 Minuten.
3. **Preise des Betriebs eintragen** – im Gespräch, unter *Einstellungen →
   Leistungskatalog*. Danach den Haken „Demo-Preise" entfernen.
4. **Den Pilotvertrag geben** (Vorlage in `AKQUISE.md`) und, sobald echte
   Kundendaten fließen, den Auftragsverarbeitungsvertrag klären.

Alles andere – Code, Tests, Fehlerbehebung, neue Funktionen – kannst du an
mich geben. Sag einfach, was der Betrieb gesagt hat.
