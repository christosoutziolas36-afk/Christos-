"use client";

import { useCallback, useEffect, useState } from "react";
import type { CallStatus, VoiceCall } from "./types";

/**
 * Lädt die Anrufe des Telefonassistenten vom Server.
 * Anrufe kommen unabhängig vom geöffneten Browser herein, deshalb wird
 * regelmäßig nachgesehen – und immer dann, wenn der Tab wieder aktiv wird.
 */
export function useVoiceCalls(intervalMs = 30_000) {
  const [calls, setCalls] = useState<VoiceCall[]>([]);
  const [geladen, setGeladen] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  const laden = useCallback(async () => {
    try {
      const res = await fetch("/api/voice/calls", { cache: "no-store" });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const json = (await res.json()) as { calls: VoiceCall[] };
      setCalls(json.calls ?? []);
      setFehler(null);
    } catch (error) {
      setFehler(error instanceof Error ? error.message : "Unbekannter Fehler");
    } finally {
      setGeladen(true);
    }
  }, []);

  useEffect(() => {
    laden();
    const timer = setInterval(laden, intervalMs);
    const onFocus = () => laden();
    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("focus", onFocus);
    };
  }, [laden, intervalMs]);

  const statusSetzen = useCallback(
    async (id: string, status: CallStatus, inquiryId?: string) => {
      setCalls((prev) => prev.map((c) => (c.id === id ? { ...c, status, inquiryId } : c)));
      await fetch("/api/voice/calls", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, status, inquiryId }),
      }).catch(() => undefined);
      laden();
    },
    [laden],
  );

  /** Anrufe, die der Betrieb noch ansehen muss. */
  const offene = calls.filter((c) => c.status === "aufgenommen" || c.status === "abgebrochen");

  return { calls, offene, geladen, fehler, laden, statusSetzen };
}
