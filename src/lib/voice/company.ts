import { createClient } from "@supabase/supabase-js";
import { DEMO_COMPANY } from "../demo-data";
import type { CompanySettings } from "../types";

/**
 * Betriebsdaten für die Telefonansage.
 * Der Anruf kommt am Server an, wo der Browser-Store nicht verfügbar ist:
 * deshalb zuerst Supabase, dann Umgebungsvariablen, dann der Demo-Betrieb.
 */
export async function companyFuerAnsage(): Promise<CompanySettings> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (url && key) {
    try {
      const client = createClient(url, key, { auth: { persistSession: false } });
      const { data } = await client
        .from("company_settings")
        .select("data")
        .eq("id", "default")
        .maybeSingle();
      const gespeichert = (data as { data: CompanySettings } | null)?.data;
      if (gespeichert) return gespeichert;
    } catch (error) {
      console.error("Betriebsdaten konnten nicht geladen werden", error);
    }
  }

  return {
    ...DEMO_COMPANY,
    name: process.env.VOICE_COMPANY_NAME || DEMO_COMPANY.name,
    owner: process.env.VOICE_COMPANY_OWNER || DEMO_COMPANY.owner,
  };
}
