import { followUpDateFrom, toISODate } from "./dates";
import type { AppData, CatalogService, CompanySettings } from "./types";

const DAY = 86_400_000;

export const DEMO_COMPANY: CompanySettings = {
  name: "Malerbetrieb Farbwerk – Demo",
  owner: "Thomas Farbwerk",
  street: "Rheinstraße 14",
  zip: "47051",
  city: "Duisburg",
  phone: "0203 1234567",
  email: "info@farbwerk-demo.de",
  taxRate: 19,
  validityDays: 21,
  followUpWorkdays: 3,
  signature: "Viele Grüße\nThomas Farbwerk\nMalerbetrieb Farbwerk – Duisburg",
  demoPrices: true,
};

/** Beispiel-Leistungskatalog. Preise sind Demo-Preise und vom Betrieb anpassbar. */
export const DEMO_SERVICES: CatalogService[] = [
  {
    id: "svc_abkleben",
    name: "Abklebe- und Schutzarbeiten",
    unit: "m²",
    defaultPrice: 3.5,
    description: "Böden, Fenster und Möbel abdecken und abkleben",
    active: true,
  },
  {
    id: "svc_untergrund",
    name: "Untergrund vorbereiten",
    unit: "m²",
    defaultPrice: 4.9,
    description: "Reinigen, schleifen, grundieren",
    active: true,
  },
  {
    id: "svc_risse",
    name: "Risse verspachteln",
    unit: "lfm",
    defaultPrice: 6.5,
    description: "Risse öffnen, spachteln, schleifen",
    active: true,
  },
  {
    id: "svc_waende",
    name: "Wände zweimal streichen",
    unit: "m²",
    defaultPrice: 9.8,
    description: "Zweifacher Anstrich in Wunschfarbton",
    active: true,
  },
  {
    id: "svc_decke",
    name: "Decke zweimal streichen",
    unit: "m²",
    defaultPrice: 10.5,
    active: true,
  },
  {
    id: "svc_treppenhaus",
    name: "Treppenhaus streichen",
    unit: "m²",
    defaultPrice: 12.4,
    description: "Erhöhter Aufwand durch Gerüst und Höhe",
    active: true,
  },
  {
    id: "svc_material",
    name: "Materialpauschale",
    unit: "pauschal",
    defaultPrice: 180,
    active: true,
  },
  {
    id: "svc_anfahrt",
    name: "Anfahrt",
    unit: "pauschal",
    defaultPrice: 45,
    active: true,
  },
];

/**
 * Demo-Bestand für Entwicklung, Demo-Termine und Pilotgespräche.
 * Alle Datumswerte sind relativ zum Seed-Zeitpunkt, damit das
 * Heute-Dashboard sofort realistische Fälle zeigt.
 */
