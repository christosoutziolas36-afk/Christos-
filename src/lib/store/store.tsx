"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { addWorkdays, toISODate } from "../dates";
import { buildDemoData } from "../demo-data";
import { newId } from "../id";
import type {
  AppData,
  CatalogService,
  CompanySettings,
  Customer,
  Inquiry,
  Quote,
  QuoteItem,
  Task,
} from "../types";
import type { AdapterName, DataAdapter } from "./adapter";
import { LocalAdapter } from "./local-adapter";
import { SupabaseAdapter, createSupabaseClient } from "./supabase-adapter";

function pickAdapter(): DataAdapter {
  const client = createSupabaseClient();
  if (client) return new SupabaseAdapter(client);
  return new LocalAdapter();
}

function nowISO(): string {
  return new Date().toISOString();
}

export interface StoreValue {
  data: AppData;
  ready: boolean;
  adapter: AdapterName;
  saving: boolean;

  // Kunden
  upsertCustomer(input: Partial<Customer> & { name: string; phone: string }): Customer;
  deleteCustomer(id: string): void;

  // Anfragen
  createInquiry(input: {
    customer: Partial<Customer> & { name: string; phone: string };
    title: string;
    description: string;
    source: Inquiry["source"];
    desiredPeriod?: string;
    address?: string;
    notes?: string;
    status?: Inquiry["status"];
  }): Inquiry;
  updateInquiry(id: string, patch: Partial<Inquiry>): void;
  deleteInquiry(id: string): void;

  // Angebote
  createQuote(input: { customerId: string; inquiryId?: string; address?: string }): Quote;
  createQuoteFromInquiry(inquiryId: string, items?: QuoteItem[]): Quote;
  updateQuote(id: string, patch: Partial<Quote>): void;
  addQuoteItem(quoteId: string, item: Omit<QuoteItem, "id">): void;
  updateQuoteItem(quoteId: string, itemId: string, patch: Partial<QuoteItem>): void;
  removeQuoteItem(quoteId: string, itemId: string): void;
  markQuoteSent(quoteId: string): void;
  markQuoteAccepted(quoteId: string): void;
  markQuoteRejected(quoteId: string): void;
  snoozeFollowUp(quoteId: string, workdays: number): void;
  logFollowUp(quoteId: string, text: string, kind?: "vorbereitet" | "notiz"): void;
  deleteQuote(id: string): void;

  // Leistungskatalog
  upsertService(service: Partial<CatalogService> & { name: string }): CatalogService;
  deleteService(id: string): void;

  // Aufgaben
  addTask(input: Omit<Task, "id" | "createdAt" | "done"> & { done?: boolean }): Task;
  toggleTask(id: string): void;
  deleteTask(id: string): void;

  // Betrieb
  updateCompany(patch: Partial<CompanySettings>): void;
  resetToDemo(): void;
  clearAll(): void;
}

const StoreContext = createContext<StoreValue | null>(null);

