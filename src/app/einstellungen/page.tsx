"use client";

import { useState } from "react";
import { Button, Card, Field, PageHeader, SectionTitle, inputClass } from "@/components/ui";
import { VoiceSetup } from "@/components/voice-setup";
import { useStore } from "@/lib/store/store";
import { formatEuro } from "@/lib/money";
import { UNITS, type Unit } from "@/lib/types";

export default function EinstellungenPage() {
  const { data, ready, adapter, updateCompany, upsertService, deleteService, resetToDemo, clearAll } =
    useStore();
  const [newService, setNewService] = useState({ name: "", unit: "m²" as Unit, price: "" });
  const [confirm, setConfirm] = useState<"demo" | "leeren" | null>(null);

  if (!ready) return <div className="py-20 text-center text-ink-400">Wird geladen…</div>;

  const company = data.company;

  return (
    <div className="space-y-6">
      <PageHeader title="Einstellungen" subtitle="Betrieb, Preise und Follow-up-Regel." />

      <Card className="space-y-4 p-4 md:p-5">
        <SectionTitle>Betrieb</SectionTitle>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Firmenname">
            <input
              value={company.name}
              onChange={(e) => updateCompany({ name: e.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label="Inhaber">
            <input
              value={company.owner}
              onChange={(e) => updateCompany({ owner: e.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label="Straße und Nr.">
            <input
              value={company.street}
              onChange={(e) => updateCompany({ street: e.target.value })}
              className={inputClass}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="PLZ">
              <input
                value={company.zip}
                onChange={(e) => updateCompany({ zip: e.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label="Ort">
              <input
                value={company.city}
                onChange={(e) => updateCompany({ city: e.target.value })}
                className={inputClass}
              />
            </Field>
          </div>
          <Field label="Telefon">
            <input
              value={company.phone}
              onChange={(e) => updateCompany({ phone: e.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label="E-Mail">
            <input
              value={company.email}
              onChange={(e) => updateCompany({ email: e.target.value })}
              className={inputClass}
            />
          </Field>
        </div>
        <Field label="Grußformel für Angebote und Nachfassnachrichten">
          <textarea
            value={company.signature}
            onChange={(e) => updateCompany({ signature: e.target.value })}
            rows={3}
            className={inputClass}
          />
        </Field>
      </Card>

      <Card className="space-y-4 p-4 md:p-5">
        <SectionTitle hint="gilt für alle neuen Angebote">Angebote und Follow-up</SectionTitle>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="MwSt. in %">
            <input
              type="number"
              min="0"
              max="25"
              value={company.taxRate}
              onChange={(e) => updateCompany({ taxRate: Number(e.target.value) })}
              className={inputClass}
            />
          </Field>
          <Field label="Gültigkeit in Tagen">
            <input
              type="number"
              min="1"
              value={company.validityDays}
              onChange={(e) => updateCompany({ validityDays: Number(e.target.value) })}
              className={inputClass}
            />
          </Field>
          <Field label="Follow-up nach (Werktagen)" hint="Standard: 3 Werktage nach Versand.">
            <input
              type="number"
              min="1"
              max="30"
              value={company.followUpWorkdays}
              onChange={(e) => updateCompany({ followUpWorkdays: Number(e.target.value) })}
              className={inputClass}
            />
          </Field>
        </div>
        <label className="flex items-center gap-3 text-sm text-ink-700">
          <input
            type="checkbox"
            checked={company.demoPrices}
            onChange={(e) => updateCompany({ demoPrices: e.target.checked })}
            className="h-5 w-5 rounded border-ink-300 accent-brand-600"
          />
          Preise als Demo-/Beispielpreise kennzeichnen
        </label>
      </Card>

      <Card className="space-y-4 p-4 md:p-5">
        <SectionTitle hint="einzige Preisquelle für Peter">Leistungskatalog</SectionTitle>
        <p className="text-sm text-ink-500">
          Peter darf nur diese Leistungen und Preise verwenden. Was hier nicht steht, schlägt er
          nicht vor.
        </p>

        <div className="-mx-4 overflow-x-auto px-4">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-ink-200 text-left text-xs uppercase tracking-wide text-ink-400">
                <th className="pb-2">Leistung</th>
                <th className="pb-2 w-28">Einheit</th>
                <th className="pb-2 w-32 text-right">Preis</th>
                <th className="pb-2 w-20 text-center">Aktiv</th>
                <th className="pb-2 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {data.services.map((service) => (
                <tr key={service.id}>
                  <td className="py-2 pr-2">
                    <input
                      value={service.name}
                      onChange={(e) => upsertService({ ...service, name: e.target.value })}
                      className="w-full rounded-md border border-transparent px-2 py-1.5 hover:border-ink-200 focus:border-brand-500 focus:outline-none"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <select
                      value={service.unit}
                      onChange={(e) => upsertService({ ...service, unit: e.target.value as Unit })}
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
                      value={service.defaultPrice}
                      onChange={(e) =>
                        upsertService({ ...service, defaultPrice: Number(e.target.value) })
                      }
                      className="w-full rounded-md border border-transparent px-2 py-1.5 text-right tabular-nums hover:border-ink-200 focus:border-brand-500 focus:outline-none"
                    />
                  </td>
                  <td className="py-2 text-center">
                    <input
                      type="checkbox"
                      checked={service.active}
                      onChange={(e) => upsertService({ ...service, active: e.target.checked })}
                      className="h-5 w-5 rounded border-ink-300 accent-brand-600"
                    />
                  </td>
                  <td className="py-2 text-right">
                    <button
                      onClick={() => deleteService(service.id)}
                      className="rounded-md px-2 py-1 text-ink-300 hover:bg-red-50 hover:text-red-600"
                      aria-label="Leistung löschen"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-2 border-t border-ink-100 pt-4 md:flex-row">
          <input
            value={newService.name}
            onChange={(e) => setNewService((s) => ({ ...s, name: e.target.value }))}
            placeholder="Neue Leistung, z. B. Lackierarbeiten Türen"
            className={inputClass}
          />
          <select
            value={newService.unit}
            onChange={(e) => setNewService((s) => ({ ...s, unit: e.target.value as Unit }))}
            className={`${inputClass} md:w-32`}
          >
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
          <input
            type="number"
            step="0.01"
            min="0"
            value={newService.price}
            onChange={(e) => setNewService((s) => ({ ...s, price: e.target.value }))}
            placeholder="Preis"
            className={`${inputClass} md:w-32`}
          />
          <Button
            disabled={!newService.name.trim()}
            onClick={() => {
              upsertService({
                name: newService.name.trim(),
                unit: newService.unit,
                defaultPrice: Number(newService.price) || 0,
                active: true,
              });
              setNewService({ name: "", unit: "m²", price: "" });
            }}
          >
            Hinzufügen
          </Button>
        </div>
        <p className="text-xs text-ink-400">
          {data.services.filter((s) => s.active).length} aktive Leistungen · Durchschnittspreis{" "}
          {formatEuro(
            data.services.length > 0
              ? data.services.reduce((s, x) => s + x.defaultPrice, 0) / data.services.length
              : 0,
          )}
        </p>
      </Card>

      <VoiceSetup />

      <Card className="space-y-3 p-4 md:p-5">
        <SectionTitle>Daten</SectionTitle>
        <p className="text-sm text-ink-600">
          Speicherort:{" "}
          <strong className="text-ink-900">
            {adapter === "supabase"
              ? "Supabase-Datenbank"
              : "Demo-Modus – Daten liegen nur in diesem Browser"}
          </strong>
          .
          {adapter === "local" ? (
            <>
              {" "}
              Für den Pilotbetrieb Supabase-Zugang in <code>.env.local</code> hinterlegen
              (siehe <code>.env.example</code> und <code>supabase/schema.sql</code>).
            </>
          ) : null}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={() => setConfirm("demo")}>
            Demo-Daten neu laden
          </Button>
          <Button variant="danger" onClick={() => setConfirm("leeren")}>
            Alle Daten löschen
          </Button>
        </div>
        {confirm ? (
          <div className="rounded-lg border border-ink-200 bg-ink-50 p-3">
            <p className="text-sm font-semibold text-ink-800">
              {confirm === "demo"
                ? "Demo-Bestand neu laden? Der aktuelle Stand wird überschrieben."
                : "Wirklich alle Anfragen, Angebote und Kunden löschen? Der Leistungskatalog bleibt erhalten."}
            </p>
            <div className="mt-2 flex gap-2">
              <Button
                size="sm"
                variant={confirm === "leeren" ? "danger" : "primary"}
                onClick={() => {
                  if (confirm === "demo") resetToDemo();
                  else clearAll();
                  setConfirm(null);
                }}
              >
                Ja, ausführen
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirm(null)}>
                Abbrechen
              </Button>
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
