import { promises as fs } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { VoiceCall } from "./types";

/**
 * Serverseitige Ablage der Telefonanrufe.
 *
 * Ein Anruf kommt beim Server an, nicht im Browser des Betriebs – deshalb
 * braucht dieser Teil eine eigene Persistenz. Ist Supabase konfiguriert,
 * wird dort gespeichert. Sonst greift eine Datei im Projektverzeichnis,
 * damit Entwicklung und Demo ohne Backend funktionieren.
 *
 * Wichtig: Nach jeder Antwort des Anrufers wird sofort geschrieben. Legt
 * jemand mitten im Gespräch auf, ist alles Gesagte trotzdem gesichert.
 */

const FILE = path.join(process.cwd(), ".data", "voice-calls.json");

function supabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export function speicherArt(): "supabase" | "datei" {
  return supabase() ? "supabase" : "datei";
}

async function ladeDatei(): Promise<VoiceCall[]> {
  try {
    const raw = await fs.readFile(FILE, "utf8");
    return JSON.parse(raw) as VoiceCall[];
  } catch {
    return [];
  }
}

async function schreibeDatei(calls: VoiceCall[]): Promise<void> {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(calls, null, 2), "utf8");
}

export async function alleAnrufe(): Promise<VoiceCall[]> {
  const client = supabase();
  if (client) {
    const { data, error } = await client
      .from("voice_calls")
      .select("data")
      .order("started_at", { ascending: false })
      .limit(200);
    if (error) {
      console.error("Anrufe konnten nicht geladen werden", error);
      return [];
    }
    return (data ?? []).map((row) => (row as { data: VoiceCall }).data);
  }
  const calls = await ladeDatei();
  return [...calls].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

export async function anrufLaden(id: string): Promise<VoiceCall | null> {
  const client = supabase();
  if (client) {
    const { data } = await client.from("voice_calls").select("data").eq("id", id).maybeSingle();
    return (data as { data: VoiceCall } | null)?.data ?? null;
  }
  const calls = await ladeDatei();
  return calls.find((c) => c.id === id) ?? null;
}

/** Legt einen Anruf an oder aktualisiert ihn – nach jedem Gesprächsschritt. */
export async function anrufSichern(call: VoiceCall): Promise<void> {
  call.updatedAt = new Date().toISOString();
  const client = supabase();
  if (client) {
    const { error } = await client.from("voice_calls").upsert({
      id: call.id,
      provider_call_id: call.providerCallId ?? null,
      status: call.status,
      started_at: call.startedAt,
      updated_at: call.updatedAt,
      data: call,
    });
    if (error) console.error("Anruf konnte nicht gespeichert werden", error);
    return;
  }
  const calls = await ladeDatei();
  const index = calls.findIndex((c) => c.id === call.id);
  if (index >= 0) calls[index] = call;
  else calls.unshift(call);
  await schreibeDatei(calls);
}

export async function anrufLoeschen(id: string): Promise<void> {
  const client = supabase();
  if (client) {
    await client.from("voice_calls").delete().eq("id", id);
    return;
  }
  const calls = await ladeDatei();
  await schreibeDatei(calls.filter((c) => c.id !== id));
}
