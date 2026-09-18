"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  Button,
  Card,
  EmptyState,
  Fade,
  InquiryBadge,
  PageHeader,
  QuoteBadge,
  SectionTitle,
  StatTile,
} from "@/components/ui";
import { FollowUpCard } from "@/components/followup-card";
import { CallCard } from "@/components/call-card";
import { useVoiceCalls } from "@/lib/voice/use-calls";
import { useStore } from "@/lib/store/store";
import {
  callbacks,
  customerName,
  draftQuotes,
  dueFollowUps,
  newInquiries,
  openTasks,
  readyForQuote,
  todayCounts,
} from "@/lib/selectors";
import { buildInsights } from "@/lib/peter/insights";
import { formatEuroShort, quoteNet } from "@/lib/money";

export default function HeutePage() {
  const { data, ready, toggleTask } = useStore();
  const { offene: offeneAnrufe, statusSetzen } = useVoiceCalls();

  const view = useMemo(() => {
    const now = new Date();
    return {
      counts: todayCounts(data, now),
      followUps: dueFollowUps(data, now),
      fresh: newInquiries(data),
      ready: readyForQuote(data),
      drafts: draftQuotes(data),
      tasks: openTasks(data, now),
      calls: callbacks(data, now),
      insights: buildInsights(data, now),
    };
  }, [data]);

  if (!ready) {
    return <div className="py-20 text-center text-ink-400">Wird geladen…</div>;
  }

  const nothingToDo =
    offeneAnrufe.length === 0 &&
    view.followUps.length === 0 &&
    view.fresh.length === 0 &&
    view.ready.length === 0 &&
    view.drafts.length === 0 &&
    view.tasks.length === 0;

  const greeting = new Date().getHours() < 11 ? "Guten Morgen" : "Heute";

  return (
    <div className="space-y-8">
      <PageHeader
        title={`${greeting}, ${data.company.owner.split(" ")[0]}`}
        subtitle={new Date().toLocaleDateString("de-DE", {
          weekday: "long",
          day: "2-digit",
          month: "long",
          year: "numeric",
        })}
        action={
          <Button href="/anfragen/neu" size="lg">
            + Neue Anfrage
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Anrufe aufgenommen" value={offeneAnrufe.length} href="/anrufe" tone="warn" />
        <StatTile label="Neue Anfragen" value={view.counts.newInquiries} href="/anfragen" tone="warn" />
        <StatTile label="Angebote in Arbeit" value={view.counts.drafts} href="/angebote" tone="warn" />
        <StatTile label="Follow-ups fällig" value={view.counts.followUps} href="/angebote" tone="warn" />
      </div>

      {view.insights.length > 0 ? (
        <Fade>
          <section>
            <SectionTitle hint="aus deinen Daten">Peter sagt</SectionTitle>
            <Card className="divide-y divide-ink-100">
              {view.insights.map((insight) => (
                <Link
                  key={insight.id}
                  href={insight.href}
                  className="flex items-start gap-3 px-4 py-3 transition hover:bg-ink-50"
                >
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                      insight.tone === "achtung"
                        ? "bg-brand-600"
                        : insight.tone === "chance"
                          ? "bg-emerald-500"
                          : "bg-ink-300"
                    }`}
                  />
                  <span className="text-sm text-ink-800">{insight.text}</span>
                </Link>
              ))}
              <Link
                href="/peter"
                className="block px-4 py-3 text-sm font-semibold text-brand-600 hover:bg-ink-50"
              >
                Peter etwas fragen →
              </Link>
            </Card>
          </section>
        </Fade>
      ) : null}

      <section>
        <SectionTitle
          hint={`${offeneAnrufe.length + view.followUps.length + view.fresh.length + view.drafts.length + view.tasks.length} Punkte`}
        >
          Heute zu erledigen
        </SectionTitle>

        {nothingToDo ? (
          <EmptyState
            title="Alles erledigt"
            text="Keine offenen Follow-ups, keine unbearbeiteten Anfragen. Neue Anfrage erfassen?"
            action={<Button href="/anfragen/neu">+ Neue Anfrage</Button>}
          />
        ) : null}

        <div className="space-y-6">
          {offeneAnrufe.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-ink-700">
                Anrufe, die der Assistent angenommen hat
              </h3>
              {offeneAnrufe.map((call) => (
                <CallCard key={call.id} call={call} onStatus={statusSetzen} />
              ))}
            </div>
          ) : null}

          {view.followUps.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-ink-700">Follow-up fällig</h3>
              {view.followUps.map((quote) => (
                <FollowUpCard key={quote.id} quote={quote} />
              ))}
            </div>
          ) : null}

          {view.fresh.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-ink-700">Neue Anfragen</h3>
              {view.fresh.map((inquiry) => (
                <Card key={inquiry.id} className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <Link
                        href={`/anfragen/${inquiry.id}`}
                        className="font-bold text-ink-900 hover:text-brand-600"
                      >
                        {customerName(data, inquiry.customerId)}
                      </Link>
                      <p className="mt-0.5 text-sm text-ink-600">{inquiry.title}</p>
                    </div>
                    <InquiryBadge status={inquiry.status} />
                  </div>
                  <div className="mt-3">
                    <Button href={`/anfragen/${inquiry.id}`} variant="ghost" size="sm">
                      Anfrage öffnen
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : null}

          {view.ready.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-ink-700">Bereit fürs Angebot</h3>
              {view.ready.map((inquiry) => (
                <Card key={inquiry.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <Link
                      href={`/anfragen/${inquiry.id}`}
                      className="font-bold text-ink-900 hover:text-brand-600"
                    >
                      {customerName(data, inquiry.customerId)}
                    </Link>
                    <p className="mt-0.5 text-sm text-ink-600">{inquiry.title}</p>
                  </div>
                  <Button href={`/anfragen/${inquiry.id}`} size="sm">
                    Angebot erstellen
                  </Button>
                </Card>
              ))}
            </div>
          ) : null}

          {view.drafts.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-ink-700">Angebote fertigstellen</h3>
              {view.drafts.map((quote) => (
                <Card key={quote.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <Link
                      href={`/angebote/${quote.id}`}
                      className="font-bold text-ink-900 hover:text-brand-600"
                    >
                      Nr. {quote.number} · {customerName(data, quote.customerId)}
                    </Link>
                    <p className="mt-0.5 text-sm text-ink-600">
                      {quote.items.length === 0
                        ? "Noch keine Positionen"
                        : `${quote.items.length} Positionen · ${formatEuroShort(quoteNet(quote))}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <QuoteBadge status={quote.status} />
                    <Button href={`/angebote/${quote.id}`} variant="ghost" size="sm">
                      Öffnen
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : null}

          {view.tasks.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-ink-700">Rückrufe und Aufgaben</h3>
              <Card className="divide-y divide-ink-100">
                {view.tasks.map((task) => (
                  <label
                    key={task.id}
                    className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-ink-50"
                  >
                    <input
                      type="checkbox"
                      checked={task.done}
                      onChange={() => toggleTask(task.id)}
                      className="h-5 w-5 rounded border-ink-300 accent-brand-600"
                    />
                    <span className="flex-1 text-sm text-ink-800">{task.title}</span>
                    {task.kind === "rueckruf" ? (
                      <span className="rounded-md bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-700">
                        Rückruf
                      </span>
                    ) : null}
                  </label>
                ))}
              </Card>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
