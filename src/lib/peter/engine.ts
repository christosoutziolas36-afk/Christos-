import { formatDate, toISODate } from "../dates";
import { formatEuro, formatEuroShort, quoteNet } from "../money";
import {
  callbacks,
  customerName,
  customerOf,
  draftQuotes,
  dueFollowUps,
  inquiriesOfCustomer,
  newInquiries,
  openQuotes,
  openTasks,
  quoteAgeInDays,
  quotesOfCustomer,
  readyForQuote,
} from "../selectors";
import {
  INQUIRY_SOURCE_LABEL,
  INQUIRY_STATUS_LABEL,
  QUOTE_STATUS_LABEL,
  type AppData,
  type Customer,
  type Inquiry,
  type Quote,
} from "../types";
import { draftItemsForInquiry, followUpMessage, missingInfo } from "./drafts";
import type { PeterAction, PeterAnswer } from "./types";

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss");
}

/** Findet den Kunden, über den die Frage geht. */
export function findCustomerInText(data: AppData, text: string): Customer | undefined {
  const t = norm(text);
  let best: { customer: Customer; score: number } | undefined;
  for (const customer of data.customers) {
    const parts = norm(customer.name)
      .split(/\s+/)
      .filter((p) => p.length >= 3 && !["herr", "frau", "familie"].includes(p));
    for (const part of parts) {
      if (t.includes(part)) {
        const score = part.length;
        if (!best || score > best.score) best = { customer, score };
      }
    }
  }
  return best?.customer;
}

/** Findet ein Angebot über Nummer ("Angebot 1042") oder Kundenname. */
export function findQuoteInText(data: AppData, text: string): Quote | undefined {
  const numberMatch = text.match(/\b(\d{3,6})\b/);
  if (numberMatch) {
    const byNumber = data.quotes.find((q) => q.number === Number(numberMatch[1]));
    if (byNumber) return byNumber;
  }
  const customer = findCustomerInText(data, text);
  if (customer) {
    const list = quotesOfCustomer(data, customer.id);
    return list.find((q) => q.status === "gesendet") ?? list[0];
  }
  return undefined;
}

export function findInquiryInText(data: AppData, text: string): Inquiry | undefined {
  const customer = findCustomerInText(data, text);
  if (!customer) return undefined;
  const list = inquiriesOfCustomer(data, customer.id);
  return list.find((i) => i.status !== "abgeschlossen") ?? list[0];
}

function has(text: string, words: string[]): boolean {
  const t = norm(text);
  return words.some((w) => t.includes(norm(w)));
}

const HELP_TEXT = [
  "Ich kenne die Daten deines Betriebs und helfe dir im Tagesgeschäft. Frag mich zum Beispiel:",
  "",
  "• Was steht heute an?",
  "• Welche Angebote sind noch offen?",
  "• Mach aus der Anfrage von Keller einen Angebotsentwurf.",
  "• Was fehlt bei der Anfrage Becker?",
  "• Schreib eine freundliche Nachfrage für Angebot 1042.",
  "• Was wissen wir über Frau Schneider?",
].join("\n");

/**
 * Regelbasierte Antwort auf Basis der gespeicherten Daten.
 * Diese Engine erfindet nichts: jede Zahl und jeder Name stammt aus dem Bestand.
 */
