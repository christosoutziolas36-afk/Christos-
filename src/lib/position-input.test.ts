import { describe, expect, it } from "vitest";
import { DEMO_SERVICES } from "./demo-data";
import { findeLeistungen, trenneMenge, werteEingabeAus } from "./position-input";

describe("Schnelleingabe von Positionen", () => {
  it("trennt Menge vom Suchbegriff", () => {
    expect(trenneMenge("wände 95")).toEqual({ suche: "wände", menge: 95 });
    expect(trenneMenge("treppenhaus 45,5")).toEqual({ suche: "treppenhaus", menge: 45.5 });
    expect(trenneMenge("risse 12 lfm")).toEqual({ suche: "risse", menge: 12 });
    expect(trenneMenge("materialpauschale")).toEqual({ suche: "materialpauschale" });
  });

  it("findet Leistungen über Wortanfänge und Umlaute", () => {
    expect(findeLeistungen("wände", DEMO_SERVICES)[0].id).toBe("svc_waende");
    expect(findeLeistungen("waende", DEMO_SERVICES)[0].id).toBe("svc_waende");
    expect(findeLeistungen("treppe", DEMO_SERVICES)[0].id).toBe("svc_treppenhaus");
    expect(findeLeistungen("abkleb", DEMO_SERVICES)[0].id).toBe("svc_abkleben");
  });

  it("findet Leistungen auch bei abweichender Wortform", () => {
    // Getippt wird die Verbform, im Katalog steht das Substantiv.
    expect(findeLeistungen("abkleben", DEMO_SERVICES)[0].id).toBe("svc_abkleben");
    expect(findeLeistungen("spachteln", DEMO_SERVICES)[0].id).toBe("svc_risse");
    expect(findeLeistungen("wand", DEMO_SERVICES)[0].id).toBe("svc_waende");
  });

  it("liefert nichts zurück, wenn der Katalog nichts Passendes hat", () => {
    expect(findeLeistungen("dachdecken", DEMO_SERVICES)).toEqual([]);
  });

  it("macht aus einer Zeile eine fertige Position", () => {
    const { vorschlag } = werteEingabeAus("wände 95", DEMO_SERVICES);
    expect(vorschlag?.service.id).toBe("svc_waende");
    expect(vorschlag?.menge).toBe(95);
    expect(vorschlag?.mengeAngegeben).toBe(true);
  });

  it("setzt Pauschalen automatisch auf 1", () => {
    const { vorschlag } = werteEingabeAus("material", DEMO_SERVICES);
    expect(vorschlag?.service.id).toBe("svc_material");
    expect(vorschlag?.menge).toBe(1);
    expect(vorschlag?.mengeAngegeben).toBe(true);
  });

  it("markiert eine fehlende Menge, statt sie zu erfinden", () => {
    const { vorschlag } = werteEingabeAus("untergrund", DEMO_SERVICES);
    expect(vorschlag?.menge).toBe(0);
    expect(vorschlag?.mengeAngegeben).toBe(false);
  });

  it("zeigt bei leerer Eingabe die ersten Leistungen des Katalogs", () => {
    expect(findeLeistungen("", DEMO_SERVICES).length).toBeGreaterThan(0);
  });

  it("nutzt ausschließlich Leistungen aus dem Katalog", () => {
    const { treffer } = werteEingabeAus("wände 95", DEMO_SERVICES);
    for (const t of treffer) {
      expect(DEMO_SERVICES.some((s) => s.id === t.id)).toBe(true);
    }
  });
});
