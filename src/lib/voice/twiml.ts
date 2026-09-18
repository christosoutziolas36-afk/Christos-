/**
 * TwiML-Antworten für Twilio Programmable Voice.
 * Gekapselt, damit ein Wechsel des Telefonanbieters nur diese Datei betrifft.
 */

const STIMME = process.env.VOICE_TTS_VOICE || "Polly.Vicki";
const SPRACHE = "de-DE";

export function xmlEscape(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function say(text: string): string {
  return `<Say voice="${STIMME}" language="${SPRACHE}">${xmlEscape(text)}</Say>`;
}

function huelle(inhalt: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<Response>${inhalt}</Response>`;
}

/**
 * Stellt eine Frage und wartet auf die gesprochene Antwort.
 * Antwortet der Anrufer nicht, ruft Twilio dieselbe action-URL ohne
 * Sprachergebnis auf – der Agent fragt dann einmal nach.
 */
export function frageStellen(text: string, actionUrl: string): string {
  return huelle(
    `<Gather input="speech" language="${SPRACHE}" speechTimeout="auto" ` +
      `action="${xmlEscape(actionUrl)}" method="POST">` +
      say(text) +
      `</Gather>` +
      // Fällt der Gather ohne Ergebnis durch, wird die action erneut angesteuert.
      `<Redirect method="POST">${xmlEscape(actionUrl)}</Redirect>`,
  );
}

/** Letzte Ansage, danach wird aufgelegt. */
export function verabschieden(text: string): string {
  return huelle(say(text) + "<Hangup/>");
}

export const TWIML_CONTENT_TYPE = "text/xml; charset=utf-8";
