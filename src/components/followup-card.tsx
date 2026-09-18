"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, Card, QuoteBadge } from "./ui";
import { MessageDialog, type MessageDraft } from "./message-dialog";
import { useStore } from "@/lib/store/store";
import { formatEuroShort, quoteNet } from "@/lib/money";
import { customerName, customerOf, quoteAgeInDays } from "@/lib/selectors";
import { followUpMessage } from "@/lib/peter/drafts";
import { formatDate } from "@/lib/dates";
import type { Quote } from "@/lib/types";

/**
 * Die zentrale Follow-up-Karte: ein offenes Angebot mit genau den vier
 * Entscheidungen, die ein Malermeister dazu treffen kann.
 */
export function FollowUpCard({ quote }: { quote: Quote }) {
  const { data, snoozeFollowUp, markQuoteAccepted, markQuoteRejected, logFollowUp } = useStore();
  const [draft, setDraft] = useState<MessageDraft | null>(null);
  const [confirm, setConfirm] = useState<"angenommen" | "abgelehnt" | null>(null);

  const customer = customerOf(data, quote.customerId);
  const days = quoteAgeInDays(quote);
  const net = quoteNet(quote);

  function prepareMessage() {
    const body = followUpMessage(data, quote, net, days);
    setDraft({
      subject: `Nachfrage zu Angebot Nr. ${quote.number}`,
      body,
      email: customer?.email,
      phone: customer?.phone,
      onSent: (channel) =>
        logFollowUp(quote.id, `Nachfassnachricht über ${channel} vorbereitet.`, "vorbereitet"),
    });
  }

  return (
    <>
      <Card className="p-4 md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Link
              href={`/angebote/${quote.id}`}
              className="text-lg font-bold text-ink-900 hover:text-brand-600"
            >
              Angebot {customerName(data, quote.customerId)}
            </Link>
            <div className="mt-1 text-2xl font-bold tabular-nums text-ink-900">
              {formatEuroShort(net)}
            </div>
            <p className="mt-1 text-sm text-ink-500">
              Nr. {quote.number} · seit {days} {days === 1 ? "Tag" : "Tagen"} offen · Follow-up{" "}
              {formatDate(quote.followUpDate)}
            </p>
          </div>
          <QuoteBadge status={quote.status} />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 md:flex md:flex-wrap">
          <Button onClick={prepareMessage} size="md">
            Nachricht vorbereiten
          </Button>
          <Button variant="ghost" onClick={() => snoozeFollowUp(quote.id, 3)}>
            Später erinnern
          </Button>
          <Button variant="ghost" onClick={() => setConfirm("angenommen")}>
            Angenommen
          </Button>
          <Button variant="ghost" onClick={() => setConfirm("abgelehnt")}>
            Abgelehnt
          </Button>
        </div>

        {confirm ? (
          <div className="mt-3 rounded-lg border border-ink-200 bg-ink-50 p-3">
            <p className="text-sm font-semibold text-ink-800">
              Angebot Nr. {quote.number} wirklich als {confirm} markieren?
            </p>
            <div className="mt-2 flex gap-2">
              <Button
                size="sm"
                onClick={() => {
                  if (confirm === "angenommen") markQuoteAccepted(quote.id);
                  else markQuoteRejected(quote.id);
                  setConfirm(null);
                }}
              >
                Ja, {confirm}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirm(null)}>
                Abbrechen
              </Button>
            </div>
          </div>
        ) : null}

        {quote.followUps.length > 0 ? (
          <p className="mt-3 text-xs text-ink-400">
            Zuletzt: {quote.followUps[quote.followUps.length - 1].text}
          </p>
        ) : null}
      </Card>

      <MessageDialog draft={draft} onClose={() => setDraft(null)} />
    </>
  );
}