function emptyData(): AppData {
  const demo = buildDemoData();
  return {
    version: 1,
    company: { ...demo.company, name: "Mein Malerbetrieb", demoPrices: false },
    services: demo.services,
    customers: [],
    inquiries: [],
    quotes: [],
    tasks: [],
    nextQuoteNumber: 1001,
  };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const adapterRef = useRef<DataAdapter | null>(null);
  if (!adapterRef.current) adapterRef.current = pickAdapter();
  const adapter = adapterRef.current;

  const [data, setData] = useState<AppData>(() => emptyData());
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const dirtyRef = useRef(false);
  /** Änderungen am Kernprozess werden sofort geschrieben, nicht erst nach dem Debounce. */
  const immediateRef = useRef(false);
  const pendingRef = useRef<AppData | null>(null);

  // Initiales Laden. Beim allerersten Start wird der Demo-Bestand angelegt,
  // damit das Produkt nie mit einem leeren, erklärungsbedürftigen Screen startet.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const loaded = await adapter.load();
      if (cancelled) return;
      if (loaded) {
        setData(migrate(loaded));
      } else {
        const demo = buildDemoData();
        setData(demo);
        await adapter.save(demo);
      }
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [adapter]);

  const flush = useCallback(
    (snapshot: AppData) => {
      pendingRef.current = null;
      setSaving(true);
      adapter
        .save(snapshot)
        .catch((err) => console.error("Speichern fehlgeschlagen", err))
        .finally(() => setSaving(false));
    },
    [adapter],
  );

  // Tipp-Eingaben werden gebündelt gespeichert, Schritte im Kernprozess sofort.
  useEffect(() => {
    if (!ready || !dirtyRef.current) return;
    pendingRef.current = data;
    if (immediateRef.current) {
      immediateRef.current = false;
      flush(data);
      return;
    }
    setSaving(true);
    const handle = setTimeout(() => flush(data), 250);
    return () => clearTimeout(handle);
  }, [data, ready, flush]);

  // Sicherheitsnetz: Beim Schließen, Neuladen oder Wegschalten des Tabs wird
  // ein noch ausstehender Stand sofort geschrieben. Ohne das könnte eine gerade
  // erfasste Anfrage verloren gehen.
  useEffect(() => {
    const save = () => {
      if (pendingRef.current) flush(pendingRef.current);
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") save();
    };
    window.addEventListener("pagehide", save);
    window.addEventListener("beforeunload", save);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", save);
      window.removeEventListener("beforeunload", save);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [flush]);

  const mutate = useCallback((fn: (draft: AppData) => void, immediate = false) => {
    dirtyRef.current = true;
    if (immediate) immediateRef.current = true;
    setData((prev) => {
      const next: AppData = structuredClone(prev);
      fn(next);
      return next;
    });
  }, []);

  const value = useMemo<StoreValue>(() => {
    const findQuote = (draft: AppData, id: string) => draft.quotes.find((q) => q.id === id);

    /**
     * Legt ein Angebot an und verknüpft es mit der Anfrage.
     * Bewusst als eigenständige Funktion, damit sie auch aufgerufen werden kann,
     * wenn die Store-Methoden einzeln aus dem Context entnommen werden.
     */
    const createQuote: StoreValue["createQuote"] = (input) => {
      const customer = data.customers.find((c) => c.id === input.customerId);
      const quote: Quote = {
        id: newId("quo"),
        number: data.nextQuoteNumber,
        customerId: input.customerId,
        inquiryId: input.inquiryId,
        address:
          input.address ??
          [customer?.street, [customer?.zip, customer?.city].filter(Boolean).join(" ")]
            .filter(Boolean)
            .join(", "),
        items: [],
        notes: "",
        validUntil: toISODate(new Date(Date.now() + data.company.validityDays * 86_400_000)),
        status: "entwurf",
        followUps: [],
        createdAt: nowISO(),
        updatedAt: nowISO(),
      };
      mutate((draft) => {
        draft.quotes.unshift(quote);
        draft.nextQuoteNumber += 1;
        if (input.inquiryId) {
          const inq = draft.inquiries.find((i) => i.id === input.inquiryId);
          if (inq && inq.status !== "abgeschlossen") {
            inq.status = "angebot_erstellt";
            inq.updatedAt = nowISO();
          }
        }
      }, true);
      return quote;
    };

    return {
      data,
      ready,
      saving,
      adapter: adapter.name,

      upsertCustomer(input) {
        const existing = data.customers.find(
          (c) => c.id === input.id || (c.name === input.name && c.phone === input.phone),
        );
        const customer: Customer = existing
          ? { ...existing, ...input }
          : {
              id: input.id ?? newId("cus"),
              name: input.name,
              phone: input.phone,
              email: input.email,
              street: input.street,
              zip: input.zip,
              city: input.city,
              notes: input.notes,
              createdAt: nowISO(),
            };
        mutate((draft) => {
          const idx = draft.customers.findIndex((c) => c.id === customer.id);
          if (idx >= 0) draft.customers[idx] = customer;
          else draft.customers.unshift(customer);
        });
        return customer;
      },

      deleteCustomer(id) {
        mutate((draft) => {
          draft.customers = draft.customers.filter((c) => c.id !== id);
          draft.inquiries = draft.inquiries.filter((i) => i.customerId !== id);
          draft.quotes = draft.quotes.filter((q) => q.customerId !== id);
        });
      },

      createInquiry(input) {
        const existing = data.customers.find(
          (c) =>
            c.id === input.customer.id ||
            (c.name.toLowerCase() === input.customer.name.toLowerCase() &&
              c.phone === input.customer.phone),
        );
        const customer: Customer = existing
          ? { ...existing, ...input.customer, id: existing.id }
          : {
              id: newId("cus"),
              name: input.customer.name,
              phone: input.customer.phone,
              email: input.customer.email,
              street: input.customer.street,
              zip: input.customer.zip,
              city: input.customer.city,
              createdAt: nowISO(),
            };

        const inquiry: Inquiry = {
          id: newId("inq"),
          customerId: customer.id,
          title: input.title,
          description: input.description,
          source: input.source,
          status: input.status ?? "neu",
          desiredPeriod: input.desiredPeriod,
          address:
            input.address ??
            [customer.street, [customer.zip, customer.city].filter(Boolean).join(" ")]
              .filter(Boolean)
              .join(", "),
          notes: input.notes,
          createdAt: nowISO(),
          updatedAt: nowISO(),
        };

        mutate((draft) => {
          const idx = draft.customers.findIndex((c) => c.id === customer.id);
          if (idx >= 0) draft.customers[idx] = customer;
          else draft.customers.unshift(customer);
          draft.inquiries.unshift(inquiry);
        }, true);
        return inquiry;
      },

      updateInquiry(id, patch) {
        mutate((draft) => {
          const inq = draft.inquiries.find((i) => i.id === id);
          if (!inq) return;
          Object.assign(inq, patch, { updatedAt: nowISO() });
        });
      },

      deleteInquiry(id) {
        mutate((draft) => {
          draft.inquiries = draft.inquiries.filter((i) => i.id !== id);
        });
      },

      createQuote,

      createQuoteFromInquiry(inquiryId, items) {
        const inquiry = data.inquiries.find((i) => i.id === inquiryId);
        if (!inquiry) throw new Error("Anfrage nicht gefunden");
        const quote = createQuote({
          customerId: inquiry.customerId,
          inquiryId,
          address: inquiry.address,
        });
        if (items && items.length > 0) {
          mutate((draft) => {
            const q = findQuote(draft, quote.id);
            if (q) {
              q.items = items.map((i) => ({ ...i, id: i.id || newId("qi") }));
              q.updatedAt = nowISO();
            }
          });
          quote.items = items;
        }
        return quote;
      },

      updateQuote(id, patch) {
        mutate((draft) => {
          const q = findQuote(draft, id);
          if (!q) return;
          Object.assign(q, patch, { updatedAt: nowISO() });
        });
      },

      addQuoteItem(quoteId, item) {
        mutate((draft) => {
          const q = findQuote(draft, quoteId);
          if (!q) return;
          q.items.push({ ...item, id: newId("qi") });
          q.updatedAt = nowISO();
        });
      },

      updateQuoteItem(quoteId, itemId, patch) {
        mutate((draft) => {
          const q = findQuote(draft, quoteId);
          const item = q?.items.find((i) => i.id === itemId);
          if (!q || !item) return;
          Object.assign(item, patch);
          q.updatedAt = nowISO();
        });
      },

      removeQuoteItem(quoteId, itemId) {
        mutate((draft) => {
          const q = findQuote(draft, quoteId);
          if (!q) return;
          q.items = q.items.filter((i) => i.id !== itemId);
          q.updatedAt = nowISO();
        });
      },

      /**
       * Angebot als gesendet markieren. Erzeugt automatisch das Follow-up-Datum
       * (Standard: 3 Werktage). Damit taucht das Angebot von selbst wieder
       * auf "Heute" auf – der eigentliche Kern des Produkts.
       */
      markQuoteSent(quoteId) {
        mutate((draft) => {
          const q = findQuote(draft, quoteId);
          if (!q) return;
          const sentAt = new Date();
          q.status = "gesendet";
          q.sentAt = sentAt.toISOString();
          q.followUpDate = toISODate(addWorkdays(sentAt, draft.company.followUpWorkdays));
          q.updatedAt = nowISO();
        }, true);
      },

      markQuoteAccepted(quoteId) {
        mutate((draft) => {
          const q = findQuote(draft, quoteId);
          if (!q) return;
          q.status = "angenommen";
          q.decidedAt = nowISO();
          q.followUpDate = undefined;
          q.updatedAt = nowISO();
          if (q.inquiryId) {
            const inq = draft.inquiries.find((i) => i.id === q.inquiryId);
            if (inq) {
              inq.status = "abgeschlossen";
              inq.updatedAt = nowISO();
            }
          }
        }, true);
      },

      markQuoteRejected(quoteId) {
        mutate((draft) => {
          const q = findQuote(draft, quoteId);
          if (!q) return;
          q.status = "abgelehnt";
          q.decidedAt = nowISO();
          q.followUpDate = undefined;
          q.updatedAt = nowISO();
          if (q.inquiryId) {
            const inq = draft.inquiries.find((i) => i.id === q.inquiryId);
            if (inq) {
              inq.status = "abgeschlossen";
              inq.updatedAt = nowISO();
            }
          }
        }, true);
      },

      snoozeFollowUp(quoteId, workdays) {
        mutate((draft) => {
          const q = findQuote(draft, quoteId);
          if (!q) return;
          q.followUpDate = toISODate(addWorkdays(new Date(), workdays));
          q.followUps.push({
            id: newId("fu"),
            date: nowISO(),
            kind: "verschoben",
            text: `Erinnerung auf ${q.followUpDate} verschoben.`,
          });
          q.updatedAt = nowISO();
        });
      },

      logFollowUp(quoteId, text, kind = "vorbereitet") {
        mutate((draft) => {
          const q = findQuote(draft, quoteId);
          if (!q) return;
          q.followUps.push({ id: newId("fu"), date: nowISO(), kind, text });
          q.updatedAt = nowISO();
        });
      },

      deleteQuote(id) {
        mutate((draft) => {
          draft.quotes = draft.quotes.filter((q) => q.id !== id);
        });
      },

      upsertService(input) {
        const existing = data.services.find((s) => s.id === input.id);
        const service: CatalogService = existing
          ? { ...existing, ...input }
          : {
              id: input.id ?? newId("svc"),
              name: input.name,
              unit: input.unit ?? "m²",
              defaultPrice: input.defaultPrice ?? 0,
              description: input.description,
              active: input.active ?? true,
            };
        mutate((draft) => {
          const idx = draft.services.findIndex((s) => s.id === service.id);
          if (idx >= 0) draft.services[idx] = service;
          else draft.services.push(service);
        });
        return service;
      },

      deleteService(id) {
        mutate((draft) => {
          draft.services = draft.services.filter((s) => s.id !== id);
        });
      },

      addTask(input) {
        const task: Task = {
          id: newId("tsk"),
          title: input.title,
          dueDate: input.dueDate,
          done: input.done ?? false,
          linkType: input.linkType,
          linkId: input.linkId,
          kind: input.kind,
          createdAt: nowISO(),
        };
        mutate((draft) => {
          draft.tasks.unshift(task);
        });
        return task;
      },

      toggleTask(id) {
        mutate((draft) => {
          const t = draft.tasks.find((x) => x.id === id);
          if (t) t.done = !t.done;
        });
      },

      deleteTask(id) {
        mutate((draft) => {
          draft.tasks = draft.tasks.filter((t) => t.id !== id);
        });
      },

      updateCompany(patch) {
        mutate((draft) => {
          Object.assign(draft.company, patch);
        });
      },

      resetToDemo() {
        dirtyRef.current = true;
        setData(buildDemoData());
      },

      clearAll() {
        dirtyRef.current = true;
        setData(emptyData());
      },
    };
  }, [data, ready, saving, adapter, mutate]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

/** Ältere Stände auf das aktuelle Modell heben. */
function migrate(data: AppData): AppData {
  return {
    ...data,
    version: 1,
    tasks: data.tasks ?? [],
    services: data.services ?? [],
    quotes: (data.quotes ?? []).map((q) => ({ ...q, followUps: q.followUps ?? [] })),
  };
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore muss innerhalb von <StoreProvider> verwendet werden");
  return ctx;
}
