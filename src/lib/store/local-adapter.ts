import type { AppData } from "../types";
import type { DataAdapter } from "./adapter";

const KEY = "angebotsmeister.v1";

/**
 * Demo-/Pilotmodus ohne Backend: der komplette Bestand liegt im Browser.
 * Reload-fest, aber an dieses Gerät gebunden.
 */
export class LocalAdapter implements DataAdapter {
  name = "local" as const;

  async load(): Promise<AppData | null> {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(KEY);
      if (!raw) return null;
      return JSON.parse(raw) as AppData;
    } catch {
      return null;
    }
  }

  async save(data: AppData): Promise<void> {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(KEY, JSON.stringify(data));
  }

  async clear(): Promise<void> {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(KEY);
  }
}
