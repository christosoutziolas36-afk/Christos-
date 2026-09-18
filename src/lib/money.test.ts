import { describe, expect, it } from "vitest";
import { formatEuroShort, itemTotal, quoteGross, quoteNet, quoteTax } from "./money";
import type { QuoteItem } from "./types";

const items: QuoteItem[] = [
  { id: "1", name: "Wände zweimal streichen", quantity: 95, unit: "m²", unitPrice: 9.8 },
  { id: "2", name: "Materialpauschale", quantity: 1, unit: "pauschal", unitPrice: 180 },
];

describe("Angebotssummen", () => {
  it("rechnet Positionen korrekt", () => {
    expect(itemTotal(items[0])).toBe(931);
  });

  it("rechnet netto, Steuer und brutto", () => {
    const quote = { items };
    expect(quoteNet(quote)).toBe(1111);
    expect(quoteTax(quote, 19)).toBe(211.09);
    expect(quoteGross(quote, 19)).toBe(1322.09);
  });

  it("rundet auf zwei Nachkommastellen", () => {
    const quote = { items: [{ id: "x", name: "Test", quantity: 3, unit: "m²" as const, unitPrice: 3.333 }] };
    expect(quoteNet(quote)).toBe(10);
  });

  it("formatiert Beträge deutsch", () => {
    expect(formatEuroShort(1840)).toBe("1.840 €");
  });
});
