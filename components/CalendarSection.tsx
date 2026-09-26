"use client";

import { useMemo, useRef, useState } from "react";
import { gsap, SplitText, useGSAP, withMotion } from "@/lib/gsap";
import {
  addMonths,
  formatLongDate,
  formatMonth,
  fromKey,
  monthKey,
  monthMatrix,
  WEEKDAYS,
} from "@/lib/dates";
import { dayStatus, groupByDate, monthStats, pageLabel, STATUS_LABEL } from "@/lib/logic";
import { useCalendar } from "./CalendarProvider";
import DayDrawer from "./DayDrawer";
import NotifyStatus from "./NotifyStatus";
import { Legend, PageChip, StatusDot, StorageNotice } from "./ui";
import { IconCalendar, IconChevronLeft, IconChevronRight, IconPlus } from "./icons";

export default function CalendarSection() {
  const rootRef = useRef<HTMLElement>(null);
  const monthLabelRef = useRef<HTMLHeadingElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [direction, setDirection] = useState(1);
  const { state, users, today, storage, sync } = useCalendar();

  const [cursor, setCursor] = useState(() => {
    const base = fromKey(today);
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const [selected, setSelected] = useState<string | null>(null);

  const byDate = useMemo(() => groupByDate(state.assignments), [state.assignments]);
  const days = useMemo(() => monthMatrix(cursor), [cursor]);
  const stats = useMemo(() => monthStats(state, cursor), [state, cursor]);
  const currentMonthId = monthKey(cursor);
  const monthLabel = useMemo(() => {
    const label = formatMonth(cursor);
    return label.charAt(0).toUpperCase() + label.slice(1);
  }, [cursor]);

  function move(delta: number) {
    setDirection(delta);
    setCursor((prev) => addMonths(prev, delta));
  }

  function goToday() {
    const base = fromKey(today);
    setDirection(1);
    setCursor(new Date(base.getFullYear(), base.getMonth(), 1));
    setSelected(today);
  }

  // Animacion de entrada del titulo: palabras que suben desde una mascara.
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      withMotion(mm, () => {
        const title = titleRef.current;
        if (title) {
          SplitText.create(title, {
            type: "lines,words",
            mask: "lines",
            autoSplit: true,
            linesClass: "overflow-hidden",
            onSplit: (self) =>
              gsap.from(self.words, {
                yPercent: 118,
                opacity: 0,
                duration: 1,
                ease: "expo.out",
                stagger: 0.03,
              }),
          });
        }
        gsap.from("[data-intro-item]", {
          y: 22,
          opacity: 0,
          duration: 0.7,
          ease: "power3.out",
          stagger: 0.08,
          delay: 0.2,
        });
      });
      return () => mm.revert();
    },
    { scope: rootRef },
  );

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      withMotion(mm, () => {
        const cells = gsap.utils.toArray<HTMLElement>(".day-cell");
        if (cells.length) {
          gsap.fromTo(
            cells,
            { opacity: 0, y: 24 * direction, scale: 0.94 },
            {
              opacity: 1,
              y: 0,
              scale: 1,
              duration: 0.5,
              ease: "power3.out",
              stagger: { each: 0.006, from: direction >= 0 ? "start" : "end" },
            },
          );
        }
        if (monthLabelRef.current) {
          gsap.fromTo(
            monthLabelRef.current,
            { opacity: 0, y: 10 * direction },
            { opacity: 1, y: 0, duration: 0.45, ease: "power2.out" },
          );
        }
      });
      return () => mm.revert();
    },
    { scope: rootRef, dependencies: [currentMonthId], revertOnUpdate: true },
  );

  const monthCards = [
    { label: "Videos del mes", value: stats.total, color: "#c4b5fd" },
    { label: "Dias con video", value: stats.daysWithVideo, color: "#67e8f9" },
    { label: "Pendientes", value: stats.pending, color: "#ff7382" },
    { label: "Listos", value: stats.ready, color: "#4ee79b" },
  ];

  return (
    <section id="calendario" ref={rootRef} className="relative py-10 sm:py-14">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col gap-4">
          <span
            data-intro-item
            className="inline-flex w-fit items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-[0.68rem] font-semibold tracking-[0.18em] text-brand-300 uppercase"
          >
            <IconCalendar size={13} />
            Calendario compartido de videos
          </span>
          <h1
            ref={titleRef}
            className="text-3xl font-semibold tracking-tight text-balance text-white sm:text-4xl lg:text-5xl"
          >
            El color de cada dia dice el estado, sin abrir nada.
          </h1>
          <p data-intro-item className="max-w-2xl text-base leading-relaxed text-ink-300">
            Toca un dia para asignar el video de esa pagina. Queda en{" "}
            <span className="font-semibold text-danger-400">rojo</span> hasta que la otra persona
            confirme que ya esta listo y pase a{" "}
            <span className="font-semibold text-success-400">verde</span>.
          </p>
        </div>

        <div data-reveal className="mt-8 flex flex-col gap-5">
          <Legend user1={users.user1} user2={users.user2} />
          <StorageNotice storage={storage} />
        </div>

        <div
          data-reveal
          className="glass mt-6 overflow-hidden rounded-[1.75rem]"
          style={{ transformOrigin: "center" }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 px-4 py-4 sm:px-5">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1">
                <button
                  type="button"
                  onClick={() => move(-1)}
                  className="grid h-8 w-8 place-items-center rounded-full text-ink-300 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <IconChevronLeft size={17} />
                  <span className="sr-only">Mes anterior</span>
                </button>
                <button
                  type="button"
                  onClick={() => move(1)}
                  className="grid h-8 w-8 place-items-center rounded-full text-ink-300 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <IconChevronRight size={17} />
                  <span className="sr-only">Mes siguiente</span>
                </button>
              </div>
              <h3 ref={monthLabelRef} className="min-w-40 text-lg font-semibold text-white">
                {monthLabel}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <span
                className="hidden items-center gap-1.5 text-[0.7rem] font-medium sm:flex"
                style={{ color: sync === "error" ? "#ff7382" : "#9aa2c0" }}
              >
                {sync === "saving" ? "Guardando…" : "Sincronizado en vivo"}
              </span>
              <button type="button" className="btn btn-sm btn-ghost" onClick={goToday}>
                Hoy
              </button>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => setSelected(today)}
              >
                <IconPlus size={14} />
                Asignar video
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 px-4 pt-4 sm:grid-cols-4 sm:px-5">
            {monthCards.map((card) => (
              <div
                key={card.label}
                className="rounded-2xl border border-white/10 bg-white/[0.03] px-3.5 py-3"
              >
                <span className="text-[0.62rem] font-semibold tracking-[0.14em] text-ink-400 uppercase">
                  {card.label}
                </span>
                <p
                  className="mt-1 text-2xl font-semibold tabular-nums"
                  style={{ color: card.color }}
                >
                  {card.value}
                </p>
              </div>
            ))}
          </div>

          <div className="px-3 pt-5 pb-4 sm:px-5">
            <div className="mb-2 grid grid-cols-7 gap-1.5 sm:gap-2">
              {WEEKDAYS.map((weekday) => (
                <span
                  key={weekday}
                  className="text-center text-[0.62rem] font-semibold tracking-[0.14em] text-ink-500 uppercase"
                >
                  {weekday}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {days.map((day) => {
                const entries = byDate.get(day.key) ?? [];
                const status = dayStatus(entries);
                return (
                  <button
                    key={day.key}
                    type="button"
                    className="day-cell"
                    data-outside={!day.inMonth}
                    data-status={status}
                    data-today={day.key === today}
                    data-selected={selected === day.key}
                    onClick={() => setSelected(day.key)}
                    aria-label={`${formatLongDate(day.date)}: ${STATUS_LABEL[status]}${
                      entries.length ? `, ${entries.length} video(s)` : ""
                    }`}
                  >
                    <span className="flex items-start justify-between gap-1">
                      <span
                        className={`font-mono text-[0.72rem] ${
                          day.inMonth ? "text-ink-100" : "text-ink-500"
                        }`}
                      >
                        {String(day.date.getDate()).padStart(2, "0")}
                      </span>
                      {status === "empty" ? null : <StatusDot status={status} size={7} />}
                    </span>

                    <span className="mt-auto flex flex-col items-start gap-1">
                      {entries.slice(0, 2).map((entry) => {
                        const page = pageLabel(state.pages, entry.pageId);
                        return (
                          <PageChip
                            key={entry.id}
                            accent={page.accent}
                            label={page.slug}
                            ready={entry.status === "ready"}
                            hasLink={entry.url.trim().length > 0}
                            compact
                          />
                        );
                      })}
                      {entries.length > 2 ? (
                        <span className="pl-1 text-[0.6rem] text-ink-400">
                          +{entries.length - 2} mas
                        </span>
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div
          data-reveal
          className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row"
        >
          <NotifyStatus />
          <p className="text-center text-xs text-ink-500 sm:text-right">
            Los dos pueden editar a la vez: los cambios se sincronizan solos cada pocos segundos.
          </p>
        </div>
      </div>

      {selected ? (
        <DayDrawer
          key={selected}
          dateKey={selected}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </section>
  );
}
