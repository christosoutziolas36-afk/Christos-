"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Button,
  Card,
  EmptyState,
  InquiryBadge,
  PageHeader,
  inputClass,
} from "@/components/ui";
import { useStore } from "@/lib/store/store";
import { customerName } from "@/lib/selectors";
import { formatDate } from "@/lib/dates";
import { INQUIRY_SOURCE_LABEL, INQUIRY_STATUSES, INQUIRY_STATUS_LABEL } from "@/lib/types";

export default function AnfragenPage() {
  const { data, ready } = useStore();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>("offen");

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.inquiries
      .filter((i) => {
        if (status === "offen") return i.status !== "abgeschlossen";
        if (status !== "alle" && i.status !== status) return false;
        return true;
      })
      .filter((i) => {
        if (!q) return true;
        const name = customerName(data, i.customerId).toLowerCase();
        return (
          name.includes(q) ||
          i.title.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [data, query, status]);

  if (!ready) return <div className="py-20 text-center text-ink-400">Wird geladen…</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Anfragen"
        subtitle="Jede Kundenanfrage an einem Ort – vom Anruf bis zum Angebot."
        action={
          <Button href="/anfragen/neu" size="lg">
            + Neue Anfrage
          </Button>
        }
      />

      <div className="flex flex-col gap-3 md:flex-row">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nach Kunde oder Stichwort suchen"
          className={inputClass}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${inputClass} md:w-64`}>
          <option value="offen">Offene Anfragen</option>
          <option value="alle">Alle</option>
          {INQUIRY_STATUSES.map((s) => (
            <option key={s} value={s}>
              {INQUIRY_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>

      {list.length === 0 ? (
        <EmptyState
          title={data.inquiries.length === 0 ? "Noch keine Anfragen" : "Keine Treffer"}
          text={
            data.inquiries.length === 0
              ? "Erfasse die nächste Anfrage direkt beim Telefonat – Name, Nummer, was gemacht werden soll."
              : "Passe Suche oder Filter an."
          }
          action={<Button href="/anfragen/neu">+ Neue Anfrage</Button>}
        />
      ) : (
        <Card className="divide-y divide-ink-100">
          {list.map((inquiry) => (
            <Link
              key={inquiry.id}
              href={`/anfragen/${inquiry.id}`}
              className="flex flex-wrap items-start justify-between gap-3 px-4 py-4 transition hover:bg-ink-50"
            >
              <div className="min-w-0">
                <div className="font-bold text-ink-900">{customerName(data, inquiry.customerId)}</div>
                <div className="mt-0.5 truncate text-sm text-ink-600">{inquiry.title}</div>
                <div className="mt-1 text-xs text-ink-400">
                  {INQUIRY_SOURCE_LABEL[inquiry.source]} · {formatDate(inquiry.createdAt.slice(0, 10))}
                  {inquiry.desiredPeriod ? ` · Wunsch: ${inquiry.desiredPeriod}` : ""}
                </div>
              </div>
              <InquiryBadge status={inquiry.status} />
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}
