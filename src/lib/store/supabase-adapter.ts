import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AppData } from "../types";
import type { DataAdapter } from "./adapter";
import { buildDemoData } from "../demo-data";

export function supabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function createSupabaseClient(): SupabaseClient | null {
  if (!supabaseConfigured()) return null;
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
  );
}

type Row = Record<string, unknown>;

/**
 * Supabase-Persistenz. Der Bestand eines Betriebs ist klein (2–8 Mitarbeiter),
 * deshalb wird beim Speichern der komplette Snapshot per upsert abgeglichen
 * und entfernte Datensätze werden gelöscht. Das hält den Code einfach und
 * vermeidet halbe Schreibzustände im Kernprozess.
 */
export class SupabaseAdapter implements DataAdapter {
  name = "supabase" as const;
  private client: SupabaseClient;
  private companyId: string;

  constructor(client: SupabaseClient, companyId = "default") {
    this.client = client;
    this.companyId = companyId;
  }

  async load(): Promise<AppData | null> {
    const [company, customers, inquiries, quotes, services, tasks] = await Promise.all([
      this.client.from("company_settings").select("*").eq("id", this.companyId).maybeSingle(),
      this.client.from("customers").select("*").eq("company_id", this.companyId),
      this.client.from("inquiries").select("*").eq("company_id", this.companyId),
      this.client.from("quotes").select("*").eq("company_id", this.companyId),
      this.client.from("services").select("*").eq("company_id", this.companyId),
      this.client.from("tasks").select("*").eq("company_id", this.companyId),
    ]);

    if (!company.data) return null;
    const settings = company.data as Row;

    return {
      version: 1,
      company: (settings.data as AppData["company"]) ?? buildDemoData().company,
      nextQuoteNumber: (settings.next_quote_number as number) ?? 1001,
      customers: (customers.data ?? []).map((r) => (r as Row).data as AppData["customers"][number]),
      inquiries: (inquiries.data ?? []).map((r) => (r as Row).data as AppData["inquiries"][number]),
      quotes: (quotes.data ?? []).map((r) => (r as Row).data as AppData["quotes"][number]),
      services: (services.data ?? []).map((r) => (r as Row).data as AppData["services"][number]),
      tasks: (tasks.data ?? []).map((r) => (r as Row).data as AppData["tasks"][number]),
    };
  }

  async save(data: AppData): Promise<void> {
    await this.client.from("company_settings").upsert({
      id: this.companyId,
      data: data.company,
      next_quote_number: data.nextQuoteNumber,
      updated_at: new Date().toISOString(),
    });

    await Promise.all([
      this.syncTable("customers", data.customers),
      this.syncTable("inquiries", data.inquiries),
      this.syncTable("quotes", data.quotes),
      this.syncTable("services", data.services),
      this.syncTable("tasks", data.tasks),
    ]);
  }

  private async syncTable(table: string, rows: { id: string }[]): Promise<void> {
    if (rows.length > 0) {
      await this.client.from(table).upsert(
        rows.map((row) => ({
          id: row.id,
          company_id: this.companyId,
          data: row,
          updated_at: new Date().toISOString(),
        })),
      );
    }
    const ids = rows.map((r) => r.id);
    const filter = ids.length > 0 ? `(${ids.map((id) => `"${id}"`).join(",")})` : `("__none__")`;
    await this.client.from(table).delete().eq("company_id", this.companyId).not("id", "in", filter);
  }

  async clear(): Promise<void> {
    for (const table of ["customers", "inquiries", "quotes", "services", "tasks"]) {
      await this.client.from(table).delete().eq("company_id", this.companyId);
    }
    await this.client.from("company_settings").delete().eq("id", this.companyId);
  }
}
