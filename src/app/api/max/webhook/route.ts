import { NextResponse } from "next/server";
import { processMaxUpdates, webhookSecret } from "@/lib/max";

export async function POST(req: Request) {
  const secret = await webhookSecret();
  if (secret) {
    const header = req.headers.get("x-max-bot-api-secret") || "";
    if (header !== secret) {
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  const payload = await req.json().catch(() => null);
  const updates = Array.isArray(payload)
    ? payload
    : payload?.updates
      ? payload.updates
      : payload
        ? [payload]
        : [];
  await processMaxUpdates(updates);
  return NextResponse.json({ ok: true });
}
