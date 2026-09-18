import { formatEuroShort, quoteNet } from "../money";
import {
  callbacks,
  customerName,
  dueFollowUps,
  draftQuotes,
  expiredQuotes,
  needsClarification,
  newInquiries,
  quoteAgeInDays,
  readyForQuote,
} from "../selectors";
import type { AppData } from "../types";
import { missingInfo } from "./drafts";

export interface Insight {
  id: string;
  text: string;
  href: string;
  tone: "hinweis" | "chance" | "achtung";
}

/**
 * "Peter sagt" – kurze, konkrete Hinweise aus den echten Daten des Betriebs.
 * Bewusst begrenzt, damit das Dashboard nicht überladen wirkt.
 */
export function buildInsights(data: AppData, now: Date = new Date(), limit = 4): Insight[] {
  const insights: Insight[] = [];

  for (const quote of dueFollowUps(data, now)) {
    const days = quoteAgeInDays(quote, now);
    insights.push({
      id: `fu_${quote.id}`,
      tone: "achtung",
      text: `Das Angebot für ${customerName(data, quote.customerId)} über ${formatEuroShort(
        quoteNet(quote),
      )} ist seit ${days} ${days === 1 ? "Tag" : "Tagen"} offen. Nachfassen?`,
      href: `/angebote/${quote.id}`,
    });
  }

  for (const inquiry of readyForQuote(data)) {
    insights.push({
      id: `ready_${inquiry.id}`,
      tone: "chance",
      text: `Aus der Anfrage von ${customerName(data, inquiry.customerId)} kann jetzt ein Angebot erstellt werden.`,
      href: `/anfragen/${inquiry.id}`,
    });
  }

  for (const inquiry of needsClarification(data)) {
    const missing = missingInfo(data, inquiry);
    if (missing.length > 0) {
      insights.push({
        id: `miss_${inquiry.id}`,
        tone: "hinweis",
        text: `Bei der Anfrage von ${customerName(data, inquiry.customerId)} fehlt noch ${missing[0]}.`,
        href: `/anfragen/${inquiry.id}`,
      });
    }
  }

  for (const quote of expiredQuotes(data, now)) {
    insights.push({
      id: `exp_${quote.id}`,
      tone: "achtung",
      text: `Angebot Nr. ${quote.number} für ${customerName(data, quote.customerId)} ist abgelaufen. Verlängern oder abschließen?`,
      href: `/angebote/${quote.id}`,
    });
  }

  for (const inquiry of newInquiries(data)) {
    insights.push({
      id: `new_${inquiry.id}`,
      tone: "hinweis",
      text: `Neue Anfrage von ${customerName(data, inquiry.customerId)} – noch nicht bearbeitet.`,
      href: `/anfragen/${inquiry.id}`,
    });
  }

  for (const quote of draftQuotes(data)) {
    if (quote.items.length === 0) {
      insights.push({
        id: `draft_${quote.id}`,
        tone: "hinweis",
        text: `Angebot Nr. ${quote.number} für ${customerName(data, quote.customerId)} hat noch keine Positionen.`,
        href: `/angebote/${quote.id}`,
      });
    }
  }

  for (const task of callbacks(data, now)) {
    insights.push({
      id: `cb_${task.id}`,
      tone: "hinweis",
      text: `Rückruf offen: ${task.title}`,
      href: "/heute",
    });
  }

  return insights.slice(0, limit);
}
