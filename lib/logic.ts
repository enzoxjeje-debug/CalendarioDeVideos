import type { Assignment, CalendarState, DayStatus, PageItem } from "./types";
import { monthKeys, todayKey } from "./dates";

export function pageById(pages: PageItem[], id: string): PageItem | undefined {
  return pages.find((page) => page.id === id);
}

export function pageLabel(pages: PageItem[], id: string): PageItem {
  return (
    pageById(pages, id) ?? {
      id,
      name: "Página eliminada",
      slug: "—",
      accent: "cyan",
      builtIn: false,
      createdAt: "",
    }
  );
}

/** Agrupa las asignaciones por dia para pintar el calendario en una pasada. */
export function groupByDate(assignments: Assignment[]): Map<string, Assignment[]> {
  const map = new Map<string, Assignment[]>();
  for (const item of assignments) {
    const list = map.get(item.date);
    if (list) list.push(item);
    else map.set(item.date, [item]);
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
  return map;
}

/**
 * Estado visual de un dia:
 * - empty: sin videos
 * - pending: solo rojo (asignado, sin confirmar)
 * - ready: todo confirmado (verde)
 * - mixed: parte confirmada y parte pendiente
 */
export function dayStatus(entries: Assignment[] | undefined): DayStatus {
  if (!entries || entries.length === 0) return "empty";
  const ready = entries.filter((entry) => entry.status === "ready").length;
  if (ready === entries.length) return "ready";
  if (ready === 0) return "pending";
  return "mixed";
}

export const STATUS_LABEL: Record<DayStatus, string> = {
  empty: "Sin video",
  pending: "Video asignado",
  ready: "Video listo",
  mixed: "Parcialmente listo",
};

export type MonthStats = {
  total: number;
  pending: number;
  ready: number;
  daysWithVideo: number;
  pagesInUse: number;
};

export function monthStats(state: CalendarState, month: Date): MonthStats {
  const keys = monthKeys(month);
  const inMonth = state.assignments.filter((item) => keys.has(item.date));
  const days = new Set(inMonth.map((item) => item.date));
  const pages = new Set(inMonth.map((item) => item.pageId));
  return {
    total: inMonth.length,
    pending: inMonth.filter((item) => item.status === "assigned").length,
    ready: inMonth.filter((item) => item.status === "ready").length,
    daysWithVideo: days.size,
    pagesInUse: pages.size,
  };
}

export function pageStats(state: CalendarState, pageId: string) {
  const items = state.assignments
    .filter((item) => item.pageId === pageId)
    .sort((a, b) => a.date.localeCompare(b.date));
  const todayIso = todayKey();
  return {
    total: items.length,
    pending: items.filter((item) => item.status === "assigned").length,
    ready: items.filter((item) => item.status === "ready").length,
    next: items.find((item) => item.date >= todayIso) ?? null,
  };
}

/** Ordena las asignaciones de un dia por pagina y estado. */
export function sortEntries(entries: Assignment[]): Assignment[] {
  return [...entries].sort((a, b) => {
    if (a.status !== b.status) return a.status === "assigned" ? -1 : 1;
    return a.date.localeCompare(b.date);
  });
}
