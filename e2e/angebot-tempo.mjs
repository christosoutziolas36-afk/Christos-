/**
 * Misst den Aufwand für ein vollständiges Angebot von null.
 * Szenario: Besichtigung war heute, der Kunde ist noch nicht im System,
 * das Angebot hat fünf Positionen.
 *
 *   node e2e/angebot-tempo.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const KLICK = 3, FELD = 7, SEITE = 2;

let klicks = 0, felder = 0, seiten = 0, failed = 0;
const schritte = [];
function zaehle(was, art) {
  if (art === "klick") klicks++;
  if (art === "feld") felder++;
  if (art === "seite") seiten++;
  schritte.push(`  ${art.padEnd(6)} ${was}`);
}
function check(name, ok, detail = "") {
  if (!ok) failed++;
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` – ${detail}` : ""}`);
}

const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
p.on("pageerror", (e) => check("Keine JavaScript-Fehler", false, e.message));
const ready = () => p.waitForFunction(() => !document.body.innerText.includes("Wird geladen…"), null, { timeout: 15000 });

await p.goto(`${BASE}/heute`, { waitUntil: "networkidle" });
await ready();
zaehle("Startseite", "seite");

// 1. Direkt zum Angebot – ohne Umweg über eine Anfrage
await p.getByRole("link", { name: "+ Angebot" }).click();
await p.waitForURL(/\/angebote\/neu/, { timeout: 10000 });
await ready();
zaehle("+ Angebot", "klick");
zaehle("Kundenauswahl", "seite");
check("Direkter Weg zum Angebot vorhanden", p.url().includes("/angebote/neu"));

// 2. Neuer Kunde, zwei Felder
await p.getByRole("button", { name: "Neuer Kunde" }).click();
zaehle("Neuer Kunde", "klick");
await p.getByLabel("Name").fill("Herr Schulz");
zaehle("Name", "feld");
await p.locator('input[inputmode="tel"]').fill("0203 111222");
zaehle("Telefon", "feld");
await p.getByRole("button", { name: "Weiter zu den Leistungen" }).click();
await p.waitForURL(/\/angebote\/\w+/);
await ready();
zaehle("Weiter", "klick");
zaehle("Angebotseditor", "seite");
check("Angebot ist angelegt", p.url().includes("/angebote/"));

// 3. Fünf Positionen per Tastatur – eine Zeile pro Position
const feld = p.getByPlaceholder("Leistung und Menge tippen");
const zeilen = ["abkleben 60", "untergrund 60", "wände 95", "risse 12", "material"];
for (const zeile of zeilen) {
  await feld.fill(zeile);
  await feld.press("Enter");
  zaehle(`„${zeile}“`, "feld");
  await p.waitForTimeout(120);
}

const positionen = await p.locator('input[type="number"][step="0.01"]').count();
check("Fünf Positionen erfasst", positionen / 2 === 5, `${positionen / 2}`);

// Mengen kontrollieren
const mengen = p.locator('input[type="number"][step="0.01"]');
let ohneMenge = 0;
for (let i = 0; i < positionen; i += 2) {
  if ((await mengen.nth(i).inputValue()) === "0") ohneMenge++;
}
check("Alle Mengen sind gesetzt", ohneMenge === 0, `${ohneMenge} offen`);

const summe = await p.getByText("Gesamtbetrag").locator("..").textContent();
check("Summe wird berechnet", /\d/.test(summe ?? ""), summe?.replace("Gesamtbetrag", "").trim());

// 4. Versenden und Follow-up erzeugen
await p.getByRole("button", { name: "Als gesendet markieren" }).click();
zaehle("Als gesendet markieren", "klick");
await p.getByRole("button", { name: "Ja, gesendet" }).click();
zaehle("Bestätigen", "klick");
await p.getByText("Follow-up:").waitFor();
check("Follow-up wurde erzeugt", (await p.content()).includes("Follow-up:"));

const sekunden = klicks * KLICK + felder * FELD + seiten * SEITE;
console.log("\nSchritte:");
console.log(schritte.join("\n"));
console.log("\n" + "─".repeat(52));
console.log(`Klicks: ${klicks} · Tippzeilen: ${felder} · Seitenwechsel: ${seiten}`);
console.log(`Geschätzter Aufwand: ${Math.round((sekunden / 60) * 10) / 10} Minuten`);
console.log("─".repeat(52));

await b.close();
process.exit(failed > 0 ? 1 : 0);
