"use client";

import { useMemo, useState } from "react";
import { parseVideoUrl } from "@/lib/video";
import { IconFilm, IconPlay } from "./icons";

type Size = "sm" | "md";

const SIZES: Record<Size, string> = {
  sm: "w-20",
  md: "w-32",
};

/**
 * Miniatura del video a partir del link: se obtiene sin pedir nada a ninguna
 * API (YouTube expone la imagen por ID), asi que no cuesta peticiones extra.
 */
export default function VideoThumb({
  url,
  size = "md",
  className = "",
}: {
  url: string;
  size?: Size;
  className?: string;
}) {
  const info = useMemo(() => parseVideoUrl(url), [url]);
  const [failed, setFailed] = useState(false);
  const frame = `${SIZES[size]} aspect-video shrink-0 overflow-hidden rounded-xl border border-white/10 bg-ink-950/70`;

  const content =
    info.thumbnail && !failed ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={info.thumbnail}
        alt={`Miniatura del video (${info.label})`}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="h-full w-full object-cover"
      />
    ) : (
      <span className="flex h-full w-full flex-col items-center justify-center gap-1 text-ink-400">
        {info.provider === "otro" ? <IconFilm size={16} /> : <IconPlay size={16} />}
        <span className="px-1 text-center text-[0.55rem] leading-tight">{info.label}</span>
      </span>
    );

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer noopener"
      title={`Abrir el video en ${info.label}`}
      className={`group relative block ${frame} ${className}`}
    >
      {content}
      <span className="absolute inset-0 grid place-items-center bg-ink-950/0 opacity-0 transition-opacity group-hover:bg-ink-950/45 group-hover:opacity-100">
        <IconPlay size={18} className="text-white" />
      </span>
    </a>
  );
}

/** Hueco visible cuando el video todavia no tiene link (lo agrega el usuario 2). */
export function ThumbPlaceholder({
  size = "md",
  label = "Sin link",
}: {
  size?: Size;
  label?: string;
}) {
  return (
    <span
      className={`${SIZES[size]} flex aspect-video shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-white/15 bg-white/[0.02] text-ink-500`}
    >
      <IconFilm size={15} />
      <span className="text-[0.55rem] leading-none">{label}</span>
    </span>
  );
}
