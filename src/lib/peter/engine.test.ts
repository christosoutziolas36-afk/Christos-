import { describe, expect, it } from "vitest";
import { buildDemoData } from "../demo-data";
import { answer, findCustomerInText, findQuoteInText } from "./engine";
import { draftItemsForInquiry, extractAreas, missingInfo, salutation } from "./drafts";
import { buildInsights } from "./insights";

const NOW = new Date(2026, 8, 18, 9, 0, 0);
const data = buildDemoData(NOW);

describe("Peter – Datenzugriff", () => {
  it("findet Kunden über Teilnamen", () => {
    expect(findCustomerInText(data, "Was ist mit Frau Keller?")?.id).toBe("cus_keller");
    expect(findCustomerInText(data, "anfrage becker")?.id).toBe("cus_becker");
    expect(findCustomerInText(data, "irgendwer")).toBeUndefined();
  });

  it("findet Angebote über die Nummer", () => {
    expect(findQuoteInText(data, "Schreib eine Nachfrage für Angebot 1042")?.id).toBe("quo_mueller");
  });
});

describe("Peter – Angebotsentwurf", () => {
  it("verwendet ausschließlich Preise aus dem Leistungskatalog", () => {
    const inquiry = data.inquiries.find((i) => i.id === "inq_keller")!;
    const draft = draftItemsForInquiry(data, inquiry);
    expect(draft.items.length).toBeGreaterThan(0);
    for (const item of draft.items) {
      const service = data.services.find((s) => s.id === item.serviceId);
      expect(service).toBeDefined();
      expect(item.unitPrice).toBe(service!.defaultPrice);
      expect(item.name).toBe(service!.name);
    }
  });

  it("übernimmt Flächen aus dem Anfragetext", () => {
    expect(extractAreas("Wohnzimmer ca. 28 m² und 40 qm Fassade")).toEqual([28, 40]);
    const inquiry = data.inquiries.find((i) => i.id === "inq_keller")!;
    const draft = draftItemsForInquiry(data, inquiry);
    const wand = draft.items.find((i) => i.serviceId === "svc_waende");
    expect(wand?.quantity).toBe(28);
  });

  it("schätzt keine Mengen, sondern markiert sie als offen", () => {
    const inquiry = data.inquiries.find((i) => i.id === "inq_becker")!;
    const draft = draftItemsForInquiry(data, inquiry);
    expect(draft.openQuantities.length).toBeGreaterThan(0);
    for (const item of draft.items) {
      if (item.unit !== "pauschal") expect(item.quantity).toBeGreaterThanOrEqual(0);
    }
    expect(draft.notes.join(" ")).toContain("keine Flächenangabe");
  });

  it("erkennt fehlende Informationen einer Anfrage", () => {
    const becker = data.inquiries.find((i) => i.id === "inq_becker")!;
    const missing = missingInfo(data, becker);
    expect(missing).toContain("Raumgröße bzw. Fläche");
    expect(missing).toContain("E-Mail-Adresse (für den Angebotsversand)");
  });
});

describe("Peter – Antworten", () => {
  it("listet offene Angebote mit echten Beträgen", () => {
    const res = answer(data, "Welche Angebote sind noch offen?", NOW);
    expect(res.text).toContain("1042");
    expect(res.text).toContain("Familie Müller");
    expect(res.source).toBe("regeln");
  });

  it("bereitet einen Angebotsentwurf mit Bestätigungsaktion vor", () => {
    const res = answer(data, "Mach aus der Anfrage von Keller einen Angebotsentwurf", NOW);
    const action = res.actions.find((a) => a.type === "create_quote_from_inquiry");
    expect(action).toBeDefined();
    expect(res.text).toContain("Soll ich daraus ein Angebot anlegen?");
  });

  it("formuliert eine Nachfassnachricht, verschickt sie aber nicht", () => {
    const res = answer(data, "Schreib eine freundliche Nachfrage für Angebot 1042", NOW);
    expect(res.text).toContain("Angebot Nr. 1042");
    expect(res.text).toContain("Ich verschicke nichts von selbst");
    expect(res.actions.some((a) => a.type === "copy_text")).toBe(true);
    expect(res.actions.some((a) => a.type === "open" && a.href.startsWith("/angebote/"))).toBe(true);
  });

  it("beantwortet Fragen zu gespeicherten Kundendaten", () => {
    const res = answer(data, "Was wissen wir über Frau Schneider?", NOW);
    expect(res.text).toContain("Frau Schneider");
    expect(res.text).toContain("Garage");
  });

  it("fasst den Tag zusammen", () => {
    const res = answer(data, "Was steht heute an?", NOW);
    expect(res.text).toContain("Heute:");
    expect(res.text).toContain("Follow-up");
  });

  it("gibt Hilfe statt zu raten, wenn es die Frage nicht versteht", () => {
    const res = answer(data, "Wie wird das Wetter morgen in Hamburg?", NOW);
    expect(res.text).toContain("Frag mich zum Beispiel");
  });

  it("nutzt die passende Anrede", () => {
    expect(salutation("Familie Müller")).toBe("Hallo Familie Müller,");
    expect(salutation("Herr Becker")).toBe("Sehr geehrter Herr Becker,");
    expect(salutation("Frau Schneider")).toBe("Sehr geehrte Frau Schneider,");
  });
});

describe("Peter sagt – Hinweise", () => {
  it("weist auf ein überfälliges Follow-up hin", () => {
    const insights = buildInsights(data, NOW);
    const followUp = insights.find((i) => i.id.startsWith("fu_"));
    expect(followUp?.text).toContain("Familie Müller");
    expect(followUp?.text).toContain("Nachfassen?");
  });

  it("weist auf Anfragen hin, die angebotsreif sind", () => {
    const insights = buildInsights(data, NOW, 10);
    expect(insights.some((i) => i.text.includes("kann jetzt ein Angebot erstellt werden"))).toBe(true);
  });

  it("überlädt das Dashboard nicht", () => {
    expect(buildInsights(data, NOW).length).toBeLessThanOrEqual(4);
  });
});

describe("Peter – Notiz strukturieren", () => {
  it("erkennt Name, Telefon, Adresse und Zeitraum aus einer Telefonnotiz", async () => {
    const { parseNote } = await import("./parse");
    const parsed = parseNote(
      "Frau Schmitz hat angerufen, 0203 445566, Bergstraße 12, 47051 Duisburg, Wohnzimmer streichen, am besten im Oktober",
    );
    expect(parsed.name).toBe("Frau Schmitz");
    expect(parsed.phone).toContain("0203");
    expect(parsed.street).toBe("Bergstraße 12");
    expect(parsed.zip).toBe("47051");
    expect(parsed.city).toBe("Duisburg");
    expect(parsed.desiredPeriod).toBe("Oktober");
    expect(parsed.source).toBe("telefon");
    expect(parsed.title).toBe("Wohnzimmer streichen");
    expect(parsed.unresolved).toEqual([]);
  });

  it("meldet offene Felder statt sie zu erfinden", async () => {
    const { parseNote } = await import("./parse");
    const parsed = parseNote("kurz gestrichen werden soll was");
    expect(parsed.unresolved).toContain("Name");
    expect(parsed.unresolved).toContain("Telefonnummer");
    expect(parsed.name).toBeUndefined();
  });
});
