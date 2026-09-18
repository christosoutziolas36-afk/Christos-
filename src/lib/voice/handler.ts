import { newId } from "../id";
import { abbruchAnsage, abschluss, frageZu, MAX_WIEDERHOLUNGEN, nachfrage, naechsterSchritt, neuerTurn } from "./dialog";
import { antwortVerarbeiten } from "./extract";
import { anrufLaden, anrufSichern } from "./call-store";
import { frageStellen, verabschieden } from "./twiml";
import { companyFuerAnsage } from "./company";
import type { VoiceCall, VoiceStep } from "./types";

/**
 * Ablaufsteuerung eines Anrufs – unabhängig von der Web-Schicht, damit sie
 * sich ohne echtes Telefon testen lässt.
 */

export function neuerAnruf(from: string, to?: string, providerCallId?: string): VoiceCall {
  const jetzt = new Date().toISOString();
  return {
    id: newId("call"),
    from,
    to,
    providerCallId,
    status: "laeuft",
    step: "begruessung",
    turns: [],
    extracted: { phone: from, source: "telefon" },
    startedAt: jetzt,
    updatedAt: jetzt,
  };
}

function wiederholungen(call: VoiceCall, step: VoiceStep): number {
  return call.turns.filter((t) => t.step === step && !t.antwort).length;
}

/** Erster Kontakt: begrüßen und nach dem Namen fragen. */
export async function anrufBeginnen(
  from: string,
  to: string | undefined,
  providerCallId: string | undefined,
  actionUrl: (callId: string, step: VoiceStep) => string,
): Promise<{ twiml: string; call: VoiceCall }> {
  const company = await companyFuerAnsage();
  const call = neuerAnruf(from, to, providerCallId);
  const frage = frageZu("begruessung", company);

  call.step = "name";
  call.turns.push(neuerTurn("name", frage));
  await anrufSichern(call);

  return { twiml: frageStellen(frage, actionUrl(call.id, "name")), call };
}

/**
 * Verarbeitet eine gesprochene Antwort und liefert die nächste Ansage.
 * Nach jedem Schritt wird gespeichert – auch wenn der Anrufer gleich auflegt.
 */
export async function antwortVerarbeitenUndFortfahren(
  callId: string,
  step: VoiceStep,
  sprachergebnis: string | undefined,
  confidence: number | undefined,
  actionUrl: (callId: string, step: VoiceStep) => string,
): Promise<{ twiml: string; call: VoiceCall | null }> {
  const company = await companyFuerAnsage();
  const call = await anrufLaden(callId);
  if (!call) {
    return { twiml: verabschieden(abbruchAnsage(company)), call: null };
  }

  const verwertbar = antwortVerarbeiten(call, step, sprachergebnis);

  if (verwertbar) {
    const letzter = [...call.turns].reverse().find((t) => t.step === step && !t.antwort);
    if (letzter) {
      letzter.antwort = sprachergebnis;
      letzter.confidence = confidence;
    }
  } else {
    // Nichts verstanden: einmal nachfragen, danach das Gespräch freundlich beenden.
    if (wiederholungen(call, step) <= MAX_WIEDERHOLUNGEN) {
      const text = nachfrage(step, company);
      call.turns.push(neuerTurn(step, text));
      await anrufSichern(call);
      return { twiml: frageStellen(text, actionUrl(call.id, step)), call };
    }
    call.status = "aufgenommen";
    call.step = "beendet";
    await anrufSichern(call);
    return { twiml: verabschieden(abbruchAnsage(company)), call };
  }

  const naechster = naechsterSchritt(step);

  if (naechster === "abschluss" || naechster === "beendet") {
    call.step = "beendet";
    call.status = "aufgenommen";
    const text = abschluss(call, company);
    call.turns.push({ step: "abschluss", frage: text, at: new Date().toISOString() });
    await anrufSichern(call);
    return { twiml: verabschieden(text), call };
  }

  const frage = frageZu(naechster, company);
  call.step = naechster;
  call.turns.push(neuerTurn(naechster, frage));
  await anrufSichern(call);

  return { twiml: frageStellen(frage, actionUrl(call.id, naechster)), call };
}

/**
 * Wird gerufen, wenn der Anruf endet. Ein Gespräch, das noch "laeuft",
 * wurde vom Anrufer abgebrochen – es bleibt trotzdem im Dashboard stehen.
 */
export async function anrufBeenden(providerCallId: string): Promise<void> {
  const { alleAnrufe } = await import("./call-store");
  const calls = await alleAnrufe();
  const call = calls.find((c) => c.providerCallId === providerCallId);
  if (!call || call.status !== "laeuft") return;
  call.status = "abgebrochen";
  call.step = "beendet";
  await anrufSichern(call);
}
