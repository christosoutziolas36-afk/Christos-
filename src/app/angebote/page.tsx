"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Button, Card, EmptyState, PageHeader, QuoteBadge, inputClass } from "@/components/ui";
import { useStore } from "@/lib/store/store";
import { customerName, quoteAgeInDays } from "@/lib/selectors";
import { formatEuro, formatEuroShort, quoteNet } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import { QUOTE_STATUSES, QUOTE_STATUS_LABEL } from "@/lib/types";

export default function AngebotePage() {
  const { data, ready } = useStore();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("aktiv");

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.quotes
      .filter((quote) => {
        if (status === "aktiv") return !["angenommen", "abgelehnt"].includes(quote.status);
        if (status !== "alle" && quote.status !== status) return false;
        return true;
      })
      .filter((quote) => {
        if (!q) return true;
        return (
          customerName(data, quote.customerId).toLowerCase().includes(q) ||
          String(quote.number).includes(q)
        );
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [data, query, status]);

  const openSum = data.quotes
    .filter((q) => q.status === "gesendet")
    .reduce((sum, q) => sum + quoteNet(q), 0);

  if (!ready) return <div className="py-20 text-center text-ink-400">Wird geladen…</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Angebote"
        subtitle={
          openSum > 0
            ? `${formatEuro(openSum)} netto sind aktuell offen.`
            : "Alle Angebote im Überblick."
        }
        action={
          <div className="flex gap-2">
            <Button href="/anfragen" variant="ghost" size="lg">
              Aus Anfrage
            </Button>
            <Button href="/angebote/neu" size="lg">
              + Neues Angebot
            </Button>
          </div>
        }
      />

      <div className="flex flex-col gap-3 md:flex-row">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nach Kunde oder Nummer suchen"
          className={inputClass}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${inputClass} md:w-64`}>
          <option value="aktiv">Aktive Angebote</option>
          <option value="alle">Alle</option>
          {QUOTE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {QUOTE_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>

      {list.length === 0 ? (
        <EmptyState
          title={data.quotes.length === 0 ? "Noch keine Angebote" : "Keine Treffer"}
          text="Lege ein Angebot direkt an oder starte aus einer erfassten Anfrage – dann bleibt beides verknüpft."
          action={<Button href="/angebote/neu">+ Neues Angebot</Button>}
        />
      ) : (
        <Card className="divide-y divide-ink-100">
          {list.map((quote) => (
            <Link
              key={quote.id}
              href={`/angebote/${quote.id}`}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 transition hover:bg-ink-50"
            >
              <div className="min-w-0">
                <div className="font-bold text-ink-900">
                  Nr. {quote.number} · {customerName(data, quote.customerId)}
                </div>
                <div className="mt-0.5 text-sm text-ink-500">
                  {quote.items.length} Positionen · gültig bis {formatDate(quote.validUntil)}
                  {quote.status === "gesendet" && quote.followUpDate
                    ? ` · Follow-up ${formatDate(quote.followUpDate)}`
                    : ""}
                  {quote.status === "gesendet"
                    ? ` · seit ${quoteAgeInDays(quote)} Tagen offen`
                    : ""}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold tabular-nums text-ink-900">
                  {formatEuroShort(quoteNet(quote))}
                </span>
                <QuoteBadge status={quote.status} />
              </div>
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}