export function answer(data: AppData, question: string, now: Date = new Date()): PeterAnswer {
  const q = question.trim();
  if (!q) return { text: HELP_TEXT, actions: [], source: "regeln" };

  // 1) Angebotsentwurf aus einer Anfrage vorbereiten
  if (has(q, ["angebotsentwurf", "angebot erstellen", "mach aus der anfrage", "entwurf"]) &&
      !has(q, ["nachfrage", "nachfassen"])) {
    const inquiry = findInquiryInText(data, q);
    if (!inquiry) {
      return {
        text: "Zu welcher Anfrage soll ich einen Entwurf vorbereiten? Nenn mir den Kundennamen.",
        actions: newInquiries(data).slice(0, 3).map((i) => ({
          type: "open" as const,
          label: `Anfrage ${customerName(data, i.customerId)}`,
          href: `/anfragen/${i.id}`,
        })),
        source: "regeln",
      };
    }
    const draft = draftItemsForInquiry(data, inquiry);
    const sum = draft.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
    const lines = draft.items.map(
      (i) =>
        `• ${i.name}: ${i.quantity > 0 ? `${i.quantity} ${i.unit}` : `Menge offen (${i.unit})`} × ${formatEuro(i.unitPrice)}`,
    );
    return {
      text: [
        `Entwurf für ${customerName(data, inquiry.customerId)} – „${inquiry.title}“:`,
        "",
        ...lines,
        "",
        sum > 0 ? `Zwischensumme netto: ${formatEuro(sum)}` : "Summe erst nach Eintragen der Mengen.",
        ...(draft.openQuantities.length > 0
          ? ["", `Offene Mengen: ${draft.openQuantities.join(", ")}.`]
          : []),
        ...draft.notes.map((n) => `\n${n}`),
        "",
        "Soll ich daraus ein Angebot anlegen?",
      ].join("\n"),
      actions: [
        {
          type: "create_quote_from_inquiry",
          label: "Angebot anlegen",
          inquiryId: inquiry.id,
          items: draft.items,
          openQuantities: draft.openQuantities,
        },
        { type: "open", label: "Anfrage ansehen", href: `/anfragen/${inquiry.id}` },
      ],
      source: "regeln",
    };
  }

  // 2) Nachfass-Nachricht vorbereiten
  if (has(q, ["nachfrage", "nachfassen", "nachhaken", "erinnerung schreiben", "nachricht"])) {
    const quote = findQuoteInText(data, q);
    if (!quote) {
      const due = dueFollowUps(data, now);
      return {
        text:
          due.length > 0
            ? "Für welches Angebot? Diese sind gerade fällig:"
            : "Aktuell ist kein Follow-up fällig. Nenn mir sonst die Angebotsnummer.",
        actions: due.slice(0, 3).map((x) => ({
          type: "open" as const,
          label: `Angebot ${x.number} – ${customerName(data, x.customerId)}`,
          href: `/angebote/${x.id}`,
        })),
        source: "regeln",
      };
    }
    const text = followUpMessage(data, quote, quoteNet(quote), quoteAgeInDays(quote, now));
    return {
      text: [
        `Vorschlag für Angebot Nr. ${quote.number} (${customerName(data, quote.customerId)}):`,
        "",
        text,
        "",
        "Ich verschicke nichts von selbst – du kannst den Text kopieren oder direkt per E-Mail öffnen.",
      ].join("\n"),
      actions: [
        { type: "copy_text", label: "Text kopieren", text, quoteId: quote.id },
        { type: "open", label: "Angebot öffnen", href: `/angebote/${quote.id}` },
      ],
      source: "regeln",
    };
  }

  // 3) Was fehlt bei einer Anfrage?
  if (has(q, ["was fehlt", "fehlt noch", "unvollstaendig", "unvollständig"])) {
    const inquiry = findInquiryInText(data, q);
    if (!inquiry) {
      return { text: "Zu welcher Anfrage? Nenn mir bitte den Kundennamen.", actions: [], source: "regeln" };
    }
    const missing = missingInfo(data, inquiry);
    return {
      text:
        missing.length === 0
          ? `Bei der Anfrage von ${customerName(data, inquiry.customerId)} ist alles da, was du für ein Angebot brauchst.`
          : [
              `Bei der Anfrage von ${customerName(data, inquiry.customerId)} fehlt noch:`,
              "",
              ...missing.map((m) => `• ${m}`),
            ].join("\n"),
      actions: [
        { type: "open", label: "Anfrage öffnen", href: `/anfragen/${inquiry.id}` },
        ...(missing.length > 0
          ? [
              {
                type: "add_task" as const,
                label: "Rückruf einplanen",
                title: `${customerName(data, inquiry.customerId)} zurückrufen – ${missing[0]} erfragen`,
                linkType: "inquiry" as const,
                linkId: inquiry.id,
              },
            ]
          : []),
      ],
      source: "regeln",
    };
  }

  // 4) Offene Angebote
  if (has(q, ["offene angebote", "angebote offen", "offen", "welche angebote", "diese woche"])) {
    const open = openQuotes(data);
    if (open.length === 0) {
      return { text: "Aktuell ist kein Angebot offen.", actions: [], source: "regeln" };
    }
    const lines = open
      .sort((a, b) => quoteAgeInDays(b, now) - quoteAgeInDays(a, now))
      .map((x) => {
        const days = quoteAgeInDays(x, now);
        return `• Nr. ${x.number} – ${customerName(data, x.customerId)}: ${formatEuroShort(
          quoteNet(x),
        )}, seit ${days} ${days === 1 ? "Tag" : "Tagen"} offen (Follow-up ${formatDate(x.followUpDate)})`;
      });
    const sum = open.reduce((s, x) => s + quoteNet(x), 0);
    return {
      text: [
        `${open.length} ${open.length === 1 ? "Angebot ist" : "Angebote sind"} offen, zusammen ${formatEuro(sum)} netto:`,
        "",
        ...lines,
      ].join("\n"),
      actions: open.slice(0, 3).map((x) => ({
        type: "open" as const,
        label: `Nr. ${x.number} öffnen`,
        href: `/angebote/${x.id}`,
      })),
      source: "regeln",
    };
  }

  // 5) Tagesübersicht
  if (has(q, ["heute", "was steht an", "tagesueberblick", "überblick", "zusammenfassung des tages"])) {
    const due = dueFollowUps(data, now);
    const drafts = draftQuotes(data);
    const fresh = newInquiries(data);
    const ready = readyForQuote(data);
    const tasks = openTasks(data, now);
    const parts = [
      `${fresh.length} neue ${fresh.length === 1 ? "Anfrage" : "Anfragen"}`,
      `${ready.length} bereit fürs Angebot`,
      `${drafts.length} ${drafts.length === 1 ? "Angebot" : "Angebote"} in Arbeit`,
      `${due.length} Follow-up${due.length === 1 ? "" : "s"} fällig`,
      `${tasks.length} offene ${tasks.length === 1 ? "Aufgabe" : "Aufgaben"}`,
    ];
    return {
      text: [
        "Heute:",
        "",
        ...parts.map((p) => `• ${p}`),
        ...(due.length > 0
          ? [
              "",
              "Fällige Follow-ups:",
              ...due.map(
                (x) =>
                  `• Nr. ${x.number} – ${customerName(data, x.customerId)} (${formatEuroShort(quoteNet(x))})`,
              ),
            ]
          : []),
      ].join("\n"),
      actions: [{ type: "open", label: "Zu Heute", href: "/heute" }],
      source: "regeln",
    };
  }

  // 6) Aufgaben / Rückrufe
  if (has(q, ["aufgabe", "aufgaben", "rueckruf", "rückruf", "anrufen"])) {
    const tasks = openTasks(data, now);
    const cb = callbacks(data, now);
    return {
      text:
        tasks.length === 0
          ? "Es sind keine Aufgaben offen."
          : [
              `${tasks.length} offene ${tasks.length === 1 ? "Aufgabe" : "Aufgaben"} (davon ${cb.length} Rückrufe):`,
              "",
              ...tasks.map((t) => `• ${t.title} (fällig ${formatDate(t.dueDate)})`),
            ].join("\n"),
      actions: [{ type: "open", label: "Zu Heute", href: "/heute" }],
      source: "regeln",
    };
  }

  // 7) Kundenauskunft / Anfrage zusammenfassen
  const customer = findCustomerInText(data, q);
  if (customer) {
    const inquiries = inquiriesOfCustomer(data, customer.id);
    const quotes = quotesOfCustomer(data, customer.id);
    const lines: string[] = [
      `${customer.name} – ${customer.phone}${customer.email ? `, ${customer.email}` : ""}`,
    ];
    const address = [customer.street, [customer.zip, customer.city].filter(Boolean).join(" ")]
      .filter(Boolean)
      .join(", ");
    if (address) lines.push(address);
    if (inquiries.length > 0) {
      lines.push("", "Anfragen:");
      for (const i of inquiries) {
        lines.push(
          `• „${i.title}“ – ${INQUIRY_STATUS_LABEL[i.status]}, Quelle ${INQUIRY_SOURCE_LABEL[i.source]}${
            i.desiredPeriod ? `, Zeitraum ${i.desiredPeriod}` : ""
          }`,
        );
      }
    }
    if (quotes.length > 0) {
      lines.push("", "Angebote:");
      for (const x of quotes) {
        lines.push(
          `• Nr. ${x.number}: ${formatEuroShort(quoteNet(x))} – ${QUOTE_STATUS_LABEL[x.status]}${
            x.followUpDate ? `, Follow-up ${formatDate(x.followUpDate)}` : ""
          }`,
        );
      }
    }
    if (inquiries.length === 0 && quotes.length === 0) {
      lines.push("", "Zu diesem Kunden ist noch nichts erfasst.");
    }
    const open = inquiries.find((i) => i.status !== "abgeschlossen");
    return {
      text: lines.join("\n"),
      actions: [
        { type: "open", label: "Kunde öffnen", href: `/kunden/${customer.id}` },
        ...(open ? [{ type: "open" as const, label: "Anfrage öffnen", href: `/anfragen/${open.id}` }] : []),
      ],
      source: "regeln",
    };
  }

  // 8) Neue Anfragen
  if (has(q, ["neue anfragen", "anfragen"])) {
    const fresh = newInquiries(data);
    return {
      text:
        fresh.length === 0
          ? "Es liegen keine unbearbeiteten Anfragen vor."
          : [
              `${fresh.length} neue ${fresh.length === 1 ? "Anfrage" : "Anfragen"}:`,
              "",
              ...fresh.map(
                (i) => `• ${customerName(data, i.customerId)}: „${i.title}“ (${INQUIRY_SOURCE_LABEL[i.source]})`,
              ),
            ].join("\n"),
      actions: [{ type: "open", label: "Zu den Anfragen", href: "/anfragen" }],
      source: "regeln",
    };
  }

  return { text: HELP_TEXT, actions: [], source: "regeln" };
}

