import { after, NextResponse } from "next/server";
import {
  applyDeleteAssignment,
  applySetStatus,
  applyUpsertAssignment,
} from "@/lib/mutations";
import { isValidUser2Token } from "@/lib/auth";
import { notifyVideoReady } from "@/lib/notify";
import { USER_NAMES } from "@/lib/presets";
import { getState, mutateState, storageKind } from "@/lib/store";
import type { CalendarState, UserId } from "@/lib/types";

export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function asActor(value: unknown): UserId {
  return value === "user2" ? "user2" : "user1";
}

/**
 * Actuar como usuario 2 exige el PIN: sin token valido el servidor rechaza la
 * mutacion, asi que cambiar el selector en el navegador no basta.
 */
function requireUser2(request: Request, actor: UserId) {
  if (actor !== "user2") return null;
  if (isValidUser2Token(request.headers.get("x-user2-token"))) return null;
  return NextResponse.json(
    {
      code: "USER2_PIN_REQUIRED",
      error: "Este cambio necesita el PIN del usuario 2.",
    },
    { status: 401 },
  );
}

function payload(state: CalendarState) {
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

  const date = typeof body.date === "string" ? body.date : "";
  const pageId = typeof body.pageId === "string" ? body.pageId : "";
  const title = typeof body.title === "string" ? body.title.trim().slice(0, 140) : "";
  const url = typeof body.url === "string" ? body.url.trim().slice(0, 500) : "";
  const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 400) : "";
  const id = typeof body.id === "string" && body.id ? body.id : undefined;

  if (!DATE_RE.test(date)) return bad("Fecha inválida (usa el formato AAAA-MM-DD)");
  if (!pageId) return bad("Falta la página");
  if (!title) return bad("Escribe el título o la idea del video");

  const actor = asActor(body.actor);
  const denied = requireUser2(request, actor);
  if (denied) return denied;

  const current = await getState();
  if (!current.pages.some((page) => page.id === pageId)) {
    return bad("La página no existe", 404);
  }

  const next = await mutateState(
    (state) =>
      applyUpsertAssignment(state, {
        id,
        date,
        pageId,
        title,
        url,
        notes,
        actor,
      }).state,
  );

  return payload(next);
}

export async function PATCH(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return bad("JSON inválido");
  }

  const id = typeof body.id === "string" ? body.id : "";
  const status = body.status === "ready" ? "ready" : "assigned";
  if (!id) return bad("Falta el id de la asignación");

  const actor = asActor(body.actor);
  const denied = requireUser2(request, actor);
  if (denied) return denied;

  const current = await getState();
  const previous = current.assignments.find((item) => item.id === id);
  if (!previous) {
    return bad("La asignación no existe", 404);
  }

  const next = await mutateState((state) => applySetStatus(state, { id, status, actor }));

  // Aviso al usuario 1 solo en la transicion pendiente -> listo (no al
  // reabrir ni al volver a confirmar). Se envia despues de responder, para que
  // el guardado nunca espere a Resend, CallMeBot o al webhook.
  if (status === "ready" && previous.status === "assigned") {
    const entry = next.assignments.find((item) => item.id === id);
    const sameDay = next.assignments.filter((item) => item.date === previous.date);
    if (entry) {
      const page = next.pages.find((item) => item.id === entry.pageId);
      after(async () => {
        await notifyVideoReady({
          date: entry.date,
          pageName: page?.name ?? "Página",
          title: entry.title,
          url: entry.url,
          totalForDay: sameDay.length,
          readyForDay: sameDay.filter((item) => item.status === "ready").length,
          assignedBy: USER_NAMES[entry.createdBy],
          confirmedBy: USER_NAMES[entry.readyBy ?? actor],
        });
      });
    }
  }

  return payload(next);
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return bad("Falta el id de la asignación");

  const next = await mutateState((state) => applyDeleteAssignment(state, id));
  return payload(next);
}
