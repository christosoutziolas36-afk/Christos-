"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, Field, PageHeader, inputClass } from "@/components/ui";
import { useStore } from "@/lib/store/store";
import { parseNote } from "@/lib/peter/parse";
import { INQUIRY_SOURCES, INQUIRY_SOURCE_LABEL, type InquirySource } from "@/lib/types";

export default function NeueAnfragePage() {
  const router = useRouter();
  const { createInquiry, ready } = useStore();

  const [note, setNote] = useState("");
  const [parsedHint, setParsedHint] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    street: "",
    zip: "",
    city: "",
    title: "",
    description: "",
    source: "telefon" as InquirySource,
    desiredPeriod: "",
    notes: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  /** Peter strukturiert die Notiz – ohne etwas zu erfinden. */
  function applyNote() {
    const parsed = parseNote(note);
    setForm((f) => ({
      ...f,
      name: parsed.name ?? f.name,
      phone: parsed.phone ?? f.phone,
      email: parsed.email ?? f.email,
      street: parsed.street ?? f.street,
      zip: parsed.zip ?? f.zip,
      city: parsed.city ?? f.city,
      title: parsed.title ?? f.title,
      desiredPeriod: parsed.desiredPeriod ?? f.desiredPeriod,
      source: parsed.source ?? f.source,
      description: f.description || note.trim(),
    }));
    setParsedHint(
      parsed.unresolved.length > 0
        ? `Übernommen. Nicht erkannt: ${parsed.unresolved.join(", ")} – bitte ergänzen.`
        : "Alles erkannt. Bitte kurz prüfen.",
    );
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      setError("Name und Telefonnummer werden gebraucht.");
      return;
    }
    if (!form.description.trim() && !form.title.trim()) {
      setError("Beschreibe kurz, was gemacht werden soll.");
      return;
    }
    setSaving(true);
    const inquiry = createInquiry({
      customer: {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        street: form.street.trim() || undefined,
        zip: form.zip.trim() || undefined,
        city: form.city.trim() || undefined,
      },
      title: form.title.trim() || form.description.trim().slice(0, 60),
      description: form.description.trim(),
      source: form.source,
      desiredPeriod: form.desiredPeriod.trim() || undefined,
      notes: form.notes.trim() || undefined,
    });
    router.push(`/anfragen/${inquiry.id}`);
  }

  if (!ready) return <div className="py-20 text-center text-ink-400">Wird geladen…</div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Neue Anfrage" subtitle="Beim Telefonat in einer Minute erfasst." />

      <Card className="p-4 md:p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">
          Schnellerfassung
        </h2>
        <p className="mt-1 text-sm text-ink-500">
          Notiz eintippen – Peter sortiert die Angaben in die Felder. Erfunden wird nichts.
        </p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="z. B. Frau Schmitz angerufen, 0203 445566, Bergstraße 12, 47051 Duisburg, Wohnzimmer ca. 30 m² streichen, am liebsten im Oktober"
          className={`${inputClass} mt-3`}
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button variant="secondary" onClick={applyNote} disabled={!note.trim()}>
            Felder ausfüllen
          </Button>
          {parsedHint ? <span className="text-sm text-ink-500">{parsedHint}</span> : null}
        </div>
      </Card>

      <form onSubmit={submit} className="space-y-6">
        <Card className="space-y-4 p-4 md:p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">Kunde</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Name" required>
              <input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                className={inputClass}
                placeholder="Familie Müller"
              />
            </Field>
            <Field label="Telefon" required>
              <input
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                className={inputClass}
                placeholder="0203 1234567"
                inputMode="tel"
              />
            </Field>
            <Field label="E-Mail" hint="Für den Angebotsversand und das Nachfassen.">
              <input
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                className={inputClass}
                inputMode="email"
              />
            </Field>
            <Field label="Straße und Nr.">
              <input
                value={form.street}
                onChange={(e) => set("street", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="PLZ">
              <input value={form.zip} onChange={(e) => set("zip", e.target.value)} className={inputClass} />
            </Field>
            <Field label="Ort">
              <input value={form.city} onChange={(e) => set("city", e.target.value)} className={inputClass} />
            </Field>
          </div>
        </Card>

        <Card className="space-y-4 p-4 md:p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">Anfrage</h2>
          <Field label="Kurzbezeichnung">
            <input
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              className={inputClass}
              placeholder="Wohnzimmer und Flur streichen"
            />
          </Field>
          <Field label="Beschreibung" required hint="Räume, Flächen, Besonderheiten – so genau wie möglich.">
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={4}
              className={inputClass}
            />
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Quelle der Anfrage">
              <select
                value={form.source}
                onChange={(e) => set("source", e.target.value as InquirySource)}
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
                value={form.desiredPeriod}
                onChange={(e) => set("desiredPeriod", e.target.value)}
                className={inputClass}
                placeholder="Oktober / KW 42"
              />
            </Field>
          </div>
          <Field label="Notizen">
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={2}
              className={inputClass}
              placeholder="Erreichbar ab 16 Uhr, Hund im Haus …"
            />
          </Field>
        </Card>

        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Button type="submit" size="lg" disabled={saving}>
            Anfrage speichern
          </Button>
          <Button href="/anfragen" variant="ghost" size="lg">
            Abbrechen
          </Button>
        </div>
      </form>
    </div>
  );
}
