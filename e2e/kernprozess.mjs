/**
 * End-to-End-Test des V1-Kernprozesses:
 * Anfrage -> Angebot -> Versand -> Follow-up -> Entscheidung -> Persistenz.
 *
 * Start: node e2e/kernprozess.mjs   (Server muss auf :3000 laufen)
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const results = [];
let failed = 0;

function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  if (!ok) failed++;
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` – ${detail}` : ""}`);
}

/** Wartet, bis der Store geladen und die Seite gerendert ist. */
async function ready(page) {
  await page.waitForFunction(() => !document.body.innerText.includes("Wird geladen…"), null, {
    timeout: 15000,
  });
}

const run = async () => {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on("pageerror", (e) => check("Keine JavaScript-Fehler", false, e.message));

  // --- 1. Anfrage erfassen -------------------------------------------------
  await page.goto(`${BASE}/anfragen/neu`, { waitUntil: "networkidle" });

  // Schnellerfassung: Peter strukturiert eine Telefonnotiz.
  await page.getByPlaceholder("z. B. Frau Schmitz").fill(
    "Herr Wagner angerufen, 0203 776655, Lindenstraße 4, 47051 Duisburg, Wohnzimmer ca. 32 m² streichen, gerne im Oktober",
  );
  await page.getByRole("button", { name: "Felder ausfüllen" }).click();

  const nameValue = await page.getByLabel("Name").inputValue();
  check("Peter strukturiert eine Telefonnotiz", nameValue === "Herr Wagner", `Name: "${nameValue}"`);
  const periodValue = await page.getByLabel("Gewünschter Zeitraum").inputValue();
  check("Zeitraum wird erkannt", periodValue === "Oktober", `Zeitraum: "${periodValue}"`);

  await page.locator('input[inputmode="email"]').first().fill("wagner@example.de");
  await page.getByRole("button", { name: "Anfrage speichern" }).click();
  await page.waitForURL(/\/anfragen\/inq_|\/anfragen\/[a-z]+_/);
  check("2. Anfrage wird gespeichert und geöffnet", page.url().includes("/anfragen/"));

  const inquiryUrl = page.url();
  await page.getByText("Herr Wagner").first().waitFor();
  check("3. Anfrage zeigt die erfassten Daten", (await page.content()).includes("32 m²"));

  // --- 2. Persistenz der Anfrage nach Reload -------------------------------
  await page.reload({ waitUntil: "networkidle" });
  await ready(page);
  check("Anfrage überlebt einen Reload", (await page.content()).includes("Herr Wagner"));

  // --- 3. Angebot aus der Anfrage ------------------------------------------
  await page.getByRole("button", { name: "Angebot aus Anfrage erstellen" }).click();
  await page.getByText("Peters Vorschlag").waitFor();
  const draftHtml = await page.content();
  check(
    "4. Peter schlägt Leistungen aus dem Katalog vor",
    draftHtml.includes("Wände zweimal streichen") && draftHtml.includes("Materialpauschale"),
  );
  check("Peter übernimmt die Fläche aus der Anfrage", draftHtml.includes("32 m²"));

  await page.getByRole("button", { name: "Vorschlag übernehmen" }).click();
  await page.waitForURL(/\/angebote\//);
  const quoteUrl = page.url();
  check("5. Angebot wird angelegt", quoteUrl.includes("/angebote/"));

  // Menge einer offenen Position ergänzen (Peter schätzt nichts).
  const quantityInputs = page.locator('input[type="number"][step="0.01"]');
  const firstQuantity = quantityInputs.first();
  await firstQuantity.fill("32");
  await page.waitForTimeout(400);

  const sumText = await page.getByText("Gesamtbetrag").locator("..").textContent();
  check("6. Summen werden berechnet", /\d/.test(sumText ?? ""), sumText?.trim());

  // --- 4. Versand + automatisches Follow-up --------------------------------
  await page.getByRole("button", { name: "Als gesendet markieren" }).click();
  await page.getByRole("button", { name: "Ja, gesendet" }).click();
  await page.getByText("Follow-up:").waitFor();
  check("7. Angebot ist als gesendet markiert", (await page.content()).includes("Gesendet am"));

  const followUpText = await page.getByText("Follow-up:").textContent();
  const followUpDate = (followUpText ?? "").replace("Follow-up:", "").trim();
  check("8. Follow-up-Datum wird automatisch erzeugt", /\d{2}\.\d{2}\.\d{4}/.test(followUpDate), followUpDate);

  // Prüfen, dass das Datum 3 Werktage in der Zukunft liegt.
  const [d, m, y] = followUpDate.split(".").map(Number);
  const fu = new Date(y, m - 1, d);
  const diffDays = Math.round((fu - new Date()) / 86400000);
  check("Follow-up liegt 3–6 Tage in der Zukunft (Werktage)", diffDays >= 2 && diffDays <= 6, `${diffDays} Tage`);

  // --- 5. Follow-up erscheint auf Heute ------------------------------------
  // Das bereits fällige Demo-Angebot deckt den Live-Fall ab.
  await page.goto(`${BASE}/heute`, { waitUntil: "networkidle" });
  await ready(page);
  const heute = await page.content();
  check("9. Fälliges Follow-up erscheint auf Heute", heute.includes("Follow-up fällig"));
  check("„Peter sagt“ weist auf das offene Angebot hin", heute.includes("Nachfassen?"));

  // Das neue Angebot vordatieren, um den eigenen Follow-up-Lauf zu prüfen.
  const quoteId = quoteUrl.split("/").pop();
  await page.evaluate((id) => {
    const raw = JSON.parse(localStorage.getItem("angebotsmeister.v1"));
    const q = raw.quotes.find((x) => x.id === id);
    const t = new Date();
    q.followUpDate = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
    localStorage.setItem("angebotsmeister.v1", JSON.stringify(raw));
  }, quoteId);
  await page.reload({ waitUntil: "networkidle" });
  await ready(page);
  check(
    "Das neue Angebot taucht am Follow-up-Tag auf Heute auf",
    (await page.content()).includes("Angebot Herr Wagner"),
  );

  // --- 6. Peter formuliert die Nachfassnachricht ---------------------------
  await page.goto(`${BASE}/peter`, { waitUntil: "networkidle" });
  await ready(page);
  await page.getByPlaceholder("Frage an Peter…").fill("Welche Angebote sind noch offen?");
  await page.getByRole("button", { name: "Fragen" }).click();
  await page.waitForTimeout(500);
  const peterOffen = await page.content();
  check("Peter listet offene Angebote aus echten Daten", peterOffen.includes("1042") && peterOffen.includes("Müller"));

  await page.getByPlaceholder("Frage an Peter…").fill("Schreib eine freundliche Nachfrage für Angebot 1042");
  await page.getByRole("button", { name: "Fragen" }).click();
  await page.waitForTimeout(500);
  const peterText = await page.content();
  check(
    "10. Peter formuliert eine passende Nachfassnachricht",
    peterText.includes("Angebot Nr. 1042") && peterText.includes("Ich verschicke nichts von selbst"),
  );

  await page.getByRole("button", { name: "Text kopieren" }).first().click();
  await page.waitForTimeout(300);
  check("Nachricht öffnet sich zur Kontrolle im Dialog", (await page.content()).includes("Nachricht vorbereiten"));
  check(
    "Versand-Kanäle stehen bereit (Gmail/E-Mail)",
    (await page.content()).includes("In Gmail öffnen"),
  );
  await page.keyboard.press("Escape");

  // Peter legt auf Zuruf ein Angebot an – erst nach Bestätigung durch den Nutzer.
  await page.getByPlaceholder("Frage an Peter…").fill(
    "Mach aus der Anfrage von Schneider einen Angebotsentwurf",
  );
  await page.getByRole("button", { name: "Fragen" }).click();
  await page.waitForTimeout(500);
  check(
    "Peter fragt vor dem Anlegen eines Angebots nach",
    (await page.content()).includes("Soll ich daraus ein Angebot anlegen?"),
  );
  await page.getByRole("button", { name: "Angebot anlegen" }).click();
  await page.waitForURL(/\/angebote\/\w+/);
  await ready(page);
  check(
    "Peters Angebotsentwurf landet als echtes Angebot im System",
    (await page.content()).includes("Untergrund vorbereiten"),
  );

  // --- 7. Entscheidung -----------------------------------------------------
  await page.goto(quoteUrl, { waitUntil: "networkidle" });
  await ready(page);
  await page.getByRole("button", { name: "Angenommen" }).click();
  await page.getByRole("button", { name: "Ja", exact: true }).click();
  await page.waitForTimeout(400);
  check("11. Angebot kann als angenommen markiert werden", (await page.content()).includes("Entschieden am"));

  // --- 8. Persistenz nach Reload ------------------------------------------
  await page.reload({ waitUntil: "networkidle" });
  await ready(page);
  const afterReload = await page.content();
  check("12. Status bleibt nach Reload erhalten", afterReload.includes("Entschieden am"));
  check("Positionen bleiben nach Reload erhalten", afterReload.includes("Wände zweimal streichen"));

  await page.goto(inquiryUrl, { waitUntil: "networkidle" });
  await ready(page);
  check(
    "Anfrage wird durch die Auftragsannahme abgeschlossen",
    (await page.content()).includes("Abgeschlossen"),
  );

  // --- 9. Mobile Ansicht ---------------------------------------------------
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobile.goto(`${BASE}/heute`, { waitUntil: "networkidle" });
  await ready(mobile);
  const hasBottomNav = await mobile.getByRole("link", { name: "Anfragen" }).first().isVisible();
  check("Mobile Navigation ist sichtbar", hasBottomNav);
  const scrollWidth = await mobile.evaluate(() => document.documentElement.scrollWidth);
  check("Kein horizontaler Überlauf auf dem Handy", scrollWidth <= 400, `${scrollWidth}px`);

  // --- 10. Leere Zustände --------------------------------------------------
  await mobile.evaluate(() => localStorage.setItem("angebotsmeister.v1", JSON.stringify({
    version: 1,
    company: { name: "Test", owner: "Test Inhaber", street: "", zip: "", city: "", phone: "", email: "", taxRate: 19, validityDays: 21, followUpWorkdays: 3, signature: "", demoPrices: false },
    customers: [], inquiries: [], quotes: [], services: [], tasks: [], nextQuoteNumber: 1001,
  })));
  await mobile.goto(`${BASE}/anfragen`, { waitUntil: "networkidle" });
  await ready(mobile);
  check("Leerer Zustand bei Anfragen wird erklärt", (await mobile.content()).includes("Noch keine Anfragen"));
  // Offene Anrufe liegen auf dem Server, nicht im Browser-Speicher – für den
  // Leerzustand müssen auch sie abgehakt sein.
  const { calls } = await fetch(`${BASE}/api/voice/calls`, { cache: "no-store" }).then((r) => r.json());
  for (const call of calls.filter((c) => c.status === "aufgenommen" || c.status === "abgebrochen")) {
    await fetch(`${BASE}/api/voice/calls`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: call.id, status: "erledigt" }),
    });
  }

  await mobile.goto(`${BASE}/heute`, { waitUntil: "networkidle" });
  await ready(mobile);
  await mobile.waitForTimeout(600);
  check("Leerer Zustand auf Heute wird erklärt", (await mobile.content()).includes("Alles erledigt"));

  // --- 11. Fehlerzustand: unbekannte ID ------------------------------------
  await mobile.goto(`${BASE}/angebote/gibtsnicht`, { waitUntil: "networkidle" });
  await ready(mobile);
  check("Unbekanntes Angebot führt nicht zum Absturz", (await mobile.content()).includes("Angebot nicht gefunden"));

  await browser.close();

  console.log(`\n${results.length - failed}/${results.length} Prüfungen bestanden.`);
  process.exit(failed > 0 ? 1 : 0);
};

run().catch((err) => {
  console.error("Testlauf abgebrochen:", err);
  process.exit(1);
});
