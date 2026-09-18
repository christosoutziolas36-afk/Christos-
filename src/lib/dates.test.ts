import { describe, expect, it } from "vitest";
import { addWorkdays, followUpDateFrom, holidaysNRW, isWorkday, toISODate } from "./dates";

describe("Werktagslogik", () => {
  it("überspringt das Wochenende", () => {
    // Donnerstag, 17.09.2026 + 3 Werktage -> Dienstag, 22.09.2026
    const donnerstag = new Date(2026, 8, 17);
    expect(toISODate(addWorkdays(donnerstag, 3))).toBe("2026-09-22");
  });

  it("zählt Samstag und Sonntag nicht als Werktag", () => {
    expect(isWorkday(new Date(2026, 8, 19))).toBe(false); // Samstag
    expect(isWorkday(new Date(2026, 8, 20))).toBe(false); // Sonntag
    expect(isWorkday(new Date(2026, 8, 18))).toBe(true); // Freitag
  });

  it("kennt NRW-Feiertage inklusive beweglicher Termine", () => {
    const h = holidaysNRW(2026);
    expect(h.has("2026-01-01")).toBe(true); // Neujahr
    expect(h.has("2026-04-03")).toBe(true); // Karfreitag 2026
    expect(h.has("2026-04-06")).toBe(true); // Ostermontag 2026
    expect(h.has("2026-06-04")).toBe(true); // Fronleichnam 2026
    expect(h.has("2026-10-03")).toBe(true); // Tag der Deutschen Einheit
    expect(isWorkday(new Date(2026, 11, 25))).toBe(false); // 1. Weihnachtstag
  });

  it("überspringt Feiertage beim Follow-up-Datum", () => {
    // Mittwoch, 01.04.2026 + 3 Werktage: Do 02.04., Fr 03.04. ist Karfreitag,
    // Mo 06.04. ist Ostermontag -> Di 07.04. und Mi 08.04.
    expect(followUpDateFrom(new Date(2026, 3, 1), 3)).toBe("2026-04-08");
  });

  it("nutzt drei Werktage als Standard", () => {
    const montag = new Date(2026, 8, 14);
    expect(followUpDateFrom(montag)).toBe("2026-09-17");
  });
});
