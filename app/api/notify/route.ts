import { NextResponse } from "next/server";
import { isValidUser2Token } from "@/lib/auth";
import { notifyChannels, notifyVideoReady } from "@/lib/notify";
import { todayKey } from "@/lib/dates";
import { USER_NAMES } from "@/lib/presets";

export const dynamic = "force-dynamic";

/** Que canales hay configurados (sin exponer ninguna credencial). */
export async function GET() {
  return NextResponse.json(
    { channels: notifyChannels() },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/**
 * Envia un aviso de prueba. Solo el usuario 2 puede dispararlo, porque es
 * quien provoca los avisos reales al confirmar un video.
 */
export async function POST(request: Request) {
  if (!isValidUser2Token(request.headers.get("x-user2-token"))) {
    return NextResponse.json(
      { code: "USER2_PIN_REQUIRED", error: "Entra con el PIN del usuario 2 para probar los avisos." },
      { status: 401 },
    );
  }

  const results = await notifyVideoReady({
    date: todayKey(),
    pageName: "GGDROP",
    title: "Aviso de prueba de VideoCal",
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    totalForDay: 1,
    readyForDay: 1,
    assignedBy: USER_NAMES.user1,
    confirmedBy: USER_NAMES.user2,
    test: true,
  });

  return NextResponse.json(
    { results },
    { headers: { "Cache-Control": "no-store" } },
  );
}
