"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button, Card, Field, PageHeader, SectionTitle, inputClass } from "@/components/ui";
import { useStore } from "@/lib/store/store";
import { quotesOfCustomer } from "@/lib/selectors";

/**
 * Angebot direkt anlegen – ohne Umweg über eine Anfrage.
 * Der typische Fall: Besichtigung war heute, abends wird das Angebot
 * geschrieben. Zwei Angaben genügen, alles Weitere steht im Editor.
 */
export default function NeuesAngebotPage() {
  const router = useRouter();
  const { data, ready, createQuote, upsertCustomer } = useStore();
  const [suche, setSuche] = useState("");
  const [neuerKunde, setNeuerKunde] = useState({ name: "", phone: "" });
  const [modus, setModus] = useState<"bestand" | "neu">("bestand");
  const [fehler, setFehler] = useState<string | null>(null);

  const treffer = useMemo(() => {
    const q = suche.trim().toLowerCase();
    const liste = [...data.customers].sort((a, b) => a.name.localeCompare(b.name, "de"));
    if (!q) return liste.slice(0, 8);
    return liste
      .filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q))
      .slice(0, 8);
  }, [data.customers, suche]);

  if (!ready) return <div className="py-20 text-center text-ink-400">Wird geladen…</div>;

  function fuerKunden(customerId: string) {
    const quote = createQuote({ customerId });
    router.push(`/angebote/${quote.id}`);
  }

  function neuAnlegen() {
    if (!neuerKunde.name.trim() || !neuerKunde.phone.trim()) {
      setFehler("Name und Telefonnummer werden gebraucht.");
      return;
    }
    const customer = upsertCustomer({
      name: neuerKunde.name.trim(),
      phone: neuerKunde.phone.trim(),
    });
    fuerKunden(customer.id);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Neues Angebot"
        subtitle="Für wen ist das Angebot? Danach geht es direkt zu den Leistungen."
      />

      <div className="flex gap-2">
        <Button
          variant={modus === "bestand" ? "secondary" : "ghost"}
          onClick={() => setModus("bestand")}
        >
          Bestehender Kunde
        </Button>
        <Button variant={modus === "neu" ? "secondary" : "ghost"} onClick={() => setModus("neu")}>
          Neuer Kunde
        </Button>
      </div>

      {modus === "bestand" ? (
        <Card className="p-4 md:p-5">
          <SectionTitle hint={`${data.customers.length} Kunden`}>Kunde wählen</SectionTitle>
          <input
            autoFocus
            value={suche}
            onChange={(e) => setSuche(e.target.value)}
            placeholder="Name oder Telefonnummer"
            className={inputClass}
          />

          {treffer.length === 0 ? (
            <p className="mt-4 text-sm text-ink-500">
              Kein Kunde gefunden.{" "}
              <button
                onClick={() => {
                  setNeuerKunde((k) => ({ ...k, name: suche }));
                  setModus("neu");
                }}
                className="font-semibold text-brand-600 underline"
              >
                Als neuen Kunden anlegen
              </button>
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-ink-100">
              {treffer.map((customer) => {
                const anzahl = quotesOfCustomer(data, customer.id).length;
                return (
                  <li key={customer.id}>
                    <button
                      onClick={() => fuerKunden(customer.id)}
                      className="flex w-full items-center justify-between gap-3 px-1 py-3 text-left transition hover:bg-ink-50"
                    >
                      <span>
                        <span className="block font-semibold text-ink-900">{customer.name}</span>
                        <span className="text-sm text-ink-500">
                          {customer.phone}
                          {customer.city ? ` · ${customer.city}` : ""}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-ink-400">
                        {anzahl > 0 ? `${anzahl} ${anzahl === 1 ? "Angebot" : "Angebote"}` : "neu"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      ) : (
        <Card className="space-y-4 p-4 md:p-5">
          <SectionTitle>Neuer Kunde</SectionTitle>
          <p className="text-sm text-ink-500">
            Name und Telefonnummer genügen. Adresse und E-Mail kannst du später ergänzen.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Name" required>
              <input
                autoFocus
                value={neuerKunde.name}
                onChange={(e) => setNeuerKunde((k) => ({ ...k, name: e.target.value }))}
                className={inputClass}
                placeholder="Familie Müller"
              />
            </Field>
            <Field label="Telefon" required>
              <input
                value={neuerKunde.phone}
                onChange={(e) => setNeuerKunde((k) => ({ ...k, phone: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") neuAnlegen();
                }}
                className={inputClass}
                placeholder="0203 1234567"
                inputMode="tel"
              />
            </Field>
          </div>
          {fehler ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {fehler}
            </p>
          ) : null}
          <Button onClick={neuAnlegen} size="lg">
            Weiter zu den Leistungen
          </Button>
        </Card>
      )}

      <p className="text-sm text-ink-500">
        Gehört das Angebot zu einer erfassten Anfrage? Dann starte{" "}
        <a href="/anfragen" className="font-semibold text-brand-600 underline">
          dort
        </a>{" "}
        – so bleibt beides verknüpft.
      </p>
    </div>
  );
}
