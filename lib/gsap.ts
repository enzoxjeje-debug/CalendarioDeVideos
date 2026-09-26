"use client";

import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

// Todos los plugins de GSAP son gratuitos desde la 3.13, asi que registramos
// aqui los que usa la landing (scroll + texto dividido).
gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText);

// En desarrollo expongo GSAP para poder inspeccionar tweens desde la consola.
if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
  (window as unknown as { gsap?: typeof gsap }).gsap = gsap;
}

export const MOTION_OK = "(prefers-reduced-motion: no-preference)";

/**
 * Override manual para ver (o apagar) las animaciones sin tocar el sistema:
 * ?motion=force las enciende, ?motion=off las apaga.
 */
export function forcedMotion(): boolean | null {
  if (typeof window === "undefined") return null;
  const value = new URLSearchParams(window.location.search).get("motion");
  if (value === "force" || value === "on") return true;
  if (value === "off") return false;
  return null;
}

/**
 * Ejecuta las animaciones solo si el visitante acepta movimiento (o si lo
 * fuerza con ?motion=force). Se registra via gsap.matchMedia para que GSAP
 * revierta todo si la preferencia cambia.
 */
export function withMotion(mm: gsap.MatchMedia, callback: () => void) {
  const forced = forcedMotion();
  // gsap.matchMedia solo entiende media queries, asi que el override manual
  // se resuelve antes: al ejecutarse dentro de useGSAP las animaciones siguen
  // perteneciendo al mismo contexto y se revierten igual al desmontar.
  if (forced === true) {
    callback();
    return;
  }
  if (forced === false) return;
  mm.add(MOTION_OK, () => callback());
}

export { gsap, useGSAP, ScrollTrigger, SplitText };
