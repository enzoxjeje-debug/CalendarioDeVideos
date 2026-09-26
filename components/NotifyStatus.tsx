"use client";

import { useEffect, useState } from "react";
import { useCalendar } from "./CalendarProvider";
import { IconBell, IconCheck, IconX } from "./icons";

type Channels = { email: boolean; whatsapp: boolean; webhook: boolean };

export default function NotifyStatus() {
  const { me, users, postJson } = useCalendar();
  const [channels, setChannels] = useState<Channels | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/notify", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { channels?: Channels } | null) => {
        if (alive && data?.channels) setChannels(data.channels);
      })
      .catch(() => {
        /* sin conexion: se muestra como no configurado */
      });
    return () => {
      alive = false;
    };
  }, []);

  const items: { key: keyof Channels; label: string }[] = [
    { key: "email", label: "Email" },
    { key: "whatsapp", label: "WhatsApp" },
    { key: "webhook", label: "Webhook" },
  ];
  const anyOn = channels ? Object.values(channels).some(Boolean) : false;

  async function sendTest() {
    setBusy(true);
    setMessage(null);
    const { ok, data, error } = await postJson<{ results?: { channel: string; ok: boolean; detail: string }[] }>(
      "/api/notify",
    );
    setBusy(false);
    if (!ok) {
      setMessage(error ?? "No se pudo enviar la prueba");
      return;
    }
    const results = data?.results ?? [];
    if (results.length === 0) {
      setMessage("No hay ningun canal configurado todavia");
      return;
    }
    setMessage(
      results
        .map((item) => `${item.channel}: ${item.ok ? "enviado" : item.detail}`)
        .join(" · "),
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-ink-400">
      <span className="inline-flex items-center gap-1.5 font-semibold tracking-[0.1em] text-ink-500 uppercase">
        <IconBell size={13} />
        Aviso a {users.user1}
      </span>

      {items.map((item) => {
        const on = channels ? channels[item.key] : false;
        return (
          <span
            key={item.key}
            className="chip"
            style={{
              background: on ? "rgba(34,217,127,0.14)" : "rgba(148,163,210,0.08)",
              borderColor: on ? "rgba(34,217,127,0.35)" : "rgba(148,163,210,0.14)",
              color: on ? "#4ee79b" : "#6f7796",
              border: "1px solid",
            }}
            title={
              on
                ? `${item.label} configurado: se avisa al confirmar un video`
                : `${item.label} sin configurar`
            }
          >
            {on ? <IconCheck size={10} /> : <IconX size={10} />}
            {item.label}
          </span>
        );
      })}

      {channels === null ? (
        <span className="text-ink-500">comprobando…</span>
      ) : anyOn ? null : (
        <span className="text-ink-500">
          sin configurar (mira el README para activarlo por email o WhatsApp)
        </span>
      )}

      {me === "user2" ? (
        <button
          type="button"
          onClick={() => void sendTest()}
          disabled={busy}
          className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[0.65rem] font-semibold text-ink-300 transition-colors hover:text-white"
        >
          {busy ? "Enviando…" : "Probar aviso"}
        </button>
      ) : null}

      {message ? <span className="text-brand-300">{message}</span> : null}
    </div>
  );
}
