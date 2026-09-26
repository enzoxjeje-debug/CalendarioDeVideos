"use client";

import { useEffect, useRef, useState } from "react";
import { forcedMotion, gsap, ScrollTrigger, useGSAP, withMotion } from "@/lib/gsap";
import { CalendarProvider, useCalendar } from "./CalendarProvider";
import SiteHeader from "./SiteHeader";
import PinGate from "./PinGate";
import CalendarSection from "./CalendarSection";
import PagesSection from "./PagesSection";
import HowItWorks from "./HowItWorks";
import SiteFooter from "./SiteFooter";
import { IconX } from "./icons";
import type { CalendarState, StorageKind } from "@/lib/types";

export default function Landing({
  initialState,
  initialStorage,
  serverToday,
}: {
  initialState: CalendarState;
  initialStorage: StorageKind;
  serverToday: string;
}) {
  return (
    <CalendarProvider
      initialState={initialState}
      initialStorage={initialStorage}
      serverToday={serverToday}
    >
      <LandingShell />
    </CalendarProvider>
  );
}

function LandingShell() {
  const rootRef = useRef<HTMLDivElement>(null);
  const toastRef = useRef<HTMLDivElement>(null);
  const [pinOpen, setPinOpen] = useState(false);
  const { error, clearError } = useCalendar();

  // Revelado generico: cualquier bloque con data-reveal aparece al hacer scroll.
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      withMotion(mm, () => {
        gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((element) => {
          gsap.from(element, {
            y: 28,
            opacity: 0,
            duration: 0.8,
            ease: "power3.out",
            scrollTrigger: {
              trigger: element,
              start: "top 88%",
              once: true,
            },
          });
        });
        ScrollTrigger.refresh();
      });
      return () => mm.revert();
    },
    { scope: rootRef },
  );

  useEffect(() => {
    if (!error) return;
    const timer = window.setTimeout(() => clearError(), 7000);
    return () => window.clearTimeout(timer);
  }, [error, clearError]);

  // ?motion=force | ?motion=off controla tambien las animaciones CSS.
  useEffect(() => {
    const forced = forcedMotion();
    if (forced === true) document.documentElement.dataset.motion = "force";
    if (forced === false) document.documentElement.dataset.motion = "off";
  }, []);

  useGSAP(
    () => {
      if (!toastRef.current) return;
      gsap.fromTo(
        toastRef.current,
        { y: 26, opacity: 0, scale: 0.96 },
        { y: 0, opacity: 1, scale: 1, duration: 0.45, ease: "back.out(1.7)" },
      );
    },
    { dependencies: [error] },
  );

  return (
    <div ref={rootRef} className="app-shell">
      <SiteHeader onRequireUser2Access={() => setPinOpen(true)} />
      <main>
        <CalendarSection />
        <PagesSection />
        <HowItWorks />
      </main>
      <SiteFooter />

      {/* El modal vive aqui, fuera del encabezado (que tiene backdrop-blur y
          atraparia el posicionamiento `fixed` de sus hijos). */}
      {pinOpen ? <PinGate onClose={() => setPinOpen(false)} /> : null}

      {error ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-5 z-[80] flex justify-center px-4">
          <div
            ref={toastRef}
            role="alert"
            className="glass pointer-events-auto flex w-[min(32rem,100%)] items-start gap-3 rounded-2xl border border-danger-500/40 px-4 py-3 text-sm text-danger-400"
          >
            <span className="flex-1">{error}</span>
            <button
              type="button"
              onClick={clearError}
              className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/5 text-ink-300 transition-colors hover:text-white"
            >
              <IconX size={13} />
              <span className="sr-only">Cerrar aviso</span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
