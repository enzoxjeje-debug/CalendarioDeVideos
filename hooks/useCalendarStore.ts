"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { todayKey } from "@/lib/dates";
import { USER_NAMES } from "@/lib/presets";
import type { Accent, CalendarState, StorageKind, UserId } from "@/lib/types";

export type SyncState = "idle" | "saving" | "syncing" | "error";
const ME_KEY = "videocal:me";
const USER2_KEY = "videocal:user2-token";
const POLL_MS = 12_000;

type StatePayload = {
  state?: CalendarState;
  storage?: StorageKind;
  error?: string;
  code?: string;
};

export type AssignmentDraft = {
  id?: string;
  date: string;
  pageId: string;
  title: string;
  url: string;
  notes: string;
};

export function useCalendarStore(
  initialState: CalendarState,
  initialStorage: StorageKind,
  initialToday: string,
) {
  const [state, setState] = useState<CalendarState>(initialState);
  const [storage, setStorage] = useState<StorageKind>(initialStorage);
  const [sync, setSync] = useState<SyncState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [me, setMeState] = useState<UserId>("user1");
  const [user2Token, setUser2Token] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  // Arranca con la fecha del servidor (SSR sin desajustes) y se corrige con la
  // zona horaria del visitante justo despues de hidratar.
  const [today, setToday] = useState<string>(initialToday);
  const inFlight = useRef(0);

  const applyPayload = useCallback((payload: StatePayload) => {
    if (payload.state) setState(payload.state);
    if (payload.storage) setStorage(payload.storage);
  }, []);

  /** Identidad local (cada persona elige quien es en su navegador). */
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(ME_KEY);
      const token = window.localStorage.getItem(USER2_KEY);
      if (token) setUser2Token(token);
      // El usuario 2 nunca queda activo sin haber pasado por el PIN.
      if ((stored === "user1" || stored === "user2") && !(stored === "user2" && !token)) {
        setMeState(stored);
      }
    } catch {
      /* almacenamiento no disponible */
    }
    // Corrige la "fecha de hoy" con la zona horaria del visitante tras hidratar.
    setToday(todayKey());
    setReady(true);
  }, []);

  const setMe = useCallback((id: UserId) => {
    setMeState(id);
    try {
      window.localStorage.setItem(ME_KEY, id);
    } catch {
      /* almacenamiento no disponible */
    }
  }, []);

  /**
   * El PIN viaja al servidor y solo se guarda el token si es correcto.
   * Devuelve `null` cuando entra, o el mensaje de error para mostrarlo en el
   * propio modal (asi el fallo no acaba tambien en el aviso global).
   */
  const unlockUser2 = useCallback(
    async (pin: string): Promise<string | null> => {
      try {
        const response = await fetch("/api/session", {
          method: "POST",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin }),
        });
        const payload = (await response.json().catch(() => null)) as
          | { token?: string; error?: string }
          | null;
        if (!response.ok || !payload?.token) {
          return payload?.error ?? "PIN incorrecto";
        }
        setUser2Token(payload.token);
        try {
          window.localStorage.setItem(USER2_KEY, payload.token);
        } catch {
          /* almacenamiento no disponible */
        }
        setMe("user2");
        setError(null);
        return null;
      } catch {
        return "Sin conexión con el servidor. Revisa tu red e inténtalo de nuevo.";
      }
    },
    [setMe],
  );

  /** Cierra la sesion del usuario 2 en este navegador. */
  const lockUser2 = useCallback(() => {
    setUser2Token(null);
    try {
      window.localStorage.removeItem(USER2_KEY);
    } catch {
      /* almacenamiento no disponible */
    }
    setMe("user1");
  }, [setMe]);

  const send = useCallback(
    async (url: string, init: RequestInit): Promise<boolean> => {
      inFlight.current += 1;
      setSync("saving");
      try {
        const response = await fetch(url, {
          ...init,
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
            ...(user2Token ? { "x-user2-token": user2Token } : {}),
            ...(init.headers ?? {}),
          },
        });
        const payload = (await response.json().catch(() => null)) as StatePayload | null;
        if (!response.ok) {
          if (payload?.code === "USER2_PIN_REQUIRED") {
            // El token ya no sirve: se cierra la sesion del usuario 2.
            setUser2Token(null);
            try {
              window.localStorage.removeItem(USER2_KEY);
            } catch {
              /* almacenamiento no disponible */
            }
            setMeState("user1");
          }
          setError(payload?.error ?? "No se pudo guardar el cambio");
          setSync("error");
          return false;
        }
        applyPayload(payload ?? {});
        setSync("idle");
        return true;
      } catch {
        setError("Sin conexión con el servidor. Revisa tu red e inténtalo de nuevo.");
        setSync("error");
        return false;
      } finally {
        inFlight.current -= 1;
      }
    },
    [applyPayload, user2Token],
  );

  /** Peticion suelta (con el token del usuario 2 si lo hay) sin tocar el estado. */
  const postJson = useCallback(
    async <T,>(
      path: string,
      body?: unknown,
    ): Promise<{ ok: boolean; data: T | null; error?: string }> => {
      try {
        const response = await fetch(path, {
          method: "POST",
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
            ...(user2Token ? { "x-user2-token": user2Token } : {}),
          },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
        const data = (await response.json().catch(() => null)) as
          | (T & { error?: string })
          | null;
        if (!response.ok) {
          return { ok: false, data, error: data?.error ?? "No se pudo completar la petición" };
        }
        return { ok: true, data };
      } catch {
        return { ok: false, data: null, error: "Sin conexión con el servidor" };
      }
    },
    [user2Token],
  );

  const refresh = useCallback(async (silent = false) => {
    if (inFlight.current > 0) return;
    if (!silent) setSync("syncing");
    try {
      const response = await fetch("/api/state", { cache: "no-store" });
      if (!response.ok) throw new Error("bad status");
      const payload = (await response.json()) as StatePayload;
      applyPayload(payload);
      setSync("idle");
    } catch {
      if (!silent) setSync("error");
    }
  }, [applyPayload]);

  // Sincronizacion suave: sondeo cada 12s y al volver a la pestana.
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") void refresh(true);
    };
    const interval = window.setInterval(tick, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh(true);
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [refresh]);

  const saveAssignment = useCallback(
    (draft: AssignmentDraft) =>
      send("/api/assignments", {
        method: "POST",
        body: JSON.stringify({ ...draft, actor: me }),
      }),
    [me, send],
  );

  const setAssignmentStatus = useCallback(
    (id: string, status: "assigned" | "ready") =>
      send("/api/assignments", {
        method: "PATCH",
        body: JSON.stringify({ id, status, actor: me }),
      }),
    [me, send],
  );

  const removeAssignment = useCallback(
    (id: string) =>
      send(`/api/assignments?id=${encodeURIComponent(id)}`, { method: "DELETE" }),
    [send],
  );

  const addPage = useCallback(
    (name: string, accent: Accent) =>
      send("/api/pages", { method: "POST", body: JSON.stringify({ name, accent }) }),
    [send],
  );

  const removePage = useCallback(
    (id: string) => send(`/api/pages?id=${encodeURIComponent(id)}`, { method: "DELETE" }),
    [send],
  );

  return {
    state,
    storage,
    sync,
    error,
    clearError: () => setError(null),
    me,
    setMe,
    user2Unlocked: user2Token !== null,
    unlockUser2,
    lockUser2,
    ready,
    today,
    // Los dos nombres son fijos; cada visita solo elige con cual de los dos entra.
    users: USER_NAMES,
    myName: USER_NAMES[me],
    saveAssignment,
    setAssignmentStatus,
    removeAssignment,
    addPage,
    removePage,
    postJson,
    refresh,
  };
}

export type CalendarStore = ReturnType<typeof useCalendarStore>;
