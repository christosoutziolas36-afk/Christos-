"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Button, Card, EmptyState, PageHeader, inputClass } from "@/components/ui";
import { useStore } from "@/lib/store/store";
import { inquiriesOfCustomer, quotesOfCustomer } from "@/lib/selectors";

export default function KundenPage() {
  const { data, ready } = useStore();
  const [query, setQuery] = useState("");

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.customers
      .filter(
        (c) =>
          !q ||
          c.name.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          (c.city ?? "").toLowerCase().includes(q),
      )
      .sort((a, b) => a.name.localeCompare(b.name, "de"));
  }, [data.customers, query]);

  if (!ready) return <div className="py-20 text-center text-ink-400">Wird geladen…</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kunden"
        subtitle="Alle Kunden mit ihren Anfragen und Angeboten."
        action={
          <Button href="/anfragen/neu" size="lg">
            + Neue Anfrage
          </Button>
        }
      />

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Name, Telefonnummer oder Ort"
        className={inputClass}
      />

      {list.length === 0 ? (
        <EmptyState
          title="Noch keine Kunden"
          text="Kunden entstehen automatisch, sobald du eine Anfrage erfasst."
          action={<Button href="/anfragen/neu">+ Neue Anfrage</Button>}
        />
      ) : (
        <Card className="divide-y divide-ink-100">
          {list.map((customer) => {
            const inquiries = inquiriesOfCustomer(data, customer.id);
            const quotes = quotesOfCustomer(data, customer.id);
            return (
              <Link
                key={customer.id}
                href={`/kunden/${customer.id}`}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 transition hover:bg-ink-50"
              >
                <div>
                  <div className="font-bold text-ink-900">{customer.name}</div>
                  <div className="mt-0.5 text-sm text-ink-500">
                    {customer.phone}
                    {customer.city ? ` · ${customer.city}` : ""}
                  </div>
                </div>
                <div className="text-sm text-ink-500">
                  {inquiries.length} {inquiries.length === 1 ? "Anfrage" : "Anfragen"} ·{" "}
                  {quotes.length} {quotes.length === 1 ? "Angebot" : "Angebote"}
                </div>
              </Link>
            );
          })}
        </Card>
      )}
    </div>
  );
}
