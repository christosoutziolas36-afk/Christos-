import { NextResponse } from "next/server";
import { anrufBeginnen } from "@/lib/voice/handler";
import { pruefeTwilioSignatur } from "@/lib/voice/signature";
import { TWIML_CONTENT_TYPE, verabschieden } from "@/lib/voice/twiml";
import type { VoiceStep } from "@/lib/voice/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Eingehender Anruf. Diese URL wird in der Twilio-Nummer als
 * "A call comes in"-Webhook hinterlegt.
 */
export async function POST(request: Request) {
  const form = await request.formData();
  const params: Record<string, string> = {};
  form.forEach((value, key) => {
    params[key] = String(value);
  });

  const url = oeffentlicheUrl(request);
  const signatur = pruefeTwilioSignatur(url, params, request.headers.get("x-twilio-signature"));
  if (!signatur.ok) {
    console.warn("Anruf abgewiesen:", signatur.grund);
    return new NextResponse(verabschieden("Es gab ein technisches Problem. Auf Wiederhören."), {
      status: 403,
      headers: { "content-type": TWIML_CONTENT_TYPE },
    });
  }

  const from = params.From || "unbekannt";
  const to = params.To;
  const callSid = params.CallSid;

  const actionUrl = (callId: string, step: VoiceStep) =>
    `${basisUrl(request)}/api/voice/gather?callId=${encodeURIComponent(callId)}&step=${step}`;

  const { twiml } = await anrufBeginnen(from, to, callSid, actionUrl);

  return new NextResponse(twiml, { headers: { "content-type": TWIML_CONTENT_TYPE } });
}

export function basisUrl(request: Request): string {
  const konfiguriert = process.env.PUBLIC_BASE_URL;
  if (konfiguriert) return konfiguriert.replace(/\/$/, "");
  const url = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") ?? url.host;
  const proto = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  return `${proto}://${host}`;
}

export function oeffentlicheUrl(request: Request): string {
  const url = new URL(request.url);
  return `${basisUrl(request)}${url.pathname}${url.search}`;
}
