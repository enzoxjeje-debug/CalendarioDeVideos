/** Identificadores de las dos personas que comparten el calendario. */
export type UserId = "user1" | "user2";

export type Users = Record<UserId, string>;

/** Una pagina/canal donde se publican los videos (ej. GGDROP, LLAVEDROP). */
export type PageItem = {
  id: string;
  /** Nombre visible, ej. "GGDROP". */
  name: string;
  /** Slug en mayusculas para mostrar en el calendario, ej. "GGDROP". */
  slug: string;
  /** Token de acento Tailwind-friendly, ej. "violet". */
  accent: Accent;
  /** true para las paginas preestablecidas (no se pueden borrar). */
  builtIn: boolean;
  createdAt: string;
};

export type Accent =
  | "violet"
  | "amber"
  | "cyan"
  | "rose"
  | "lime"
  | "sky"
  | "fuchsia"
  | "orange";

/** Un video asignado a un dia concreto para una pagina concreta. */
export type Assignment = {
  id: string;
  /** Fecha local en formato YYYY-MM-DD. */
  date: string;
  pageId: string;
  title: string;
  url: string;
  notes: string;
  /** "assigned" = pendiente (rojo), "ready" = confirmado (verde). */
  status: "assigned" | "ready";
  createdBy: UserId;
  createdAt: string;
  updatedAt: string;
  readyBy: UserId | null;
  readyAt: string | null;
};

export type CalendarState = {
  version: number;
  pages: PageItem[];
  assignments: Assignment[];
  updatedAt: string;
};

/** Estado agregado de un dia, usado para pintar la celda del calendario. */
export type DayStatus = "empty" | "pending" | "ready" | "mixed";

export type StorageKind = "redis" | "file" | "memory";
