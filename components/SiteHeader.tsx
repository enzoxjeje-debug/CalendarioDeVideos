"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { useCalendar } from "./CalendarProvider";
import { IconCalendar, IconLock, IconRefresh } from "./icons";

const NAV = [
  { href: "#calendario", label: "Calendario" },
  { href: "#paginas", label: "Paginas" },
  { href: "#como-funciona", label: "Como funciona" },
];

export default function SiteHeader({
  onRequireUser2Access,
}: {
  /** El PIN se pide desde el shell: el modal no puede vivir dentro del
   *  encabezado porque su backdrop-blur atrapa los hijos `fixed`. */
  onRequireUser2Access: () => void;
}) {
  const headerRef = useRef<HTMLElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);
  const { users, me, setMe, sync, refresh, user2Unlocked, lockUser2 } = useCalendar();

  useGSAP(
    () => {
      gsap.from(headerRef.current, {
        y: -24,
        opacity: 0,
        duration: 0.7,
        ease: "power3.out",
      });

      const progress = progressRef.current;
      if (progress) {
        gsap.fromTo(
          progress,
          { scaleX: 0 },
          {
            scaleX: 1,
            ease: "none",
            scrollTrigger: {
              trigger: document.documentElement,
              start: "top top",
              end: "bottom bottom",
              scrub: 0.4,
            },
          },
        );
      }
    },
    { scope: headerRef },
  );

  const syncLabel = {
    idle: "Al dia",
    saving: "Guardando…",
    syncing: "Sincronizando…",
    error: "Reintentar",
  }[sync];
  const syncColor =
    sync === "error" ? "#ff7382" : sync === "idle" ? "#4ee79b" : "#c4b5fd";

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-50 border-b border-white/5 bg-ink-950/70 backdrop-blur-xl"
    >
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <a href="#calendario" className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-linear-to-br from-brand-500 to-brand-600 text-white shadow-lg shadow-brand-600/30">
            <IconCalendar size={18} />
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-sm font-semibold tracking-tight text-white">VideoCal</span>
            <span className="text-[0.65rem] tracking-[0.14em] text-ink-400 uppercase">
              2 personas · 1 calendario
            </span>
          </span>
        </a>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-full px-3.5 py-2 text-sm text-ink-300 transition-colors hover:bg-white/5 hover:text-white"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 md:flex">
            <button
              type="button"
              onClick={() => void refresh()}
              title="Sincronizar ahora"
              className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-white/5 text-ink-300 transition-colors hover:text-white"
            >
              <IconRefresh size={14} />
              <span className="sr-only">Sincronizar ahora</span>
            </button>
            <span className="flex items-center gap-1.5 text-[0.7rem] font-medium" style={{ color: syncColor }}>
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: syncColor, boxShadow: `0 0 8px ${syncColor}` }}
              />
              {syncLabel}
            </span>
          </div>

          <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 p-1">
            <span className="hidden px-2 text-[0.62rem] font-semibold tracking-[0.14em] text-ink-400 uppercase sm:inline">
              Estoy como
            </span>
            {(["user1", "user2"] as const).map((id) => {
              const active = me === id;
              const color = id === "user1" ? "#ff4d5e" : "#22d97f";
              const locked = id === "user2" && !user2Unlocked;
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={active}
                  title={
                    locked
                      ? `Entrar como ${users[id]} pide su PIN numerico`
                      : `Usar el calendario como ${users[id]}`
                  }
                  onClick={() => {
                    // El usuario 2 solo entra con el PIN, que se valida en el servidor.
                    if (locked) {
                      onRequireUser2Access();
                      return;
                    }
                    setMe(id);
                  }}
                  className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold transition-all"
                  style={{
                    background: active ? `color-mix(in oklab, ${color} 22%, transparent)` : "transparent",
                    color: active ? color : "#9aa2c0",
                    boxShadow: active ? `inset 0 0 0 1px color-mix(in oklab, ${color} 45%, transparent)` : "none",
                  }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
                  {users[id]}
                  {locked ? <IconLock size={11} className="opacity-70" /> : null}
                </button>
              );
            })}

            {user2Unlocked ? (
              <button
                type="button"
                onClick={lockUser2}
                title={`Bloquear la sesion de ${users.user2}`}
                className="ml-0.5 grid h-7 w-7 place-items-center rounded-full text-ink-400 transition-colors hover:bg-white/10 hover:text-white"
              >
                <IconLock size={13} />
                <span className="sr-only">Bloquear la sesion de {users.user2}</span>
              </button>
            ) : null}
          </div>
        </div>
      </div>



      <span className="pointer-events-none absolute inset-x-0 bottom-0 h-px overflow-hidden">
        <span
          ref={progressRef}
          className="block h-px w-full origin-left bg-linear-to-r from-brand-400 via-success-400 to-danger-500"
          style={{ transform: "scaleX(0)" }}
        />
      </span>
    </header>
  );
}
