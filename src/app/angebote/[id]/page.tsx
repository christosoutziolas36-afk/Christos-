"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Button,
  Card,
  EmptyState,
  Field,
  PageHeader,
  QuoteBadge,
  SectionTitle,
  inputClass,
} from "@/components/ui";
import { MessageDialog, type MessageDraft } from "@/components/message-dialog";
import { useStore } from "@/lib/store/store";
import { customerOf, quoteAgeInDays } from "@/lib/selectors";
import { formatEuro, itemTotal, quoteGross, quoteNet, quoteTax } from "@/lib/money";
import { formatDate, formatDateTime } from "@/lib/dates";
import { followUpMessage, salutation } from "@/lib/peter/drafts";
import { UNITS, type Unit } from "@/lib/types";

export default function AngebotDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const {
    data,
    ready,
    updateQuote,
    addQuoteItem,
    updateQuoteItem,
    removeQuoteItem,
    markQuoteSent,
    markQuoteAccepted,
    markQuoteRejected,
    snoozeFollowUp,
    logFollowUp,
    deleteQuote,
  } = useStore();

  const [draft, setDraft] = useState<MessageDraft | null>(null);
  const [confirmSend, setConfirmSend] = useState(false);
  const [confirmDecision, setConfirmDecision] = useState<"angenommen" | "abgelehnt" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const quote = data.quotes.find((q) => q.id === params.id);
  const customer = quote ? customerOf(data, quote.customerId) : undefined;

  if (!ready) return <div className="py-20 text-center text-ink-400">Wird geladen…</div>;

  if (!quote || !customer) {
    return (
      <EmptyState
        title="Angebot nicht gefunden"
        text="Dieses Angebot gibt es nicht mehr."
        action={<Button href="/angebote">Zurück zu den Angeboten</Button>}
      />
    );
  }

  const net = quoteNet(quote);
  const tax = quoteTax(quote, data.company.taxRate);
  const gross = quoteGross(quote, data.company.taxRate);
  const editable = quote.status === "entwurf" || quote.status === "bereit";
  const activeServices = data.services.filter((s) => s.active);

  function addFromCatalog(serviceId: string) {
    const service = data.services.find((s) => s.id === serviceId);
    if (!service || !quote) return;
    addQuoteItem(quote.id, {
      serviceId: service.id,
      name: service.name,
      quantity: service.unit === "pauschal" ? 1 : 0,
      unit: service.unit,
      unitPrice: service.defaultPrice,
    });
  }

  function sendQuoteMail() {
    if (!quote || !customer) return;
    const lines = quote.items.map(
      (i) => `- ${i.name}: ${i.quantity} ${i.unit} × ${formatEuro(i.unitPrice)} = ${formatEuro(itemTotal(i))}`,
    );
    const body = [
      salutation(customer.name),
      "",
      `vielen Dank für Ihre Anfrage. Anbei unser Angebot Nr. ${quote.number}${
        quote.address ? ` für die Arbeiten in ${quote.address}` : ""
      }:`,
      "",
      ...lines,
      "",
      `Summe netto: ${formatEuro(net)}`,
      `zzgl. ${data.company.taxRate} % MwSt.: ${formatEuro(tax)}`,
      `Gesamtbetrag: ${formatEuro(gross)}`,
      "",
      `Das Angebot ist gültig bis ${formatDate(quote.validUntil)}.`,
      ...(quote.notes ? ["", quote.notes] : []),
      "",
      data.company.signature,
    ].join("\n");

    setDraft({
      title: "Angebot versenden",
      subject: `Angebot Nr. ${quote.number} – ${data.company.name}`,
      body,
      email: customer.email,
      phone: customer.phone,
      onSent: () => setConfirmSend(true),
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Angebot Nr. ${quote.number}`}
        subtitle={`${customer.name}${quote.address ? ` · ${quote.address}` : ""}`}
        action={<QuoteBadge status={quote.status} />}
      />

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <Card className="p-4 md:p-5">
            <SectionTitle hint={data.company.demoPrices ? "Katalogpreise (Demo)" : "aus deinem Katalog"}>
              Leistungen
            </SectionTitle>

            {quote.items.length === 0 ? (
              <p className="py-4 text-sm text-ink-500">
                Noch keine Positionen. Füge unten Leistungen aus deinem Katalog hinzu.
              </p>
            ) : (
              <div className="-mx-4 overflow-x-auto px-4">
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr className="border-b border-ink-200 text-left text-xs uppercase tracking-wide text-ink-400">
                      <th className="pb-2">Leistung</th>
                      <th className="pb-2 w-24 text-right">Menge</th>
                      <th className="pb-2 w-28">Einheit</th>
                      <th className="pb-2 w-28 text-right">Einzelpreis</th>
                      <th className="pb-2 w-28 text-right">Gesamt</th>
                      <th className="pb-2 w-8" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {quote.items.map((item) => (
                      <tr key={item.id}>
                        <td className="py-2 pr-2">
                          <input
                            value={item.name}
                            disabled={!editable}
                            onChange={(e) => updateQuoteItem(quote.id, item.id, { name: e.target.value })}
                            className="w-full rounded-md border border-transparent px-2 py-1.5 text-ink-900 hover:border-ink-200 focus:border-brand-500 focus:outline-none disabled:bg-transparent"
                          />
                        </td>
                        <td className="py-2 pr-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.quantity}
                            disabled={!editable}
                            onChange={(e) =>
                              updateQuoteItem(quote.id, item.id, { quantity: Number(e.target.value) })
                            }
                            className={`w-full rounded-md border px-2 py-1.5 text-right tabular-nums focus:border-brand-500 focus:outline-none ${
                              item.quantity === 0
                                ? "border-amber-300 bg-amber-50"
                                : "border-transparent hover:border-ink-200"
                            }`}
                          />
                        </td>
                        <td className="py-2 pr-2">
                          <select
                            value={item.unit}
                            disabled={!editable}
                            onChange={(e) =>
                              updateQuoteItem(quote.id, item.id, { unit: e.target.value as Unit })
                            }
                            className="w-full rounded-md border border-transparent px-2 py-1.5 hover:border-ink-200 focus:border-brand-500 focus:outline-none"
                          >
                            {UNITS.map((u) => (
                              <option key={u} value={u}>
                                {u}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 pr-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.unitPrice}
                            disabled={!editable}
                            onChange={(e) =>
                              updateQuoteItem(quote.id, item.id, { unitPrice: Number(e.target.value) })
                            }
                            className="w-full rounded-md border border-transparent px-2 py-1.5 text-right tabular-nums hover:border-ink-200 focus:border-brand-500 focus:outline-none"
                          />
                        </td>
                        <td className="py-2 pr-2 text-right font-semibold tabular-nums text-ink-900">
                          {formatEuro(itemTotal(item))}
                        </td>
                        <td className="py-2 text-right">
                          {editable ? (
                            <button
                              onClick={() => removeQuoteItem(quote.id, item.id)}
                              className="rounded-md px-2 py-1 text-ink-300 hover:bg-red-50 hover:text-red-600"
                              aria-label="Position entfernen"
                            >
                              ×
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {quote.items.some((i) => i.quantity === 0) ? (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Bei markierten Positionen fehlt noch die Menge.
              </p>
            ) : null}

            {editable ? (
              <div className="mt-4 flex flex-col gap-2 border-t border-ink-100 pt-4 md:flex-row">
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) addFromCatalog(e.target.value);
                    e.target.value = "";
                  }}
                  className={inputClass}
                >
                  <option value="">+ Leistung aus Katalog hinzufügen…</option>
                  {activeServices.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} · {formatEuro(s.defaultPrice)} / {s.unit}
                    </option>
                  ))}
                </select>
                <Button
                  variant="ghost"
                  onClick={() =>
                    addQuoteItem(quote.id, { name: "", quantity: 1, unit: "pauschal", unitPrice: 0 })
                  }
                  className="md:w-64"
                >
                  Freie Position
                </Button>
              </div>
            ) : null}

            <div className="mt-5 space-y-1 border-t border-ink-200 pt-4 text-sm">
              <div className="flex justify-between text-ink-600">
                <span>Summe netto</span>
                <span className="tabular-nums">{formatEuro(net)}</span>
              </div>
              <div className="flex justify-between text-ink-600">
                <span>zzgl. {data.company.taxRate} % MwSt.</span>
                <span className="tabular-nums">{formatEuro(tax)}</span>
              </div>
              <div className="flex justify-between border-t border-ink-200 pt-2 text-lg font-bold text-ink-900">
                <span>Gesamtbetrag</span>
                <span className="tabular-nums">{formatEuro(gross)}</span>
              </div>
            </div>
          </Card>

          <Card className="space-y-4 p-4 md:p-5">
            <SectionTitle>Angaben</SectionTitle>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Baustellenadresse">
                <input
                  value={quote.address ?? ""}
                  onChange={(e) => updateQuote(quote.id, { address: e.target.value })}
                  className={inputClass}
                />
              </Field>
              <Field label="Gültig bis">
                <input
                  type="date"
                  value={quote.validUntil}
                  onChange={(e) => updateQuote(quote.id, { validUntil: e.target.value })}
                  className={inputClass}
                />
              </Field>
            </div>
            <Field label="Notizen für den Kunden">
              <textarea
                value={quote.notes ?? ""}
                onChange={(e) => updateQuote(quote.id, { notes: e.target.value })}
                rows={3}
                className={inputClass}
                placeholder="Ausführung nach Absprache, Farbton wird vorab festgelegt …"
              />
            </Field>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-4 md:p-5">
            <SectionTitle>Nächster Schritt</SectionTitle>

            {quote.status === "entwurf" || quote.status === "bereit" ? (
              <div className="space-y-2">
                <Button href={`/angebote/${quote.id}/druck`} variant="ghost" className="w-full">
                  Angebot ansehen / drucken
                </Button>
                <Button onClick={sendQuoteMail} variant="secondary" className="w-full">
                  Angebot per E-Mail senden
                </Button>
                {quote.status === "entwurf" ? (
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={() => updateQuote(quote.id, { status: "bereit" })}
                  >
                    Als bereit markieren
                  </Button>
                ) : null}
                <Button
                  className="w-full"
                  size="lg"
                  disabled={quote.items.length === 0}
                  onClick={() => setConfirmSend(true)}
                >
                  Als gesendet markieren
                </Button>
                <p className="text-xs text-ink-400">
                  Danach erinnert dich Angebotsmeister automatisch nach{" "}
                  {data.company.followUpWorkdays} Werktagen.
                </p>
              </div>
            ) : null}

            {confirmSend && quote.status !== "gesendet" ? (
              <div className="mt-3 rounded-lg border border-ink-200 bg-ink-50 p-3">
                <p className="text-sm font-semibold text-ink-800">
                  Angebot als gesendet markieren? Das Follow-up wird automatisch gesetzt.
                </p>
                <div className="mt-2 flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      markQuoteSent(quote.id);
                      setConfirmSend(false);
                    }}
                  >
                    Ja, gesendet
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmSend(false)}>
                    Abbrechen
                  </Button>
                </div>
              </div>
            ) : null}

            {quote.status === "gesendet" ? (
              <div className="space-y-3">
                <div className="rounded-lg bg-ink-50 px-3 py-2 text-sm text-ink-700">
                  Gesendet am {formatDateTime(quote.sentAt)} · seit {quoteAgeInDays(quote)}{" "}
                  {quoteAgeInDays(quote) === 1 ? "Tag" : "Tagen"} offen
                  <div className="mt-1 font-semibold text-ink-900">
                    Follow-up: {formatDate(quote.followUpDate)}
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={() =>
                    setDraft({
                      subject: `Nachfrage zu Angebot Nr. ${quote.number}`,
                      body: followUpMessage(data, quote, net, quoteAgeInDays(quote)),
                      email: customer.email,
                      phone: customer.phone,
                      onSent: (channel) =>
                        logFollowUp(quote.id, `Nachfassnachricht über ${channel} vorbereitet.`),
                    })
                  }
                >
                  Nachricht vorbereiten
                </Button>
                <Button variant="ghost" className="w-full" onClick={() => snoozeFollowUp(quote.id, 3)}>
                  Später erinnern (3 Werktage)
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="ghost" onClick={() => setConfirmDecision("angenommen")}>
                    Angenommen
                  </Button>
                  <Button variant="ghost" onClick={() => setConfirmDecision("abgelehnt")}>
                    Abgelehnt
                  </Button>
                </div>
                {confirmDecision ? (
                  <div className="rounded-lg border border-ink-200 bg-ink-50 p-3">
                    <p className="text-sm font-semibold text-ink-800">
                      Wirklich als {confirmDecision} markieren?
                    </p>
                    <div className="mt-2 flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          if (confirmDecision === "angenommen") markQuoteAccepted(quote.id);
                          else markQuoteRejected(quote.id);
                          setConfirmDecision(null);
                        }}
                      >
                        Ja
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setConfirmDecision(null)}>
                        Abbrechen
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {quote.status === "angenommen" || quote.status === "abgelehnt" ? (
              <div className="space-y-3">
                <p className="text-sm text-ink-600">
                  Entschieden am {formatDateTime(quote.decidedAt)}.
                </p>
                <Button href={`/angebote/${quote.id}/druck`} variant="ghost" className="w-full">
                  Angebot ansehen
                </Button>
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => updateQuote(quote.id, { status: "gesendet", decidedAt: undefined })}
                >
                  Entscheidung zurücknehmen
                </Button>
              </div>
            ) : null}
          </Card>

          <Card className="space-y-2 p-4 md:p-5">
            <SectionTitle>Kunde</SectionTitle>
            <Link href={`/kunden/${customer.id}`} className="block font-bold text-ink-900 hover:text-brand-600">
              {customer.name}
            </Link>
            <a href={`tel:${customer.phone}`} className="block text-sm font-semibold text-brand-600">
              {customer.phone}
            </a>
            {customer.email ? <p className="text-sm text-ink-600">{customer.email}</p> : null}
            {quote.inquiryId ? (
              <Button href={`/anfragen/${quote.inquiryId}`} variant="ghost" size="sm" className="mt-2">
                Zur Anfrage
              </Button>
            ) : null}
          </Card>

          {quote.followUps.length > 0 ? (
            <Card className="p-4 md:p-5">
              <SectionTitle>Verlauf</SectionTitle>
              <ul className="space-y-2 text-sm text-ink-600">
                {[...quote.followUps].reverse().map((entry) => (
                  <li key={entry.id}>
                    <span className="text-ink-400">{formatDateTime(entry.date)} · </span>
                    {entry.text}
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          <Card className="p-4 md:p-5">
            <SectionTitle>Angebot entfernen</SectionTitle>
            {confirmDelete ? (
              <div className="space-y-2">
                <p className="text-sm text-ink-600">Wirklich löschen?</p>
                <div className="flex gap-2">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      deleteQuote(quote.id);
                      router.push("/angebote");
                    }}
                  >
                    Endgültig löschen
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                    Abbrechen
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>
                Angebot löschen
              </Button>
            )}
          </Card>
        </div>
      </div>

      <MessageDialog draft={draft} onClose={() => setDraft(null)} />
    </div>
  );
}
