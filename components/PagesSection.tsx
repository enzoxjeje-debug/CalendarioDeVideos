"use client";

import { useRef, useState } from "react";
import { gsap, useGSAP, withMotion } from "@/lib/gsap";
import { accentGlow, accentStyle } from "@/lib/colors";
import { ACCENTS } from "@/lib/presets";
import { formatShortDate } from "@/lib/dates";
import { pageStats } from "@/lib/logic";
import { useCalendar } from "./CalendarProvider";
import { AccentDot, SectionHeading, StorageNotice } from "./ui";
import { IconLayers, IconPlus, IconTrash } from "./icons";
import type { Accent } from "@/lib/types";

export default function PagesSection() {
  const rootRef = useRef<HTMLElement>(null);
  const { state, storage, addPage, removePage, sync } = useCalendar();
  // Arranca con el total actual para que solo anime las paginas nuevas.
  const previousCount = useRef(state.pages.length);

  const [name, setName] = useState("");
  const [accent, setAccent] = useState<Accent>("cyan");
  const [formError, setFormError] = useState<string | null>(null);

  // Aparicion escalonada de las tarjetas + "pop" al agregar una nueva.
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      withMotion(mm, () => {
        if (state.pages.length > previousCount.current) {
          const cards = gsap.utils.toArray<HTMLElement>("[data-page-card]");
          const last = cards[cards.length - 1];
          if (last) {
            gsap.from(last, {
              y: 20,
              opacity: 0,
              scale: 0.95,
              duration: 0.55,
              ease: "back.out(1.7)",
            });
          }
        }
        previousCount.current = state.pages.length;
      });
      return () => mm.revert();
    },
    { scope: rootRef, dependencies: [state.pages.length] },
  );

  async function handleAddPage(event: React.FormEvent) {
    event.preventDefault();
    if (name.trim().length < 2) {
      setFormError("El nombre debe tener al menos 2 caracteres");
      return;
    }
    const ok = await addPage(name.trim(), accent);
    if (ok) {
      setName("");
      setAccent(ACCENTS[state.pages.length % ACCENTS.length] ?? "cyan");
      setFormError(null);
    } else {
      setFormError("No se pudo crear la página. Quizá ya existe.");
    }
  }

  return (
    <section id="paginas" ref={rootRef} className="relative py-20 sm:py-24">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 sm:px-6">
        <SectionHeading
          label="Páginas"
          icon={<IconLayers size={13} />}
          title="Los canales donde se publica cada video"
          description="GGDROP y LLAVEDROP vienen incluidas. Agrega las páginas que necesites: cada una tiene su color y su propio historial de videos dentro del calendario."
        />

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
            {state.pages.map((page) => {
              const stats = pageStats(state, page.id);
              return (
                <article
                  key={page.id}
                  data-page-card
                  className="glass-soft flex flex-col gap-4 rounded-2xl p-5"
                  style={{ boxShadow: accentGlow(page.accent, 0.45) }}
                >
                  <header className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <AccentDot accent={page.accent} size={10} />
                      <div>
                        <h3 className="text-base font-semibold tracking-tight text-white">
                          {page.name}
                        </h3>
                        <span
                          className="chip mt-1"
                          style={{ ...accentStyle(page.accent, 0.12), fontSize: "0.6rem" }}
                        >
                          {page.builtIn ? "Preestablecida" : "Personalizada"}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      disabled={page.builtIn || sync === "saving"}
                      title={
                        page.builtIn
                          ? "Las páginas preestablecidas no se pueden borrar"
                          : "Borrar página"
                      }
                      onClick={() => void removePage(page.id)}
                    >
                      <IconTrash size={13} />
                      <span className="sr-only">Borrar {page.name}</span>
                    </button>
                  </header>

                  <dl className="grid grid-cols-3 gap-2 text-center">
                    {[
                      { label: "Videos", value: stats.total, color: "#e7eaf6" },
                      { label: "Pendientes", value: stats.pending, color: "#ff7382" },
                      { label: "Listos", value: stats.ready, color: "#4ee79b" },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="rounded-xl border border-white/10 bg-white/[0.03] px-2 py-2.5"
                      >
                        <dt className="text-[0.58rem] font-semibold tracking-[0.1em] text-ink-400 uppercase">
                          {item.label}
                        </dt>
                        <dd
                          className="mt-0.5 text-lg font-semibold tabular-nums"
                          style={{ color: item.color }}
                        >
                          {item.value}
                        </dd>
                      </div>
                    ))}
                  </dl>

                  <p className="text-xs text-ink-400">
                    {stats.next ? (
                      <>
                        Próximo video:{" "}
                        <span className="font-semibold text-ink-200">
                          {formatShortDate(stats.next.date)}
                        </span>{" "}
                        · {stats.next.title || "sin título"}
                      </>
                    ) : (
                      "Todavía sin videos programados"
                    )}
                  </p>
                </article>
              );
            })}
          </div>

          <div className="flex flex-col gap-4">
            <form
              data-reveal
              onSubmit={handleAddPage}
              className="glass flex flex-col gap-4 rounded-2xl p-5"
            >
              <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                <IconPlus size={15} />
                Agregar página
              </h3>
              <div>
                <label className="label" htmlFor="page-name">
                  Nombre
                </label>
                <input
                  id="page-name"
                  className="input"
                  value={name}
                  maxLength={18}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Ej: CASEDROP"
                />
              </div>
              <div>
                <span className="label">Color de la página</span>
                <div className="flex flex-wrap gap-2">
                  {ACCENTS.map((item) => (
                    <button
                      key={item}
                      type="button"
                      aria-label={`Color ${item}`}
                      aria-pressed={accent === item}
                      onClick={() => setAccent(item)}
                      className="h-7 w-7 rounded-full transition-transform"
                      style={{
                        ...accentStyle(item, 0.35),
                        transform: accent === item ? "scale(1.15)" : "scale(1)",
                        boxShadow:
                          accent === item
                            ? `0 0 0 2px rgba(255,255,255,0.85), ${accentGlow(item, 0.8)}`
                            : "none",
                      }}
                    >
                      <span className="sr-only">{item}</span>
                    </button>
                  ))}
                </div>
              </div>

              {formError ? (
                <p className="rounded-xl border border-danger-500/30 bg-danger-500/10 px-3 py-2 text-xs text-danger-400">
                  {formError}
                </p>
              ) : null}

              <button type="submit" className="btn btn-primary" disabled={sync === "saving"}>
                <IconPlus size={15} />
                Crear página
              </button>
              <p className="text-[0.7rem] leading-relaxed text-ink-500">
                Máximo 12 páginas. Al borrar una página también se eliminan los videos asignados a
                ella.
              </p>
            </form>
          </div>
        </div>

        <StorageNotice storage={storage} />
      </div>
    </section>
  );
}
