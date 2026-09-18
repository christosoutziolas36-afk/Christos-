import type { InquirySource } from "../types";

export interface ParsedNote {
  name?: string;
  phone?: string;
  email?: string;
  street?: string;
  zip?: string;
  city?: string;
  desiredPeriod?: string;
  source?: InquirySource;
  title?: string;
  /** Felder, die Peter nicht sicher erkennen konnte. */
  unresolved: string[];
}

const MONTHS = [
  "januar", "februar", "märz", "maerz", "april", "mai", "juni",
  "juli", "august", "september", "oktober", "november", "dezember",
];

/**
 * Macht aus einer schnell hingetippten Telefonnotiz eine strukturierte Anfrage.
 * Erkennt nur, was wirklich im Text steht – der Rest bleibt leer und wird
 * ausdrücklich als offen gemeldet.
 */
export function parseNote(note: string): ParsedNote {
  const text = note.trim();
  const result: ParsedNote = { unresolved: [] };
  if (!text) return { unresolved: ["Name", "Telefonnummer", "Beschreibung"] };

  const phone = text.match(/(\+49[\s\d/-]{6,}|0\d{2,5}[\s/-]?\d{3,})/);
  if (phone) result.phone = phone[1].trim().replace(/\s{2,}/g, " ");

  const email = text.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
  if (email) result.email = email[0];

  const name = text.match(
    /\b((?:Herr|Frau|Familie|Fam\.)\s+[A-ZÄÖÜ][a-zäöüß]+|[A-ZÄÖÜ][a-zäöüß]+\s+[A-ZÄÖÜ][a-zäöüß]+)/,
  );
  if (name) result.name = name[1].replace(/^Fam\./, "Familie");

  const address = text.match(/\b([A-ZÄÖÜ][a-zäöüß]+(?:straße|str\.|weg|allee|platz|gasse|ring))\s*(\d+[a-z]?)/i);
  if (address) result.street = `${address[1]} ${address[2]}`;

  const zipCity = text.match(/\b(\d{5})\s+([A-ZÄÖÜ][a-zäöüß-]+)/);
  if (zipCity) {
    result.zip = zipCity[1];
    result.city = zipCity[2];
  }

  const lower = text.toLowerCase();
  const month = MONTHS.find((m) => lower.includes(m));
  const kw = text.match(/\bKW\s?(\d{1,2})\b/i);
  if (kw) result.desiredPeriod = `KW ${kw[1]}`;
  else if (month) result.desiredPeriod = month.charAt(0).toUpperCase() + month.slice(1);
  else if (/(so schnell wie möglich|asap|dringend|möglichst bald)/i.test(text))
    result.desiredPeriod = "möglichst bald";

  if (lower.includes("whatsapp")) result.source = "whatsapp";
  else if (lower.includes("website") || lower.includes("homepage")) result.source = "website";
  else if (lower.includes("empfehlung") || lower.includes("empfohlen")) result.source = "empfehlung";
  else if (lower.includes("mail")) result.source = "email";
  else if (lower.includes("angerufen") || lower.includes("telefon") || result.phone)
    result.source = "telefon";

  result.title = guessTitle(lower);

  if (!result.name) result.unresolved.push("Name");
  if (!result.phone) result.unresolved.push("Telefonnummer");
  if (!result.desiredPeriod) result.unresolved.push("gewünschter Zeitraum");
  if (!result.street) result.unresolved.push("Adresse");
  return result;
}

function guessTitle(lower: string): string | undefined {
  const rooms = [
    ["wohnzimmer", "Wohnzimmer streichen"],
    ["schlafzimmer", "Schlafzimmer streichen"],
    ["treppenhaus", "Treppenhaus streichen"],
    ["küche", "Küche streichen"],
    ["kueche", "Küche streichen"],
    ["bad", "Bad streichen"],
    ["flur", "Flur streichen"],
    ["fassade", "Fassade streichen"],
    ["garage", "Garage streichen"],
    ["büro", "Büro streichen"],
    ["decke", "Decke streichen"],
  ] as const;
  const hits = rooms.filter(([k]) => lower.includes(k)).map(([, v]) => v);
  if (hits.length === 0) return undefined;
  if (hits.length === 1) return hits[0];
  return `${hits[0].replace(" streichen", "")} und ${hits[1].replace(" streichen", "")} streichen`;
}
