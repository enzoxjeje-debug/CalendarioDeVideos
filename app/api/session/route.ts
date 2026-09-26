import { NextResponse } from "next/server";
import { user2PinConfigured, user2Token, verifyUser2Pin } from "@/lib/auth";

export const dynamic = "force-dynamic";

const MAX_ATTEMPTS = 8;
const WINDOW_MS = 10 * 60 * 1000;
const attempts = new Map<string, { count: number; resetAt: number }>();

function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return (forwarded?.split(",")[0] ?? request.headers.get("x-real-ip") ?? "local").trim();
}

function tooManyAttempts(key: string): boolean {
  const entry = attempts.get(key);
  if (!entry) return false;
  if (Date.now() > entry.resetAt) {
    attempts.delete(key);
    return false;
  }
  return entry.count >= MAX_ATTEMPTS;
}

function registerFailure(key: string) {
  const current = attempts.get(key);
  if (!current || Date.now() > current.resetAt) {
    attempts.set(key, { count: 1, resetAt: Date.now() + WINDOW_MS });
    return;
  }
  current.count += 1;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function GET() {
  return NextResponse.json(
    { pinRequired: user2PinConfigured() },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  const key = clientKey(request);

  if (tooManyAttempts(key)) {
    return NextResponse.json(
      { error: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo." },
      { status: 429 },
    );
  }

  if (!user2PinConfigured()) {
    return NextResponse.json(
      { error: "El acceso del usuario 2 todavía no está configurado en el servidor." },
      { status: 503 },
    );
  }

  let body: { pin?: unknown } | null = null;
  try {
    body = (await request.json()) as { pin?: unknown };
  } catch {
    body = null;
  }

  const pin = typeof body?.pin === "string" ? body.pin : "";

  if (!verifyUser2Pin(pin)) {
    registerFailure(key);
    // Pequeña espera para que probar PINes a la fuerza salga caro.
    await sleep(400);
    return NextResponse.json({ error: "PIN incorrecto" }, { status: 401 });
  }

  attempts.delete(key);
  return NextResponse.json(
    { token: user2Token() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
