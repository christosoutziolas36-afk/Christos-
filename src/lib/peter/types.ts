import type { QuoteItem } from "../types";

/**
 * Aktionen, die Peter VORBEREITET. Ausgelöst werden sie immer erst durch
 * einen Klick des Nutzers – Peter handelt nie mit Außenwirkung von selbst.
 */
export type PeterAction =
  | { type: "open"; label: string; href: string }
  | {
      type: "create_quote_from_inquiry";
      label: string;
      inquiryId: string;
      items: QuoteItem[];
      /** Positionen, bei denen die Menge noch geprüft werden muss. */
      openQuantities: string[];
    }
  | { type: "copy_text"; label: string; text: string; quoteId?: string }
  | { type: "add_task"; label: string; title: string; linkType?: "inquiry" | "quote"; linkId?: string };

export interface PeterAnswer {
  text: string;
  actions: PeterAction[];
  /** Quelle der Antwort – für Transparenz in der Oberfläche. */
  source: "regeln" | "modell";
}

export interface PeterMessage {
  id: string;
  role: "user" | "peter";
  text: string;
  actions?: PeterAction[];
  source?: PeterAnswer["source"];
  createdAt: string;
}
