"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { gsap, useGSAP, withMotion } from "@/lib/gsap";
import { formatLongDate, fromKey } from "@/lib/dates";
import { dayStatus, pageLabel, sortEntries } from "@/lib/logic";
import { accentStyle } from "@/lib/colors";
import { useCalendar } from "./CalendarProvider";
import { AccentDot, PageChip, StatusPill } from "./ui";
import VideoThumb, { ThumbPlaceholder } from "./VideoThumb";
import {
  IconCheck,
  IconLink,
  IconPencil,
  IconPlus,
  IconTrash,
  IconX,
} from "./icons";

type Props = { dateKey: string; onClose: () => void };

export default function DayDrawer({ dateKey, onClose }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const closingRef = useRef(false);
  const closedRef = useRef(false);
  const { state, users, me, myName, saveAssignment, setAssignmentStatus, removeAssignment, sync } =
    useCalendar();

  const date = useMemo(() => fromKey(dateKey), [dateKey]);
  const entries = useMemo(
    () => sortEntries(state.assignments.filter((item) => item.date === dateKey)),
    [state.assignments, dateKey],
  );
  const status = dayStatus(entries);

  // El link y las notas son exclusivos del usuario 2 (el servidor tambien lo aplica).
  const canEditMedia = me === "user2";

  const [pageId, setPageId] = useState(state.pages[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Bloquea el scroll de fondo y cierra con Escape.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeWithAnimation();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useGSAP(() => {
    const mm = gsap.matchMedia();
    withMotion(mm, () => {
      gsap.from(overlayRef.current, { opacity: 0, duration: 0.3, ease: "power2.out" });
      gsap.from(panelRef.current, {
        y: 60,
        opacity: 0,
        duration: 0.5,
        ease: "expo.out",
      });
      gsap.from("[data-drawer-item]", {
        y: 18,
        opacity: 0,
        duration: 0.45,
        ease: "power2.out",
        stagger: 0.05,
        delay: 0.12,
      });
    });
    return () => mm.revert();
  }, { scope: panelRef });

  useEffect(() => {
    const timer = window.setTimeout(() => titleInputRef.current?.focus(), 260);
    return () => window.clearTimeout(timer);
  }, []);

  function closeWithAnimation() {
    if (closingRef.current) return;
    closingRef.current = true;

    const finish = () => {
      if (closedRef.current) return;
      closedRef.current = true;
      onClose();
    };

    const tl = gsap.timeline({ onComplete: finish });
    tl.to(overlayRef.current, { opacity: 0, duration: 0.22, ease: "power2.in" })
      .to(panelRef.current, { y: 40, opacity: 0, duration: 0.26, ease: "power2.in" }, 0);

    // Red de seguridad: si el ticker de GSAP esta dormido (pestana oculta,
    // webview sin composicion), cerramos igual para no dejar el scroll bloqueado.
    window.setTimeout(finish, 500);
  }

  function resetForm() {
    setEditingId(null);
    setTitle("");
    setUrl("");
    setNotes("");
    setFormError(null);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!pageId) {
      setFormError("Primero crea una pagina en la seccion Paginas");
      return;
    }
    if (!title.trim()) {
      setFormError("Escribe el titulo o la idea del video");
      return;
    }
    const ok = await saveAssignment({ id: editingId ?? undefined, date: dateKey, pageId, title, url, notes });
    if (ok) resetForm();
    else setFormError("No se pudo guardar. Intenta otra vez.");
  }

  function handleEdit(id: string) {
    const item = entries.find((entry) => entry.id === id);
    if (!item) return;
    setEditingId(item.id);
    setPageId(item.pageId);
    setTitle(item.title);
    setUrl(item.url);
    setNotes(item.notes);
    setFormError(null);
    titleInputRef.current?.focus();
  }

  return (
    <>
      <div
        ref={overlayRef}
        className="overlay"
        onClick={closeWithAnimation}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        className="drawer glass"
        role="dialog"
        aria-modal="true"
        aria-label={`Videos del ${formatLongDate(date)}`}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-white/5 bg-ink-900/80 px-5 py-4 backdrop-blur-xl">
          <div>
            <p className="text-[0.65rem] font-semibold tracking-[0.18em] text-ink-400 uppercase">
              {me === "user1" ? "Modo creador" : "Modo revisor"}
            </p>
            <h3 className="mt-1 text-lg font-semibold text-white">
              {formatLongDate(date)}
            </h3>
            <div className="mt-2">
              <StatusPill status={status} />
            </div>
          </div>
          <button
            type="button"
            onClick={closeWithAnimation}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/5 text-ink-300 transition-colors hover:text-white"
          >
            <IconX size={16} />
            <span className="sr-only">Cerrar</span>
          </button>
        </div>

        <div className="flex flex-col gap-6 px-5 py-5">
          <section data-drawer-item className="flex flex-col gap-3">
            <h4 className="text-[0.68rem] font-semibold tracking-[0.18em] text-ink-400 uppercase">
              {entries.length > 0 ? `Videos de este dia (${entries.length})` : "Sin videos este dia"}
            </h4>

            {entries.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-6 text-sm text-ink-400">
                Este dia esta libre. Asigna el titulo de lo que hay que subir: el dia se pinta de{" "}
                <span className="font-semibold text-danger-400">rojo</span>, {" "}
                {users.user2} le agrega el link (con su miniatura) y lo confirma en{" "}
                <span className="font-semibold text-success-400">verde</span>.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {entries.map((entry) => {
                  const page = pageLabel(state.pages, entry.pageId);
                  return (
                    <li
                      key={entry.id}
                      className="rounded-2xl border border-white/10 bg-white/[0.04] p-3.5"
                      style={
                        entry.status === "ready"
                          ? { borderColor: "rgba(34,217,127,0.35)" }
                          : { borderColor: "rgba(255,77,94,0.35)" }
                      }
                    >
                      <div className="flex gap-3">
                        {entry.url ? (
                          <VideoThumb url={entry.url} size="md" />
                        ) : (
                          <ThumbPlaceholder size="md" label="Link pendiente" />
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <PageChip accent={page.accent} label={page.slug} />
                            <StatusPill status={entry.status === "ready" ? "ready" : "pending"} />
                          </div>

                          <p className="mt-2.5 text-sm font-semibold text-white">
                            {entry.title || "Video sin titulo"}
                          </p>

                          {entry.url ? (
                            <a
                              href={entry.url}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="mt-1.5 inline-flex max-w-full items-center gap-1.5 text-xs text-brand-300 hover:text-brand-200"
                            >
                              <IconLink size={12} />
                              <span className="truncate">{entry.url}</span>
                            </a>
                          ) : (
                            <p className="mt-1.5 text-xs text-ink-500">
                              Todavia sin link: lo agrega {users.user2}.
                            </p>
                          )}
                        </div>
                      </div>

                      {entry.notes ? (
                        <p className="mt-3 rounded-xl bg-ink-950/60 px-3 py-2 text-xs leading-relaxed text-ink-300">
                          {entry.notes}
                        </p>
                      ) : null}

                      <p className="mt-2 text-[0.7rem] text-ink-500">
                        Asigno: <span className="text-danger-400">{users[entry.createdBy]}</span>
                        {entry.status === "ready" && entry.readyBy ? (
                          <>
                            {" · Confirmo: "}
                            <span className="text-success-400">{users[entry.readyBy]}</span>
                          </>
                        ) : null}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {entry.status === "assigned" ? (
                          <button
                            type="button"
                            className="btn btn-sm btn-success"
                            disabled={sync === "saving"}
                            onClick={() => void setAssignmentStatus(entry.id, "ready")}
                          >
                            <IconCheck size={13} />
                            Marcar como listo
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-sm btn-ghost"
                            disabled={sync === "saving"}
                            onClick={() => void setAssignmentStatus(entry.id, "assigned")}
                          >
                            Volver a pendiente
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost"
                          onClick={() => handleEdit(entry.id)}
                        >
                          <IconPencil size={13} />
                          Editar
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-danger"
                          disabled={sync === "saving"}
                          onClick={() => {
                            if (editingId === entry.id) resetForm();
                            void removeAssignment(entry.id);
                          }}
                        >
                          <IconTrash size={13} />
                          Borrar
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <form data-drawer-item onSubmit={handleSubmit} className="flex flex-col gap-4">
            <h4 className="text-[0.68rem] font-semibold tracking-[0.18em] text-ink-400 uppercase">
              {editingId ? "Editando el video" : "Asignar un video"}
            </h4>

            <div>
              <span className="label">Pagina</span>
              <div className="flex flex-wrap gap-2">
                {state.pages.map((page) => {
                  const active = page.id === pageId;
                  return (
                    <button
                      key={page.id}
                      type="button"
                      onClick={() => setPageId(page.id)}
                      className="chip transition-transform"
                      aria-pressed={active}
                      style={{
                        ...accentStyle(page.accent, active ? 0.28 : 0.1),
                        transform: active ? "translateY(-1px)" : "none",
                        boxShadow: active ? `0 0 0 1px ${accentStyle(page.accent).borderColor}` : "none",
                      }}
                    >
                      <AccentDot accent={page.accent} size={6} />
                      {page.slug}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="label" htmlFor="video-title">
                Titulo o idea del video
              </label>
              <input
                id="video-title"
                ref={titleInputRef}
                className="input"
                value={title}
                maxLength={140}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Ej: Top 5 aperturas de cajas"
              />
            </div>

            {canEditMedia ? (
              <>
                <div>
                  <label className="label" htmlFor="video-url">
                    Link del video
                  </label>
                  <input
                    id="video-url"
                    className="input"
                    value={url}
                    inputMode="url"
                    onChange={(event) => setUrl(event.target.value)}
                    placeholder="https://youtube.com/watch?v=…"
                  />
                  {url.trim() ? (
                    <div className="mt-3 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                      <VideoThumb url={url} size="md" />
                      <p className="text-[0.7rem] leading-relaxed text-ink-400">
                        Asi se vera la miniatura del video en el calendario y en la lista.
                      </p>
                    </div>
                  ) : null}
                </div>

                <div>
                  <label className="label" htmlFor="video-notes">
                    Notas
                  </label>
                  <textarea
                    id="video-notes"
                    className="textarea"
                    rows={3}
                    value={notes}
                    maxLength={400}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Duracion, musica, hooks, lo que sea util para el otro"
                  />
                </div>
              </>
            ) : (
              <p className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-3 text-[0.72rem] leading-relaxed text-ink-400">
                El <span className="font-semibold text-ink-200">link</span> y las{" "}
                <span className="font-semibold text-ink-200">notas</span> los agrega{" "}
                {users.user2} cuando tenga el video. Tu solo pones el titulo de lo que hay que
                subir.
              </p>
            )}

            {formError ? (
              <p className="rounded-xl border border-danger-500/30 bg-danger-500/10 px-3 py-2 text-xs text-danger-400">
                {formError}
              </p>
            ) : null}

            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="btn btn-primary flex-1"
                disabled={sync === "saving"}
              >
                {editingId ? (
                  <>
                    <IconCheck size={15} />
                    Guardar cambios
                  </>
                ) : (
                  <>
                    <IconPlus size={15} />
                    Asignar video a este dia
                  </>
                )}
              </button>
              {editingId ? (
                <button type="button" className="btn btn-ghost" onClick={resetForm}>
                  Cancelar
                </button>
              ) : null}
            </div>

            <p className="text-[0.7rem] leading-relaxed text-ink-500">
              Estas como <span className="font-semibold text-ink-300">{myName}</span>. Al guardar,
              el dia queda en <span className="text-danger-400">rojo</span> hasta que alguien lo
              marque como listo.
            </p>

            {canEditMedia && editingId === null && url.trim() === "" ? (
              <p className="text-[0.7rem] leading-relaxed text-ink-500">
                Puedes guardar solo el titulo y pegar el link despues, cuando el video ya exista:
                la miniatura aparece en cuanto lo agregues.
              </p>
            ) : null}
          </form>
        </div>
      </div>
    </>
  );
}
