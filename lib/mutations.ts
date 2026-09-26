import { ACCENTS, slugifyPage } from "./presets";
import type {
  Accent,
  Assignment,
  Assignment as A,
  CalendarState,
  PageItem,
  UserId,
} from "./types";

function touch(state: CalendarState): CalendarState {
  return { ...state, updatedAt: new Date().toISOString() };
}

export type UpsertAssignmentInput = {
  id?: string;
  date: string;
  pageId: string;
  title: string;
  url: string;
  notes?: string;
  actor: UserId;
};

/** Crea o actualiza el video de un dia para una pagina. */
export function applyUpsertAssignment(
  state: CalendarState,
  input: UpsertAssignmentInput,
): { state: CalendarState; assignment: A } {
  const now = new Date().toISOString();
  const existing = input.id
    ? state.assignments.find((item) => item.id === input.id)
    : state.assignments.find(
        (item) => item.date === input.date && item.pageId === input.pageId,
      );

  // El link y las notas son cosa del usuario 2: si el usuario 1 los manda
  // (o intenta borrarlos), el servidor los ignora y conserva lo que ya habia.
  const canEditMedia = input.actor === "user2";

  const next: A = existing
    ? {
        ...existing,
        date: input.date,
        pageId: input.pageId,
        title: input.title,
        url: canEditMedia ? input.url : existing.url,
        notes: canEditMedia ? (input.notes ?? "") : existing.notes,
        updatedAt: now,
      }
    : {
        id: `asg-${crypto.randomUUID().slice(0, 12)}`,
        date: input.date,
        pageId: input.pageId,
        title: input.title,
        url: canEditMedia ? input.url : "",
        notes: canEditMedia ? (input.notes ?? "") : "",
        status: "assigned",
        createdBy: input.actor,
        createdAt: now,
        updatedAt: now,
        readyBy: null,
        readyAt: null,
      };

  const assignments = existing
    ? state.assignments.map((item) => (item.id === existing.id ? next : item))
    : [...state.assignments, next];

  return { state: touch({ ...state, assignments }), assignment: next };
}

/** Marca el video como listo (verde) o vuelve a pendiente (rojo). */
export function applySetStatus(
  state: CalendarState,
  input: { id: string; status: Assignment["status"]; actor: UserId },
): CalendarState {
  const now = new Date().toISOString();
  const assignments = state.assignments.map((item) => {
    if (item.id !== input.id) return item;
    if (input.status === "ready") {
      return {
        ...item,
        status: "ready" as const,
        readyBy: input.actor,
        readyAt: now,
        updatedAt: now,
      };
    }
    return {
      ...item,
      status: "assigned" as const,
      readyBy: null,
      readyAt: null,
      updatedAt: now,
    };
  });
  return touch({ ...state, assignments });
}

export function applyDeleteAssignment(state: CalendarState, id: string): CalendarState {
  return touch({
    ...state,
    assignments: state.assignments.filter((item) => item.id !== id),
  });
}

export function applyAddPage(
  state: CalendarState,
  input: { name: string; accent?: Accent },
): { state: CalendarState; page: PageItem } {
  const name = input.name.trim();
  const used = new Set(state.pages.map((page) => page.name.toUpperCase()));
  if (used.has(name.toUpperCase())) {
    throw new Error("Esa pagina ya existe");
  }
  if (state.pages.length >= 12) {
    throw new Error("Maximo 12 paginas");
  }
  const accent =
    input.accent ?? ACCENTS[state.pages.length % ACCENTS.length] ?? "cyan";
  const page: PageItem = {
    id: `page-${crypto.randomUUID().slice(0, 12)}`,
    name,
    slug: slugifyPage(name),
    accent,
    builtIn: false,
    createdAt: new Date().toISOString(),
  };
  return { state: touch({ ...state, pages: [...state.pages, page] }), page };
}

export function applyDeletePage(state: CalendarState, id: string): CalendarState {
  const page = state.pages.find((item) => item.id === id);
  if (!page) return state;
  if (page.builtIn) throw new Error("Las paginas preestablecidas no se pueden borrar");
  return touch({
    ...state,
    pages: state.pages.filter((item) => item.id !== id),
    assignments: state.assignments.filter((item) => item.pageId !== id),
  });
}

