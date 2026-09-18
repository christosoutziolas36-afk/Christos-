import type { CatalogService } from "./types";

/**
 * Schnelleingabe für Angebotspositionen.
 *
 * Der Betrieb tippt "wände 95" und drückt Enter – Leistung und Menge stehen
 * in einer Zeile. Damit lässt sich ein ganzes Angebot ohne Maus erfassen,
 * was abends am Küchentisch den Unterschied macht.
 */

export function normalisiere(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9\s.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Trennt die Mengenangabe vom Suchbegriff: "wände 95" -> { suche: "wände", menge: 95 } */
export function trenneMenge(eingabe: string): { suche: string; menge?: number } {
  const treffer = eingabe.trim().match(/^(.*?)[\s]*(\d+(?:[.,]\d+)?)\s*(?:m²|m2|qm|lfm|stk|std)?$/i);
  if (!treffer || !treffer[1].trim()) {
    return { suche: eingabe.trim() };
  }
  return { suche: treffer[1].trim(), menge: Number(treffer[2].replace(",", ".")) };
}

/**
 * Findet passende Leistungen im Katalog.
 * Sortiert nach Güte: exakter Anfang vor Teiltreffer.
 */
export function findeLeistungen(suche: string, services: CatalogService[]): CatalogService[] {
  const begriff = normalisiere(suche);
  if (!begriff) return services.filter((s) => s.active).slice(0, 6);

  const woerter = begriff.split(" ").filter(Boolean);

  return services
    .filter((s) => s.active)
    .map((service) => {
      const name = normalisiere(service.name);
      let punkte = 0;
      if (name.startsWith(begriff)) punkte += 100;
      if (name.includes(begriff)) punkte += 50;
      const namensteile = name.split(" ");
      for (const wort of woerter) {
        if (wort.length < 2) continue;
        if (name.includes(wort)) punkte += 10;
        if (namensteile.some((teil) => teil.startsWith(wort))) punkte += 5;
        // Deutsche Wortformen: getippt wird "abkleben", im Katalog steht
        // "Abklebe- und Schutzarbeiten". Ein gemeinsamer Wortstamm genügt.
        if (namensteile.some((teil) => gemeinsamerStamm(teil, wort) >= 4)) punkte += 5;
        if (vereinfache(name).includes(vereinfache(wort))) punkte += 8;
      }
      return { service, punkte };
    })
    .filter((eintrag) => eintrag.punkte > 0)
    .sort((a, b) => b.punkte - a.punkte)
    .slice(0, 6)
    .map((eintrag) => eintrag.service);
}

/**
 * Zweite Vergleichsform: reduziert die Umlautumschrift weiter.
 * Damit findet "wand" auch "Wände" (waende -> wande), egal ob jemand
 * den Umlaut, die ae-Schreibweise oder die Einzahl tippt.
 */
export function vereinfache(text: string): string {
  return text.replace(/ae/g, "a").replace(/oe/g, "o").replace(/ue/g, "u");
}

/** Länge des gemeinsamen Wortanfangs zweier Wörter. */
export function gemeinsamerStamm(a: string, b: string): number {
  const laenge = Math.min(a.length, b.length);
  let i = 0;
  while (i < laenge && a[i] === b[i]) i++;
  return i;
}

export interface PositionsVorschlag {
  service: CatalogService;
  menge: number;
  /** Menge war in der Eingabe enthalten – sonst muss sie noch eingetragen werden. */
  mengeAngegeben: boolean;
}

/** Wertet eine komplette Eingabezeile aus. */
export function werteEingabeAus(
  eingabe: string,
  services: CatalogService[],
): { treffer: CatalogService[]; vorschlag?: PositionsVorschlag; menge?: number } {
  const { suche, menge } = trenneMenge(eingabe);
  const treffer = findeLeistungen(suche, services);
  if (treffer.length === 0) return { treffer: [], menge };

  const service = treffer[0];
  const istPauschal = service.unit === "pauschal";
  return {
    treffer,
    menge,
    vorschlag: {
      service,
      menge: menge ?? (istPauschal ? 1 : 0),
      mengeAngegeben: menge !== undefined || istPauschal,
    },
  };
}