/** Prüft, ob die Regel-Engine die Frage wirklich beantworten konnte. */
export function isFallback(result: PeterAnswer): boolean {
  return result.text === HELP_TEXT;
}

export { HELP_TEXT };
export type { PeterAction };

/** Kompakter Datenauszug für das Sprachmodell – ohne erfundene Werte. */
export function buildContextSnapshot(data: AppData, now: Date = new Date()): string {
  const lines: string[] = [];
  lines.push(`Betrieb: ${data.company.name}, ${data.company.city}. Heute: ${toISODate(now)}.`);
  lines.push(`Follow-up-Regel: ${data.company.followUpWorkdays} Werktage nach Versand.`);
  lines.push("");
  lines.push("LEISTUNGSKATALOG (einzige erlaubte Preisquelle):");
  for (const s of data.services.filter((s) => s.active)) {
    lines.push(`- ${s.name} | ${s.unit} | ${formatEuro(s.defaultPrice)}`);
  }
  lines.push("");
  lines.push("KUNDEN:");
  for (const c of data.customers) {
    lines.push(`- ${c.id} ${c.name} | ${c.phone}${c.email ? ` | ${c.email}` : ""}`);
  }
  lines.push("");
  lines.push("ANFRAGEN:");
  for (const i of data.inquiries) {
    lines.push(
      `- ${i.id} | ${customerName(data, i.customerId)} | "${i.title}" | ${INQUIRY_STATUS_LABEL[i.status]} | Zeitraum: ${i.desiredPeriod ?? "offen"} | ${i.description}`,
    );
  }
  lines.push("");
  lines.push("ANGEBOTE:");
  for (const x of data.quotes) {
    lines.push(
      `- Nr. ${x.number} (${x.id}) | ${customerName(data, x.customerId)} | ${formatEuro(quoteNet(x))} netto | ${QUOTE_STATUS_LABEL[x.status]} | Follow-up: ${x.followUpDate ?? "-"} | offen seit: ${quoteAgeInDays(x, now)} Tagen`,
    );
  }
  lines.push("");
  lines.push("AUFGABEN:");
  for (const t of openTasks(data, now)) {
    lines.push(`- ${t.title} (fällig ${t.dueDate})`);
  }
  return lines.join("\n");
}

export function customerContext(data: AppData, id: string): Customer | undefined {
  return customerOf(data, id);
}
