import { NextResponse } from "next/server";
import { speicherArt } from "@/lib/voice/call-store";
import { basisUrl } from "../incoming/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Einrichtungsstand des Telefonassistenten für die Einstellungsseite. */
export async function GET(request: Request) {
  const basis = basisUrl(request);
  return NextResponse.json({
    speicher: speicherArt(),
    signaturGeprueft: Boolean(process.env.TWILIO_AUTH_TOKEN),
    oeffentlicheBasis: Boolean(process.env.PUBLIC_BASE_URL),
    webhooks: {
      incoming: `${basis}/api/voice/incoming`,
      status: `${basis}/api/voice/status`,
    },
  });
}
