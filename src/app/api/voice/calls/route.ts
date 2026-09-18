import { NextResponse } from "next/server";
import { alleAnrufe, anrufLaden, anrufSichern, speicherArt } from "@/lib/voice/call-store";
import type { CallStatus } from "@/lib/voice/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Anrufe für das Dashboard. */
export async function GET() {
  const calls = await alleAnrufe();
  return NextResponse.json({ calls, speicher: speicherArt() });
}

/** Status eines Anrufs ändern – z. B. nachdem daraus eine Anfrage wurde. */
export async function POST(request: Request) {
  let body: { id?: string; status?: CallStatus; inquiryId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  if (!body.id || !body.status) {
    return NextResponse.json({ error: "id und status werden benötigt" }, { status: 400 });
  }

  const call = await anrufLaden(body.id);
  if (!call) return NextResponse.json({ error: "Anruf nicht gefunden" }, { status: 404 });

  call.status = body.status;
  if (body.inquiryId) call.inquiryId = body.inquiryId;
  await anrufSichern(call);

  return NextResponse.json({ call });
}
