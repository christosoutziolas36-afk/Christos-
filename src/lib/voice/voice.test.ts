import { describe, expect, it } from "vitest";
import { DEMO_COMPANY } from "../demo-data";
import { abschluss, begruessung, istZustimmung, naechsterSchritt, sprichNummer } from "./dialog";
import { antwortVerarbeiten, bereinige, fehlendeAngaben, nameAusSprache, zeitraumAusSprache, ziffernAusSprache, zusammenfassung } from "./extract";
import { frageStellen, verabschieden, xmlEscape } from "./twiml";
import { neuerAnruf } from "./handler";
import type { VoiceCall } from "./types";

function anruf(): VoiceCall {
  return neuerAnruf("+4917022334455", "+492031234567", "CA123");
}

describe("Telefonassistent – Gesprächsführung", () => {
  it("begrüßt mit Betriebsnamen und erklärt die Lage", () => {
    const text = begruessung(DEMO_COMPANY);
    expect(text).toContain("Malerbetrieb Farbwerk – Demo");
    expect(text).toContain("Wie ist Ihr Name?");
    expect(text).toContain("meldet er sich bei Ihnen zurück");
    expect(text).toContain("Thomas Farbwerk");
  });

  it("nennt weder Preise noch Termine", () => {
    const call = anruf();
    call.extracted.name = "Frau Berger";
    call.extracted.anliegen = "Wohnzimmer streichen";
    const texte = [begruessung(DEMO_COMPANY), abschluss(call, DEMO_COMPANY)].join(" ");
    expect(texte).not.toMatch(/€|Euro|kostet|Preis/i);
    expect(texte).not.toMatch(/Termin am|wir kommen am|ich trage Sie ein/i);
  });

  it("geht die Fragen in fester Reihenfolge durch", () => {
    expect(naechsterSchritt("begruessung")).toBe("name");
    expect(naechsterSchritt("name")).toBe("anliegen");
    expect(naechsterSchritt("anliegen")).toBe("adresse");
    expect(naechsterSchritt("adresse")).toBe("zeitraum");
    expect(naechsterSchritt("zeitraum")).toBe("rueckrufnummer");
    expect(naechsterSchritt("rueckrufnummer")).toBe("abschluss");
    expect(naechsterSchritt("abschluss")).toBe("beendet");
  });

  it("fasst am Ende nur zusammen, was verstanden wurde", () => {
    const call = anruf();
    call.extracted.name = "Herr Wagner";
    call.extracted.anliegen = "Wohnzimmer streichen, etwa 30 Quadratmeter";
    const text = abschluss(call, DEMO_COMPANY);
    expect(text).toContain("Herr Wagner");
    expect(text).toContain("Wohnzimmer streichen");
    expect(text).not.toContain("Adresse:");
    expect(text).not.toContain("Zeitraum:");
  });

  it("spricht Rufnummern in Zweiergruppen", () => {
    const gesprochen = sprichNummer("+4917022334455");
    expect(gesprochen).toBe("+49 17 02 23 34 455");
    // Keine Ziffer darf beim Gruppieren verloren gehen.
    expect(gesprochen.replace(/[^\d+]/g, "")).toBe("+4917022334455");
  });

  it("erkennt Zustimmung", () => {
    expect(istZustimmung("Ja gerne")).toBe(true);
    expect(istZustimmung("Nein, lieber die andere")).toBe(false);
  });
});

describe("Telefonassistent – Antworten auswerten", () => {
  it("entfernt Füllphrasen", () => {
    expect(bereinige("Ja also mein Name ist Sabine Keller")).toBe("Sabine Keller");
    expect(bereinige("Es geht um das Treppenhaus")).toBe("das Treppenhaus");
  });

  it("erkennt Namen", () => {
    expect(nameAusSprache("mein name ist herr becker")).toBe("Herr Becker");
    expect(nameAusSprache("")).toBeUndefined();
  });

  it("wandelt gesprochene Rufnummern in Ziffern", () => {
    expect(ziffernAusSprache("null zwei null drei vier vier fünf fünf sechs sechs")).toBe("0203445566");
    expect(ziffernAusSprache("0170 2233445")).toBe("01702233445");
    expect(ziffernAusSprache("keine Ahnung")).toBeUndefined();
  });

  it("erkennt Zeiträume", () => {
    expect(zeitraumAusSprache("am besten im Oktober")).toBe("Oktober");
    expect(zeitraumAusSprache("so schnell wie möglich")).toBe("möglichst bald");
    expect(zeitraumAusSprache("das eilt nicht, keine Eile")).toBe("keine Eile");
  });

  it("übernimmt Anliegen und Adresse", () => {
    const call = anruf();
    expect(antwortVerarbeiten(call, "anliegen", "Wohnzimmer und Flur streichen, etwa 40 Quadratmeter")).toBe(true);
    expect(call.extracted.anliegen).toContain("Wohnzimmer");
    expect(antwortVerarbeiten(call, "adresse", "Die Adresse ist Bergstraße 12 in 47051 Duisburg")).toBe(true);
    expect(call.extracted.adresse).toContain("Bergstraße 12");
    expect(call.extracted.adresse).toContain("47051 Duisburg");
  });

  it("meldet unverständliche Antworten, statt zu raten", () => {
    const call = anruf();
    expect(antwortVerarbeiten(call, "name", undefined)).toBe(false);
    expect(antwortVerarbeiten(call, "name", "   ")).toBe(false);
    expect(call.extracted.name).toBeUndefined();
  });

  it("behält die Anrufernummer, wenn keine andere genannt wird", () => {
    const call = anruf();
    antwortVerarbeiten(call, "rueckrufnummer", "ja passt");
    expect(call.extracted.phone).toBe("+4917022334455");
  });

  it("übernimmt eine abweichende Rückrufnummer", () => {
    const call = anruf();
    antwortVerarbeiten(call, "rueckrufnummer", "nein, besser 0203 998877");
    expect(call.extracted.phone).toBe("0203998877");
  });

  it("listet fehlende Angaben eines abgebrochenen Anrufs", () => {
    const call = anruf();
    antwortVerarbeiten(call, "name", "Frau Schneider");
    expect(fehlendeAngaben(call)).toEqual(["Anliegen", "Adresse", "Zeitraum"]);
    expect(zusammenfassung(call)).toContain("aufgelegt");
  });
});

describe("Telefonassistent – TwiML", () => {
  it("baut eine Frage mit Spracherkennung auf Deutsch", () => {
    const xml = frageStellen("Wie ist Ihr Name?", "https://example.de/api/voice/gather?callId=1&step=name");
    expect(xml).toContain('<Gather input="speech" language="de-DE"');
    expect(xml).toContain("speechTimeout=\"auto\"");
    expect(xml).toContain("Wie ist Ihr Name?");
    expect(xml).toContain("callId=1&amp;step=name");
    expect(xml).toContain("<Redirect");
  });

  it("verabschiedet und legt auf", () => {
    const xml = verabschieden("Auf Wiederhören.");
    expect(xml).toContain("<Hangup/>");
  });

  it("maskiert Sonderzeichen", () => {
    expect(xmlEscape('Meier & Söhne "Malerei"')).toBe("Meier &amp; Söhne &quot;Malerei&quot;");
  });
});
