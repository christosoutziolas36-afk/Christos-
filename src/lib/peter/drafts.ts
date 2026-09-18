import { newId } from "../id";
import type { AppData, CatalogService, Inquiry, Quote, QuoteItem } from "../types";
import { customerOf } from "../selectors";

/**
 * Zuordnung von Stichworten aus einer Anfrage zu Leistungen im Katalog
 * des Betriebs. Peter wählt ausschließlich aus, was hinterlegt ist –
 * er erfindet weder Leistungen noch Preise.
 */
const KEYWORD_MAP: { triggers: string[]; serviceMatch: string[] }[] = [
  { triggers: ["riss", "risse", "spachtel"], serviceMatch: ["riss", "spachtel"] },
  { triggers: ["treppenhaus", "treppe", "flur über"], serviceMatch: ["treppenhaus"] },
  { triggers: ["decke", "decken"], serviceMatch: ["decke"] },
  {
    triggers: ["fassade", "garage", "außen", "aussen", "untergrund", "putz"],
    serviceMatch: ["untergrund"],
  },
  {
    triggers: [
      "wand", "wände", "waende", "streichen", "zimmer", "wohnzimmer",
      "schlafzimmer", "küche", "kueche", "bad", "flur", "büro", "buero",
    ],
    serviceMatch: ["wände", "waende", "wand"],
  },
];

/** Leistungen, die bei einem Malerauftrag praktisch immer dazugehören. */
const ALWAYS_MATCH = ["abklebe", "material", "anfahrt"];

function findService(services: CatalogService[], needles: string[]): CatalogService | undefined {
  return services.find(
    (s) => s.active && needles.some((n) => s.name.toLowerCase().includes(n.toLowerCase())),
  );
}

/** Zieht Flächen-/Längenangaben aus dem Anfragetext, z. B. "ca. 28 m²". */
export function extractAreas(text: string): number[] {
  const matches = text.matchAll(/(\d+(?:[.,]\d+)?)\s*(?:m²|m2|qm|quadratmeter)/gi);
  return [...matches].map((m) => Number(m[1].replace(",", ".")));
}

export interface DraftResult {
  items: QuoteItem[];
  /** Positionen ohne belastbare Menge – der Nutzer muss sie prüfen. */
  openQuantities: string[];
  notes: string[];
}

/**
 * Baut einen Angebotsentwurf aus einer Anfrage.
 * Preise stammen 1:1 aus dem Leistungskatalog; fehlende Mengen bleiben 0
 * und werden ausdrücklich als offen markiert, statt geschätzt zu werden.
 */
export function draftItemsForInquiry(data: AppData, inquiry: Inquiry): DraftResult {
  const text = `${inquiry.title} ${inquiry.description} ${inquiry.notes ?? ""}`.toLowerCase();
  const areas = extractAreas(text);
  const primaryArea = areas.length > 0 ? Math.max(...areas) : 0;

  const chosen: CatalogService[] = [];
  for (const rule of KEYWORD_MAP) {
    if (rule.triggers.some((t) => text.includes(t))) {
      const svc = findService(data.services, rule.serviceMatch);
      if (svc && !chosen.includes(svc)) chosen.push(svc);
    }
  }
  for (const needle of ALWAYS_MATCH) {
    const svc = findService(data.services, [needle]);
    if (svc && !chosen.includes(svc)) chosen.push(svc);
  }

  const openQuantities: string[] = [];
  const items: QuoteItem[] = chosen.map((svc) => {
    let quantity = 0;
    if (svc.unit === "pauschal") {
      quantity = 1;
    } else if (svc.unit === "m²" && primaryArea > 0) {
      quantity = primaryArea;
    }
    if (quantity === 0) openQuantities.push(svc.name);
    return {
      id: newId("qi"),
      serviceId: svc.id,
      name: svc.name,
      quantity,
      unit: svc.unit,
      unitPrice: svc.defaultPrice,
    };
  });

  const notes: string[] = [];
  if (areas.length === 0) {
    notes.push("In der Anfrage steht keine Flächenangabe – Mengen bitte eintragen.");
  }
  if (data.company.demoPrices) {
    notes.push("Die Preise stammen aus dem hinterlegten Katalog (aktuell Demo-Preise).");
  }
  if (items.length === 0) {
    notes.push("Im Leistungskatalog ist keine passende Leistung hinterlegt.");
  }
  return { items, openQuantities, notes };
}

/** Was fehlt in einer Anfrage, bevor daraus ein Angebot werden kann? */
export function missingInfo(data: AppData, inquiry: Inquiry): string[] {
  const customer = customerOf(data, inquiry.customerId);
  const text = `${inquiry.title} ${inquiry.description} ${inquiry.notes ?? ""}`;
  const missing: string[] = [];
  if (extractAreas(text).length === 0) missing.push("Raumgröße bzw. Fläche");
  if (!inquiry.address && !customer?.street) missing.push("Adresse");
  if (!inquiry.desiredPeriod) missing.push("gewünschter Zeitraum");
  if (!customer?.phone) missing.push("Telefonnummer");
  if (!customer?.email) missing.push("E-Mail-Adresse (für den Angebotsversand)");
  return missing;
}

/**
 * Freundlicher Nachfass-Text zu einem versendeten Angebot.
 * Enthält nur Daten, die wirklich gespeichert sind.
 */
export function followUpMessage(
  data: AppData,
  quote: Quote,
  total: number,
  daysOpen: number,
): string {
  const customer = customerOf(data, quote.customerId);
  const name = customer?.name ?? "Kunde";
  const anrede = salutation(name);
  const euro = new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(total);

  return [
    `${anrede}`,
    "",
    `vor ${daysOpen === 1 ? "einem Tag" : `${daysOpen} Tagen`} habe ich Ihnen unser Angebot Nr. ${quote.number} über ${euro} für ${quote.address ? `die Arbeiten in ${quote.address}` : "die besprochenen Arbeiten"} geschickt.`,
    "",
    "Ich wollte kurz nachfragen, ob Sie dazu noch Fragen haben oder ob etwas angepasst werden soll. Einen Termin können wir gerne direkt abstimmen.",
    "",
    data.company.signature,
  ].join("\n");
}

export function salutation(name: string): string {
  const n = name.trim();
  if (/^familie/i.test(n)) return `Hallo ${n},`;
  if (/^(herr|hr\.)\s+/i.test(n)) return `Sehr geehrter ${n.replace(/^hr\./i, "Herr")},`;
  if (/^(frau|fr\.)\s+/i.test(n)) return `Sehr geehrte ${n.replace(/^fr\./i, "Frau")},`;
  return `Hallo ${n},`;
}
