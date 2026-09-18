/**
 * Datenmodell Angebotsmeister.
 * Kernprozess: ANFRAGE -> ANGEBOT -> FOLLOW-UP.
 */

export type ISODate = string; // "2026-09-18"
export type ISODateTime = string; // "2026-09-18T09:12:00.000Z"

export const INQUIRY_STATUSES = [
  "neu",
  "rueckfrage",
  "besichtigung",
  "bereit",
  "angebot_erstellt",
  "abgeschlossen",
] as const;
export type InquiryStatus = (typeof INQUIRY_STATUSES)[number];

export const INQUIRY_STATUS_LABEL: Record<InquiryStatus, string> = {
  neu: "Neu",
  rueckfrage: "Rückfrage nötig",
  besichtigung: "Besichtigung geplant",
  bereit: "Bereit fürs Angebot",
  angebot_erstellt: "Angebot erstellt",
  abgeschlossen: "Abgeschlossen",
};

export const INQUIRY_SOURCES = [
  "telefon",
  "whatsapp",
  "website",
  "empfehlung",
  "email",
  "sonstiges",
] as const;
export type InquirySource = (typeof INQUIRY_SOURCES)[number];

export const INQUIRY_SOURCE_LABEL: Record<InquirySource, string> = {
  telefon: "Telefon",
  whatsapp: "WhatsApp",
  website: "Website",
  empfehlung: "Empfehlung",
  email: "E-Mail",
  sonstiges: "Sonstiges",
};

export const QUOTE_STATUSES = [
  "entwurf",
  "bereit",
  "gesendet",
  "angenommen",
  "abgelehnt",
  "abgelaufen",
] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

export const QUOTE_STATUS_LABEL: Record<QuoteStatus, string> = {
  entwurf: "Entwurf",
  bereit: "Bereit",
  gesendet: "Gesendet",
  angenommen: "Angenommen",
  abgelehnt: "Abgelehnt",
  abgelaufen: "Abgelaufen",
};

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  street?: string;
  zip?: string;
  city?: string;
  notes?: string;
  createdAt: ISODateTime;
}

export interface Inquiry {
  id: string;
  customerId: string;
  title: string;
  description: string;
  source: InquirySource;
  status: InquiryStatus;
  /** Freitext, z. B. "Oktober" oder "KW 42". */
  desiredPeriod?: string;
  address?: string;
  notes?: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export const UNITS = ["m²", "lfm", "Stk", "Std", "pauschal"] as const;
export type Unit = (typeof UNITS)[number];

export interface CatalogService {
  id: string;
  name: string;
  unit: Unit;
  /** Netto-Einzelpreis in Euro. */
  defaultPrice: number;
  description?: string;
  active: boolean;
}

export interface QuoteItem {
  id: string;
  /** Referenz auf den Leistungskatalog, falls von dort übernommen. */
  serviceId?: string;
  name: string;
  quantity: number;
  unit: Unit;
  unitPrice: number;
}

export interface FollowUpEntry {
  id: string;
  date: ISODateTime;
  /** Was ist passiert: erinnert, verschoben, Nachricht vorbereitet. */
  kind: "vorbereitet" | "verschoben" | "notiz";
  text: string;
}

export interface Quote {
  id: string;
  /** Fortlaufende Angebotsnummer, z. B. 1042. */
  number: number;
  customerId: string;
  inquiryId?: string;
  address?: string;
  items: QuoteItem[];
  notes?: string;
  /** Gültig bis (Datum). */
  validUntil: ISODate;
  status: QuoteStatus;
  sentAt?: ISODateTime;
  /** Automatisch aus sentAt + Werktagen des Betriebs. */
  followUpDate?: ISODate;
  decidedAt?: ISODateTime;
  followUps: FollowUpEntry[];
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface Task {
  id: string;
  title: string;
  dueDate: ISODate;
  done: boolean;
  /** Verknüpfung in den Kernprozess. */
  linkType?: "inquiry" | "quote" | "customer";
  linkId?: string;
  kind: "rueckruf" | "aufgabe";
  createdAt: ISODateTime;
}

export interface CompanySettings {
  name: string;
  owner: string;
  street: string;
  zip: string;
  city: string;
  phone: string;
  email: string;
  /** Mehrwertsteuersatz in Prozent. */
  taxRate: number;
  /** Standard-Gültigkeit eines Angebots in Tagen. */
  validityDays: number;
  /** Werktage bis zum automatischen Follow-up nach Versand. */
  followUpWorkdays: number;
  signature: string;
  /** Kennzeichnet Katalogpreise sichtbar als Demo-/Beispielpreise. */
  demoPrices: boolean;
}

export interface AppData {
  version: number;
  company: CompanySettings;
  customers: Customer[];
  inquiries: Inquiry[];
  quotes: Quote[];
  services: CatalogService[];
  tasks: Task[];
  nextQuoteNumber: number;
}
