import { NextResponse } from "next/server";
import { applyAddPage, applyDeletePage } from "@/lib/mutations";
import { getState, mutateState, storageKind } from "@/lib/store";
import { ACCENTS } from "@/lib/presets";
import type { Accent } from "@/lib/types";

export const dynamic = "force-dynamic";

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function payload(state: Awaited<ReturnType<typeof getState>>) {
  return NextResponse.json(
    { state, storage: storageKind() },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return bad("JSON inválido");
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (name.length < 2) return bad("El nombre debe tener al menos 2 caracteres");
  if (name.length > 18) return bad("El nombre no puede superar los 18 caracteres");

  const accent =
    typeof body.accent === "string" && ACCENTS.includes(body.accent as Accent)
      ? (body.accent as Accent)
      : undefined;

  try {
    const next = await mutateState((state) => applyAddPage(state, { name, accent }).state);
    return payload(next);
  } catch (error) {
    return bad(error instanceof Error ? error.message : "No se pudo crear la página");
  }
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return bad("Falta el id de la página");

  const current = await getState();
  if (!current.pages.some((page) => page.id === id)) return bad("La página no existe", 404);

  try {
    const next = await mutateState((state) => applyDeletePage(state, id));
    return payload(next);
  } catch (error) {
    return bad(error instanceof Error ? error.message : "No se pudo borrar la página");
  }
}
