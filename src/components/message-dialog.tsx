"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "./ui";
import { gmailComposeUrl, mailtoUrl, whatsAppUrl } from "@/lib/contact";

export interface MessageDraft {
  subject: string;
  body: string;
  email?: string;
  phone?: string;
  /** Wird aufgerufen, wenn der Nutzer die Nachricht wirklich rausgeschickt hat. */
  onSent?: (channel: string) => void;
  title?: string;
}

/**
 * Peter bereitet Text vor – verschickt wird ausschließlich durch den Nutzer.
 * Deshalb gibt es hier nur Kanäle, die der Nutzer selbst bestätigt.
 */
export function MessageDialog({
  draft,
  onClose,
}: {
  draft: MessageDraft | null;
  onClose: () => void;
}) {
  const [text, setText] = useState(draft?.body ?? "");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setText(draft?.body ?? "");
    setCopied(false);
  }, [draft]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const wa = draft ? whatsAppUrl(draft.phone, text) : null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <AnimatePresence>
      {draft ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/40 p-0 md:items-center md:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-2xl rounded-t-2xl bg-white p-5 md:rounded-2xl md:p-6"
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-ink-900">
                  {draft.title ?? "Nachricht vorbereiten"}
                </h2>
                <p className="mt-1 text-sm text-ink-500">
                  Vorschlag prüfen, anpassen und selbst versenden. Es geht nichts automatisch raus.
                </p>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg px-2 py-1 text-xl leading-none text-ink-400 hover:bg-ink-50"
                aria-label="Schließen"
              >
                ×
              </button>
            </div>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={12}
              className="mt-4 w-full rounded-lg border border-ink-200 bg-ink-50 p-3 text-sm leading-relaxed text-ink-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />

            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={copy} variant="secondary">
                {copied ? "Kopiert ✓" : "Text kopieren"}
              </Button>
              <a
                href={gmailComposeUrl(draft.email, draft.subject, text)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => draft.onSent?.("Gmail")}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
              >
                In Gmail öffnen
              </a>
              <a
                href={mailtoUrl(draft.email, draft.subject, text)}
                onClick={() => draft.onSent?.("E-Mail")}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 transition hover:bg-ink-50"
              >
                E-Mail-Programm
              </a>
              {wa ? (
                <a
                  href={wa}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => draft.onSent?.("WhatsApp")}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 transition hover:bg-ink-50"
                >
                  WhatsApp
                </a>
              ) : null}
            </div>

            {!draft.email ? (
              <p className="mt-3 text-xs text-amber-700">
                Für diesen Kunden ist keine E-Mail-Adresse hinterlegt – der Entwurf öffnet sich ohne
                Empfänger.
              </p>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
