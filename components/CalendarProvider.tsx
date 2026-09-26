"use client";

import { createContext, useContext } from "react";
import { useCalendarStore, type CalendarStore } from "@/hooks/useCalendarStore";
import type { CalendarState, StorageKind } from "@/lib/types";

const CalendarContext = createContext<CalendarStore | null>(null);

export function CalendarProvider({
  initialState,
  initialStorage,
  serverToday,
  children,
}: {
  initialState: CalendarState;
  initialStorage: StorageKind;
  serverToday: string;
  children: React.ReactNode;
}) {
  const store = useCalendarStore(initialState, initialStorage, serverToday);
  return <CalendarContext.Provider value={store}>{children}</CalendarContext.Provider>;
}

export function useCalendar(): CalendarStore {
  const context = useContext(CalendarContext);
  if (!context) {
    throw new Error("useCalendar debe usarse dentro de <CalendarProvider>");
  }
  return context;
}
