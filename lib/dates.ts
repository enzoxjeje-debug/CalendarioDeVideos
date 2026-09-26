const pad = (n: number) => String(n).padStart(2, "0");

/** Convierte un Date local a la clave YYYY-MM-DD usada en el almacenamiento. */
export function toKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Convierte YYYY-MM-DD en un Date local a medianoche. */
export function fromKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function todayKey(): string {
  return toKey(new Date());
}

export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

export function addMonths(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

export type GridDay = { date: Date; key: string; inMonth: boolean; isoWeekday: number };

/** Matriz de 6 semanas x 7 dias empezando en lunes, para una cuadricula estable. */
export function monthMatrix(month: Date, weekStartsOn = 1): GridDay[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = (first.getDay() - weekStartsOn + 7) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - offset);

  const days: GridDay[] = [];
  for (let i = 0; i < 42; i += 1) {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    days.push({
      date,
      key: toKey(date),
      inMonth: date.getMonth() === month.getMonth(),
      isoWeekday: date.getDay() === 0 ? 7 : date.getDay(),
    });
  }
  return days;
}

export const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export function formatMonth(date: Date): string {
  return new Intl.DateTimeFormat("es-ES", {
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatLongDate(date: Date): string {
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatShortDate(key: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
  }).format(fromKey(key));
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Todas las fechas (keys) que caen en un mes dado. */
export function monthKeys(month: Date): Set<string> {
  const keys = new Set<string>();
  for (const day of monthMatrix(month)) {
    if (day.inMonth) keys.add(day.key);
  }
  return keys;
}
