/**
 * Simuliert einen eingehenden Anruf gegen die echten Webhook-Routen.
 * Damit lässt sich der Telefonassistent ohne Telefonanschluss testen
 * und beim Kunden vorführen.
 *
 *   node e2e/anruf-simulieren.mjs
 *   node e2e/anruf-simulieren.mjs --abbruch     (Anrufer legt mittendrin auf)
 */

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const FROM = process.env.FROM ?? "+4917055512345";
const abbruch = process.argv.includes("--abbruch");

const ANTWORTEN = {
  name: "Ja hallo, mein Name ist Frau Berger",
  anliegen: "Es geht um unser Treppenhaus, das soll gestrichen werden, ungefähr 45 Quadratmeter",
  adresse: "Die Adresse ist Moselstraße 7 in 47051 Duisburg",
  zeitraum: "am besten noch im Oktober",
  rueckrufnummer: "ja passt",
};

async function post(url, felder) {
  const body = new URLSearchParams(felder);
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  return { status: res.status, text: await res.text() };
}

function ansageAus(twiml) {
  return [...twiml.matchAll(/<Say[^>]*>([\s\S]*?)<\/Say>/g)]
    .map((m) => m[1].replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&apos;/g, "'"))
    .join(" ");
}

function actionAus(twiml) {
  const m = twiml.match(/action="([^"]+)"/);
  return m ? m[1].replace(/&amp;/g, "&") : null;
}

function stepAus(actionUrl) {
  const m = actionUrl?.match(/step=([a-z]+)/);
  return m ? m[1] : null;
}

const callSid = `CAsim${Date.now()}`;

console.log(`\n☎  Eingehender Anruf von ${FROM}\n`);

let res = await post(`${BASE}/api/voice/incoming`, {
  From: FROM,
  To: "+492031234567",
  CallSid: callSid,
  CallStatus: "ringing",
});

if (res.status !== 200) {
  console.error("Webhook antwortet nicht:", res.status, res.text.slice(0, 200));
  process.exit(1);
}

let twiml = res.text;
let schritte = 0;

while (schritte < 10) {
  const ansage = ansageAus(twiml);
  console.log(`🤖 Peter: ${ansage}\n`);

  const action = actionAus(twiml);
  if (!action) break; // Gespräch beendet

  const step = stepAus(action);
  const antwort = ANTWORTEN[step];

  // Abbruch-Modus: nach dem Anliegen legt der Anrufer auf.
  if (abbruch && step === "adresse") {
    console.log("📴 Anrufer legt auf.\n");
    await post(`${BASE}/api/voice/status`, { CallSid: callSid, CallStatus: "completed" });
    break;
  }

  if (!antwort) break;
  console.log(`🧑 Anrufer: ${antwort}\n`);

  res = await post(action, {
    CallSid: callSid,
    From: FROM,
    SpeechResult: antwort,
    Confidence: "0.94",
  });
  twiml = res.text;
  schritte++;
}

// Ergebnis prüfen
const calls = await fetch(`${BASE}/api/voice/calls`, { cache: "no-store" }).then((r) => r.json());
const call = calls.calls.find((c) => c.providerCallId === callSid);

console.log("─".repeat(60));
if (!call) {
  console.error("✗ Anruf wurde nicht gespeichert.");
  process.exit(1);
}
console.log("Im Dashboard gespeichert:");
console.log(`  Status:   ${call.status}`);
console.log(`  Name:     ${call.extracted.name ?? "–"}`);
console.log(`  Telefon:  ${call.extracted.phone ?? "–"}`);
console.log(`  Anliegen: ${call.extracted.anliegen ?? "–"}`);
console.log(`  Adresse:  ${call.extracted.adresse ?? "–"}`);
console.log(`  Zeitraum: ${call.extracted.zeitraum ?? "–"}`);
console.log(`  Speicher: ${calls.speicher}`);
console.log("─".repeat(60));
