import type { Quote, QuoteItem } from "./types";

export function itemTotal(item: QuoteItem): number {
  return round2(item.quantity * item.unitPrice);
}

export function quoteNet(quote: Pick<Quote, "items">): number {
  return round2(quote.items.reduce((sum, i) => sum + itemTotal(i), 0));
}

export function quoteTax(quote: Pick<Quote, "items">, taxRate: number): number {
  return round2((quoteNet(quote) * taxRate) / 100);
}

export function quoteGross(quote: Pick<Quote, "items">, taxRate: number): number {
  return round2(quoteNet(quote) + quoteTax(quote, taxRate));
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function formatEuro(n: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(n);
}

/** Kurzform für Karten/Listen: "1.840 €" */
export function formatEuroShort(n: number): string {
  return `${new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 }).format(n)} €`;
}
