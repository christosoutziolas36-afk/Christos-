"use client";

import { useParams } from "next/navigation";
import { Button, EmptyState } from "@/components/ui";
import { useStore } from "@/lib/store/store";
import { customerOf } from "@/lib/selectors";
import { formatEuro, itemTotal, quoteGross, quoteNet, quoteTax } from "@/lib/money";
import { formatDate } from "@/lib/dates";

/** Druckfertige Ansicht – Grundlage für PDF-Versand per "Als PDF speichern". */
export default function AngebotDruckPage() {
  const params = useParams<{ id: string }>();
  const { data, ready } = useStore();
  const quote = data.quotes.find((q) => q.id === params.id);
  const customer = quote ? customerOf(data, quote.customerId) : undefined;
  const company = data.company;

  if (!ready) return <div className="py-20 text-center text-ink-400">Wird geladen…</div>;
  if (!quote || !customer) {
    return (
      <EmptyState
        title="Angebot nicht gefunden"
        text="Dieses Angebot gibt es nicht mehr."
        action={<Button href="/angebote">Zurück</Button>}
      />
    );
  }

  const net = quoteNet(quote);
  const tax = quoteTax(quote, company.taxRate);
  const gross = quoteGross(quote, company.taxRate);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 print:hidden">
        <Button href={`/angebote/${quote.id}`} variant="ghost">
          ← Zurück
        </Button>
        <Button onClick={() => window.print()}>Drucken / als PDF speichern</Button>
      </div>

      <article className="rounded-xl border border-ink-200 bg-white p-6 text-sm text-ink-900 md:p-10 print:border-0 print:p-0">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b border-ink-200 pb-6">
          <div>
            <div className="text-lg font-bold">{company.name}</div>
            <div className="mt-1 text-ink-600">
              {company.street}
              <br />
              {company.zip} {company.city}
              <br />
              {company.phone}
              <br />
              {company.email}
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">Angebot Nr. {quote.number}</div>
            <div className="mt-1 text-ink-600">
              Datum: {formatDate(quote.createdAt.slice(0, 10))}
              <br />
              Gültig bis: {formatDate(quote.validUntil)}
            </div>
          </div>
        </header>

        <div className="mt-6">
          <div className="text-xs uppercase tracking-wide text-ink-400">Angebot für</div>
          <div className="mt-1 font-semibold">{customer.name}</div>
          <div className="text-ink-600">
            {quote.address ||
              [customer.street, [customer.zip, customer.city].filter(Boolean).join(" ")]
                .filter(Boolean)
                .join(", ")}
          </div>
        </div>

        <table className="mt-8 w-full">
          <thead>
            <tr className="border-b-2 border-ink-900 text-left text-xs uppercase tracking-wide">
              <th className="pb-2">Leistung</th>
              <th className="pb-2 text-right">Menge</th>
              <th className="pb-2 text-right">Einzelpreis</th>
              <th className="pb-2 text-right">Gesamt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-200">
            {quote.items.map((item) => (
              <tr key={item.id}>
                <td className="py-3 pr-4">{item.name}</td>
                <td className="py-3 text-right tabular-nums">
                  {item.quantity} {item.unit}
                </td>
                <td className="py-3 text-right tabular-nums">{formatEuro(item.unitPrice)}</td>
                <td className="py-3 text-right font-semibold tabular-nums">
                  {formatEuro(itemTotal(item))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-6 ml-auto w-full max-w-xs space-y-1">
          <div className="flex justify-between">
            <span>Summe netto</span>
            <span className="tabular-nums">{formatEuro(net)}</span>
          </div>
          <div className="flex justify-between">
            <span>zzgl. {company.taxRate} % MwSt.</span>
            <span className="tabular-nums">{formatEuro(tax)}</span>
          </div>
          <div className="flex justify-between border-t-2 border-ink-900 pt-2 text-lg font-bold">
            <span>Gesamtbetrag</span>
            <span className="tabular-nums">{formatEuro(gross)}</span>
          </div>
        </div>

        {quote.notes ? (
          <p className="mt-8 whitespace-pre-line text-ink-700">{quote.notes}</p>
        ) : null}

        <p className="mt-8 whitespace-pre-line text-ink-700">{company.signature}</p>

        {company.demoPrices ? (
          <p className="mt-8 border-t border-ink-200 pt-4 text-xs text-ink-400">
            Hinweis: Dieses Dokument enthält Beispielpreise aus dem Demo-Leistungskatalog.
          </p>
        ) : null}
      </article>
    </div>
  );
}
