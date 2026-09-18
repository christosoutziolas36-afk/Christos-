"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
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
import { inquiriesOfCustomer, quotesOfCustomer } from "@/lib/selectors";
import { formatEuroShort, quoteNet } from "@/lib/money";
import { formatDate } from "@/lib/dates";

export default function KundeDetailPage() {
  const params = useParams<{ id: string }>();
  const { data, ready, upsertCustomer } = useStore();
  const customer = data.customers.find((c) => c.id === params.id);

  if (!ready) return <div className="py-20 text-center text-ink-400">Wird geladen…</div>;
  if (!customer) {
    return (
      <EmptyState
        title="Kunde nicht gefunden"
        text="Diesen Kunden gibt es nicht mehr."
        action={<Button href="/kunden">Zurück zu den Kunden</Button>}
      />
    );
  }

  const inquiries = inquiriesOfCustomer(data, customer.id);
  const quotes = quotesOfCustomer(data, customer.id);
  const won = quotes.filter((q) => q.status === "angenommen");

  return (
    <div className="space-y-6">
      <PageHeader
        title={customer.name}
        subtitle={`Kunde seit ${formatDate(customer.createdAt.slice(0, 10))}${
          won.length > 0
            ? ` · ${won.length} ${won.length === 1 ? "Auftrag" : "Aufträge"} gewonnen`
            : ""
        }`}
        action={
          <Button href="/anfragen/neu" variant="ghost">
            + Neue Anfrage
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <Card className="space-y-4 p-4 md:p-5">
          <SectionTitle>Kontakt</SectionTitle>
          <Field label="Name">
            <input
              value={customer.name}
              onChange={(e) => upsertCustomer({ ...customer, name: e.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label="Telefon">
            <input
              value={customer.phone}
              onChange={(e) => upsertCustomer({ ...customer, phone: e.target.value })}
              className={inputClass}
              inputMode="tel"
            />
          </Field>
          <Field label="E-Mail">
            <input
              value={customer.email ?? ""}
              onChange={(e) => upsertCustomer({ ...customer, email: e.target.value })}
              className={inputClass}
              inputMode="email"
            />
          </Field>
          <Field label="Straße und Nr.">
            <input
              value={customer.street ?? ""}
              onChange={(e) => upsertCustomer({ ...customer, street: e.target.value })}
              className={inputClass}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="PLZ">
              <input
                value={customer.zip ?? ""}
                onChange={(e) => upsertCustomer({ ...customer, zip: e.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label="Ort">
              <input
                value={customer.city ?? ""}
                onChange={(e) => upsertCustomer({ ...customer, city: e.target.value })}
                className={inputClass}
              />
            </Field>
          </div>
          <Field label="Notizen">
            <textarea
              value={customer.notes ?? ""}
              onChange={(e) => upsertCustomer({ ...customer, notes: e.target.value })}
              rows={3}
              className={inputClass}
            />
          </Field>
          <a
            href={`tel:${customer.phone}`}
            className="inline-flex w-full items-center justify-center rounded-lg bg-brand-600 px-4 py-3 font-semibold text-white"
          >
            Anrufen
          </a>
        </Card>

        <div className="space-y-6">
          <Card className="p-4 md:p-5">
            <SectionTitle>Anfragen</SectionTitle>
            {inquiries.length === 0 ? (
              <p className="text-sm text-ink-500">Keine Anfragen erfasst.</p>
            ) : (
              <div className="divide-y divide-ink-100">
                {inquiries.map((i) => (
                  <Link
                    key={i.id}
                    href={`/anfragen/${i.id}`}
                    className="flex items-center justify-between gap-3 py-3 hover:text-brand-600"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-ink-900">{i.title}</span>
                      <span className="text-xs text-ink-400">
                        {formatDate(i.createdAt.slice(0, 10))}
                      </span>
                    </span>
                    <InquiryBadge status={i.status} />
                  </Link>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-4 md:p-5">
            <SectionTitle>Angebote</SectionTitle>
            {quotes.length === 0 ? (
              <p className="text-sm text-ink-500">Keine Angebote erstellt.</p>
            ) : (
              <div className="divide-y divide-ink-100">
                {quotes.map((q) => (
                  <Link
                    key={q.id}
                    href={`/angebote/${q.id}`}
                    className="flex items-center justify-between gap-3 py-3 hover:text-brand-600"
                  >
                    <span>
                      <span className="block font-semibold text-ink-900">
                        Nr. {q.number} · {formatEuroShort(quoteNet(q))}
                      </span>
                      <span className="text-xs text-ink-400">
                        gültig bis {formatDate(q.validUntil)}
                      </span>
                    </span>
                    <QuoteBadge status={q.status} />
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
