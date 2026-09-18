import { parseNote } from "../peter/parse";
import type { VoiceCall, VoiceStep } from "./types";
import { istZustimmung } from "./dialog";

/** Füllphrasen, die Anrufer den eigentlichen Angaben voranstellen. */
const FUELLER: RegExp[] = [
  /^(ja|also|äh|ähm|hallo|guten tag|guten morgen|guten abend)[,.\s]+/i,
  /^(mein name ist|ich heiße|ich heisse|hier ist|hier spricht|ich bin|am apparat)\s+/i,
  /^(es geht um|ich hätte gern|ich hätte gerne|ich brauche|ich bräuchte|ich wollte fragen ob)\s+/i,
  /^(die adresse (ist|lautet)|das ist in|wir wohnen in|in der)\s+/i,
  /^(am besten|möglichst|gerne)\s+/i,
];

export function bereinige(text: string | undefined): string | undefined {
  if (!text) return undefined;
  let out = text.trim();
  let changed = true;
  while (changed) {
    changed = false;
    for (const re of FUELLER) {
      const next = out.replace(re, "");
      if (next !== out) {
        out = next.trim();
        changed = true;
      }
    }
  }
  out = out.replace(/[.\s]+$/, "").trim();
  return out.length > 0 ? out : undefined;
}

const ZIFFERN: Record<string, string> = {
  null: "0", eins: "1", ein: "1", eine: "1", zwei: "2", zwo: "2", drei: "3",
  vier: "4", fünf: "5", fuenf: "5", sechs: "6", sieben: "7", acht: "8", neun: "9",
};

/**
 * Wandelt gesprochene Rufnummern in Ziffern.
 * Die Spracherkennung liefert je nach Sprechweise "null zwei null drei" oder
 * bereits "0203" – beides muss zur selben Nummer führen.
 */
export function ziffernAusSprache(text: string): string | undefined {
  const direkt = text.match(/(\+49[\d\s/-]{6,}|0[\d\s/-]{6,})/);
  if (direkt) {
    const digits = direkt[1].replace(/[^\d+]/g, "");
    if (digits.length >= 7) return digits;
  }

  const woerter = text.toLowerCase().split(/[\s,-]+/);
  let out = "";
  for (const wort of woerter) {
    if (ZIFFERN[wort] !== undefined) out += ZIFFERN[wort];
    else if (/^\d+$/.test(wort)) out += wort;
    else if (out.length > 0 && !["und", "die", "nummer", "handy"].includes(wort)) break;
  }
  return out.length >= 7 ? out : undefined;
}

export function nameAusSprache(text: string): string | undefined {
  const clean = bereinige(text);
  if (!clean) return undefined;
  // Höchstens vier Wörter – längere Sätze sind kein Name.
  const woerter = clean.split(/\s+/).slice(0, 4);
  const name = woerter
    .map((w) => (w.length > 1 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
  return name.length >= 2 ? name : undefined;
}

export function zeitraumAusSprache(text: string): string | undefined {
  const clean = bereinige(text);
  if (!clean) return undefined;
  const parsed = parseNote(clean);
  if (parsed.desiredPeriod) return parsed.desiredPeriod;
  // Verneinungen zuerst: "das eilt nicht" ist das Gegenteil von "das eilt".
  if (/(keine eile|eilt nicht|nicht dringend|hat zeit|lässt sich zeit|kein stress)/i.test(clean))
    return "keine Eile";
  if (/(so schnell wie möglich|dringend|sofort|eilt|zeitnah|asap)/i.test(clean))
    return "möglichst bald";
  if (/^(egal|flexibel)$/i.test(clean)) return "keine Eile";
  return clean.length <= 60 ? clean : clean.slice(0, 60);
}

/**
 * Verarbeitet eine Antwort des Anrufers und schreibt sie in den Anruf.
 * Gibt zurück, ob die Antwort verwertbar war – sonst fragt der Agent nach.
 */
export function antwortVerarbeiten(call: VoiceCall, step: VoiceStep, text: string | undefined): boolean {
  const clean = bereinige(text);
  if (!clean) return false;

  switch (step) {
    case "name": {
      const name = nameAusSprache(clean);
      if (!name) return false;
      call.extracted.name = name;
      return true;
    }
    case "anliegen": {
      if (clean.length < 3) return false;
      call.extracted.anliegen = clean;
      return true;
    }
    case "adresse": {
      const parsed = parseNote(clean);
      const strasse = parsed.street ?? clean;
      const ort = [parsed.zip, parsed.city].filter(Boolean).join(" ");
      call.extracted.adresse = ort && !strasse.includes(ort) ? `${strasse}, ${ort}` : strasse;
      return true;
    }
    case "zeitraum": {
      const zeitraum = zeitraumAusSprache(clean);
      if (!zeitraum) return false;
      call.extracted.zeitraum = zeitraum;
      return true;
    }
    case "rueckrufnummer": {
      if (istZustimmung(clean)) {
        call.extracted.phone = call.from;
        return true;
      }
      const nummer = ziffernAusSprache(clean);
      if (nummer) {
        call.extracted.phone = nummer;
        return true;
      }
      // Weder Zustimmung noch Nummer: die Anrufernummer bleibt gültig.
      call.extracted.phone = call.from;
      return true;
    }
    default:
      return true;
  }
}

/** Kurzfassung des Anrufs für die Karte im Dashboard. */
export function zusammenfassung(call: VoiceCall): string {
  const teile: string[] = [];
  if (call.extracted.anliegen) teile.push(call.extracted.anliegen);
  if (call.extracted.adresse) teile.push(call.extracted.adresse);
  if (call.extracted.zeitraum) teile.push(`Zeitraum: ${call.extracted.zeitraum}`);
  if (teile.length === 0) return "Anrufer hat aufgelegt, bevor er etwas sagen konnte.";
  return teile.join(" · ");
}

/** Was im Gespräch nicht erfragt werden konnte. */
export function fehlendeAngaben(call: VoiceCall): string[] {
  const fehlt: string[] = [];
  if (!call.extracted.name) fehlt.push("Name");
  if (!call.extracted.anliegen) fehlt.push("Anliegen");
  if (!call.extracted.adresse) fehlt.push("Adresse");
  if (!call.extracted.zeitraum) fehlt.push("Zeitraum");
  return fehlt;
}
