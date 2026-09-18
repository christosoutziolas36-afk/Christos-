import type { InquirySource } from "../types";

/** Ein Schritt im Telefongespräch. */
export type VoiceStep =
  | "begruessung"
  | "name"
  | "anliegen"
  | "adresse"
  | "zeitraum"
  | "rueckrufnummer"
  | "abschluss"
  | "beendet";

export interface VoiceTurn {
  step: VoiceStep;
  /** Was der Agent gesagt hat. */
  frage: string;
  /** Was der Anrufer geantwortet hat (Spracherkennung). */
  antwort?: string;
  /** Vertrauenswert der Spracherkennung, 0–1. */
  confidence?: number;
  at: string;
}

export type CallStatus =
  /** Gespräch läuft gerade. */
  | "laeuft"
  /** Anrufer hat aufgelegt, bevor alles erfragt war. */
  | "abgebrochen"
  /** Gespräch vollständig geführt. */
  | "aufgenommen"
  /** Der Betrieb hat daraus eine Anfrage gemacht. */
  | "uebernommen"
  /** Der Betrieb hat den Anruf als erledigt abgehakt. */
  | "erledigt";

export interface VoiceCall {
  id: string;
  /** Rufnummer des Anrufers (Twilio "From"). */
  from: string;
  /** Angerufene Nummer des Betriebs. */
  to?: string;
  /** Call-ID des Telefonanbieters, zur Zuordnung eingehender Webhooks. */
  providerCallId?: string;
  status: CallStatus;
  step: VoiceStep;
  turns: VoiceTurn[];
  /** Strukturierte Daten, die aus dem Gespräch gewonnen wurden. */
  extracted: {
    name?: string;
    phone?: string;
    anliegen?: string;
    adresse?: string;
    zeitraum?: string;
    source: InquirySource;
  };
  /** Anfrage, die daraus entstanden ist. */
  inquiryId?: string;
  startedAt: string;
  updatedAt: string;
}
