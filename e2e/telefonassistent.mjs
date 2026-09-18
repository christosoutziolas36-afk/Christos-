/**
 * End-to-End: Anruf -> Aufnahme -> Dashboard -> Anfrage.
 * Prüft, dass wirklich kein Anruf verloren geht.
 *
 *   node e2e/telefonassistent.mjs   (Server muss auf :3000 laufen)
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const results = [];
let failed = 0;

function check(name, ok, detail = "") {
  results.push({ name, ok });
  if (!ok) failed++;
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` – ${detail}` : ""}`);
}

async function post(url, felder) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(felder),
  });
  return res.text();
}

const action = (twiml) => (twiml.match(/action="([^"]+)"/) || [])[1]?.replace(/&amp;/g, "&");

/** Führt ein Gespräch über die echten Webhooks. */
async function anrufFuehren(from, antworten, { abbruchNach } = {}) {
  const callSid = `CAtest${Date.now()}${Math.floor(Math.random() * 1000)}`;
  let twiml = await post(`${BASE}/api/voice/incoming`, {
    From: from,
    To: "+492031234567",
    CallSid: callSid,
    CallStatus: "ringing",
  });

  for (let i = 0; i < 8; i++) {
    const url = action(twiml);
    if (!url) break;
    const step = (url.match(/step=([a-z]+)/) || [])[1];
    if (abbruchNach && step === abbruchNach) {
      await post(`${BASE}/api/voice/status`, { CallSid: callSid, CallStatus: "completed" });
      break;
    }
    const antwort = antworten[step];
    if (antwort === undefined) break;
    twiml = await post(url, { CallSid: callSid, From: from, SpeechResult: antwort, Confidence: "0.9" });
  }
  return callSid;
}

const run = async () => {
  // --- 1. Vollständiges Gespräch ------------------------------------------
  const sidVoll = await anrufFuehren("+4917055500011", {
    name: "mein Name ist Frau Berger",
    anliegen: "Treppenhaus streichen, ungefähr 45 Quadratmeter",
    adresse: "Moselstraße 7 in 47051 Duisburg",
    zeitraum: "am besten im Oktober",
    rueckrufnummer: "ja passt",
  });

  // --- 2. Abgebrochenes Gespräch ------------------------------------------
  const sidAbbruch = await anrufFuehren(
    "+4917055500022",
    { name: "Herr Klein", anliegen: "Küche streichen" },
    { abbruchNach: "adresse" },
  );

  const { calls } = await fetch(`${BASE}/api/voice/calls`, { cache: "no-store" }).then((r) => r.json());
  const voll = calls.find((c) => c.providerCallId === sidVoll);
  const teil = calls.find((c) => c.providerCallId === sidAbbruch);

  check("Vollständiger Anruf wird gespeichert", voll?.status === "aufgenommen", voll?.status);
  check("Name wird erkannt", voll?.extracted.name === "Frau Berger", voll?.extracted.name);
  check("Anliegen wird erkannt", (voll?.extracted.anliegen ?? "").includes("Treppenhaus"));
  check("Adresse wird erkannt", (voll?.extracted.adresse ?? "").includes("47051 Duisburg"), voll?.extracted.adresse);
  check("Zeitraum wird erkannt", voll?.extracted.zeitraum === "Oktober", voll?.extracted.zeitraum);
  check("Rückrufnummer ist die Anrufernummer", voll?.extracted.phone === "+4917055500011");

  check("Abgebrochener Anruf geht nicht verloren", teil?.status === "abgebrochen", teil?.status);
  check("Bis zum Auflegen Gesagtes bleibt erhalten", teil?.extracted.name === "Herr Klein");
  check("Nicht erfragte Angaben bleiben leer, statt geraten zu werden", !teil?.extracted.adresse);

  // --- 3. Dashboard --------------------------------------------------------
  const browser = await chromium.launch({
    executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  page.on("pageerror", (e) => check("Keine JavaScript-Fehler", false, e.message));
  const ready = () =>
    page.waitForFunction(() => !document.body.innerText.includes("Wird geladen…"), null, { timeout: 15000 });

  await page.goto(`${BASE}/heute`, { waitUntil: "networkidle" });
  await ready();
  await page.waitForTimeout(800);
  const heute = await page.content();
  check("Aufgenommene Anrufe stehen auf Heute", heute.includes("Anrufe, die der Assistent angenommen hat"));
  check("Anrufer erscheint mit Namen", heute.includes("Frau Berger"));
  check("Abgebrochener Anruf ist als solcher markiert", heute.includes("Aufgelegt"));
  check("Fehlende Angaben werden benannt", heute.includes("Nicht erfragt"));

  await page.goto(`${BASE}/anrufe`, { waitUntil: "networkidle" });
  await ready();
  await page.waitForTimeout(600);

  // Gezielt die Karte des vollständigen Anrufs – die Liste zeigt den neuesten oben.
  const karte = page.getByTestId(`anruf-${voll.id}`);

  await karte.getByRole("button", { name: "Gespräch anzeigen" }).click();
  await page.waitForTimeout(300);
  check(
    "Das Gespräch ist nachlesbar",
    (await karte.textContent())?.includes("Anrufer: mein Name ist Frau Berger") ?? false,
  );

  // Übernahme in den Kernprozess
  await karte.getByRole("button", { name: "Als Anfrage übernehmen" }).click();
  await page.waitForURL(/\/anfragen\/\w+/, { timeout: 15000 });
  await ready();
  const anfrage = await page.content();
  check("Anruf wird zur Anfrage im Kernprozess", page.url().includes("/anfragen/"));
  check("Anliegen steht in der Anfrage", anfrage.includes("Treppenhaus"));
  check("Adresse wurde übernommen", anfrage.includes("Moselstraße 7"));
  check("Zeitraum wurde übernommen", anfrage.includes("Oktober"));
  check("Herkunft ist vermerkt", anfrage.includes("Telefonassistenten aufgenommen"));

  // Der übernommene Anruf ist nicht mehr offen
  await page.goto(`${BASE}/anrufe`, { waitUntil: "networkidle" });
  await ready();
  await page.waitForTimeout(600);
  const anrufe = await page.content();
  check("Übernommener Anruf rutscht in 'Bereits bearbeitet'", anrufe.includes("Bereits bearbeitet"));

  // Aus der Anfrage lässt sich wie gewohnt ein Angebot machen
  await page.goto(`${BASE}/anrufe`, { waitUntil: "networkidle" });
  await ready();
  const zurAnfrage = page.getByRole("link", { name: "Zur Anfrage" }).first();
  check("Verknüpfung zur Anfrage bleibt bestehen", await zurAnfrage.isVisible());

  await browser.close();
  console.log(`\n${results.length - failed}/${results.length} Prüfungen bestanden.`);
  process.exit(failed > 0 ? 1 : 0);
};

run().catch((err) => {
  console.error("Testlauf abgebrochen:", err);
  process.exit(1);
});
