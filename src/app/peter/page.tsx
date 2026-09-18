"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button, Card, PageHeader, inputClass } from "@/components/ui";
import { MessageDialog, type MessageDraft } from "@/components/message-dialog";
import { useStore } from "@/lib/store/store";
import { answer, buildContextSnapshot, isFallback } from "@/lib/peter/engine";
import { newId } from "@/lib/id";
import { toISODate } from "@/lib/dates";
import { customerOf } from "@/lib/selectors";
import type { PeterAction, PeterMessage } from "@/lib/peter/types";

const EXAMPLES = [
  "Was steht heute an?",
  "Welche Angebote sind noch offen?",
  "Was fehlt bei der Anfrage Becker?",
  "Schreib eine freundliche Nachfrage für Angebot 1042",
];

export default function PeterPage() {
  const router = useRouter();
  const { data, ready, createQuoteFromInquiry, addTask, logFollowUp } = useStore();
  const [messages, setMessages] = useState<PeterMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<MessageDraft | null>(null);
  const [modelAvailable, setModelAvailable] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/peter")
      .then((r) => r.json())
      .then((r: { available: boolean }) => setModelAvailable(r.available))
      .catch(() => setModelAvailable(false));
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    setInput("");
    setBusy(true);

    setMessages((m) => [
      ...m,
      { id: newId("msg"), role: "user", text: q, createdAt: new Date().toISOString() },
    ]);

    const local = answer(data, q);

    // Die Regel-Engine antwortet aus den echten Daten. Nur wenn sie die Frage
    // nicht zuordnen kann, wird – sofern hinterlegt – das Sprachmodell gefragt.
    if (isFallback(local) && modelAvailable) {
      try {
        const res = await fetch("/api/peter", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ question: q, context: buildContextSnapshot(data) }),
        });
        const json = (await res.json()) as { text?: string };
        setMessages((m) => [
          ...m,
          {
            id: newId("msg"),
            role: "peter",
            text: json.text ?? local.text,
            actions: [],
            source: "modell",
            createdAt: new Date().toISOString(),
          },
        ]);
        setBusy(false);
        return;
      } catch {
        // Fällt auf die Regelantwort zurück.
      }
    }

    setMessages((m) => [
      ...m,
      {
        id: newId("msg"),
        role: "peter",
        text: local.text,
        actions: local.actions,
        source: local.source,
        createdAt: new Date().toISOString(),
      },
    ]);
    setBusy(false);
  }

  function runAction(action: PeterAction) {
    if (action.type === "open") {
      router.push(action.href);
      return;
    }
    if (action.type === "create_quote_from_inquiry") {
      const quote = createQuoteFromInquiry(action.inquiryId, action.items);
      router.push(`/angebote/${quote.id}`);
      return;
    }
    if (action.type === "add_task") {
      addTask({
        title: action.title,
        dueDate: toISODate(new Date()),
        kind: "rueckruf",
        linkType: action.linkType,
        linkId: action.linkId,
      });
      setMessages((m) => [
        ...m,
        {
          id: newId("msg"),
          role: "peter",
          text: "Erledigt – der Rückruf steht jetzt auf Heute.",
          createdAt: new Date().toISOString(),
          source: "regeln",
        },
      ]);
      return;
    }
    if (action.type === "copy_text") {
      const quote = action.quoteId ? data.quotes.find((q) => q.id === action.quoteId) : undefined;
      const customer = quote ? customerOf(data, quote.customerId) : undefined;
      setDraft({
        subject: quote ? `Nachfrage zu Angebot Nr. ${quote.number}` : "Nachricht",
        body: action.text,
        email: customer?.email,
        phone: customer?.phone,
        onSent: (channel) =>
          quote ? logFollowUp(quote.id, `Nachfassnachricht über ${channel} vorbereitet.`) : undefined,
      });
    }
  }

  if (!ready) return <div className="py-20 text-center text-ink-400">Wird geladen…</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Peter"
        subtitle="Kennt deine Anfragen, Angebote und Preise – und bereitet Arbeit vor, statt sie zu erledigen."
      />

      <Card className="flex min-h-[55vh] flex-col p-4 md:p-5">
        <div className="flex-1 space-y-4 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="py-6">
              <p className="text-sm text-ink-600">
                Frag mich etwas zu deinem Betrieb. Zum Beispiel:
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {EXAMPLES.map((example) => (
                  <button
                    key={example}
                    onClick={() => ask(example)}
                    className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-left text-sm text-ink-700 transition hover:border-brand-500 hover:text-brand-700"
                  >
                    {example}
                  </button>
                ))}
              </div>
              <p className="mt-6 text-xs text-ink-400">
                Peter arbeitet nur mit gespeicherten Daten und den Preisen aus deinem
                Leistungskatalog. Er verschickt nichts von selbst.
              </p>
            </div>
          ) : null}

          {messages.map((message) => (
            <div
              key={message.id}
              className={message.role === "user" ? "flex justify-end" : "flex justify-start"}
            >
              <div
                className={`max-w-[85%] rounded-xl px-4 py-3 text-sm ${
                  message.role === "user"
                    ? "bg-ink-900 text-white"
                    : "border border-ink-200 bg-ink-50 text-ink-900"
                }`}
              >
                <p className="whitespace-pre-line leading-relaxed">{message.text}</p>
                {message.actions && message.actions.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {message.actions.map((action, index) => (
                      <Button
                        key={`${message.id}_${index}`}
                        size="sm"
                        variant={index === 0 ? "primary" : "ghost"}
                        onClick={() => runAction(action)}
                      >
                        {action.label}
                      </Button>
                    ))}
                  </div>
                ) : null}
                {message.role === "peter" && message.source === "modell" ? (
                  <p className="mt-2 text-xs text-ink-400">Antwort vom Sprachmodell</p>
                ) : null}
              </div>
            </div>
          ))}
          {busy ? <p className="text-sm text-ink-400">Peter denkt nach…</p> : null}
          <div ref={endRef} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(input);
          }}
          className="mt-4 flex gap-2 border-t border-ink-100 pt-4"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Frage an Peter…"
            className={inputClass}
          />
          <Button type="submit" disabled={busy || !input.trim()}>
            Fragen
          </Button>
        </form>
      </Card>

      <MessageDialog draft={draft} onClose={() => setDraft(null)} />
    </div>
  );
}
