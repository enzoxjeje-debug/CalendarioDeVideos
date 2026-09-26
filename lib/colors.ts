import { ACCENT_HEX } from "./presets";
import type { Accent } from "./types";

export function hexToRgba(hex: string, alphaValue: number): string {
  const value = hex.replace("#", "");
  const full =
    value.length === 3
      ? value
          .split("")
          .map((char) => char + char)
          .join("")
      : value;
  const num = Number.parseInt(full, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alphaValue})`;
}

/** Estilos inline para los badges de cada pagina (evita clases dinamicas). */
export function accentStyle(accent: Accent, strength = 0.16) {
  const hex = ACCENT_HEX[accent] ?? ACCENT_HEX.cyan;
  return {
    color: hex,
    backgroundColor: hexToRgba(hex, strength),
    borderColor: hexToRgba(hex, strength + 0.25),
  };
}

export function accentGlow(accent: Accent, strength = 0.5) {
  const hex = ACCENT_HEX[accent] ?? ACCENT_HEX.cyan;
  return `0 18px 40px -24px ${hexToRgba(hex, strength)}`;
}
