import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Modulo exclusivo del servidor. El PIN del usuario 2 se lee de la variable de
 * entorno `USER2_PIN` y nunca se envia al navegador: el cliente solo recibe un
 * token derivado si acierta, y ese token es lo que viaja en las mutaciones que
 * se hacen como usuario 2.
 */

const PIN = (process.env.USER2_PIN ?? "").trim();

export function user2PinConfigured(): boolean {
  return PIN.length >= 4;
}

/** Token determinista derivado del PIN (no se guarda ni se expone el PIN). */
export function user2Token(): string {
  return createHmac("sha256", PIN).update("videocal:user2:token").digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function verifyUser2Pin(candidate: string): boolean {
  if (!user2PinConfigured()) return false;
  return safeEqual(String(candidate ?? "").trim(), PIN);
}

export function isValidUser2Token(token: string | null | undefined): boolean {
  if (!user2PinConfigured() || !token) return false;
  return safeEqual(token, user2Token());
}
