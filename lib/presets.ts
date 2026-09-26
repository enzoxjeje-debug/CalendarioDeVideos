import type { Accent, CalendarState, PageItem, Users } from "./types";

/** Los dos nombres son fijos: no se editan desde la interfaz. */
export const USER_NAMES: Users = {
  user1: "DaemonCS",
  user2: "Enzo Editor",
};

export const ACCENTS: Accent[] = [
  "violet",
  "amber",
  "cyan",
  "rose",
  "lime",
  "sky",
  "fuchsia",
  "orange",
];

export const ACCENT_HEX: Record<Accent, string> = {
  violet: "#8b5cf6",
  amber: "#f59e0b",
  cyan: "#06b6d4",
  rose: "#f43f5e",
  lime: "#84cc16",
  sky: "#0ea5e9",
  fuchsia: "#d946ef",
  orange: "#f97316",
};

export const STATE_VERSION = 1;

export function slugifyPage(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim()
    .slice(0, 18);
}

export function builtInPages(): PageItem[] {
  const now = new Date(0).toISOString();
  return [
    {
      id: "page-ggdrop",
      name: "GGDROP",
      slug: "GGDROP",
      accent: "violet",
      builtIn: true,
      createdAt: now,
    },
    {
      id: "page-llavedrop",
      name: "LLAVEDROP",
      slug: "LLAVEDROP",
      accent: "amber",
      builtIn: true,
      createdAt: now,
    },
  ];
}

export function emptyState(): CalendarState {
  return {
    version: STATE_VERSION,
    pages: builtInPages(),
    assignments: [],
    updatedAt: new Date().toISOString(),
  };
}