export function buildDemoData(now: Date = new Date()): AppData {
  const iso = (offsetDays: number) => new Date(now.getTime() + offsetDays * DAY).toISOString();
  const date = (offsetDays: number) => toISODate(new Date(now.getTime() + offsetDays * DAY));

  return {
    version: 1,
    company: DEMO_COMPANY,
    services: DEMO_SERVICES,
    nextQuoteNumber: 1044,
    customers: [
      {
        id: "cus_keller",
        name: "Sabine Keller",
        phone: "0170 2233445",
        email: "s.keller@example.de",
        street: "Kaiserstraße 8",
        zip: "47051",
        city: "Duisburg",
        notes: "Erreichbar ab 16 Uhr.",
        createdAt: iso(-12),
      },
      {
        id: "cus_mueller",
        name: "Familie Müller",
        phone: "0203 998877",
        email: "mueller.familie@example.de",
        street: "Lindenweg 22",
        zip: "47057",
        city: "Duisburg",
        createdAt: iso(-20),
      },
      {
        id: "cus_becker",
        name: "Herr Becker",
        phone: "0176 5544332",
        street: "Am Buchenhain 5",
        zip: "47119",
        city: "Duisburg",
        createdAt: iso(-3),
      },
      {
        id: "cus_schneider",
        name: "Frau Schneider",
        phone: "0203 445566",
        email: "schneider@example.de",
        street: "Bergstraße 3",
        zip: "47166",
        city: "Duisburg",
        createdAt: iso(-6),
      },
    ],
    inquiries: [
      {
        id: "inq_keller",
        customerId: "cus_keller",
        title: "Wohnzimmer und Treppenhaus streichen",
        description:
          "Wohnzimmer ca. 28 m² streichen, Treppenhaus über zwei Etagen, kleinere Risse an der Wand zum Flur.",
        source: "empfehlung",
        status: "bereit",
        desiredPeriod: "Oktober",
        address: "Kaiserstraße 8, 47051 Duisburg",
        notes: "Besichtigung war am Dienstag. Farbton wird noch ausgesucht.",
        createdAt: iso(-12),
        updatedAt: iso(-2),
      },
      {
        id: "inq_becker",
        customerId: "cus_becker",
        title: "Schlafzimmer neu streichen",
        description: "Schlafzimmer soll gestrichen werden, Wunschfarbe hell.",
        source: "telefon",
        status: "rueckfrage",
        desiredPeriod: "möglichst bald",
        notes: "Raumgröße fehlt noch.",
        createdAt: iso(-3),
        updatedAt: iso(-3),
      },
      {
        id: "inq_schneider",
        customerId: "cus_schneider",
        title: "Fassade Garage streichen",
        description: "Garagenfassade ca. 40 m², Untergrund muss vorbereitet werden.",
        source: "website",
        status: "neu",
        desiredPeriod: "November",
        address: "Bergstraße 3, 47166 Duisburg",
        createdAt: iso(-1),
        updatedAt: iso(-1),
      },
    ],
    quotes: [
      {
        id: "quo_mueller",
        number: 1042,
        customerId: "cus_mueller",
        address: "Lindenweg 22, 47057 Duisburg",
        items: [
          { id: "qi_1", serviceId: "svc_abkleben", name: "Abklebe- und Schutzarbeiten", quantity: 60, unit: "m²", unitPrice: 3.5 },
          { id: "qi_2", serviceId: "svc_untergrund", name: "Untergrund vorbereiten", quantity: 60, unit: "m²", unitPrice: 4.9 },
          { id: "qi_3", serviceId: "svc_waende", name: "Wände zweimal streichen", quantity: 95, unit: "m²", unitPrice: 9.8 },
          { id: "qi_4", serviceId: "svc_material", name: "Materialpauschale", quantity: 1, unit: "pauschal", unitPrice: 180 },
          { id: "qi_5", serviceId: "svc_anfahrt", name: "Anfahrt", quantity: 1, unit: "pauschal", unitPrice: 45 },
        ],
        notes: "Ausführung nach Absprache, Farbton wird vor Beginn festgelegt.",
        validUntil: date(17),
        status: "gesendet",
        sentAt: iso(-4),
        followUpDate: followUpDateFrom(new Date(now.getTime() - 4 * DAY), 3),
        followUps: [],
        createdAt: iso(-6),
        updatedAt: iso(-4),
      },
      {
        id: "quo_1043",
        number: 1043,
        customerId: "cus_keller",
        inquiryId: "inq_keller",
        address: "Kaiserstraße 8, 47051 Duisburg",
        items: [
          { id: "qi_6", serviceId: "svc_waende", name: "Wände zweimal streichen", quantity: 28, unit: "m²", unitPrice: 9.8 },
        ],
        notes: "",
        validUntil: date(21),
        status: "entwurf",
        followUps: [],
        createdAt: iso(-1),
        updatedAt: iso(-1),
      },
    ],
    tasks: [
      {
        id: "tsk_becker",
        title: "Herrn Becker zurückrufen – Raumgröße erfragen",
        dueDate: date(0),
        done: false,
        linkType: "inquiry",
        linkId: "inq_becker",
        kind: "rueckruf",
        createdAt: iso(-1),
      },
      {
        id: "tsk_farbkarte",
        title: "Farbkarten für Frau Keller mitnehmen",
        dueDate: date(0),
        done: false,
        linkType: "customer",
        linkId: "cus_keller",
        kind: "aufgabe",
        createdAt: iso(-2),
      },
    ],
  };
}
