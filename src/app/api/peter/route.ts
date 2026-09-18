import { NextResponse } from "next/server";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `Du bist "Peter", der Assistent in der Software Angebotsmeister für einen kleinen deutschen Malerbetrieb.

Du antwortest kurz, konkret und auf Deutsch – so, wie ein erfahrener Bürokollege mit einem Handwerksmeister spricht. Keine Floskeln, keine Marketingsprache.

STRIKTE REGELN:
1. Du verwendest ausschließlich Preise und Leistungen aus dem übergebenen LEISTUNGSKATALOG. Du erfindest niemals Preise, Leistungen, Mengen oder Termine.
2. Fehlt eine Information (z. B. eine Fläche), sagst du das ausdrücklich, statt zu schätzen.
3. Du verschickst nichts und kontaktierst niemanden. Du bereitest Texte vor, der Nutzer versendet sie selbst.
4. Du markierst keine Aufträge als gewonnen oder verloren und änderst keine Status. Du schlägst vor, der Nutzer entscheidet.
5. Alle Fakten (Namen, Beträge, Daten) stammen aus dem übergebenen Datenauszug. Steht etwas nicht drin, sagst du, dass es nicht erfasst ist.
6. Bei allem mit Außenwirkung weist du darauf hin, dass der Nutzer es bestätigen muss.

Antworte in klarem Fließtext oder kurzen Listen, maximal 150 Wörter.`;

export async function GET() {
  return NextResponse.json({ available: Boolean(process.env.ANTHROPIC_API_KEY) });
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        available: false,
        text: "Für freie Fragen ist noch kein Sprachmodell hinterlegt. Die eingebauten Auswertungen funktionieren trotzdem.",
      },
      { status: 200 },
    );
  }

  let body: { question?: string; context?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  const question = (body.question ?? "").trim();
  const context = body.context ?? "";
  if (!question) return NextResponse.json({ error: "Keine Frage übergeben" }, { status: 400 });

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-opus-5",
        max_tokens: 800,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `AKTUELLER DATENAUSZUG DES BETRIEBS:\n${context}\n\nFRAGE DES NUTZERS:\n${question}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error("Anthropic-Fehler", response.status, detail);
      return NextResponse.json(
        { available: true, text: "Das Sprachmodell antwortet gerade nicht. Versuch es gleich noch einmal." },
        { status: 200 },
      );
    }

    const json = (await response.json()) as { content?: { type: string; text?: string }[] };
    const text =
      json.content
        ?.filter((c) => c.type === "text")
        .map((c) => c.text ?? "")
        .join("\n")
        .trim() || "Dazu habe ich keine Antwort gefunden.";

    return NextResponse.json({ available: true, text });
  } catch (error) {
    console.error("Peter-Anfrage fehlgeschlagen", error);
    return NextResponse.json(
      { available: true, text: "Verbindung zum Sprachmodell fehlgeschlagen." },
      { status: 200 },
    );
  }
}
