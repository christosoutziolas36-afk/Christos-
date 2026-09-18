import { NextResponse } from "next/server";
import { antwortVerarbeitenUndFortfahren } from "@/lib/voice/handler";
import { pruefeTwilioSignatur } from "@/lib/voice/signature";
import { TWIML_CONTENT_TYPE, verabschieden } from "@/lib/voice/twiml";
import type { VoiceStep } from "@/lib/voice/types";
import { basisUrl, oeffentlicheUrl } from "../incoming/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Antwort des Anrufers auf die zuletzt gestellte Frage. */
export async function POST(request: Request) {
  const form = await request.formData();
  const params: Record<string, string> = {};
  form.forEach((value, key) => {
    params[key] = String(value);
  });

  const signatur = pruefeTwilioSignatur(
    oeffentlicheUrl(request),
    params,
    request.headers.get("x-twilio-signature"),
  );
  if (!signatur.ok) {
    console.warn("Antwort abgewiesen:", signatur.grund);
    return new NextResponse(verabschieden("Es gab ein technisches Problem. Auf Wiederhören."), {
      status: 403,
      headers: { "content-type": TWIML_CONTENT_TYPE },
    });
  }

  const url = new URL(request.url);
  const callId = url.searchParams.get("callId") ?? "";
  const step = (url.searchParams.get("step") ?? "name") as VoiceStep;
  const sprachergebnis = params.SpeechResult || undefined;
  const confidence = params.Confidence ? Number(params.Confidence) : undefined;

  const actionUrl = (id: string, naechsterStep: VoiceStep) =>
    `${basisUrl(request)}/api/voice/gather?callId=${encodeURIComponent(id)}&step=${naechsterStep}`;

  const { twiml } = await antwortVerarbeitenUndFortfahren(
    callId,
    step,
    sprachergebnis,
    confidence,
    actionUrl,
  );

  return new NextResponse(twiml, { headers: { "content-type": TWIML_CONTENT_TYPE } });
}
