import { NextResponse } from "next/server";
import { anrufBeenden } from "@/lib/voice/handler";
import { pruefeTwilioSignatur } from "@/lib/voice/signature";
import { oeffentlicheUrl } from "../incoming/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Status-Callback von Twilio. Legt der Anrufer mitten im Gespräch auf,
 * wird der Anruf als abgebrochen markiert – mit allem, was bis dahin
 * gesagt wurde. So geht auch ein halber Anruf nicht verloren.
 */
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
  if (!signatur.ok) return new NextResponse(null, { status: 403 });

  const callSid = params.CallSid;
  const status = params.CallStatus;
  if (callSid && ["completed", "no-answer", "busy", "failed", "canceled"].includes(status)) {
    await anrufBeenden(callSid);
  }

  return new NextResponse(null, { status: 204 });
}
