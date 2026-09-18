import crypto from "node:crypto";

/**
 * Prüft die Twilio-Signatur eines Webhooks.
 * Ohne diese Prüfung könnte jeder beliebige Anrufe in das Dashboard schreiben.
 *
 * Ist kein TWILIO_AUTH_TOKEN gesetzt (Entwicklung, Demo, Simulator), wird
 * nicht geprüft – dann ist der Endpunkt aber auch nicht öffentlich zu betreiben.
 */
export function pruefeTwilioSignatur(
  url: string,
  params: Record<string, string>,
  signatur: string | null,
): { ok: boolean; grund?: string } {
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!token) return { ok: true, grund: "ungeprüft: kein TWILIO_AUTH_TOKEN gesetzt" };
  if (!signatur) return { ok: false, grund: "Signatur fehlt" };

  const daten =
    url +
    Object.keys(params)
      .sort()
      .map((key) => key + params[key])
      .join("");

  const erwartet = crypto.createHmac("sha1", token).update(Buffer.from(daten, "utf8")).digest("base64");

  const a = Buffer.from(erwartet);
  const b = Buffer.from(signatur);
  const ok = a.length === b.length && crypto.timingSafeEqual(a, b);
  return ok ? { ok: true } : { ok: false, grund: "Signatur stimmt nicht" };
}
