"use client";

import { useEffect, useRef, useState } from "react";
import { formatEuro } from "@/lib/money";
import { werteEingabeAus } from "@/lib/position-input";
import type { CatalogService, QuoteItem } from "@/lib/types";

/**
 * Eine Zeile tippen, Enter – Position steht im Angebot.
 * "wände 95" wird zu 95 m² "Wände zweimal streichen" mit dem Katalogpreis.
 *
 * Der Fokus bleibt im Feld, damit mehrere Positionen ohne Maus erfasst
 * werden können. Das ist der schnellste Weg zu einem fertigen Angebot.
 */
export function PositionSchnelleingabe({
  services,
  onAdd,
}: {
  services: CatalogService[];
  onAdd: (item: Omit<QuoteItem, "id">) => void;
}) {
  const [eingabe, setEingabe] = useState("");
  const [auswahl, setAuswahl] = useState(0);
  const [offen, setOffen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const { treffer, menge } = werteEingabeAus(eingabe, services);
  const aktiv = treffer[Math.min(auswahl, treffer.length - 1)];

  useEffect(() => setAuswahl(0), [eingabe]);

  useEffect(() => {
    const zu = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOffen(false);
    };
    document.addEventListener("mousedown", zu);
    return () => document.removeEventListener("mousedown", zu);
  }, []);

  function uebernehmen(service: CatalogService) {
    const istPauschal = service.unit === "pauschal";
    onAdd({
      serviceId: service.id,
      name: service.name,
      quantity: menge ?? (istPauschal ? 1 : 0),
      unit: service.unit,
      unitPrice: service.defaultPrice,
    });
    setEingabe("");
    setOffen(false);
    inputRef.current?.focus();
  }

  function taste(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOffen(true);
      setAuswahl((a) => Math.min(a + 1, treffer.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setAuswahl((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (aktiv) uebernehmen(aktiv);
    } else if (e.key === "Escape") {
      setOffen(false);
    }
  }

  return (
    <div ref={boxRef} className="relative">
      <input
        ref={inputRef}
        value={eingabe}
        onChange={(e) => {
          setEingabe(e.target.value);
          setOffen(true);
        }}
        onFocus={() => setOffen(true)}
        onKeyDown={taste}
        placeholder="Leistung und Menge tippen, z. B. „wände 95“ – dann Enter"
        className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2.5 text-ink-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        aria-label="Position hinzufügen"
        autoComplete="off"
      />

      {offen && treffer.length > 0 ? (
        <ul className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-ink-200 bg-white shadow-lg">
          {treffer.map((service, index) => {
            const istPauschal = service.unit === "pauschal";
            const zeigeMenge = menge ?? (istPauschal ? 1 : undefined);
            return (
              <li key={service.id}>
                <button
                  type="button"
                  onMouseEnter={() => setAuswahl(index)}
                  onClick={() => uebernehmen(service)}
                  className={`flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm ${
                    index === Math.min(auswahl, treffer.length - 1)
                      ? "bg-brand-50 text-brand-900"
                      : "text-ink-800 hover:bg-ink-50"
                  }`}
                >
                  <span className="min-w-0 truncate font-medium">{service.name}</span>
                  <span className="shrink-0 text-xs tabular-nums text-ink-500">
                    {zeigeMenge !== undefined ? `${zeigeMenge} ${service.unit} · ` : ""}
                    {formatEuro(service.defaultPrice)}/{service.unit}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {offen && eingabe.trim() && treffer.length === 0 ? (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-lg border border-ink-200 bg-white px-3 py-2.5 text-sm text-ink-500 shadow-lg">
          Keine passende Leistung im Katalog. Unter Einstellungen anlegen oder unten eine freie
          Position einfügen.
        </div>
      ) : null}
    </div>
  );
}
