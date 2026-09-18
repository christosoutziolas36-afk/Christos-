"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Button,
  Card,
  EmptyState,
  Field,
  InquiryBadge,
  PageHeader,
  QuoteBadge,
  SectionTitle,
  inputClass,
} from "@/components/ui";
import { useStore } from "@/lib/store/store";
import { customerOf } from "@/lib/selectors";
import { formatDate, toISODate } from "@/lib/dates";
import { formatEuro, formatEuroShort, quoteNet } from "@/lib/money";
import { draftItemsForInquiry, missingInfo } from "@/lib/peter/drafts";
import {
  INQUIRY_SOURCES,
  INQUIRY_SOURCE_LABEL,
  INQUIRY_STATUSES,
  INQUIRY_STATUS_LABEL,
  type InquirySource,
  type InquiryStatus,
} from "@/lib/types";

export default function AnfrageDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data, ready, updateInquiry, upsertCustomer, createQuoteFromInquiry, addTask, deleteInquiry } =
    useStore();
  const [showDraft, setShowDraft] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const inquiry = data.inquiries.find((i) => i.id === params.id);
  const customer = inquiry ? customerOf(data, inquiry.customerId) : undefined;
  const quotes = useMemo(
    () => (inquiry ? data.quotes.filter((q) => q.inquiryId === inquiry.id) : []),
    [data.quotes, inquiry],
  );
  const draft = useMemo(
    () => (inquiry ? draftItemsForInquiry(data, inquiry) : null),
    [data, inquiry],
  );
  const missing = inquiry ? missingInfo(data, inquiry) : [];

  if (!ready) return <div className="py-20 text-center text-ink-400">Wird geladen…</div>;

  if (!inquiry || !customer) {
    return (
      <EmptyState
        title="Anfrage nicht gefunden"
        text="Diese Anfrage gibt es nicht mehr."
        action={<Button href="/anfragen">Zurück zu den Anfragen</Button>}
      />
    );
  }

  function createQuote(withDraft: boolean) {
    if (!inquiry) return;
    const quote = createQuoteFromInquiry(inquiry.id, withDraft ? draft?.items : undefined);
    router.push(`/angebote/${quote.id}`);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={customer.name}
        subtitle={`${inquiry.title} · erfasst am ${formatDate(inquiry.createdAt.slice(0, 10))}`}
        action={<InquiryBadge status={inquiry.status} />}
      />

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <Card className="space-y-4 p-4 md:p-5">
            <SectionTitle>Anfrage</SectionTitle>
            <Field label="Kurzbezeichnung">
              <input
                value={inquiry.title}
                onChange={(e) => updateInquiry(inquiry.id, { title: e.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label="Beschreibung">
              <textarea
                value={inquiry.description}
                onChange={(e) => updateInquiry(inquiry.id, { description: e.target.value })}
                rows={4}
                className={inputClass}
              />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Status">
                <select
                  value={inquiry.status}
                  onChange={(e) =>
                    updateInquiry(inquiry.id, { status: e.target.value as InquiryStatus })
                  }
                  className={inputClass}
                >
                  {INQUIRY_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {INQUIRY_STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Quelle">
                <select
                  value={inquiry.source}
                  onChange={(e) =>
                    updateInquiry(inquiry.id, { source: e.target.value as InquirySource })
                  }
                  className={inputClass}
                >
                  {INQUIRY_SOURCES.map((s) => (
                    <option key={s} value={s}>
                      {INQUIRY_SOURCE_LABEL[s]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Gewünschter Zeitraum">
                <input
                  value={inquiry.desiredPeriod ?? ""}
                  onChange={(e) => updateInquiry(inquiry.id, { desiredPeriod: e.target.value })}
                  className={inputClass}
                  placeholder="Oktober"
                />
              </Field>
              <Field label="Adresse der Baustelle">
                <input
                  value={inquiry.address ?? ""}
                  onChange={(e) => updateInquiry(inquiry.id, { address: e.target.value })}
                  className={inputClass}
                />
              </Field>
            </div>
            <Field label="Notizen">
              <textarea
                value={inquiry.notes ?? ""}
                onChange={(e) => updateInquiry(inquiry.id, { notes: e.target.value })}
                rows={3}
                className={inputClass}
              />
            </Field>
            <p className="text-xs text-ink-400">Änderungen werden sofort gespeichert.</p>
          </Card>

          <Card className="p-4 md:p-5">
            <SectionTitle>Angebot</SectionTitle>
            {quotes.length > 0 ? (
              <div className="space-y-2">
                {quotes.map((q) => (
                  <Link
                    key={q.id}
                    href={`/angebote/${q.id}`}
                    className="flex items-center justify-between rounded-lg border border-ink-200 px-4 py-3 hover:bg-ink-50"
                  >
                    <span className="font-semibold text-ink-900">
                      Nr. {q.number} · {formatEuroShort(quoteNet(q))}
                    </span>
                    <QuoteBadge status={q.status} />
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-ink-500">Zu dieser Anfrage gibt es noch kein Angebot.</p>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={() => setShowDraft((v) => !v)} size="lg">
                Angebot aus Anfrage erstellen
              </Button>
              <Button variant="ghost" onClick={() => createQuote(false)}>
                Leeres Angebot
              </Button>
            </div>

            {showDraft && draft ? (
              <div className="mt-4 rounded-lg border border-ink-200 bg-ink-50 p-4">
                <p className="text-sm font-semibold text-ink-800">
                  Peters Vorschlag aus deinem Leistungskatalog
                </p>
                {draft.items.length === 0 ? (
                  <p className="mt-2 text-sm text-ink-600">
                    Im Leistungskatalog ist keine passende Leistung hinterlegt. Lege sie unter
                    Einstellungen an oder starte mit einem leeren Angebot.
                  </p>
                ) : (
                  <table className="mt-3 w-full text-sm">
                    <tbody className="divide-y divide-ink-200">
                      {draft.items.map((item) => (
                        <tr key={item.id}>
                          <td className="py-2 pr-2 text-ink-800">{item.name}</td>
                          <td className="py-2 pr-2 text-right tabular-nums text-ink-600">
                            {item.quantity > 0 ? (
                              `${item.quantity} ${item.unit}`
                            ) : (
                              <span className="font-semibold text-amber-700">Menge offen</span>
                            )}
                          </td>
                          <td className="py-2 text-right tabular-nums text-ink-600">
                            {formatEuro(item.unitPrice)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {draft.notes.map((n) => (
                  <p key={n} className="mt-2 text-xs text-ink-500">
                    {n}
                  </p>
                ))}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button onClick={() => createQuote(true)} disabled={draft.items.length === 0}>
                    Vorschlag übernehmen
                  </Button>
                  <Button variant="ghost" onClick={() => setShowDraft(false)}>
                    Abbrechen
                  </Button>
                </div>
              </div>
            ) : null}
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="space-y-3 p-4 md:p-5">
            <SectionTitle>Kunde</SectionTitle>
            <div className="text-lg font-bold text-ink-900">{customer.name}</div>
            <a href={`tel:${customer.phone}`} className="block text-sm font-semibold text-brand-600">
              {customer.phone}
            </a>
            <Field label="E-Mail">
              <input
                value={customer.email ?? ""}
                onChange={(e) =>
                  upsertCustomer({ ...customer, email: e.target.value })
                }
                className={inputClass}
                placeholder="noch nicht hinterlegt"
              />
            </Field>
            <p className="text-sm text-ink-600">
              {[customer.street, [customer.zip, customer.city].filter(Boolean).join(" ")]
                .filter(Boolean)
                .join(", ") || "Keine Adresse hinterlegt"}
            </p>
            <Button href={`/kunden/${customer.id}`} variant="ghost" size="sm">
              Kundenakte öffnen
            </Button>
          </Card>

          <Card className="p-4 md:p-5">
            <SectionTitle>Peter prüft</SectionTitle>
            {missing.length === 0 ? (
              <p className="text-sm text-emerald-700">
                Alles da, was du für ein Angebot brauchst.
              </p>
            ) : (
              <>
                <p className="text-sm text-ink-600">Für ein sauberes Angebot fehlt noch:</p>
                <ul className="mt-2 space-y-1 text-sm text-ink-800">
                  {missing.map((m) => (
                    <li key={m} className="flex gap-2">
                      <span className="text-amber-600">•</span>
                      {m}
                    </li>
                  ))}
                </ul>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-3"
                  onClick={() => {
                    addTask({
                      title: `${customer.name} zurückrufen – ${missing[0]} erfragen`,
                      dueDate: toISODate(new Date()),
                      kind: "rueckruf",
                      linkType: "inquiry",
                      linkId: inquiry.id,
                    });
                    updateInquiry(inquiry.id, { status: "rueckfrage" });
                  }}
                >
                  Rückruf einplanen
                </Button>
              </>
            )}
          </Card>

          <Card className="p-4 md:p-5">
            <SectionTitle>Anfrage entfernen</SectionTitle>
            {confirmDelete ? (
              <div className="space-y-2">
                <p className="text-sm text-ink-600">Wirklich löschen? Das lässt sich nicht rückgängig machen.</p>
                <div className="flex gap-2">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      deleteInquiry(inquiry.id);
                      router.push("/anfragen");
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
                Anfrage löschen
              </Button>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
