"use client";

import { useRef } from "react";
import { gsap, useGSAP, withMotion } from "@/lib/gsap";
import { useCalendar } from "./CalendarProvider";
import { SectionHeading, StatusDot } from "./ui";
import { IconCalendar, IconCheck, IconClock, IconSpark } from "./icons";

export default function HowItWorks() {
  const rootRef = useRef<HTMLElement>(null);
  const { users } = useCalendar();

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      withMotion(mm, () => {
        gsap.from("[data-step]", {
          y: 36,
          opacity: 0,
          duration: 0.7,
          ease: "power3.out",
          stagger: 0.12,
          scrollTrigger: { trigger: "[data-steps]", start: "top 82%" },
        });

        gsap.from("[data-step-line]", {
          scaleX: 0,
          transformOrigin: "left center",
          duration: 1.1,
          ease: "power2.inOut",
          stagger: 0.12,
          scrollTrigger: { trigger: "[data-steps]", start: "top 78%" },
        });

        gsap.from("[data-state-card]", {
          scale: 0.9,
          opacity: 0,
          duration: 0.6,
          ease: "back.out(1.8)",
          stagger: 0.1,
          scrollTrigger: { trigger: "[data-states]", start: "top 88%" },
        });

        // Latido continuo en los colores para que se entienda el semaforo.
        gsap.to("[data-state-glow]", {
          opacity: 0.35,
          duration: 1.6,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
          stagger: 0.2,
        });
      });
      return () => mm.revert();
    },
    { scope: rootRef },
  );

  const steps = [
    {
      icon: <IconClock size={16} />,
      badge: "Rojo",
      color: "#ff4d5e",
      title: `1. ${users.user1} asigna el video`,
      text: "Abre el dia, elige la pagina (GGDROP, LLAVEDROP o la que agregues) y escribe solo el titulo de lo que hay que subir. El dia se pinta de rojo automaticamente.",
    },
    {
      icon: <IconCheck size={16} />,
      badge: "Verde",
      color: "#22d97f",
      title: `2. ${users.user2} pone el link y confirma`,
      text: `Solo ${users.user2} puede pegar el link del video y dejar notas: en cuanto lo guarda se ve la miniatura del video ahi mismo. Cuando el video ya esta subido, lo marca como listo y el dia pasa a verde para los dos.`,
    },
    {
      icon: <IconCalendar size={16} />,
      badge: "Semaforo",
      color: "#c4b5fd",
      title: "3. Miren el mes de un vistazo",
      text: "Sin abrir ningun dia: gris es libre, rojo hay tarea pendiente, verde esta cumplido y mitad y mitad avisa que hay algo a medias.",
    },
  ];

  const states = [
    { status: "empty" as const, title: "Sin color", text: "Dia libre", color: "#6f7796" },
    {
      status: "pending" as const,
      title: "Rojo",
      text: `Video asignado por ${users.user1}`,
      color: "#ff4d5e",
    },
    {
      status: "ready" as const,
      title: "Verde",
      text: `${users.user2} confirmo que esta listo`,
      color: "#22d97f",
    },
    {
      status: "mixed" as const,
      title: "Mitad",
      text: "Unas paginas listas y otras pendientes",
      color: "#f59e0b",
    },
  ];

  return (
    <section id="como-funciona" ref={rootRef} className="relative py-20 sm:py-24">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 sm:px-6">
        <SectionHeading
          label="Como funciona"
          icon={<IconSpark size={13} />}
          title="Dos pasos y el calendario se pinta solo"
          description="Nada de chats perdidos ni notas mentales: el estado de cada video vive en el dia donde toca publicarlo."
          align="center"
        />

        <div data-steps className="grid gap-5 lg:grid-cols-3">
          {steps.map((step) => (
            <article
              key={step.title}
              data-step
              className="glass-soft relative flex flex-col gap-3 rounded-2xl p-6"
            >
              <span
                data-step-line
                className="absolute inset-x-6 top-0 h-px"
                style={{ background: `linear-gradient(90deg, ${step.color}, transparent)` }}
              />
              <span
                className="inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-[0.65rem] font-bold tracking-[0.14em] uppercase"
                style={{ color: step.color, background: `${step.color}22` }}
              >
                {step.icon}
                {step.badge}
              </span>
              <h3 className="text-lg font-semibold text-white">{step.title}</h3>
              <p className="text-sm leading-relaxed text-ink-300">{step.text}</p>
            </article>
          ))}
        </div>

        <div data-states className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {states.map((state) => (
            <div
              key={state.status}
              data-state-card
              className="relative overflow-hidden rounded-2xl border border-white/10 bg-ink-900/60 p-5"
            >
              <span
                data-state-glow
                aria-hidden="true"
                className="pointer-events-none absolute -top-16 -right-10 h-32 w-32 rounded-full opacity-70 blur-3xl"
                style={{ background: state.color }}
              />
              <div className="relative flex items-center gap-2">
                <StatusDot status={state.status} size={10} />
                <span className="text-sm font-semibold text-white">{state.title}</span>
              </div>
              <p className="relative mt-2 text-xs leading-relaxed text-ink-300">{state.text}</p>
            </div>
          ))}
        </div>

        <div
          data-reveal
          className="glass flex flex-col items-start gap-4 rounded-2xl p-6 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h3 className="text-base font-semibold text-white">
              Listo para compartir con la otra persona
            </h3>
            <p className="mt-1 text-sm text-ink-300">
              Copia el link de la pagina y abranlo los dos: el mismo calendario, los mismos
              colores, en tiempo real.
            </p>
          </div>
          <a href="#calendario" className="btn btn-primary">
            Volver al calendario
          </a>
        </div>
      </div>
    </section>
  );
}
