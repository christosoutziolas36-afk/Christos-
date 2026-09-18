import type { AppData } from "../types";

export type AdapterName = "supabase" | "local";

export interface DataAdapter {
  name: AdapterName;
  /** Liefert den gespeicherten Bestand oder null, wenn noch nichts existiert. */
  load(): Promise<AppData | null>;
  save(data: AppData): Promise<void>;
  clear(): Promise<void>;
}
