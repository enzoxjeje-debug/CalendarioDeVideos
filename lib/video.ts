export type VideoProvider = "youtube" | "vimeo" | "imagen" | "archivo" | "otro";

export type VideoInfo = {
  provider: VideoProvider;
  id: string | null;
  /** URL de la miniatura, cuando se puede obtener sin llamar a ninguna API. */
  thumbnail: string | null;
  /** Etiqueta corta del proveedor para mostrar. */
  label: string;
};

const IMAGE_EXT = /\.(jpe?g|png|webp|avif|gif)(\?.*)?$/i;
const VIDEO_EXT = /\.(mp4|webm|mov|m4v)(\?.*)?$/i;
const YT_ID = /^[A-Za-z0-9_-]{6,20}$/;

function normalize(raw: string): URL | null {
  const value = (raw ?? "").trim();
  if (!value) return null;
  try {
    return new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
  } catch {
    return null;
  }
}

function youtubeId(url: URL): string | null {
  const host = url.hostname.replace(/^www\.|^m\./, "");
  if (host === "youtu.be") {
    const id = url.pathname.slice(1).split("/")[0];
    return YT_ID.test(id) ? id : null;
  }
  if (host !== "youtube.com" && host !== "music.youtube.com" && host !== "youtube-nocookie.com") {
    return null;
  }
  const fromQuery = url.searchParams.get("v");
  if (fromQuery && YT_ID.test(fromQuery)) return fromQuery;
  const match = url.pathname.match(/^\/(?:shorts|embed|live|v)\/([^/?#]+)/);
  if (match && YT_ID.test(match[1])) return match[1];
  return null;
}

/** Miniatura de YouTube: `hqdefault` existe para todos los videos publicos. */
export function youtubeThumbnail(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

export function parseVideoUrl(raw: string): VideoInfo {
  const url = normalize(raw);
  if (!url) {
    return { provider: "otro", id: null, thumbnail: null, label: "Enlace" };
  }

  const videoId = youtubeId(url);
  if (videoId) {
    return {
      provider: "youtube",
      id: videoId,
      thumbnail: youtubeThumbnail(videoId),
      label: "YouTube",
    };
  }

  const host = url.hostname.replace(/^www\./, "");
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const match = url.pathname.match(/(\d{6,})/);
    return {
      provider: "vimeo",
      id: match ? match[1] : null,
      // Vimeo no expone una miniatura por URL directa (necesita su API).
      thumbnail: null,
      label: "Vimeo",
    };
  }

  if (IMAGE_EXT.test(url.pathname)) {
    return { provider: "imagen", id: null, thumbnail: url.toString(), label: "Imagen" };
  }

  if (VIDEO_EXT.test(url.pathname)) {
    return { provider: "archivo", id: null, thumbnail: null, label: "Archivo de video" };
  }

  return { provider: "otro", id: null, thumbnail: null, label: host || "Enlace" };
}

/** true cuando el link ya trae miniatura automatica (YouTube o una imagen). */
export function hasAutoThumbnail(raw: string): boolean {
  return parseVideoUrl(raw).thumbnail !== null;
}
