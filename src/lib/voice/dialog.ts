import type { CompanySettings } from "../types";
import type { VoiceCall, VoiceStep, VoiceTurn } from "./types";

/**
 * Gesprächsführung des Telefonassistenten.
 *
 * Bewusst kurz gehalten: Ein Anrufer, der niemanden erreicht, ist schon
 * ungeduldig. Fünf Fragen, dann ist Schluss. Die Rufnummer kommt vom
 * Telefonanbieter, danach muss niemand mehr buchstabieren.
 *
 * Der Assistent nennt keine Preise, sagt keine Termine zu und verspricht
 * nichts außer einem Rückruf.
 */

export const MAX_WIEDERHOLUNGEN = 1;

export function begruessung(company: CompanySettings): string {
  // Voller Name: "Farbwerk ist im Einsatz" klingt falsch, und ein geratenes
  // "Herr" wäre bei einer Inhaberin schlicht verkehrt.
  const inhaber = company.owner.trim();
  return (
    `Guten Tag, Sie sind bei ${company.name}. ` +
    `${inhaber} ist gerade im Einsatz und kann nicht ans Telefon. ` +
    `Ich nehme Ihre Anfrage auf, dann meldet er sich bei Ihnen zurück. ` +
    `Wie ist Ihr Name?`
  );
}

const FRAGEN: Record<Exclude<VoiceStep, "begruessung" | "beendet">, string> = {
  name: "Wie ist Ihr Name?",
  anliegen:
    "Worum geht es? Sagen Sie kurz, was gestrichen oder gemacht werden soll, und wie groß es ungefähr ist.",
  adresse: "Wo sollen die Arbeiten stattfinden? Straße und Ort genügen.",
  zeitraum: "Bis wann soll es fertig sein?",
  rueckrufnummer:
    "Sollen wir Sie unter der Nummer zurückrufen, von der Sie gerade anrufen? Sagen Sie ja, oder nennen Sie mir eine andere Nummer.",
  abschluss: "",
};

const REIHENFOLGE: VoiceStep[] = [
  "name",
  "anliegen",
  "adresse",
  "zeitraum",
  "rueckrufnummer",
  "abschluss",
];

export function naechsterSchritt(step: VoiceStep): VoiceStep {
  if (step === "begruessung") return "name";
  const index = REIHENFOLGE.indexOf(step);
  if (index === -1 || index === REIHENFOLGE.length - 1) return "beendet";
  return REIHENFOLGE[index + 1];
}

export function frageZu(step: VoiceStep, company: CompanySettings): string {
  if (step === "begruessung") return begruessung(company);
  if (step === "abschluss" || step === "beendet") return "";
  return FRAGEN[step as keyof typeof FRAGEN];
}

/** Nachfrage, wenn die Spracherkennung nichts Brauchbares geliefert hat. */
export function nachfrage(step: VoiceStep, company: CompanySettings): string {
  return `Entschuldigung, das habe ich nicht verstanden. ${frageZu(step, company)}`;
}

/**
 * Abschlusssatz mit Zusammenfassung. Er wiederholt nur, was wirklich
 * verstanden wurde – und sagt weder Preis noch Termin zu.
 */
export function abschluss(call: VoiceCall, company: CompanySettings): string {
  const inhaber = company.owner.trim();
  const teile: string[] = [];
  if (call.extracted.name) teile.push(`Ihr Name: ${call.extracted.name}`);
  if (call.extracted.anliegen) teile.push(`Ihr Anliegen: ${call.extracted.anliegen}`);
  if (call.extracted.adresse) teile.push(`Adresse: ${call.extracted.adresse}`);
  if (call.extracted.zeitraum) teile.push(`Zeitraum: ${call.extracted.zeitraum}`);

  const zusammenfassung =
    teile.length > 0
      ? `Ich habe notiert: ${teile.join(". ")}. `
      : "Ich habe Ihre Nummer notiert. ";

  const nummer = call.extracted.phone ?? call.from;
  return (
    zusammenfassung +
    `${inhaber} ruft Sie unter ${sprichNummer(nummer)} zurück und bespricht dann alles Weitere mit Ihnen. ` +
    `Vielen Dank für Ihren Anruf und auf Wiederhören.`
  );
}

/** Wenn der Anrufer zweimal nichts Verständliches gesagt hat. */
export function abbruchAnsage(company: CompanySettings): string {
  const inhaber = company.owner.trim();
  return (
    `Ich konnte Sie leider nicht verstehen. ${inhaber} sieht Ihre Nummer und ruft Sie zurück. ` +
    `Auf Wiederhören.`
  );
}

/**
 * Rufnummern werden gruppiert gesprochen, sonst nuschelt die Ansage.
 * Ländervorwahl bleibt zusammen, der Rest läuft in Zweiergruppen –
 * eine einzelne Restziffer wird an die vorige Gruppe gehängt.
 */
export function sprichNummer(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "");
  const treffer = digits.match(/^(\+\d{2})(\d+)$/);
  const prefix = treffer ? `${treffer[1]} ` : "";
  const rest = treffer ? treffer[2] : digits;

  const gruppen: string[] = [];
  for (let i = 0; i < rest.length; i += 2) gruppen.push(rest.slice(i, i + 2));
  if (gruppen.length > 1 && gruppen[gruppen.length - 1].length === 1) {
    gruppen[gruppen.length - 2] += gruppen.pop();
  }
  return `${prefix}${gruppen.join(" ")}`.trim();
}

export function neuerTurn(step: VoiceStep, frage: string): VoiceTurn {
  return { step, frage, at: new Date().toISOString() };
}

/** Ein "ja" auf die Rückrufnummer-Frage. */
export function istZustimmung(text: string | undefined): boolean {
  if (!text) return false;
  return /\b(ja|jawohl|genau|richtig|passt|stimmt|korrekt|gerne|klar)\b/i.test(text);
}
