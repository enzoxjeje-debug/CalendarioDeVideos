"use client";

import { accentStyle } from "@/lib/colors";
import { ACCENT_HEX } from "@/lib/presets";
import { STATUS_LABEL } from "@/lib/logic";
import type { Accent, DayStatus, StorageKind } from "@/lib/types";
import { IconCheck, IconInfo, IconPlay } from "./icons";

export function AccentDot({ accent, size = 8 }: { accent: Accent; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block shrink-0 rounded-full"
      style={{
        width: size,
        height: size,
        background: ACCENT_HEX[accent],
        boxShadow: `0 0 10px ${ACCENT_HEX[accent]}`,
      }}
    />
  );
}

export function PageChip({
  accent,
  label,
  ready = false,
  hasLink = false,
  compact = false,
}: {
  accent: Accent;
  label: string;
  ready?: boolean;
  /** Marca los videos que ya tienen link (el usuario 2 lo agrego). */
  hasLink?: boolean;
  compact?: boolean;
}) {
  return (
    <span
      className="chip max-w-full truncate"
      style={{ ...accentStyle(accent), fontSize: compact ? "0.6rem" : "0.68rem" }}
      title={
        hasLink
          ? `${label}: video con link agregado${ready ? " y confirmado" : ""}`
          : `${label}: falta el link del video`
      }
    >
      <AccentDot accent={accent} size={compact ? 5 : 6} />
      <span className="truncate">{label}</span>
      {hasLink ? <IconPlay size={compact ? 9 : 10} className="shrink-0 opacity-80" /> : null}
      {ready ? <IconCheck size={compact ? 10 : 11} className="shrink-0" /> : null}
    </span>
  );
}

export function StatusDot({ status, size = 9 }: { status: DayStatus; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className={`legend-dot dot-${status} ${status === "pending" ? "pulse-dot" : ""}`}
      style={{ width: size, height: size }}
    />
  );
}

export function StatusPill({ status }: { status: DayStatus }) {
  const map: Record<DayStatus, string> = {
    empty: "rgba(148,163,210,0.14)",
    pending: "rgba(255,77,94,0.18)",
    ready: "rgba(34,217,127,0.18)",
    mixed: "rgba(245,158,11,0.18)",
  };
  const text: Record<DayStatus, string> = {
    empty: "#9aa2c0",
    pending: "#ff7382",
    ready: "#4ee79b",
    mixed: "#fbbf24",
  };
  return (
    <span
      className="chip"
      style={{
        backgroundColor: map[status],
        color: text[status],
        borderColor: "transparent",
        letterSpacing: "0.04em",
      }}
    >
      <StatusDot status={status} size={7} />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function Legend({ user1, user2 }: { user1: string; user2: string }) {
  const items = [
    { status: "empty" as DayStatus, title: "Sin video", text: "Dia libre" },
    { status: "pending" as DayStatus, title: "Rojo", text: `${user1} asigno el video` },
    { status: "ready" as DayStatus, title: "Verde", text: `${user2} confirmo que esta listo` },
    { status: "mixed" as DayStatus, title: "Mitad", text: "Hay videos listos y pendientes" },
  ];
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-3">
      {items.map((item) => (
        <li key={item.status} className="flex items-center gap-2 text-sm">
          <StatusDot status={item.status} />
          <span className="font-semibold text-ink-100">{item.title}</span>
          <span className="text-ink-400">{item.text}</span>
        </li>
      ))}
    </ul>
  );
}

export function SectionLabel({
  children,
  icon,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-[0.68rem] font-semibold tracking-[0.18em] text-brand-300 uppercase">
      {icon}
      {children}
    </span>
  );
}

export function SectionHeading({
  label,
  title,
  description,
  icon,
  align = "left",
}: {
  label: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  align?: "left" | "center";
}) {
  return (
    <div
      data-reveal
      className={`flex flex-col gap-4 ${align === "center" ? "items-center text-center" : "items-start"}`}
    >
      <SectionLabel icon={icon}>{label}</SectionLabel>
      <h2 className="text-3xl font-semibold tracking-tight text-balance text-white sm:text-4xl">
        {title}
      </h2>
      {description ? (
        <p className="max-w-2xl text-base leading-relaxed text-ink-300">{description}</p>
      ) : null}
    </div>
  );
}

export function StorageNotice({ storage }: { storage: StorageKind }) {
  if (storage !== "memory") return null;
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
      <IconInfo size={16} className="mt-0.5 shrink-0" />
      <p>
        <span className="font-semibold">Modo demo (memoria):</span> los cambios se ven al
        instante pero se pierden al reiniciar. Conecta una base Redis (Upstash) en Vercel
        para guardarlos de verdad — mira <code className="font-mono">.env.example</code>.
      </p>
    </div>
  );
}

export function StorageBadge({ storage }: { storage: StorageKind }) {
  const map: Record<StorageKind, { label: string; color: string }> = {
    redis: { label: "Base compartida conectada", color: "#4ee79b" },
    file: { label: "Guardando en archivo local", color: "#fbbf24" },
    memory: { label: "Solo en memoria (demo)", color: "#ff7382" },
  };
  const info = map[storage];
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[0.68rem] font-semibold"
      style={{
        color: info.color,
        borderColor: "rgba(148,163,210,0.18)",
        backgroundColor: "rgba(148,163,210,0.08)",
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: info.color, boxShadow: `0 0 8px ${info.color}` }}
      />
      {info.label}
    </span>
  );
}
